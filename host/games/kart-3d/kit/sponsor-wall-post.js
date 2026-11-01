// The padded sponsor wall's fence post (M7d4c3): a steel post up from a bolted foot plate on the pad's ridge, with
// a collar over the plate and a round cap above the top rail. Coloured white so the steel material's grey shows.
// Used by kit/sponsor-wall.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';

const BOLT_COLOR = 0xb8bdc6;
const CAP_COLOR = 0xd0d4da;

// `padTop` is the height of the pad's ridge the post stands on, `fenceTop` the top rail's height. The plate is
// taller than a plate needs to be: the pad's ridge slopes away on both sides of it, and the plate's foot must not
// hang in the air.
export function buildFencePost(padTop, fenceTop) {
  const plateMiddle = padTop - 0.02;
  const top = fenceTop + 0.05;
  const bolts = [-1, 1].flatMap((x) => [-1, 1].map((z) => coloured(at(new THREE.SphereGeometry(0.022, 6, 4), x * 0.065, padTop + 0.045, z * 0.075), BOLT_COLOR)));
  return mergeShapes([
    coloured(at(roundedBox(0.18, 0.1, 0.22, 0.02, { chamfered: true }), 0, plateMiddle, 0), CAP_COLOR),
    ...bolts,
    coloured(at(roundedCylinder(0.05, 0.05, top - padTop, 0.015, 8), 0, (top + padTop) / 2, 0), 0xffffff),
    coloured(at(roundedCylinder(0.075, 0.09, 0.08, 0.02, 8), 0, padTop + 0.1, 0), CAP_COLOR),
    coloured(at(new THREE.SphereGeometry(0.065, 8, 6), 0, fenceTop + 0.07, 0), CAP_COLOR),
  ]);
}
