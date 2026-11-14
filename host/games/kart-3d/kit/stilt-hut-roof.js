// The stilt hut's thatch roof (M7d4d), as at the reference beach course: three square roofs stacked, each steeper
// than the one below, every eave hung with a ragged fringe of tapered straw bunches (so the edge is thick and
// uneven, not a clean line), a roll of straw along each hip and a bound topknot. One geometry with colours and
// texture coordinates, for the thatch material. `top` is the walls' top; the roof is centred on z = `centreZ`.
// Used by kit/stilt-hut.js.

import * as THREE from 'three';
import { at, between as stretch, coloured, mergeShapes } from '../shape-utils.js';
import { createRandom, between } from '../random.js';
import { jittered, patchUv } from './stilt-hut-shapes.js';

// Half widths along x and z, the height of the eave over the walls' top, and the rise to the apex.
const TIERS = [
  { halfX: 1.85, halfZ: 1.7, base: -0.1, rise: 1.3, rows: 2 },
  { halfX: 1.5, halfZ: 1.3, base: 0.2, rise: 1.2, rows: 2 },
  { halfX: 0.9, halfZ: 0.8, base: 0.7, rise: 1.1, rows: 1 },
];
const STRAW = 0xffffff;
const ROLL = 0xb89858;
const BUNCH_SPACING = 0.27;

export function buildRoof(top, centreZ) {
  const random = createRandom(53);
  const parts = [];
  for (const tier of TIERS) {
    parts.push(...buildTier(tier, random));
  }
  const apex = TIERS[2].base + TIERS[2].rise;
  parts.push(coloured(at(new THREE.CylinderGeometry(0.1, 0.17, 0.6, 7), 0, apex + 0.15, 0), ROLL));
  parts.push(coloured(at(new THREE.SphereGeometry(0.17, 7, 5), 0, apex + 0.5, 0), 0xd8c08a));
  const roof = mergeShapes(parts);
  return roof.translate(0, top, centreZ);
}

// One roof: the pyramid, a roll along each hip, and the fringe round its eaves.
function buildTier({ halfX, halfZ, base, rise, rows }, random) {
  // A pyramid 1 wide each way and 1 high, stretched to the tier.
  const roof = new THREE.ConeGeometry(Math.SQRT2, 1, 4, 1).rotateY(Math.PI / 4).translate(0, 0.5, 0);
  roof.scale(halfX, rise, halfZ).translate(0, base, 0);
  const parts = [coloured(roof, STRAW)];
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const roll = new THREE.CylinderGeometry(0.075, 0.075, 1, 6);
    parts.push(coloured(stretch(roll, [0, base + rise + 0.03, 0], [x * halfX, base + 0.04, z * halfZ]), ROLL));
  }
  // The front and back eaves run along x, the side ones along z (a quarter turn).
  [0, 1, 2, 3].forEach((side) => {
    const sideways = side % 2 === 1;
    const [along, across] = sideways ? [halfZ, halfX] : [halfX, halfZ];
    const slope = Math.atan2(rise, across);
    for (let row = 0; row < rows; row += 1) {
      for (const bunch of fringeRow({ along, across, slope, base, row, random })) {
        parts.push(bunch.rotateY((side * Math.PI) / 2));
      }
    }
  });
  return parts;
}

// Bunches of straw hanging from the +z eave of a roof `across` out from its middle and `along` either way, as
// one row (rows after the first hang lower, and are shifted half a bunch so they cover the gaps).
function fringeRow({ along, across, slope, base, row, random }) {
  const bunches = [];
  const count = Math.floor((2 * along) / BUNCH_SPACING);
  for (let index = 0; index < count; index += 1) {
    const x = -along + BUNCH_SPACING * (index + 0.5 + row * 0.5);
    if (Math.abs(x) > along) {
      continue;
    }
    const length = between(random, 0.35, 0.65) + row * 0.12;
    const width = BUNCH_SPACING * between(random, 0.95, 1.2);
    const bunch = new THREE.BoxGeometry(width, 0.17, length);
    taperTip(bunch, 0.45);
    patchUv(bunch, random, 0.1, 0.12);
    // Its inner end is tucked under the roof's surface, its tip hangs out along the slope; a little jitter of
    // turn and tilt makes the edge ragged.
    bunch.rotateY(between(random, -0.12, 0.12)).rotateX(slope + between(random, -0.08, 0.08));
    const reach = length / 2 - 0.12 + row * 0.1;
    bunch.translate(x, base - 0.03 - Math.sin(slope) * reach - row * 0.05, across + Math.cos(slope) * reach);
    bunches.push(coloured(bunch, jittered(STRAW, random, 0.18)));
  }
  return bunches;
}

// Narrows the far (+z) half of a box to `share` of its width, so a bunch ends in a blunt point.
function taperTip(geometry, share) {
  const { position } = geometry.attributes;
  for (let index = 0; index < position.count; index += 1) {
    if (position.getZ(index) > 0) {
      position.setX(index, position.getX(index) * share);
    }
  }
}
