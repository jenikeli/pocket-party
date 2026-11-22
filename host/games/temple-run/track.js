// The endless corridor for the temple run, all made from a seed so the rules and the renderer always agree and
// nothing is stored: obstacle rows, coin trails and powerups between them, and the corners where the corridor
// turns 90 degrees. Used by rules.js, views.js, path.js and the renderer (relative imports only, so Node unit
// tests can load it).

export const LANE_COUNT = 3;
export const ROW_GAP = 14;
const FIRST_ROW_Z = 40;
// Pickups sit this far past an obstacle row, in the gap before the next.
const PICKUP_OFFSET = 7;

// low: jump over. high: slide under. wall: change lane.
// The hazards: fire jets that flare on a cycle (jump them, or time them), a missing tile (jump the gap), and a
// tile that shakes when a player is near and then falls away.
export const OBSTACLE = Object.freeze({ LOW: 'low', HIGH: 'high', WALL: 'wall', FIRE: 'fire', GAP: 'gap', TILE: 'tile' });
const HAZARD_TYPES = [OBSTACLE.LOW, OBSTACLE.HIGH, OBSTACLE.FIRE, OBSTACLE.GAP, OBSTACLE.TILE];

// A falling tile starts to fall when a player is this close, and is gone this long after.
export const TILE_TRIGGER_DISTANCE = 11;
export const TILE_FALL_DELAY = 0.5;

// Whether the fire jet at distance z burns at round time `time`. Each jet has its own phase, so they flare apart.
export function fireIsOn(time, z) {
  return (time + z * 0.37) % 2.4 < 1.3;
}

export const obstacleId = (obstacle) => `o${obstacle.z}:${obstacle.lane}`;
export const PICKUP = Object.freeze({ COIN: 'coin', MAGNET: 'magnet', SHIELD: 'shield', BOOST: 'boost' });
const POWERUPS = [PICKUP.MAGNET, PICKUP.SHIELD, PICKUP.BOOST];

// A swipe toward the corner's direction, from TURN_BEFORE units ahead of its start to TURN_AFTER past it, turns.
// Not turning in time is a crash.
export const TURN_BEFORE = 16;
export const TURN_AFTER = 3;
// Nothing is placed from this far before a corner to this far after it, so the turn is clear.
const CLEAR_BEFORE = 26;
const CLEAR_AFTER = 16;

// A small seeded random generator (mulberry32), started fresh for each use.
function makeRandom(seed, key) {
  let state = (seed ^ Math.imul(key + 1, 0x9e3779b1)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Corners, made on demand and kept for the latest seed: [{ z, dir }] where z is the distance along the corridor
// where the turn starts.
let cornerCache = { seed: null, list: [] };

export function ensureCorners(seed, upToZ) {
  if (cornerCache.seed !== seed) {
    cornerCache = { seed, list: [] };
  }
  const { list } = cornerCache;
  while (list.length === 0 || list.at(-1).z < upToZ) {
    const index = list.length;
    const length = 110 + Math.floor(makeRandom(seed, 100000 + index)() * 60);
    const dir = makeRandom(seed, 200000 + index)() < 0.5 ? 'left' : 'right';
    list.push({ z: (list.at(-1)?.z ?? 0) + length, dir });
  }
  return list;
}

export function cornerAt(seed, index) {
  const list = ensureCorners(seed, 0);
  while (list.length <= index) {
    ensureCorners(seed, list.at(-1).z + 1);
  }
  return list[index];
}

// The first corner a player at distance z has not yet finished (its window has not ended).
export function nextCornerIndex(seed, z) {
  let index = 0;
  while (cornerAt(seed, index).z + TURN_AFTER <= z) {
    index += 1;
  }
  return index;
}

function nearCorner(seed, z) {
  return ensureCorners(seed, z + 200).some((corner) => z >= corner.z - CLEAR_BEFORE && z <= corner.z + CLEAR_AFTER);
}

// The obstacles in one row: at most one wall, so some lane always lets a player through with a jump or slide.
// `hazards` false keeps only logs, beams and walls.
export function rowObstacles(seed, row, hazards = true) {
  const z = FIRST_ROW_Z + row * ROW_GAP;
  if (nearCorner(seed, z)) {
    return [];
  }
  const random = makeRandom(seed, row);
  const wallLane = random() < 0.5 ? Math.floor(random() * LANE_COUNT) : -1;
  const obstacles = [];
  for (let lane = 0; lane < LANE_COUNT; lane += 1) {
    if (lane === wallLane) {
      obstacles.push({ lane, z, type: OBSTACLE.WALL });
    } else if (random() < 0.4) {
      const pick = random();
      const type = hazards ? HAZARD_TYPES[Math.floor(pick * HAZARD_TYPES.length)] : pick < 0.5 ? OBSTACLE.LOW : OBSTACLE.HIGH;
      obstacles.push({ lane, z, type });
    }
  }
  return obstacles;
}

// Every obstacle with fromZ <= z <= toZ.
export function obstaclesBetween(seed, fromZ, toZ, hazards = true) {
  const firstRow = Math.max(0, Math.ceil((fromZ - FIRST_ROW_Z) / ROW_GAP));
  const lastRow = Math.floor((toZ - FIRST_ROW_Z) / ROW_GAP);
  const found = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    found.push(...rowObstacles(seed, row, hazards));
  }
  return found;
}

// What lies in the gap after one obstacle row: a trail of five coins in one lane, or a powerup, or nothing.
// Every pickup has an id, so the round can remember which were taken.
export function rowPickups(seed, row) {
  const z = FIRST_ROW_Z + row * ROW_GAP + PICKUP_OFFSET;
  if (nearCorner(seed, z)) {
    return [];
  }
  const random = makeRandom(seed, 50000 + row);
  const roll = random();
  const lane = Math.floor(random() * LANE_COUNT);
  if (roll < 0.55) {
    return [-2, -1, 0, 1, 2].map((step) => ({ id: `c${row}:${step}`, kind: PICKUP.COIN, lane, z: z + step * 2 }));
  }
  if (roll < 0.67) {
    return [{ id: `p${row}`, kind: POWERUPS[Math.floor(random() * POWERUPS.length)], lane, z }];
  }
  return [];
}

// Every pickup with fromZ <= z <= toZ.
export function pickupsBetween(seed, fromZ, toZ) {
  const firstRow = Math.max(0, Math.ceil((fromZ - PICKUP_OFFSET - 4 - FIRST_ROW_Z) / ROW_GAP));
  const lastRow = Math.floor((toZ - PICKUP_OFFSET + 4 - FIRST_ROW_Z) / ROW_GAP);
  const found = [];
  for (let row = firstRow; row <= lastRow; row += 1) {
    found.push(...rowPickups(seed, row).filter((pickup) => pickup.z >= fromZ && pickup.z <= toZ));
  }
  return found;
}
