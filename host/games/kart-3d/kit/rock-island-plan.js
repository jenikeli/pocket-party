// The plan of a rocky island in the bay (M9, from "Rock study" in docs/3d-findings.md): from a seed and a size,
// the kind of island, its masses of rock (each an outline stacked in strata, kit/rock-island-mass.js), its grass
// cap's shape, its beach and where its palms stand. Plain maths, seeded, unit tested in Node.
// Used by kit/rock-island.js and the shapes it builds (kit/rock-island-cliffs.js, kit/rock-island-top.js).
//
// The island's own frame: its middle at (0, 0), y = 0 the waterline, its beach (if any) toward +x. Every length
// below is a share of `size`, the island's radius at the waterline, unless it says units.

import { createRandom, between } from '../random.js';
import { buildMass } from './rock-island-mass.js';

// The kinds of island the study found in bays, picked by the seed (seed 1 a stack, 2 a mesa, 3 karst, and round
// again): a tall sea stack with smaller stacks beside it, a flat-topped mesa with a beach and a stack off it, or
// karst peaks huddled together with a small beach.
const KINDS = ['karst', 'stack', 'mesa'];
// Each mass: where its middle is ({ angle, distance } from the island's middle), its radius and height, how much
// it narrows toward its top (`taper`) and how high its grass domes (`dome`).
const MASSES = {
  stack: [
    { distance: 0, radius: 0.48, height: 1.35, taper: 0.12, dome: 0.05 },
    { distance: 0.82, radius: 0.2, height: 0.95, taper: 0.1, dome: 0.03 },
    { distance: 0.86, radius: 0.15, height: 0.55, taper: 0.15, dome: 0.03 },
  ],
  mesa: [
    { distance: 0, radius: 0.78, height: 0.5, taper: 0.08, dome: 0.05 },
    { distance: 1.02, radius: 0.16, height: 0.42, taper: 0.1, dome: 0.03 },
  ],
  karst: [
    { distance: 0.1, radius: 0.46, height: 1.2, taper: 0.3, dome: 0.3 },
    { distance: 0.4, radius: 0.34, height: 0.9, taper: 0.28, dome: 0.24 },
    { distance: 0.44, radius: 0.28, height: 0.6, taper: 0.25, dome: 0.18 },
  ],
};
// Which kinds have a beach (on the first mass, toward +x), and over how wide an arc (radians).
const BEACH_ARC = { stack: 0, mesa: 1.5, karst: 1.1 };
const PALMS = { stack: 2, mesa: 4, karst: 3 };
// The beach's rows: how far out from the rock's foot (units, at a beach's middle; it narrows toward the arc's ends)
// and how high. Its waterline is where it crosses y = 0, BEACH_WATERLINE out.
export const BEACH_ROWS = [[-1, 1.1], [1, 0.9], [3.5, 0.6], [6, 0.25], [8.5, -0.25], [11, -0.9]];
export const BEACH_WATERLINE = 7.25;

// Returns { kind, size, masses, beach, palms }:
//   masses  each mass's outline and strata (kit/rock-island-mass.js)
//   beach   null, or { mass: 0, corners: [first, last], widthAt(corner) (0 to 1) }
//   palms   [{ mass, corner, share, turn, size }]: palms on a cap (`share` of the way from its middle to its
//           rim, at `corner`'s angle) or, with `beach: out`, on the beach that far out from the rock's foot
export function planRockIsland({ seed, size }) {
  const random = createRandom(seed * 7919 + 17);
  const kind = KINDS[seed % KINDS.length];
  const masses = MASSES[kind].map((mass, index) => buildMass(mass, index, size, random));
  const beach = BEACH_ARC[kind] > 0 ? planBeach(masses[0], BEACH_ARC[kind]) : null;
  return { kind, size, masses, beach, palms: planPalms(kind, masses, beach, random) };
}

// The beach lies along the first mass's corners within `arc` of +x, widest in its middle.
function planBeach(mass, arc) {
  const points = mass.tiers[1].bottom.points;
  const angles = points.map(([x, z]) => Math.atan2(z - mass.z, x - mass.x));
  const inArc = angles.map((angle, corner) => (Math.abs(angle) < arc / 2 ? corner : null)).filter((corner) => corner !== null);
  // The corners turn from +x toward +z, so the arc wraps round the first corner: it starts at the last ones.
  const ordered = [...inArc.filter((corner) => angles[corner] < 0), ...inArc.filter((corner) => angles[corner] >= 0)];
  const widthAt = (corner) => Math.sin(Math.PI * Math.min(Math.max(0.5 + angles[corner] / arc, 0), 1)) ** 0.7;
  return { mass: 0, corners: ordered, widthAt };
}

// Palms on the caps' grass, the inner part (not on the lip), and on the beach if there is one.
// A beach palm stands at one of the beach's inner corners. A small island's beach has only its two end corners
// (seed 6 at size 12), so then an end corner has to do.
function beachPalmCorners(beach) {
  const inner = beach.corners.slice(1, -1);
  return inner.length > 0 ? inner : beach.corners;
}

function planPalms(kind, masses, beach, random) {
  return Array.from({ length: PALMS[kind] }, (_, index) => {
    const onBeach = beach && index % 2 === 1;
    const mass = onBeach ? 0 : index % Math.min(masses.length, 2);
    const corners = onBeach ? beachPalmCorners(beach) : masses[mass].tiers[0].top.points.map((_, corner) => corner);
    const corner = corners[Math.floor(random() * corners.length)];
    const spot = onBeach ? { beach: between(random, 2.5, 4.5) } : { share: between(random, 0.2, 0.62) };
    return { mass, corner, ...spot, turn: random() * 2 * Math.PI, size: between(random, 0.9, 1.2) };
  });
}

// The grass cap's mat stands this thick over the rock's top (a share of the mass's radius, within units).
const LIP = [0.07, 0.35, 1.1];

// How thick a mass's grass mat is at its rim (units).
export function capLip(mass) {
  return Math.min(Math.max(mass.radius * LIP[0], LIP[1]), LIP[2]);
}

// A point of a mass's grass cap, `share` of the way from its middle (0) to its rim (1) toward `corner`, as
// [x, y, z]: the mat's top domes up toward the middle, with low hummocks.
export function capPoint(mass, corner, share) {
  const top = mass.tiers.at(-1).top;
  const [middleX, middleZ] = middleOf(top.points);
  const [rimX, rimZ] = top.points[corner];
  const hummock = 0.25 * capLip(mass) * Math.sin(corner * 1.7 + share * 5) * share * (1 - share) * 4;
  const y = top.y + capLip(mass) + mass.dome * (1 - share * share) + hummock;
  return [middleX + (rimX - middleX) * share, y, middleZ + (rimZ - middleZ) * share];
}

export function middleOf(points) {
  const sum = points.reduce(([x, z], point) => [x + point[0], z + point[1]], [0, 0]);
  return [sum[0] / points.length, sum[1] / points.length];
}

// A point of the beach `out` units past the rock's foot at `corner`, as [x, y, z]; its height follows BEACH_ROWS.
export function beachPoint(island, corner, out) {
  const mass = island.masses[island.beach.mass];
  const [footX, footZ] = mass.tiers[1].bottom.points[corner];
  const [awayX, awayZ] = [footX - mass.x, footZ - mass.z];
  const length = Math.hypot(awayX, awayZ);
  const width = island.beach.widthAt(corner) * Math.min(Math.max(island.size / 20, 0.6), 1.4);
  const reach = out * width;
  return [footX + (awayX / length) * reach, beachHeightAt(out), footZ + (awayZ / length) * reach];
}

// The beach's height `out` units past the foot, along BEACH_ROWS.
function beachHeightAt(out) {
  const next = BEACH_ROWS.findIndex(([rowOut]) => rowOut >= out);
  if (next <= 0) {
    return next === 0 ? BEACH_ROWS[0][1] : BEACH_ROWS.at(-1)[1];
  }
  const [[fromOut, fromY], [toOut, toY]] = [BEACH_ROWS[next - 1], BEACH_ROWS[next]];
  return fromY + ((toY - fromY) * (out - fromOut)) / (toOut - fromOut);
}
