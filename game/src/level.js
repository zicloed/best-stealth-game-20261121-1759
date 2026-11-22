// Shadow Vault — level layout.
// All coordinates are in canvas pixels (1280 x 800). Walls and crates
// block movement and line of sight. Shadow zones halve detection,
// lamp pools speed it up. Nothing here is copied from any other game.
export const LEVEL = {
  width: 1280,
  height: 800,
  wallThickness: 24,
  walls: [
    // border
    { x: 0, y: 0, w: 1280, h: 24 },
    { x: 0, y: 776, w: 1280, h: 24 },
    { x: 0, y: 0, w: 24, h: 800 },
    { x: 1256, y: 0, w: 24, h: 800 },
    // interior walls
    { x: 300, y: 80, w: 24, h: 240 },   // W1 vertical, upper left
    { x: 560, y: 480, w: 24, h: 220 },  // W2 vertical, lower middle
    { x: 820, y: 80, w: 24, h: 240 },   // W3 vertical, upper right
    { x: 480, y: 300, w: 320, h: 24 },  // W4 horizontal, middle
    { x: 980, y: 480, w: 24, h: 200 },  // W5 vertical, lower right
    { x: 180, y: 420, w: 200, h: 24 },  // W6 horizontal, left middle
  ],
  crates: [
    { x: 420, y: 150, w: 56, h: 56 },
    { x: 700, y: 180, w: 56, h: 56 },
    { x: 1000, y: 300, w: 56, h: 56 },
    { x: 380, y: 620, w: 56, h: 56 },
    { x: 700, y: 620, w: 56, h: 56 },
    { x: 1050, y: 600, w: 56, h: 56 },
    { x: 500, y: 420, w: 48, h: 48 },
    { x: 240, y: 240, w: 48, h: 48 },
    { x: 950, y: 420, w: 48, h: 48 },
    { x: 150, y: 120, w: 48, h: 48 },
    { x: 620, y: 480, w: 48, h: 48 },
    { x: 1120, y: 380, w: 48, h: 48 },
  ],
  shadows: [
    { x: 340, y: 360, w: 220, h: 120 },
    { x: 900, y: 560, w: 200, h: 120 },
    { x: 60, y: 300, w: 160, h: 140 },
    { x: 620, y: 80, w: 180, h: 100 },
    { x: 60, y: 560, w: 180, h: 140 },
  ],
  lamps: [
    { x: 640, y: 240, r: 110 },
    { x: 1080, y: 420, r: 110 },
    { x: 240, y: 700, r: 100 },
    { x: 960, y: 140, r: 100 },
  ],
  relics: [
    { id: 'idol', name: 'Moonstone Idol', x: 1150, y: 130, color: '#bfe8ff' },
    { id: 'scarab', name: 'Gilded Scarab', x: 140, y: 140, color: '#ffd75e' },
    { id: 'sapphire', name: 'Star Sapphire', x: 660, y: 700, color: '#7aa8ff' },
  ],
  exit: { x: 1180, y: 690, w: 56, h: 64 },
  playerSpawn: { x: 80, y: 720 },
  guards: [
    {
      name: 'Warden Ash', x: 420, y: 140, speed: 70,
      waypoints: [[420, 140], [760, 140], [760, 260], [420, 260]],
    },
    {
      name: 'Warden Brine', x: 420, y: 420, speed: 62,
      waypoints: [[420, 420], [760, 420], [760, 560], [420, 560]],
    },
    {
      name: 'Warden Cinder', x: 1000, y: 260, speed: 78,
      waypoints: [[1000, 260], [1140, 260], [1140, 560], [1000, 560]],
    },
  ],
};

// All rectangles that block movement and sight.
export function solidRects() {
  return [...LEVEL.walls, ...LEVEL.crates];
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function pointInShadow(px, py) {
  return LEVEL.shadows.some((s) => pointInRect(px, py, s));
}

export function pointInLight(px, py) {
  return LEVEL.lamps.some((l) => {
    const dx = px - l.x, dy = py - l.y;
    return dx * dx + dy * dy <= l.r * l.r;
  });
}

// Segment (x1,y1)-(x2,y2) vs axis-aligned rect: true if the segment
// touches or crosses the rect (Liang-Barsky clipping).
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1, dy = y2 - y1;
  let t0 = 0, t1 = 1;
  const p = [-dx, dx, -dy, dy];
  const q = [x1 - r.x, r.x + r.w - x1, y1 - r.y, r.y + r.h - y1];
  for (let i = 0; i < 4; i++) {
    if (p[i] === 0) {
      if (q[i] < 0) return false;
    } else {
      const t = q[i] / p[i];
      if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
      else { if (t < t0) return false; if (t < t1) t1 = t; }
    }
  }
  return true;
}

// True when nothing solid stands between the two points.
export function hasLineOfSight(x1, y1, x2, y2) {
  for (const r of solidRects()) {
    if (segmentHitsRect(x1, y1, x2, y2, r)) return false;
  }
  return true;
}
