// The windsock (M9 task K): a stout mast banded red and white on a round concrete foot, a ring at its top and a
// fat sock of orange and white segments blowing along +x, drooping a little. Props are instanced, so the sock
// stands as if in a steady breeze rather than swaying. Takes the kit and returns one painted shape (coloured per
// vertex); standing on y = 0. Used by kit/props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedCylinder } from '../shape-utils.js';
import { PAINT } from './airport-vehicle-parts.js';

const MAST_HEIGHT = 4.6;
const SEGMENTS = 5;
const SEGMENT_LENGTH = 0.5;
const MOUTH_RADIUS = 0.5;
const TAIL_RADIUS = 0.17;
// Each segment droops a little more than the one before it (radians).
const DROOP = 0.07;

// The mast: a concrete foot and a mast in bands, with a collar at each change.
function mast() {
  const bands = [PAINT.white, PAINT.coral, PAINT.white, PAINT.coral];
  const bandHeight = MAST_HEIGHT / bands.length;
  return [
    coloured(at(roundedCylinder(0.65, 0.7, 0.3, 0.1, 12), 0, 0.15, 0), 0xb9b6ae),
    ...bands.map((colour, index) => coloured(at(roundedCylinder(0.13, 0.13, bandHeight, 0.03, 8), 0, (index + 0.5) * bandHeight + 0.2, 0), colour)),
    ...[1, 2, 3].map((index) => coloured(at(roundedCylinder(0.19, 0.19, 0.1, 0.03, 8), 0, index * bandHeight + 0.2, 0), PAINT.darkGrey)),
    coloured(at(new THREE.SphereGeometry(0.2, 8, 6), 0, MAST_HEIGHT + 0.25, 0), PAINT.darkGrey),
  ];
}

// The sock: a steel ring facing +x at the mast's top, then segments narrowing from the mouth, each a short cone
// turned a little further down than the last, alternating orange and white.
function sock() {
  const top = MAST_HEIGHT + 0.1;
  const parts = [coloured(at(new THREE.TorusGeometry(MOUTH_RADIUS + 0.04, 0.05, 6, 16).rotateY(Math.PI / 2), 0.3, top, 0), PAINT.darkGrey)];
  let [x, y, angle] = [0.32, top, 0];
  for (let index = 0; index < SEGMENTS; index += 1) {
    const [near, far] = [index, index + 1].map((step) => MOUTH_RADIUS + ((TAIL_RADIUS - MOUTH_RADIUS) * step) / SEGMENTS);
    angle += DROOP;
    const [dx, dy] = [Math.cos(angle) * SEGMENT_LENGTH, -Math.sin(angle) * SEGMENT_LENGTH];
    // A cylinder stands along y; its top (the wider end, `near`) faces back toward the mast.
    const segment = new THREE.CylinderGeometry(near, far, SEGMENT_LENGTH * 1.04, 10).rotateZ(Math.PI / 2 - angle);
    parts.push(coloured(at(segment, x + dx / 2, y + dy / 2, 0), index % 2 === 0 ? PAINT.orange : PAINT.white));
    [x, y] = [x + dx, y + dy];
  }
  return parts;
}

export function buildWindsock(kit) {
  return [{ geometry: kit.keep(mergeShapes([...mast(), ...sock()])), material: kit.materials.painted }];
}
