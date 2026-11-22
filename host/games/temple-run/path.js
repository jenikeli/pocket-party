// The corridor's shape in the world: a straight road with rounded 90-degree corners where track.js says. Turns a
// distance along the corridor (the rules' z) into a world position and heading. Used by the renderer; pure maths,
// so Node unit tests can load it.
//
// World axes: heading 0 faces -Z, and a heading h faces (sin h, -cos h) in (x, z). Right of it is (cos h, sin h).
// A right turn adds 90 degrees to the heading, a left turn takes them off.

import { ensureCorners } from './track.js';

export const ARC_RADIUS = 6;
export const ARC_LENGTH = (Math.PI / 2) * ARC_RADIUS;
// World metres between lane centres.
export const LANE_WIDTH = 2.2;

// Each corner's arc: where it starts in the world and with what heading, and where it ends. Kept for the latest seed.
let arcCache = { seed: null, arcs: [] };

const rightOf = (heading) => ({ x: Math.cos(heading), z: Math.sin(heading) });
const forwardOf = (heading) => ({ x: Math.sin(heading), z: -Math.cos(heading) });

function pointOnArc(arc, distance) {
  const sign = arc.dir === 'right' ? 1 : -1;
  const turned = Math.min(distance, ARC_LENGTH) / ARC_RADIUS;
  const start = rightOf(arc.heading);
  const heading = arc.heading + sign * turned;
  const now = rightOf(heading);
  const centerX = arc.x + sign * ARC_RADIUS * start.x;
  const centerZ = arc.z + sign * ARC_RADIUS * start.z;
  return { x: centerX - sign * ARC_RADIUS * now.x, z: centerZ - sign * ARC_RADIUS * now.z, heading };
}

function buildArcs(seed, upToDistance) {
  if (arcCache.seed !== seed) {
    arcCache = { seed, arcs: [] };
  }
  const { arcs } = arcCache;
  const corners = ensureCorners(seed, upToDistance + 400);
  for (let index = arcs.length; index < corners.length; index += 1) {
    const previous = arcs[index - 1];
    let state = { x: 0, z: 0, heading: 0, distance: 0 };
    if (previous) {
      const end = pointOnArc(previous, ARC_LENGTH);
      state = { ...end, distance: previous.z0 + ARC_LENGTH };
    }
    const forward = forwardOf(state.heading);
    const straight = corners[index].z - state.distance;
    arcs.push({
      z0: corners[index].z,
      dir: corners[index].dir,
      x: state.x + forward.x * straight,
      z: state.z + forward.z * straight,
      heading: state.heading,
    });
  }
  return arcs;
}

// The point `distance` along the corridor's middle, moved `offset` metres to its right: { x, z, heading }.
export function pathPoint(seed, distance, offset = 0) {
  const arcs = buildArcs(seed, distance);
  let low = -1;
  let high = arcs.length - 1;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (arcs[mid].z0 <= distance) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }
  let point;
  if (low < 0) {
    point = { x: 0, z: -distance, heading: 0 };
  } else {
    const arc = arcs[low];
    const along = distance - arc.z0;
    point = pointOnArc(arc, along);
    if (along > ARC_LENGTH) {
      const forward = forwardOf(point.heading);
      point = { x: point.x + forward.x * (along - ARC_LENGTH), z: point.z + forward.z * (along - ARC_LENGTH), heading: point.heading };
    }
  }
  const right = rightOf(point.heading);
  return { x: point.x + right.x * offset, z: point.z + right.z * offset, heading: point.heading };
}

// How far back from the start the first straight stretch begins, so the camera never sees the road end.
const LEAD_IN = 80;

// The straight stretches of the corridor, for drawing. Each runs along one heading from the previous corner's sharp
// apex (the point where the two straights would meet; players cut inside it along the rounded arc) to the next
// apex: { heading, startX, startZ, endX, endZ, z0, z1, turn }. z0 and z1 are the rules' distances it spans, a little
// generously, and `turn` is the direction the corridor turns at its end. Covers at least `upToDistance`.
export function straightSegments(seed, upToDistance) {
  const arcs = buildArcs(seed, upToDistance);
  const segments = [];
  let start = { x: 0, z: LEAD_IN };
  let from = -LEAD_IN;
  for (const arc of arcs) {
    const forward = forwardOf(arc.heading);
    const apex = { x: arc.x + forward.x * ARC_RADIUS, z: arc.z + forward.z * ARC_RADIUS };
    segments.push({ heading: arc.heading, startX: start.x, startZ: start.z, endX: apex.x, endZ: apex.z, z0: from, z1: arc.z0 + ARC_LENGTH, turn: arc.dir });
    start = apex;
    from = arc.z0;
  }
  return segments;
}
