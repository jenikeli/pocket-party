// The M6a spike's road: a closed loop on flat ground with one hill, as plain maths (no Three.js, no DOM), so it
// runs in Node for the unit tests. Used by kart-paths.js and the scene builder. Throwaway: M6b writes the real
// track model.

export const ROAD_HALF_WIDTH = 7;
const LOOP_RADIUS_X = 140;
const LOOP_RADIUS_Z = 90;
const HILL_HEIGHT = 12;
// The hill is centred a quarter of the way round and is about a sixth of the lap long.
const HILL_CENTRE = 0.25;
const HILL_SPREAD = 0.06;
const STEP = 1e-4;

// `u` is how far round the loop, 0..1 (any number works: it wraps). Returns { x, y, z } in world units.
export function roadPoint(u) {
  const angle = 2 * Math.PI * u;
  return {
    x: LOOP_RADIUS_X * Math.cos(angle),
    y: hillHeight(u),
    z: LOOP_RADIUS_Z * Math.sin(angle) + 30 * Math.sin(2 * angle),
  };
}

function hillHeight(u) {
  const fromCentre = wrapHalf(u - HILL_CENTRE);
  return HILL_HEIGHT * Math.exp(-((fromCentre / HILL_SPREAD) ** 2));
}

// -0.5..0.5: the shortest way round from 0.
function wrapHalf(u) {
  return u - Math.round(u);
}

// The road at `u`: its point, the unit direction of travel (3D, so it tilts up the hill) and the unit sideways
// direction to the driver's right (horizontal). `unitsPerU` says how far the road moves when u grows by 1 at
// this point; karts divide their speed by it, because u does not grow evenly along the loop.
export function roadFrame(u) {
  const before = roadPoint(u - STEP);
  const after = roadPoint(u + STEP);
  const delta = { x: after.x - before.x, y: after.y - before.y, z: after.z - before.z };
  const length = Math.hypot(delta.x, delta.y, delta.z);
  const forward = { x: delta.x / length, y: delta.y / length, z: delta.z / length };
  const flatLength = Math.hypot(forward.x, forward.z);
  // Right of the direction of travel with +y up: forward rotated a quarter turn clockwise seen from above.
  const side = { x: -forward.z / flatLength, y: 0, z: forward.x / flatLength };
  return { point: roadPoint(u), forward, side, unitsPerU: length / (2 * STEP) };
}

// The flat distance from (x, z) to the nearest point of the centre line, found by sampling the loop. Slow, so
// only for placing scenery once.
export function distanceFromCentreLine(x, z, samples = 600) {
  let nearest = Infinity;
  for (let i = 0; i < samples; i += 1) {
    const point = roadPoint(i / samples);
    nearest = Math.min(nearest, Math.hypot(point.x - x, point.z - z));
  }
  return nearest;
}

// The point `offset` road half-widths to the right of the centre line (negative is left).
export function pointBeside(frame, offset) {
  return {
    x: frame.point.x + frame.side.x * offset * ROAD_HALF_WIDTH,
    y: frame.point.y,
    z: frame.point.z + frame.side.z * offset * ROAD_HALF_WIDTH,
  };
}
