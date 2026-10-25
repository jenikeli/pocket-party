// The shapes of the 3D race's kart and driver (M7c), our own toy design built from Three.js's simple shapes: a low
// kart with a rounded nose, side pods, a front wing, an engine cowl, a rear wing and bumper and two chrome
// exhausts, a driver in a dark suit with white gloves on the steering wheel and a round helmet with a white
// stripe and a dark visor, and fat tyres with silver hubs, the rear ones bigger. The parts of each material are
// merged into one geometry, so a kart is one draw call per material plus one per wheel. Used by host/games/kart-3d/kart-models.js.
//
// Model axes: +z forward, +y up, +x the kart's left; the wheels stand on y = 0. A kart is about 2 long.

import * as THREE from 'three';
import { at, between, coloured, mergeShapes } from './shape-utils.js';

// Where each wheel's middle sits (x, z) and its size, front pair first.
export const WHEELS = Object.freeze([
  { x: 0.62, z: 0.68, radius: 0.27, width: 0.28, front: true },
  { x: -0.62, z: 0.68, radius: 0.27, width: 0.28, front: true },
  { x: 0.66, z: -0.72, radius: 0.34, width: 0.36, front: false },
  { x: -0.66, z: -0.72, radius: 0.34, width: 0.36, front: false },
]);
const TYRE_HEX = 0x1d1e22;
const HUB_HEX = 0xcfd3da;
// The driver's hands rest on the steering wheel.
const HANDS = [[0.13, 0.9, 0.12], [-0.13, 0.9, 0.12]];
const SHOULDERS = [[0.2, 1.02, -0.26], [-0.2, 1.02, -0.26]];
const HELMET = [0, 1.3, -0.27];

// Returns { paint, dark, chrome, white } (geometries of the parts in each material) and `wheels`, one geometry
// per entry of WHEELS with its middle at the origin and its axle along x.
export function buildKartShapes() {
  return {
    paint: mergeShapes([
      // The nose: a smooth hump in front of the driver.
      at(new THREE.SphereGeometry(1, 14, 8).scale(0.5, 0.3, 0.78), 0, 0.42, 0.42),
      // Side pods along both sides.
      ...[0.52, -0.52].map((x) => at(new THREE.CapsuleGeometry(0.17, 0.85, 3, 10).rotateX(Math.PI / 2), x, 0.38, -0.08)),
      // The front wing between the front wheels, and the engine cowl behind the seat.
      at(new THREE.BoxGeometry(1.08, 0.07, 0.26), 0, 0.26, 1.02),
      at(new THREE.SphereGeometry(1, 12, 8).scale(0.4, 0.3, 0.42), 0, 0.5, -0.74),
      // The rear wing.
      at(new THREE.BoxGeometry(1.2, 0.06, 0.3), 0, 1.0, -1.02),
      at(new THREE.BoxGeometry(0.05, 0.22, 0.34), 0.6, 0.94, -1.02),
      at(new THREE.BoxGeometry(0.05, 0.22, 0.34), -0.6, 0.94, -1.02),
      at(new THREE.SphereGeometry(0.27, 16, 10), ...HELMET),
    ]),
    dark: mergeShapes([
      // The floor pan, the rear bumper, the seat back and the steering column.
      at(new THREE.BoxGeometry(1.0, 0.1, 1.9), 0, 0.24, -0.05),
      at(new THREE.BoxGeometry(0.9, 0.14, 0.16), 0, 0.3, -1.06),
      at(new THREE.BoxGeometry(0.62, 0.5, 0.12), 0, 0.72, -0.5),
      between(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), [0, 0.5, 0.42], [0, 0.88, 0.16]),
      at(new THREE.TorusGeometry(0.15, 0.03, 6, 14).rotateX(-0.9), 0, 0.89, 0.15),
      // The wing's struts.
      ...[0.3, -0.3].map((x) => between(new THREE.BoxGeometry(0.05, 1, 0.08), [x, 0.55, -0.85], [x, 0.98, -1.0])),
      // The driver's body and arms.
      at(new THREE.CapsuleGeometry(0.2, 0.22, 3, 10), 0, 0.88, -0.32),
      ...SHOULDERS.map((shoulder, index) => between(new THREE.CapsuleGeometry(0.065, 1, 2, 6), shoulder, HANDS[index])),
      // The visor, a band across the helmet's front.
      at(new THREE.SphereGeometry(0.278, 12, 4, Math.PI / 2 - 0.85, 1.7, Math.PI * 0.36, Math.PI * 0.24), ...HELMET),
    ]),
    chrome: mergeShapes([
      ...[0.33, -0.33].map((x) => between(new THREE.CylinderGeometry(0.065, 0.075, 1, 8, 1, true), [x, 0.45, -0.9], [x, 0.72, -1.28])),
      at(new THREE.CylinderGeometry(0.12, 0.14, 0.12, 10), 0, 0.82, -0.74),
    ]),
    white: mergeShapes([
      ...HANDS.map((hand) => at(new THREE.SphereGeometry(0.07, 8, 6), ...hand)),
      // The helmet's stripe, front to back over the top.
      at(new THREE.TorusGeometry(0.274, 0.035, 4, 16, Math.PI).rotateY(Math.PI / 2), ...HELMET),
      // A round number plate on the nose.
      at(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14).rotateX(-0.35), 0, 0.71, 0.62),
    ]),
    wheels: WHEELS.map(buildWheel),
  };
}

// A fat tyre with rounded shoulders (a profile turned round the axle) and a silver hub, coloured per vertex so
// the wheel is one draw call.
function buildWheel({ radius, width }) {
  const half = width / 2;
  const hub = radius * 0.55;
  const round = width * 0.3;
  const profile = [
    [hub, -half], [radius - round, -half], [radius - round * 0.3, -half + round * 0.3], [radius, -half + round],
    [radius, half - round], [radius - round * 0.3, half - round * 0.3], [radius - round, half], [hub, half],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tyre = coloured(new THREE.LatheGeometry(profile, 14), TYRE_HEX);
  const hubShape = coloured(new THREE.CylinderGeometry(hub, hub, width * 0.9, 10), HUB_HEX);
  return mergeShapes([tyre, hubShape]).rotateZ(Math.PI / 2);
}
