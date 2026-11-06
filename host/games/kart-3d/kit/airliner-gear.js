// The airliner's landing gear (M9): a nose leg with two small wheels and its doors, and a main leg under each
// wing's root with two fat wheels, a brace and an axle, standing the plane on y = 0. One shape, built round
// GEAR_PIVOT_Y so the take-off plane (kit/take-off-plane.js) can fold it up into the plane by squashing it
// there. Used by kit/airliner.js.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';

// Squashed to this height, the gear is inside the wings' roots and the fuselage.
export const GEAR_PIVOT_Y = 2.4;
// The main wheels' middle along x: the take-off plane rotates about their foot.
export const MAIN_GEAR_X = -1.5;
const MAIN = { z: 3.2, top: 2.3, wheelRadius: 0.65, wheelWidth: 0.55, spread: 0.42 };
const NOSE = { x: 16.5, top: 1.9, wheelRadius: 0.45, wheelWidth: 0.36, spread: 0.3 };
const TYRE = 0x26282c;
const HUB = 0xb9bec5;
const STRUT = 0xd5d9de;

// A wheel turning about z: a fat tyre and its hub.
function wheel(x, y, z, radius, width) {
  const tyre = roundedCylinder(radius, radius, width, width * 0.35, 18).rotateX(Math.PI / 2);
  const hub = roundedCylinder(radius * 0.55, radius * 0.55, width + 0.04, 0.05, 12).rotateX(Math.PI / 2);
  return [coloured(at(tyre, x, y, z), TYRE), coloured(at(hub, x, y, z), HUB)];
}

function strut(from, to, radius, hex = STRUT) {
  return coloured(between(new THREE.CylinderGeometry(radius, radius, 1, 10), from, to), hex);
}

// One main leg on `side` (-1 left, 1 right).
function mainLeg(side) {
  const { z, top, wheelRadius, wheelWidth, spread } = MAIN;
  const middle = side * z;
  return [
    strut([MAIN_GEAR_X, top, middle], [MAIN_GEAR_X, wheelRadius, middle], 0.2),
    strut([MAIN_GEAR_X + 1.2, top, middle - side * 0.6], [MAIN_GEAR_X, wheelRadius + 0.9, middle], 0.1, 0xa8aeb6),
    strut([MAIN_GEAR_X, wheelRadius, middle - spread - wheelWidth / 2], [MAIN_GEAR_X, wheelRadius, middle + spread + wheelWidth / 2], 0.1, 0x8d939b),
    ...wheel(MAIN_GEAR_X, wheelRadius, middle - spread, wheelRadius, wheelWidth),
    ...wheel(MAIN_GEAR_X, wheelRadius, middle + spread, wheelRadius, wheelWidth),
  ];
}

// The nose leg, its two wheels and the open doors either side of its bay.
function noseLeg() {
  const { x, top, wheelRadius, wheelWidth, spread } = NOSE;
  return [
    strut([x, top, 0], [x, wheelRadius, 0], 0.14),
    strut([x, wheelRadius, -spread - wheelWidth / 2], [x, wheelRadius, spread + wheelWidth / 2], 0.07, 0x8d939b),
    ...wheel(x, wheelRadius, -spread, wheelRadius, wheelWidth),
    ...wheel(x, wheelRadius, spread, wheelRadius, wheelWidth),
    ...[-1, 1].map((side) => coloured(at(roundedBox(2, 0.9, 0.08, 0.03), x - 0.4, top - 0.35, side * 0.75), 0xeef0f2)),
  ];
}

// The whole gear in one geometry, with its pivot moved to y = 0 (the plane's mesh puts it back at GEAR_PIVOT_Y).
export function buildAirlinerGear() {
  return mergeShapes([...mainLeg(-1), ...mainLeg(1), ...noseLeg()]).translate(0, -GEAR_PIVOT_Y, 0);
}
