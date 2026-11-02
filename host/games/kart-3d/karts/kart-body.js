// The front half of our go-kart (M7d5), built in the style of MK8DX's Standard Kart (test-results/reference/m7d5/):
// the smooth nose and cowl (kart-shells.js) with the emblem disc on the nose's top and two round lamps at its tip;
// two soft side pods (a pillowy top in the main colour, a notched stripe in the second colour, a rounded base in
// the third); the floor pan and the front wheels' arms. Used by design-shapes.js.

import * as THREE from 'three';
import { roundedBox } from '../shape-utils.js';
import { extrudedSide } from './curved-shapes.js';
import { kartPart, painted, limb, ball, emblemDisc } from './part-shapes.js';
import { buildShells, NOSE_EMBLEM } from './kart-shells.js';
import { WHEELS } from './kart-layout.js';

const DARK_HEX = 0x2a2c33;
const LAMP_HEX = 0xfff3d6;
const CHROME_HEX = 0xdfe3ea;

// The side pods' layers seen from the side ([z, y]), from the bottom up, and where they stand across.
const POD_LOWER = [[-0.24, 0.13], [0.28, 0.13], [0.33, 0.2], [0.31, 0.3], [-0.24, 0.3], [-0.28, 0.21]];
const POD_STRIPE = [[-0.25, 0.29], [0.32, 0.29], [0.32, 0.37], [0.12, 0.37], [0.06, 0.32], [0.0, 0.37], [-0.25, 0.37]];
const POD_TOP = [[-0.25, 0.365], [0.0, 0.365], [0.06, 0.315], [0.12, 0.365], [0.32, 0.365], [0.29, 0.47], [-0.22, 0.49]];
const POD_X = 0.5;
const POD_WIDTH = 0.24;

// Returns the front half's parts (part-shapes.js's kartPart), the painted ones naming their palette colour.
export function buildKartBody() {
  return [
    ...buildShells(),
    ...buildLamps(),
    ...buildPods(),
    kartPart('decal', emblemDisc(NOSE_EMBLEM.radius, NOSE_EMBLEM.normal, NOSE_EMBLEM.at)),
    kartPart('matte', painted(roundedBox(0.86, 0.08, 1.95, 0.03).translate(0, 0.13, -0.08), DARK_HEX)),
    ...WHEELS.filter((wheel) => wheel.front).map((wheel) =>
      kartPart('matte', limb([wheel.x * 0.4, 0.26, wheel.z], [wheel.x * 0.85, wheel.radius, wheel.z], 0.045, DARK_HEX)),
    ),
  ];
}

// A round lamp in a chrome ring either side of the nose's tip.
function buildLamps() {
  return [1, -1].flatMap((side) => {
    const at = [side * 0.2, 0.2, 1.17];
    const ring = new THREE.TorusGeometry(0.05, 0.015, 4, 16).translate(...at);
    return [
      kartPart('glossy', ball(0.05, [1, 1, 0.55], at, LAMP_HEX, { detail: 10, crease: 0 })),
      kartPart('metal', painted(ring, CHROME_HEX, { crease: 0 })),
    ];
  });
}

// Both side pods, each three slabs with soft rounded edges: the third colour below, the notched stripe, a pillowy
// top in the main colour.
function buildPods() {
  // The stripe stands a little proud of the slabs it overlaps, so their faces never fight over the same spot.
  const layers = [[POD_LOWER, 'third', 0, 0.045], [POD_STRIPE, 'second', 0.016, 0.02], [POD_TOP, 'main', 0, 0.05]];
  return [1, -1].flatMap((side) =>
    layers.map(([outline, role, proud, bevel]) =>
      kartPart('glossy', extrudedSide(outline, POD_WIDTH + proud, { radius: 0.03, bevel }).translate(side * POD_X, 0, 0), role),
    ),
  );
}
