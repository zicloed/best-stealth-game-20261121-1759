// Shadow Vault — Night Warden guards: waypoint patrols, vision cones,
// a per-guard detection meter, and CALM -> SUSPICIOUS -> ALARMED states.
import { LEVEL, hasLineOfSight, pointInShadow, pointInLight, solidRects } from './level.js';

export const VISION_RANGE = 190;
export const VISION_HALF_ANGLE = (35 * Math.PI) / 180;
export const GUARD_RADIUS = 15;

const CHASE_SPEED = 168;
const INVESTIGATE_TIME = 2.2;
const LOSE_SIGHT_TIME = 3.0;

export function createGuard(def, index) {
  return {
    name: def.name,
    x: def.x,
    y: def.y,
    radius: GUARD_RADIUS,
    patrolSpeed: def.speed,
    waypoints: def.waypoints,
    wpIndex: 1,
    facing: 0,
    state: 'calm',        // calm | suspicious | alarmed | investigate
    meter: 0,             // 0..100 detection
    loseSightTimer: 0,
    investigateTarget: null,
    investigateTimer: 0,
    pauseTimer: 0,        // brief stop at each waypoint
    stepTimer: Math.random() * 0.4,
    index,
  };
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x, dy = ty - g.y;
  const d = Math.hypot(dx, dy);
  if (d < 2) return true;
  const step = Math.min(d, speed * dt);
  g.x += (dx / d) * step;
  g.y += (dy / d) * step;
  g.facing = Math.atan2(dy, dx);
  // slide out of solids (guards walk around crates, never through them)
  for (const r of solidRects()) {
    const cx = Math.max(r.x, Math.min(g.x, r.x + r.w));
    const cy = Math.max(r.y, Math.min(g.y, r.y + r.h));
    const ox = g.x - cx, oy = g.y - cy;
    const d2 = ox * ox + oy * oy;
    if (d2 < g.radius * g.radius && d2 > 0) {
      const dd = Math.sqrt(d2);
      g.x = cx + (ox / dd) * g.radius;
      g.y = cy + (oy / dd) * g.radius;
    }
  }
  return d <= step + 1;
}

// Can this guard see the player right now? Returns a 0..1 visibility
// factor (0 = unseen) used to scale the detection rise.
export function visibility(g, player) {
  const dx = player.x - g.x, dy = player.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > VISION_RANGE) return 0;
  const ang = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(ang, g.facing)) > VISION_HALF_ANGLE) return 0;
  if (!hasLineOfSight(g.x, g.y, player.x, player.y)) return 0;
  // closer = easier to spot
  const closeness = 1.6 - (dist / VISION_RANGE) * 0.9; // 1.6 near, 0.7 far
  let factor = closeness;
  if (player.sneaking) factor *= 0.55;
  if (pointInShadow(player.x, player.y)) factor *= 0.5;
  if (pointInLight(player.x, player.y)) factor *= 1.4;
  return factor;
}

export function updateGuard(g, player, dt, audio, events) {
  const vis = visibility(g, player);
  const seen = vis > 0;

  // --- detection meter ---
  if (seen) {
    g.meter += 55 * vis * dt;
    g.loseSightTimer = 0;
  } else {
    g.meter -= 25 * dt;
    if (g.state === 'alarmed') g.loseSightTimer += dt;
  }
  g.meter = Math.max(0, Math.min(100, g.meter));

  // --- state transitions ---
  if (g.state !== 'alarmed' && g.meter >= 100) {
    g.state = 'alarmed';
    g.loseSightTimer = 0;
    if (audio) audio.alarm();
    if (events) events.alarm = true;
  } else if (g.state === 'alarmed' && g.loseSightTimer >= LOSE_SIGHT_TIME) {
    g.state = 'calm';
    g.meter = 0;
    g.loseSightTimer = 0;
  } else if (g.state === 'calm' && g.meter >= 45) {
    g.state = 'suspicious';
  } else if (g.state === 'suspicious' && g.meter < 20) {
    g.state = 'calm';
  }

  // --- coin distraction: a nearby guard goes to investigate ---
  if (player.coin && g.state !== 'alarmed') {
    const d = Math.hypot(player.coin.x - g.x, player.coin.y - g.y);
    if (d < 280 && g.state !== 'investigate') {
      g.state = 'investigate';
      g.investigateTarget = { x: player.coin.x, y: player.coin.y };
      g.investigateTimer = 0;
      if (events) events.investigate = g.name;
    }
  }

  // --- movement by state ---
  if (g.state === 'alarmed') {
    moveToward(g, player.x, player.y, CHASE_SPEED, dt);
  } else if (g.state === 'investigate' && g.investigateTarget) {
    const arrived = moveToward(g, g.investigateTarget.x, g.investigateTarget.y, g.patrolSpeed * 1.3, dt);
    if (arrived) {
      g.investigateTimer += dt;
      // look around while investigating
      g.facing += Math.sin(performance.now() / 300 + g.index) * 0.02;
      if (g.investigateTimer >= INVESTIGATE_TIME) {
        g.state = 'calm';
        g.investigateTarget = null;
        if (player.coin) player.coin = null;
      }
    }
  } else if (g.state === 'suspicious') {
    // stop and stare toward the player
    g.facing = Math.atan2(player.y - g.y, player.x - g.x);
  } else {
    // patrol: walk waypoints, pause briefly at each one
    if (g.pauseTimer > 0) {
      g.pauseTimer -= dt;
    } else {
      const wp = g.waypoints[g.wpIndex];
      const arrived = moveToward(g, wp[0], wp[1], g.patrolSpeed, dt);
      if (arrived) {
        g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
        g.pauseTimer = 0.8;
      }
    }
  }

  // guard footsteps, louder when the guard is close to the player
  g.stepTimer -= dt;
  if (g.stepTimer <= 0) {
    g.stepTimer = 0.42;
    const d = Math.hypot(player.x - g.x, player.y - g.y);
    if (audio && d < 320) audio.guardStep(d);
  }

  // caught? an alarmed guard touching the player ends the run
  if (g.state === 'alarmed') {
    const d = Math.hypot(player.x - g.x, player.y - g.y);
    if (d < g.radius + player.radius + 2) return 'caught';
  }
  return null;
}

export function createGuards() {
  return LEVEL.guards.map((def, i) => createGuard(def, i));
}
