// Shadow Vault — screenshot poses. Each pose sets up a deterministic
// game state and renders the real game; nothing is faked or drawn
// separately. Used by ?shot=cover|sneak|alarm|victory.
import { LEVEL } from './level.js';

export const SHOTS = ['cover', 'sneak', 'alarm', 'victory'];

// place the player and guards for a pose; returns the screen to show
export function applyShot(game, name) {
  const g = game;
  g.frozen = true; // poses do not advance gameplay
  if (name === 'cover') {
    // attract state: full level, guards patrolling, cones on
    g.screen = 'title';
    resetRun(g);
    return;
  }
  if (name === 'sneak') {
    g.screen = 'playing';
    resetRun(g);
    // Wren crouched behind the crate at (420,150); a guard's cone
    // sweeps just past the crate edge
    g.player.x = 470; g.player.y = 215;
    g.player.sneaking = true;
    g.player.facing = -Math.PI / 2;
    const w = g.guards[0];
    w.x = 430; w.y = 130; w.facing = 0.5; w.state = 'calm'; w.meter = 30;
    g.guards[1].x = 500; g.guards[1].y = 480; g.guards[1].facing = 1.2;
    return;
  }
  if (name === 'alarm') {
    g.screen = 'playing';
    resetRun(g);
    // guard alarmed and closing in, meter full, red vignette
    g.player.x = 640; g.player.y = 380;
    const w = g.guards[1];
    w.x = 640; w.y = 300; w.facing = Math.PI / 2;
    w.state = 'alarmed'; w.meter = 100; w.loseSightTimer = 0;
    g.timesDetected = 1;
    g.alarmLevel = 1; // red vignette on in the frozen pose
    return;
  }
  if (name === 'victory') {
    g.screen = 'won';
    resetRun(g);
    g.relics.forEach((r) => { r.taken = true; });
    g.player.x = LEVEL.exit.x + 28;
    g.player.y = LEVEL.exit.y + 32;
    g.elapsed = 187;
    g.timesDetected = 2;
    return;
  }
}

// reset the run to its initial state without touching the screen
export function resetRun(g) {
  g.player.x = LEVEL.playerSpawn.x;
  g.player.y = LEVEL.playerSpawn.y;
  g.player.facing = 0;
  g.player.coin = null;
  g.player.coinCooldown = 0;
  g.player.sneaking = false;
  g.relics.forEach((r) => { r.taken = false; });
  g.elapsed = 0;
  g.timesDetected = 0;
  g.alarmLevel = 0;
  g.guards.forEach((gd, i) => {
    const def = LEVEL.guards[i];
    gd.x = def.x; gd.y = def.y;
    gd.state = 'calm'; gd.meter = 0;
    gd.wpIndex = 1; gd.loseSightTimer = 0;
    gd.investigateTarget = null; gd.investigateTimer = 0;
    gd.facing = 0;
  });
}
