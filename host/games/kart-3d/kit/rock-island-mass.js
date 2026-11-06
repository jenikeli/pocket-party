// One mass of rock of a rocky island (M9, from "M9: rock study" in docs/3d-findings.md): its outline and its
// strata, from below the water to its top, as rings of corners. The outline's corners stand far apart, so its walls
// are long flat faces: two slow waves round it make headlands and bays, jitter roughens it, a few corners pulled well
// in are clefts down a joint, and a corner between each two breaks each face at a joint. Most strata stand flush
// with the one below; some are set back (a ledge) or stand out (an overhang). Plain maths, seeded. Used by
// kit/rock-island-plan.js.

import { between } from '../random.js';

// The rock goes on below the water this far (units), under the shallows.
const ROCK_FOOT = -2.5;
// The notch the waves wear in at the waterline: up to this high (units) and this deep (units, at most a share of
// the mass's radius).
const NOTCH_TOP = 0.9;
const NOTCH_DEPTH = 1.1;
// A corner of an outline every this many units round a mass; a cleft pulls its corner in to this share. Strata
// about this thick (units, at least and at most), and this share of them set back or out from the one below.
const CORNER_SPACING = 4.2;
const CLEFT = 0.78;
const STRATUM = [1.3, 3.2];
const STEPPED = 0.4;
// Of the stepped strata, this share is set back (the others overhang).
const LEDGES = 0.65;

// `spec` is one of kit/rock-island-plan.js's MASSES (shares of `size`), `index` its place in the island's list.
// Returns { x, z, radius, height (units), dome (units), tiers: [{ bottom, top, tone }] }, each ring { y, points:
// [[x, z], ...] } (the same number of corners in every ring, turning from +x toward +z); tier 0 is the notch.
export function buildMass({ distance, radius, height, taper, dome }, index, size, random) {
  // The others stand round the far side from the beach (+x), one on each side of -x, so they keep apart.
  const angle = Math.PI * [0, 0.55, 1.1][index] + Math.PI * 0.35 * random();
  const [x, z] = [Math.cos(angle) * distance * size, Math.sin(angle) * distance * size];
  const radiusUnits = radius * size * between(random, 0.9, 1.1);
  const heightUnits = height * size * between(random, 0.9, 1.1);
  const shape = { x, z, radius: radiusUnits, height: heightUnits, taper, corners: outlineCorners(radiusUnits, random) };
  return { x, z, radius: radiusUnits, height: heightUnits, dome: dome * size, tiers: stackStrata(shape, random) };
}

// The outline's corners, { angle, out } (out a share of the radius), a main corner every CORNER_SPACING units and
// one between each two, a little in or out of the line between them: each long face breaks into two planes at a
// joint, the finer of the walls' two scales.
function outlineCorners(radius, random) {
  const count = Math.max(7, Math.min(28, Math.round((2 * Math.PI * radius) / CORNER_SPACING)));
  const phases = [random() * 6.3, random() * 6.3];
  const clefts = new Set(Array.from({ length: 1 + Math.floor(random() * 3) }, () => Math.floor(random() * count)));
  const main = Array.from({ length: count }, (_, corner) => {
    const at = ((corner + between(random, -0.25, 0.25)) / count) * 2 * Math.PI;
    const wave = 0.13 * Math.sin(2 * at + phases[0]) + 0.08 * Math.sin(3 * at + phases[1]);
    return { angle: at, out: (1 + wave + between(random, -0.1, 0.1)) * (clefts.has(corner) ? CLEFT : 1) };
  });
  return main.flatMap((corner, index) => {
    const next = main[(index + 1) % count];
    const angle = (corner.angle + next.angle + (index === count - 1 ? 2 * Math.PI : 0)) / 2;
    return [corner, { angle, out: ((corner.out + next.out) / 2) * between(random, 0.95, 1.04) }];
  });
}

// The tiers: the notch, then the strata up to the top. The two rings where strata meet share their roughness and
// differ only by the step between them, all round: they never cross, so the band between them is a ledge or an
// overhang all the way round (or nothing, flush).
function stackStrata(shape, random) {
  const roughen = () => shape.corners.map(() => 1 + between(random, -0.03, 0.03));
  // Narrower toward the top, slowly at first (steep walls with a rounder shoulder), and a little fuller or
  // leaner round the middle, each mass its own way.
  const bulge = between(random, -0.04, 0.08);
  const scaleAt = (y) => {
    const share = Math.min(Math.max(y / shape.height, 0), 1);
    return 1 - shape.taper * share ** 1.6 + bulge * Math.sin(Math.PI * share);
  };
  const notch = Math.min(NOTCH_DEPTH, shape.radius * 0.12) / shape.radius;
  const heights = strataHeights(shape.height, random);
  const jitters = heights.map(roughen);
  const tiers = [{ bottom: ring(shape, ROCK_FOOT, 1 - notch, roughen()), top: ring(shape, NOTCH_TOP, 1 - notch, jitters[0]), tone: 0 }];
  let setBack = 1;
  heights.slice(1).forEach((top, layer) => {
    const bottom = heights[layer];
    setBack *= layer > 0 && random() < STEPPED ? stepFrom(setBack, random) : 1;
    const lower = ring(shape, bottom, scaleAt(bottom) * setBack, jitters[layer]);
    tiers.push({ bottom: lower, top: ring(shape, top, scaleAt(top) * setBack, jitters[layer + 1]), tone: between(random, -1, 1) });
  });
  return tiers;
}

// A ring of the outline's corners at height `y`, `scale` times the radius, each roughened by `jitter` (one share
// per corner).
function ring({ x, z, radius, corners }, y, scale, jitter) {
  return {
    y,
    points: corners.map(({ angle, out }, corner) => {
      const reach = radius * out * scale * jitter[corner];
      return [x + Math.cos(angle) * reach, z + Math.sin(angle) * reach];
    }),
  };
}

// How a stepped stratum stands from the one below: set back (a ledge) or out (an overhang), the step big enough to
// show; one set far back already stands out, one far out is set back, so the mass keeps its size.
function stepFrom(setBack, random) {
  const ledge = setBack > 1.03 || (setBack > 0.9 && random() < LEDGES);
  return ledge ? between(random, 0.93, 0.97) : between(random, 1.025, 1.045);
}

// The strata's boundaries from the notch's top to the mass's top, each stratum its own thickness.
function strataHeights(height, random) {
  const heights = [NOTCH_TOP];
  const mean = Math.min(Math.max(height / 7, STRATUM[0]), STRATUM[1]);
  while (heights.at(-1) + mean * 0.6 < height) {
    heights.push(Math.min(heights.at(-1) + mean * between(random, 0.45, 1.7), height));
  }
  heights[heights.length - 1] = height;
  return heights;
}
