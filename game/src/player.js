// Shadow Vault — the player: Wren, a hooded thief.
// Movement is a circle (radius 14) sliding against solid rects.
import { LEVEL, solidRects, pointInRect } from './level.js';

export const PLAYER_RADIUS = 14;
export const WALK_SPEED = 170;
export const SNEAK_SPEED = 95;

export function createPlayer() {
  return {
    x: LEVEL.playerSpawn.x,
    y: LEVEL.playerSpawn.y,
    radius: PLAYER_RADIUS,
    facing: 0,          // radians, for the hood direction
    moving: false,
    sneaking: false,
    stepTimer: 0,       // drives footstep sounds
    coin: null,         // {x, y, ttl} active thrown coin
    coinCooldown: 0,
  };
}

// Resolve circle-vs-rect overlap by pushing the circle out along the
// smallest penetration axis. Returns true when a push happened.
function pushOutOfRect(p, r) {
  const cx = Math.max(r.x, Math.min(p.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(p.y, r.y + r.h));
  const dx = p.x - cx, dy = p.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= p.radius * p.radius) return false;
  if (d2 === 0) {
    // centre inside the rect: push out through the nearest edge
    const left = p.x - r.x, right = r.x + r.w - p.x;
    const top = p.y - r.y, bottom = r.y + r.h - p.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) p.x = r.x - p.radius;
    else if (m === right) p.x = r.x + r.w + p.radius;
    else if (m === top) p.y = r.y - p.radius;
    else p.y = r.y + r.h + p.radius;
    return true;
  }
  const d = Math.sqrt(d2);
  p.x = cx + (dx / d) * p.radius;
  p.y = cy + (dy / d) * p.radius;
  return true;
}

export function updatePlayer(p, vec, dt, audio) {
  p.coinCooldown = Math.max(0, p.coinCooldown - dt);
  if (p.coin) {
    p.coin.ttl -= dt;
    if (p.coin.ttl <= 0) p.coin = null;
  }
  const speed = p.sneaking ? SNEAK_SPEED : WALK_SPEED;
  p.moving = !!vec;
  if (vec) {
    p.x += vec.x * speed * dt;
    p.y += vec.y * speed * dt;
    p.facing = Math.atan2(vec.y, vec.x);
    // keep inside the arena
    p.x = Math.max(LEVEL.wallThickness + p.radius, Math.min(LEVEL.width - LEVEL.wallThickness - p.radius, p.x));
    p.y = Math.max(LEVEL.wallThickness + p.radius, Math.min(LEVEL.height - LEVEL.wallThickness - p.radius, p.y));
    for (const r of solidRects()) pushOutOfRect(p, r);
    // footstep ticks: slower + softer while sneaking
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      p.stepTimer = p.sneaking ? 0.55 : 0.34;
      if (audio) audio.footstep(p.sneaking);
    }
  }
}

// Throw a coin toward (tx, ty), capped at range 280. Returns true
// when a coin was actually thrown.
export function throwCoin(p, tx, ty) {
  if (p.coin || p.coinCooldown > 0) return false;
  const dx = tx - p.x, dy = ty - p.y;
  const d = Math.hypot(dx, dy);
  const range = Math.min(d, 280);
  const nx = d === 0 ? 0 : dx / d, ny = d === 0 ? 0 : dy / d;
  p.coin = { x: p.x + nx * range, y: p.y + ny * range, ttl: 7 };
  p.coinCooldown = 2;
  return true;
}

// True when the player stands inside the exit doorway.
export function atExit(p) {
  const e = LEVEL.exit;
  return pointInRect(p.x, p.y, { x: e.x - 6, y: e.y - 6, w: e.w + 12, h: e.h + 12 });
}
