// The water round a rocky island (M9): turquoise shallows fading out into the deep blue and patchy white foam at
// the shore, as round the study's islands and the reference game's. See-through sheets lying just on the sea, following the
// shore round the island: the masses' feet, or the beach's waterline where there is one. Used by
// kit/rock-island.js.

import * as THREE from 'three';
import { mergeShapes } from '../shape-utils.js';
import { beachPoint, BEACH_WATERLINE } from './rock-island-plan.js';
import { ringGrid } from './rock-island-grid.js';

// The shallows and the foam: rows [out past the shore (units, times the island's scale), colour, see-through].
const SHALLOWS = [[-0.5, 0x46dccb, 0.75], [3, 0x3bc8c6, 0.5], [8, 0x2fb0c4, 0.22], [15, 0x2b8fc0, 0]];
const FOAM = [[-0.2, 0xffffff, 0], [0.6, 0xffffff, 0.9], [1.6, 0xffffff, 0.45], [2.8, 0xffffff, 0]];
const SHORE_SEGMENTS = 64;

// `island` from kit/rock-island-plan.js. Returns one indexed geometry, the shallows then the foam over them,
// whose colours carry their see-through amount as a fourth value.
export function buildIslandWater(island) {
  const scale = waterScale(island);
  const shore = shoreRadii(island);
  return mergeShapes([buildRings(shore, SHALLOWS, 0.05, scale, false), buildRings(shore, FOAM, 0.08, scale, true)]);
}

// How far the island's shallows reach from its middle, the farthest anything of it does.
export function shallowsReach(island) {
  return Math.max(...shoreRadii(island).map(({ radius }) => radius)) + SHALLOWS.at(-1)[0] * waterScale(island);
}

// The shallows and foam spread wider round a bigger island.
function waterScale(island) {
  return Math.min(Math.max(island.size / 20, 0.7), 1.6);
}

// How far the shore is from the island's middle at SHORE_SEGMENTS angles round it: the farthest any mass's foot
// (or the beach's waterline) reaches along that way.
function shoreRadii(island) {
  const shores = island.masses.map((mass, massIndex) => {
    return mass.tiers[1].bottom.points.map(([x, z], corner) => {
      if (island.beach?.mass !== massIndex || !island.beach.corners.includes(corner)) {
        return [x, z];
      }
      const [waterX, , waterZ] = beachPoint(island, corner, BEACH_WATERLINE);
      return [waterX, waterZ];
    });
  });
  return Array.from({ length: SHORE_SEGMENTS + 1 }, (_, segment) => {
    const angle = (segment / SHORE_SEGMENTS) * 2 * Math.PI;
    const way = [Math.cos(angle), Math.sin(angle)];
    return { way, radius: Math.max(0, ...shores.map((outline) => farthestAlong(outline, way))) };
  });
}

// The farthest distance from the origin along `way` at which the ray crosses the closed outline (0 if never).
function farthestAlong(outline, [wayX, wayZ]) {
  let farthest = 0;
  outline.forEach(([x1, z1], index) => {
    const [x2, z2] = outline[(index + 1) % outline.length];
    const [edgeX, edgeZ] = [x2 - x1, z2 - z1];
    const denominator = wayX * edgeZ - wayZ * edgeX;
    if (Math.abs(denominator) < 1e-9) {
      return;
    }
    const distance = (x1 * edgeZ - z1 * edgeX) / denominator;
    const along = (x1 * wayZ - z1 * wayX) / denominator;
    if (distance > 0 && along >= 0 && along <= 1) {
      farthest = Math.max(farthest, distance);
    }
  });
  return farthest;
}

// Flat rings on the water past the shore, colour and see-through blended between `stops`; the foam's comes and
// goes round the island (`patchy`), as surf breaks.
function buildRings(shore, stops, y, scale, patchy) {
  return ringGrid(stops.length, SHORE_SEGMENTS, (row, segment) => {
    const { way, radius } = shore[segment];
    const [out, hex, alpha] = stops[row];
    const angle = (segment / SHORE_SEGMENTS) * 2 * Math.PI;
    const patch = patchy ? 0.55 + 0.45 * Math.sin(angle * 9) * Math.sin(angle * 4 + 1) : 1;
    const reach = radius + out * scale;
    return { point: [way[0] * reach, y, way[1] * reach], color: new THREE.Color(hex), alpha: alpha * patch };
  }, true);
}
