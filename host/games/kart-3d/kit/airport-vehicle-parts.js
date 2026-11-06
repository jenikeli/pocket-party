// Small shapes shared by the apron's ground vehicles (M9 task J: kit/airport-trucks.js, kit/airport-carts.js): a
// soft coloured box, a tyre, a tilted slab and the airlines' paint. Each returns one coloured geometry, merged by
// the vehicle into a single shape. Vehicles face +z and stand on y = 0, centred on their own middle.

import * as THREE from 'three';
import { roundedBox, roundedCylinder, at, between, coloured } from '../shape-utils.js';
import { CORAL, SUN_YELLOW } from './terminal-maps.js';

export const PAINT = Object.freeze({
  white: 0xf1f2f4,
  coral: CORAL,
  yellow: SUN_YELLOW,
  navy: 0x1e3566,
  blue: 0x2f6fd0,
  darkBlue: 0x1c3f8a,
  grey: 0x9aa0a8,
  darkGrey: 0x5b616b,
  black: 0x1d1d20,
  glass: 0x1a2a44,
  orange: 0xf08a1e,
  darkOrange: 0xb0560f,
});

// Below this a bevel would not show (and the triangles would), so the part is a plain 12-triangle box.
const SMALLEST_BEVEL = 0.03;

// A box `width` x `height` x `depth` with its middle at (x, y, z), its edges bevelled by `round` (one flat cut,
// about 60 triangles) but never more than its thinnest side allows.
export function box(colour, [width, height, depth], [x, y, z], round = 0.08) {
  const bevel = Math.min(round, Math.min(width, height, depth) / 2 - 0.005);
  const shape = bevel >= SMALLEST_BEVEL ? roundedBox(width, height, depth, bevel, { chamfered: true }) : new THREE.BoxGeometry(width, height, depth);
  return coloured(at(shape, x, y, z), colour);
}

// A fat tyre standing on y = 0 with its axle along x: a lathe with rounded rims (`soft`), or for the many small
// wheels a plain cylinder; a pale hubcap on the outside either way.
export function wheel(x, z, radius, width, soft) {
  const hubX = x + Math.sign(x) * (width / 2);
  const tyre = soft ? roundedCylinder(radius, radius, width, width * 0.35, 10) : new THREE.CylinderGeometry(radius, radius, width, 8);
  return [
    coloured(at(tyre.rotateZ(Math.PI / 2), x, radius, z), PAINT.black),
    coloured(at(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, 0.06, 8).rotateZ(Math.PI / 2), hubX, radius, z), PAINT.grey),
  ];
}

// A wheel at each of `zs` on both sides, `halfTrack` out from the middle.
export function wheelSets(zs, halfTrack, radius, width, soft = false) {
  return zs.flatMap((z) => [-1, 1].flatMap((side) => wheel(side * halfTrack, z, radius, width, soft)));
}

// A thin rod from one point to another (a rail, a strut).
export function rod(colour, from, to, radius = 0.06) {
  return coloured(between(new THREE.CylinderGeometry(radius, radius, 1, 6), from, to), colour);
}

// A slab `width` across and `thickness` thick from (y0, z0) up to (y1, z1) on the line x (default the middle),
// for stairs and belts: a box stretched along the slope.
export function slope(colour, width, thickness, [y0, z0], [y1, z1], x = 0) {
  const length = Math.hypot(y1 - y0, z1 - z0);
  const slab = new THREE.BoxGeometry(width, thickness, length);
  slab.rotateX(-Math.atan2(y1 - y0, z1 - z0));
  return coloured(at(slab, x, (y0 + y1) / 2, (z0 + z1) / 2), colour);
}

// A truck cab at the front (+z) of a chassis, from `z`: a fat soft body, a dark windscreen and side windows in
// frames, a light bar, headlights and a bumper. `colour` paints the body.
export function cab(z, colour) {
  const side = (x) => [
    box(PAINT.glass, [0.08, 0.6, 0.9], [x * 1.01, 1.75, z - 0.05], 0.02),
    box(PAINT.darkGrey, [0.1, 0.1, 1.1], [x * 1.03, 1.35, z - 0.05], 0.02),
  ];
  return [
    box(colour, [2.2, 1.6, 1.6], [0, 1.45, z], 0.2),
    box(PAINT.glass, [1.8, 0.65, 0.1], [0, 1.78, z + 0.8], 0.03),
    box(PAINT.white, [1.6, 0.18, 0.5], [0, 2.35, z + 0.2], 0.08),
    box(PAINT.orange, [0.5, 0.14, 0.3], [0, 2.5, z + 0.2], 0.06),
    box(PAINT.yellow, [0.4, 0.3, 0.1], [-0.75, 1.1, z + 0.8], 0.04),
    box(PAINT.yellow, [0.4, 0.3, 0.1], [0.75, 1.1, z + 0.8], 0.04),
    box(PAINT.darkGrey, [2.3, 0.35, 0.3], [0, 0.7, z + 0.8], 0.1),
    ...side(-1.1),
    ...side(1.1),
  ];
}
