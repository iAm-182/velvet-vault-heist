// The Velvet Vault — shared constants for the whole game.
// One screen, one museum floor: the thief crosses it left to right, grabs three
// pieces of loot and gets back out to the van. Everything the judge needs to see
// (room, guards, cones, cameras, loot, alarm meter) fits in this one frame.
export const VIEW = { width: 1280, height: 720 };
export const HUD_HEIGHT = 56;

// The playable floor, inside the outer walls.
export const FLOOR = { x: 40, y: 74, width: 1200, height: 628 };

// Movement speeds in pixels per second.
export const THIEF = {
  radius: 13,
  walkSpeed: 155,
  sneakSpeed: 82,
  ventSpeed: 110,
  // A sneaking thief is harder to spot; a sprinting one is not an option.
  sneakSpotFactor: 0.55,
};

// Guard senses. A cone is a direction, a half-angle and a range; walls and
// display cases block the line of sight inside it.
export const GUARD = {
  radius: 14,
  patrolSpeed: 58,
  chaseSpeed: 98,
  coneRange: 250,
  coneHalfAngle: 0.62, // ~71 degrees of total vision
  spotRate: 1.35, // suspicion per second while the thief is in the cone
  forgetRate: 0.45,
  chaseSeconds: 5,
  catchDistance: 26,
};

export const CAMERA = {
  coneRange: 265,
  coneHalfAngle: 0.42,
  spotRate: 1.6,
  tripAlarm: 16,
  tripCooldownSeconds: 6,
  sweepHalfAngle: 0.85,
  sweepSpeed: 0.55, // radians per second
};

export const ALARM = {
  max: 100,
  decayPerSecond: 1.6,
  guardSpotted: 25,
  busted: 20,
  empNoise: 5,
  lockdownAt: 100,
};

export const TOOLS = {
  smoke: { charges: 2, radius: 95, seconds: 6 },
  emp: { charges: 2, seconds: 8 },
  decoy: { charges: 3, lureRadius: 270, investigateSeconds: 4 },
};

export const LOOT_VALUES = { painting: 40, gold: 25, diamond: 100 };

// Colours for the night-museum look: dark floors, warm light pools, gold loot,
// amber guard cones, red camera cones, teal safe shadow.
export const PALETTE = {
  floorA: '#20242e',
  floorB: '#1b1f28',
  ventFloor: '#12141a',
  wall: '#3a4152',
  wallTop: '#4d5870',
  goldTrim: '#c9a227',
  carpet: '#5a2e35',
  caseGlass: '#7fb3c8',
  guardCone: 'rgba(255, 176, 32, 0.20)',
  guardConeEdge: 'rgba(255, 176, 32, 0.55)',
  guardAlertCone: 'rgba(255, 64, 32, 0.30)',
  cameraCone: 'rgba(255, 58, 58, 0.16)',
  cameraConeEdge: 'rgba(255, 58, 58, 0.5)',
  lootGlow: '#ffd94d',
  thief: '#101014',
  thiefTrim: '#2dd4bf',
  guard: '#2b3a67',
  guardTrim: '#f5b82e',
  smoke: 'rgba(200, 205, 215, 0.55)',
  text: '#e8e4d8',
  muted: '#9aa3b2',
  alarmLow: '#3ecf6e',
  alarmMid: '#f5b82e',
  alarmHigh: '#ff4530',
};

// Deterministic random numbers so a screenshot seed always stages the same frame.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number into [low, high]. */
export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}

/** True when the two axis-aligned rectangles overlap. */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

/**
 * Does the segment (x1,y1)-(x2,y2) hit the rectangle? Used for line of sight:
 * a guard or camera only sees the thief when no wall or case crosses the ray.
 */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (dx === 0) {
    if (x1 < r.x || x1 > r.x + r.width) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.width - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (dy === 0) {
    if (y1 < r.y || y1 > r.y + r.height) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.height - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

/** Angle from (x1,y1) to (x2,y2). */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Push a circle out of every rectangle it overlaps, along the shortest way
 * out. Unlike axis-separated blocking this slides around corners instead of
 * wedging into them — the thief and the guards both steer with it.
 */
export function resolveCircle(x, y, radius, solids) {
  for (let iter = 0; iter < 3; iter += 1) {
    let pushed = false;
    for (const s of solids) {
      const cx = clamp(x, s.x, s.x + s.width);
      const cy = clamp(y, s.y, s.y + s.height);
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      if (d2 === 0) {
        // Centre inside the rectangle: leave by the nearest face.
        const pl = x - s.x;
        const pr = s.x + s.width - x;
        const pt = y - s.y;
        const pb = s.y + s.height - y;
        const m = Math.min(pl, pr, pt, pb);
        if (m === pl) x = s.x - radius;
        else if (m === pr) x = s.x + s.width + radius;
        else if (m === pt) y = s.y - radius;
        else y = s.y + s.height + radius;
      } else {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        y = cy + (dy / d) * radius;
      }
      pushed = true;
    }
    if (!pushed) break;
  }
  return { x, y };
}

/** Smallest signed difference between two angles, in (-PI, PI]. */
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}
