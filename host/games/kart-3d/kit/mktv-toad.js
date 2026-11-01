// The Toad on the MKTV van's roof (M7d4c3), as in the study: a small blue-vested Toad with his white, red-spotted
// cap, filming with a TV camera on his shoulder. Used by kit/mktv-van.js. Standing on y = 0, facing +z, about 1
// tall; returns the shapes (coloured per vertex) to merge into the van's.

import * as THREE from 'three';
import { at, coloured, roundedBox, roundedCylinder } from '../shape-utils.js';

const SKIN = 0xffe0bd;
const CAP = 0xf7f7f2;
const SPOT = 0xe0302a;
const VEST = 0x2f6fd8;
const TROUSERS = 0xf4f4f0;
const CAMERA = 0x2b2e35;

export function buildToad() {
  const sphere = (radius, x, y, z, scale = [1, 1, 1]) => at(new THREE.SphereGeometry(radius, 12, 8).scale(...scale), x, y, z);
  const parts = [
    coloured(at(roundedBox(0.34, 0.3, 0.2, 0.06, { chamfered: true }), 0, 0.15, 0), TROUSERS),
    coloured(at(roundedCylinder(0.2, 0.22, 0.34, 0.07, 10), 0, 0.46, 0), VEST),
    coloured(sphere(0.2, 0, 0.84, 0.02), SKIN),
    // The cap: a wide dome over the face, a rim below it, and a spot on its front and each side.
    coloured(at(new THREE.SphereGeometry(0.3, 14, 8, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.85, 1), 0, 0.9, 0), CAP),
    coloured(at(roundedCylinder(0.3, 0.3, 0.06, 0.02, 14), 0, 0.88, 0), CAP),
    coloured(sphere(0.07, 0, 1.03, 0.26, [1, 1, 0.4]).rotateX(-0.2), SPOT),
    coloured(sphere(0.07, 0.25, 1.05, 0.05, [0.4, 1, 1]), SPOT),
    coloured(sphere(0.07, -0.25, 1.05, 0.05, [0.4, 1, 1]), SPOT),
    coloured(sphere(0.07, 0, 1.18, 0, [1, 0.4, 1]), SPOT),
    // Two dark eyes and a small nose.
    coloured(sphere(0.035, -0.07, 0.86, 0.19, [1, 1.5, 0.5]), 0x1a1a1a),
    coloured(sphere(0.035, 0.07, 0.86, 0.19, [1, 1.5, 0.5]), 0x1a1a1a),
    coloured(sphere(0.04, 0, 0.8, 0.21, [1, 0.8, 0.6]), 0xf0b090),
    ...camera(),
  ];
  return parts;
}

// The camera on his right shoulder (+x) and the arm holding it; its lens points forward.
function camera() {
  const dark = (geometry) => coloured(geometry, CAMERA);
  return [
    dark(at(roundedBox(0.3, 0.3, 0.55, 0.05, { chamfered: true }), 0.46, 0.7, 0.15)),
    dark(at(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 10).rotateX(Math.PI / 2), 0.46, 0.7, 0.5)),
    coloured(at(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 10).rotateX(Math.PI / 2), 0.46, 0.7, 0.61), 0x6aa0e8),
    coloured(at(new THREE.SphereGeometry(0.035, 6, 4), 0.46, 0.89, -0.05), SPOT),
    coloured(at(new THREE.CylinderGeometry(0.055, 0.055, 0.36, 6).rotateZ(Math.PI / 2.6), 0.3, 0.5, 0.07), SKIN),
  ];
}
