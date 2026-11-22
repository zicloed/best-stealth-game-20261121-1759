// Shadow Vault — all drawing. Dark museum floor, stone walls, crates,
// glowing relics, lamps, shadow patches, guards with translucent
// yellow vision cones, and the hooded player. No images: everything
// is drawn in code.
import { LEVEL, pointInShadow } from './level.js';
import { VISION_RANGE, VISION_HALF_ANGLE } from './guard.js';

function drawCone(ctx, g) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.arc(g.x, g.y, VISION_RANGE, g.facing - VISION_HALF_ANGLE, g.facing + VISION_HALF_ANGLE);
  ctx.closePath();
  const alarmed = g.state === 'alarmed';
  ctx.fillStyle = alarmed ? 'rgba(255,60,50,0.28)' : 'rgba(255,220,80,0.20)';
  ctx.fill();
  ctx.strokeStyle = alarmed ? 'rgba(255,80,60,0.5)' : 'rgba(255,220,80,0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, g) {
  // body: red uniform with a dark belt, clearly visible on the floor
  ctx.save();
  ctx.translate(g.x, g.y);
  ctx.fillStyle = '#c0392b';
  ctx.beginPath();
  ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7b241c';
  ctx.lineWidth = 2;
  ctx.stroke();
  // helmet brim facing direction
  ctx.rotate(g.facing);
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.arc(6, 0, 8, -Math.PI / 2.4, Math.PI / 2.4);
  ctx.fill();
  ctx.fillStyle = '#f5d76e';
  ctx.beginPath();
  ctx.arc(4, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // state mark
  const mark = g.state === 'alarmed' ? '!' : g.state === 'suspicious' || g.state === 'investigate' ? '?' : null;
  if (mark) {
    ctx.save();
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = g.state === 'alarmed' ? '#ff5040' : '#ffd75e';
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 4;
    ctx.strokeText(mark, g.x, g.y - 24);
    ctx.fillText(mark, g.x, g.y - 24);
    ctx.restore();
  }
  // detection meter arc above the guard
  if (g.meter > 1) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 20, 12, -Math.PI / 2, Math.PI * 1.5);
    ctx.stroke();
    ctx.strokeStyle = g.meter >= 100 ? '#ff4030' : g.meter >= 45 ? '#ffbf30' : '#ffe97a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 20, 12, -Math.PI / 2, -Math.PI / 2 + (g.meter / 100) * Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  // hood shadow
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(2, 4, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  // hooded figure: dark teal cloak
  ctx.fillStyle = '#1f6f6b';
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0e3d3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  // hood point + face shadow in facing direction
  ctx.rotate(p.facing);
  ctx.fillStyle = '#2fa39d';
  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(2, -8);
  ctx.lineTo(2, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0b1c1a';
  ctx.beginPath();
  ctx.arc(5, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // sneak indicator: faint ring
  if (p.sneaking) {
    ctx.save();
    ctx.strokeStyle = 'rgba(120,220,255,0.55)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

export function render(ctx, game) {
  const { player, guards, relics, coin, alarmLevel } = game;
  const W = LEVEL.width, H = LEVEL.height;

  // floor: dark tiles
  ctx.fillStyle = '#14161f';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // shadow zones: darker floor, clearly safer
  for (const s of LEVEL.shadows) {
    ctx.fillStyle = 'rgba(0,0,10,0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(90,140,255,0.25)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.setLineDash([]);
  }

  // lamp pools: warm lit circles
  for (const l of LEVEL.lamps) {
    const grad = ctx.createRadialGradient(l.x, l.y, 8, l.x, l.y, l.r);
    grad.addColorStop(0, 'rgba(255,214,130,0.34)');
    grad.addColorStop(1, 'rgba(255,214,130,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd882';
    ctx.beginPath();
    ctx.arc(l.x, l.y, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // exit door: green, glowing
  const e = LEVEL.exit;
  const pulse = 0.55 + Math.sin(performance.now() / 400) * 0.2;
  ctx.fillStyle = `rgba(46,204,113,${pulse})`;
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = '#a9f5c6';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = '#062b16';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 5);

  // relics: glowing gems
  for (const r of relics) {
    if (r.taken) continue;
    const bob = Math.sin(performance.now() / 350 + r.x) * 2;
    ctx.save();
    ctx.shadowColor = r.color;
    ctx.shadowBlur = 18;
    ctx.fillStyle = r.color;
    ctx.beginPath();
    ctx.moveTo(r.x, r.y - 12 + bob);
    ctx.lineTo(r.x + 9, r.y + bob);
    ctx.lineTo(r.x, r.y + 12 + bob);
    ctx.lineTo(r.x - 9, r.y + bob);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#e8f4ff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(r.name, r.x, r.y + 30 + bob);
  }

  // walls: stone blocks
  for (const w of LEVEL.walls) {
    ctx.fillStyle = '#3a3f4d';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = '#565d70';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(w.x, w.y, w.w, 4);
  }

  // crates: wooden boxes
  for (const c of LEVEL.crates) {
    ctx.fillStyle = '#6b4a26';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = '#8a6134';
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x + 1, c.y + 1, c.w - 2, c.h - 2);
    ctx.beginPath();
    ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + c.w, c.y + c.h);
    ctx.moveTo(c.x + c.w, c.y); ctx.lineTo(c.x, c.y + c.h);
    ctx.stroke();
  }

  // thrown coin
  if (coin) {
    ctx.save();
    ctx.shadowColor = '#ffe27a';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // vision cones under the guards
  for (const g of guards) drawCone(ctx, g);
  for (const g of guards) drawGuard(ctx, g);
  drawPlayer(ctx, player);

  // red vignette while any guard is alarmed
  if (alarmLevel > 0) {
    const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    grad.addColorStop(0, 'rgba(255,0,0,0)');
    grad.addColorStop(1, `rgba(255,20,20,${0.45 * alarmLevel})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // darkness overlay hint: the player is safer in shadow
  if (pointInShadow(player.x, player.y)) {
    ctx.fillStyle = 'rgba(120,170,255,0.10)';
    ctx.fillRect(0, 0, W, H);
  }
}

// ---- overlays (DOM-free, drawn on canvas) ----
export function drawHUD(ctx, game) {
  const W = LEVEL.width;
  const H = LEVEL.height;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, 44);
  ctx.fillStyle = '#f2f2f2';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  const collected = game.relics.filter((r) => r.taken).length;
  ctx.fillText(`Relics ${collected}/3`, 16, 28);
  ctx.fillText(`Time ${formatTime(game.elapsed)}`, 150, 28);
  ctx.fillText(`Detected ${game.timesDetected}x`, 300, 28);
  // global alarm bar = highest guard meter
  const top = Math.max(0, ...game.guards.map((g) => g.meter));
  ctx.fillStyle = '#222';
  ctx.fillRect(470, 14, 220, 16);
  ctx.fillStyle = top >= 100 ? '#ff4030' : top >= 45 ? '#ffbf30' : '#ffe97a';
  ctx.fillRect(470, 14, 220 * (top / 100), 16);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(470, 14, 220, 16);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillText('ALARM', 700, 28);
  ctx.textAlign = 'right';
  ctx.font = '13px sans-serif';
  ctx.fillText('WASD move · Shift sneak · Click: throw coin · R restart · P pause · M mute', W - 16, 28);
  ctx.restore();

  // objective line
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(0, H - 30, W, 30);
  ctx.fillStyle = '#cfe3ff';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.objective, 16, H - 11);
  ctx.restore();
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function drawTitle(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,18,0.82)';
  ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f5d76e';
  ctx.font = 'bold 64px sans-serif';
  ctx.fillText('SHADOW VAULT', LEVEL.width / 2, 220);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = '20px sans-serif';
  ctx.fillText('You are Wren, a thief in a museum vault at night.', LEVEL.width / 2, 280);
  ctx.fillText('Steal the 3 relics, slip past the Night Wardens, and reach the green exit.', LEVEL.width / 2, 314);
  ctx.fillStyle = '#9fb6d8';
  ctx.font = '17px sans-serif';
  ctx.fillText('WASD / arrows — move      Shift — sneak (slower, harder to spot)', LEVEL.width / 2, 380);
  ctx.fillText('Mouse click — throw a coin to distract a guard', LEVEL.width / 2, 410);
  ctx.fillText('Dark floor is safe. Lamplight is dangerous. R restart · P pause · M mute', LEVEL.width / 2, 440);
  ctx.fillStyle = '#2ecc71';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Press Enter or click to begin', LEVEL.width / 2, 520);
  ctx.restore();
}

export function drawEnd(ctx, title, lines, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(5,8,18,0.85)';
  ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText(title, LEVEL.width / 2, 300);
  ctx.fillStyle = '#e8ecf5';
  ctx.font = '20px sans-serif';
  lines.forEach((l, i) => ctx.fillText(l, LEVEL.width / 2, 360 + i * 34));
  ctx.fillStyle = '#9fb6d8';
  ctx.font = '17px sans-serif';
  ctx.fillText('Press R to play again', LEVEL.width / 2, 360 + lines.length * 34 + 30);
  ctx.restore();
}
