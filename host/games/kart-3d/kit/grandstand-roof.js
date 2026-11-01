// The grandstand's cantilevered roof (M7d4c3), as on Toad Circuit's stands in MK8DX: a roof held only from the
// back by a lattice girder over each line of columns, reaching out over both decks to a little past the stand's
// front; a pale ceiling under it crossed by purlins, so its underside is not one flat dark slab; a red fascia
// along its front edge, framed, for the MARIO KART sign; and a railing along its top's front edge. Built along x
// round x = 0, as kit/grandstand-structure.js. Used by kit/grandstand.js.

import * as THREE from 'three';
import { roundedBox, at, coloured } from '../shape-utils.js';
import { STEEL, latticeGirder, pointsAlong, railing } from './grandstand-steel.js';

// The roof's underside runs from the back (z, height) up to the front: rising a little toward the road.
const BACK = [-7.15, 7.4];
const FRONT = [0.75, 7.9];
const THICKNESS = 0.25;
// The fascia across the roof's front edge, and the sign on it, a tile of which is about SIGN_TILE long.
const FASCIA = { bottom: 7.42, top: 8.3, depth: 0.22 };
const SIGN_TILE = 7;
// The columns at the back, where the girders are held (kit/grandstand-structure.js's back columns).
const COLUMN_Z = -6.6;
const PURLIN_ZS = [-5.8, -4.3, -2.8, -1.3, 0.2];
const ROOF_TOP = 0xf4f4f0;
const CEILING = 0xf2eee6;
// The ceiling faces the ground and the stands, so the course's light leaves it dark, and the baked shade darker
// still. MK8DX's own bake lights such undersides with the light bounced up off the ground: its colour is lifted
// above white by this much to stand in for that bounce.
const CEILING_LIFT = 3;
const FASCIA_RED = 0xd8302a;

// The roof's underside height at z.
function undersideAt(z) {
  return BACK[1] + ((z - BACK[0]) * (FRONT[1] - BACK[1])) / (FRONT[0] - BACK[0]);
}

// The roof of a stand `length` long, whose lines of columns stand at `columnXs`: { painted, steel, sign }: lists
// of shapes coloured per vertex, and the sign's plane on the fascia (texture coordinates repeating one tile of the
// sign about every SIGN_TILE along it).
export function buildRoof(length, columnXs) {
  const steel = [];
  for (const x of columnXs) {
    const upper = pointsAlong([x, undersideAt(COLUMN_Z) - 0.06, COLUMN_Z], [x, undersideAt(0.55) - 0.06, 0.55], 9);
    const lower = pointsAlong([x, undersideAt(COLUMN_Z) - 1.2, COLUMN_Z], [x, undersideAt(0.55) - 0.22, 0.55], 9);
    steel.push(...latticeGirder(upper, lower));
  }
  for (const z of PURLIN_ZS) {
    steel.push(coloured(at(new THREE.BoxGeometry(length - 0.3, 0.14, 0.14), 0, undersideAt(z) - 0.08, z), STEEL));
  }
  const railZ = FRONT[0] - 0.3;
  const railY = undersideAt(railZ) + THICKNESS;
  steel.push(...railing([-length / 2 + 0.2, railY, railZ], [length / 2 - 0.2, railY, railZ], 0.5, 1.6));
  return { painted: [slab(length), ...fascia(length)], steel, sign: signPlane(length) };
}

// The roof itself, tipped to its slope: white on top, its underside a pale ceiling.
function slab(length) {
  const [run, rise] = [FRONT[0] - BACK[0], FRONT[1] - BACK[1]];
  const geometry = roundedBox(length, THICKNESS, Math.hypot(run, rise), 0.06);
  twoTone(geometry, new THREE.Color(CEILING).multiplyScalar(CEILING_LIFT), new THREE.Color(ROOF_TOP));
  geometry.rotateX(-Math.atan2(rise, run));
  return at(geometry, 0, (BACK[1] + FRONT[1]) / 2 + THICKNESS / 2, (BACK[0] + FRONT[0]) / 2);
}

// The fascia: a red board across the front edge, with a raised white rim along its top and bottom framing the sign.
function fascia(length) {
  const { bottom, top, depth } = FASCIA;
  const z = FRONT[0] - depth / 2;
  return [
    coloured(at(roundedBox(length, top - bottom, depth, 0.06), 0, (top + bottom) / 2, z), FASCIA_RED),
    ...[bottom + 0.07, top - 0.07].map((y) => coloured(at(roundedBox(length - 0.1, 0.08, 0.06, 0.025), 0, y, FRONT[0] + 0.01), 0xf4f4f0)),
  ];
}

// The sign's plane on the fascia's face, between the rims.
function signPlane(length) {
  const { bottom, top } = FASCIA;
  const tiles = Math.max(1, Math.round(length / SIGN_TILE));
  const plane = new THREE.PlaneGeometry(length - 0.3, top - bottom - 0.3);
  const uv = plane.attributes.uv;
  for (let corner = 0; corner < uv.count; corner += 1) {
    uv.setX(corner, uv.getX(corner) * tiles);
  }
  return plane.translate(0, (top + bottom) / 2, FRONT[0] + 0.005);
}

// Colours `geometry`'s vertices `below` under its middle (y < 0) and `above` over it (THREE.Color each).
function twoTone(geometry, below, above) {
  const { position } = geometry.attributes;
  const colors = [];
  for (let index = 0; index < position.count; index += 1) {
    const color = position.getY(index) < 0 ? below : above;
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
}
