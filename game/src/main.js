// Shadow Vault — game loop and state machine.
// Screens: title -> playing -> won | lost. P pauses, R restarts,
// M mutes. ?shot=cover|sneak|alarm|victory freezes a posed render
// for screenshots.
import { LEVEL } from './level.js';
import { createInput, moveVector } from './input.js';
import { createPlayer, updatePlayer, throwCoin, atExit } from './player.js';
import { createGuards, updateGuard } from './guard.js';
import { createAudio } from './audio.js';
import { render, drawHUD, drawTitle, drawEnd } from './render.js';
import { applyShot, resetRun } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = LEVEL.width;
canvas.height = LEVEL.height;

const input = createInput(canvas);
const audio = createAudio();

const game = {
  screen: 'title',   // title | playing | paused | won | lost
  player: createPlayer(),
  guards: createGuards(),
  relics: LEVEL.relics.map((r) => ({ ...r, taken: false })),
  elapsed: 0,
  timesDetected: 0,
  alarmLevel: 0,
  frozen: false,
  objective: 'Steal all 3 relics, then reach the green exit unseen.',
  _alarmedBefore: false,
};

function collectedCount() {
  return game.relics.filter((r) => r.taken).length;
}

function updateObjective() {
  const n = collectedCount();
  if (n < 3) {
    game.objective = `Steal the relics: ${n}/3 collected. Stay out of the yellow cones — dark floor is safe, lamplight is dangerous.`;
  } else {
    game.objective = 'All 3 relics stolen! Reach the green EXIT door to escape.';
  }
}

function startGame() {
  resetRun(game);
  game.screen = 'playing';
  audio.unlock();
  updateObjective();
}

function endGame(won, reason) {
  game.screen = won ? 'won' : 'lost';
  if (won) audio.win();
  else audio.lose();
  game.endReason = reason;
}

function update(dt) {
  if (game.screen !== 'playing' || game.frozen) return;
  game.elapsed += dt;
  const p = game.player;
  p.sneaking = input.sneak;
  updatePlayer(p, moveVector(input), dt, audio);

  // coin throw on click
  if (input.click) {
    const c = input.click;
    input.click = null;
    if (throwCoin(p, c.x, c.y)) audio.coin();
  }

  // relic pickup
  for (const r of game.relics) {
    if (!r.taken && Math.hypot(p.x - r.x, p.y - r.y) < 30) {
      r.taken = true;
      audio.pickup();
      updateObjective();
    }
  }

  // guards
  const events = {};
  let anyAlarmed = false;
  for (const g of game.guards) {
    const result = updateGuard(g, p, dt, audio, events);
    if (g.state === 'alarmed') anyAlarmed = true;
    if (result === 'caught') {
      endGame(false, `Caught by ${g.name}.`);
      return;
    }
  }
  if (anyAlarmed && !game._alarmedBefore) game.timesDetected += 1;
  game._alarmedBefore = anyAlarmed;
  game.alarmLevel = anyAlarmed ? 1 : 0;

  // win: all relics + at the exit
  if (collectedCount() === 3 && atExit(p)) {
    endGame(true, 'You slipped out with all three relics.');
    return;
  }
  // at the exit too early: nudge, don't win
  if (collectedCount() < 3 && atExit(p)) {
    game.objective = 'The exit is locked until you hold all 3 relics!';
  } else if (collectedCount() < 3) {
    updateObjective();
  }
}

function draw() {
  ctx.clearRect(0, 0, LEVEL.width, LEVEL.height);
  render(ctx, game);
  if (game.screen === 'title') {
    drawTitle(ctx);
  } else if (game.screen === 'playing' || game.screen === 'paused') {
    drawHUD(ctx, game);
    if (game.screen === 'paused') {
      ctx.save();
      ctx.fillStyle = 'rgba(5,8,18,0.6)';
      ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);
      ctx.fillStyle = '#f2f2f2';
      ctx.font = 'bold 44px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', LEVEL.width / 2, LEVEL.height / 2);
      ctx.font = '18px sans-serif';
      ctx.fillText('Press P to resume', LEVEL.width / 2, LEVEL.height / 2 + 40);
      ctx.restore();
    }
  } else if (game.screen === 'won') {
    drawHUD(ctx, game);
    const t = game.elapsed;
    const mm = Math.floor(t / 60), ss = Math.floor(t % 60);
    drawEnd(ctx, 'CLEAN GETAWAY!', [
      `All 3 relics stolen in ${mm}:${String(ss).padStart(2, '0')}.`,
      `Detected ${game.timesDetected} time${game.timesDetected === 1 ? '' : 's'}.`,
      game.endReason || '',
    ], '#2ecc71');
  } else if (game.screen === 'lost') {
    drawHUD(ctx, game);
    drawEnd(ctx, 'CAUGHT!', [
      game.endReason || 'A Night Warden grabbed you.',
      `Relics stolen: ${collectedCount()}/3.`,
    ], '#ff5040');
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  draw();
  requestAnimationFrame(frame);
}

// global keys: Enter/click start, R restart, P pause, M mute
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter') {
    if (game.screen === 'title') startGame();
  } else if (e.code === 'KeyR') {
    if (game.screen !== 'title') startGame();
  } else if (e.code === 'KeyP') {
    if (game.screen === 'playing') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'playing';
  } else if (e.code === 'KeyM') {
    audio.toggleMute();
  }
});
canvas.addEventListener('mousedown', () => {
  audio.unlock();
  if (game.screen === 'title') startGame();
});

// Auto-pause when the tab is hidden: the loop's clock stalls in a
// background tab, so pausing keeps the timer and the guards honest.
document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.screen === 'playing') game.screen = 'paused';
});

// screenshot poses: ?shot=cover|sneak|alarm|victory
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  applyShot(game, shot);
}

// debug hook: lets automated checks inspect the live game state
window.__shadowVault = game;

requestAnimationFrame(frame);
