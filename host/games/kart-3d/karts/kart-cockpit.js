// Where the driver sits in our go-kart (M7d5), as in MK8DX's Standard Kart: a bucket seat (a low rounded shell in
// the main colour with dark cushions in it, so from behind it reads as part of the kart rather than a dark slab)
// and a small black steering wheel with a silver three-spoke hub, on a column rising from the nose. The same for
// every design. Used by design-shapes.js.

import * as THREE from 'three';
import { roundedBox, roundedCylinder } from '../shape-utils.js';
import { kartPart, painted, limb, facing } from './part-shapes.js';
import { STEERING } from './kart-layout.js';

const SEAT_HEX = 0x2b2d36;
const WHEEL_HEX = 0x1c1d22;
const SILVER_HEX = 0xd4d8df;

// Returns the cockpit's parts (part-shapes.js's kartPart).
export function buildCockpit() {
  return [
    ...buildSeat(),
    ...buildSteeringWheel().map((shape) => kartPart('matte', shape)),
    ...buildHub().map((shape) => kartPart('metal', shape)),
  ];
}

function buildSeat() {
  const shell = roundedBox(0.56, 0.48, 0.1, 0.05).rotateX(-0.22).translate(0, 0.62, -0.54);
  const bolsters = [1, -1].map((side) => roundedBox(0.09, 0.3, 0.4, 0.045).rotateX(-0.15).translate(side * 0.29, 0.5, -0.36));
  const cushions = [
    roundedBox(0.46, 0.4, 0.06, 0.03).rotateX(-0.22).translate(0, 0.62, -0.48),
    roundedBox(0.5, 0.1, 0.44, 0.045).translate(0, 0.34, -0.28),
  ];
  return [
    ...[shell, ...bolsters].map((part) => kartPart('glossy', part, 'main', 0.3)),
    ...cushions.map((part) => kartPart('matte', painted(part, SEAT_HEX, { crease: 0.3 }))),
  ];
}

// The wheel's rim faces the driver, leaning back by STEERING.lean, on a column from the nose.
function buildSteeringWheel() {
  const rim = new THREE.TorusGeometry(STEERING.radius, 0.027, 6, 20);
  const column = limb([0, 0.52, 0.62], STEERING.middle, 0.03, WHEEL_HEX);
  return [painted(facing(rim, wheelFacing(), STEERING.middle), WHEEL_HEX, { crease: 0 }), column];
}

// A silver cap in the middle and three spokes out to the rim.
function buildHub() {
  const cap = roundedCylinder(0.045, 0.045, 0.04, 0.012, 12).rotateX(Math.PI / 2);
  const spokes = [90, 210, 330].map((degrees) => {
    const angle = (degrees * Math.PI) / 180;
    const spoke = roundedBox(STEERING.radius, 0.032, 0.018, 0.008);
    return spoke.translate(STEERING.radius / 2, 0, 0).rotateZ(angle);
  });
  return [cap, ...spokes].map((part) => painted(facing(part, wheelFacing(), STEERING.middle), SILVER_HEX, { crease: 0 }));
}

// Toward the driver (back along -z) and up, by the wheel's lean.
function wheelFacing() {
  return [0, Math.sin(STEERING.lean), -Math.cos(STEERING.lean)];
}
