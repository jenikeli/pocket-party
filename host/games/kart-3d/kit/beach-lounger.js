// The sun lounger (M7d4c4): a wooden frame with side rails and four legs, slats across the bed and the raised
// back, a rolled pillow and a towel with a stripe whose foot end folds over the frame. About 2 long along x,
// facing +z. Used by kit/beach-props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';

const FRAME = 0xb58a5a;
const SLAT = 0xc89c68;
const TOWEL = 0x2f9be8;
const TOWEL_STRIPE = 0xf6f4ee;
const BACK_ANGLE = 0.6;

// Rails along the bed and the back, and legs under the bed (chamfered: they are small).
function frame() {
  const parts = [];
  for (const z of [-0.31, 0.31]) {
    parts.push(coloured(at(roundedBox(1.35, 0.07, 0.06, 0.02, { chamfered: true }), -0.22, 0.33, z), FRAME));
    parts.push(coloured(at(roundedBox(0.8, 0.07, 0.06, 0.02, { chamfered: true }).rotateZ(BACK_ANGLE), 0.7, 0.55, z), FRAME));
    for (const x of [-0.85, 0.4]) {
      parts.push(coloured(at(roundedBox(0.07, 0.34, 0.07, 0.02, { chamfered: true }), x, 0.17, z), FRAME));
    }
  }
  // A prop stick holds the back up.
  parts.push(coloured(at(roundedBox(0.05, 0.4, 0.05, 0.015, { chamfered: true }).rotateZ(-0.5), 0.55, 0.45, 0), FRAME));
  return parts;
}

// Slats across the bed (along z), then up the back, each a thin board with a gap between.
function slats() {
  const parts = [];
  for (let slat = 0; slat < 9; slat += 1) {
    parts.push(coloured(at(new THREE.BoxGeometry(0.12, 0.03, 0.64), -0.82 + slat * 0.15, 0.38, 0), SLAT));
  }
  for (let slat = 0; slat < 5; slat += 1) {
    const along = 0.18 + slat * 0.14;
    const slatBox = new THREE.BoxGeometry(0.12, 0.03, 0.64).rotateZ(BACK_ANGLE);
    parts.push(coloured(at(slatBox, 0.55 + Math.cos(BACK_ANGLE) * along, 0.38 + Math.sin(BACK_ANGLE) * along + 0.02, 0), SLAT));
  }
  return parts;
}

// A towel over the bed with a stripe across it, a fold hanging over the foot end and a rolled pillow at the head.
function towel() {
  return [
    coloured(at(roundedBox(1.0, 0.035, 0.5, 0.012, { chamfered: true }), -0.3, 0.415, 0), TOWEL),
    coloured(at(roundedBox(0.1, 0.036, 0.505, 0.012, { chamfered: true }), -0.3, 0.417, 0), TOWEL_STRIPE),
    coloured(at(roundedBox(0.04, 0.2, 0.5, 0.015, { chamfered: true }), -0.81, 0.31, 0), TOWEL),
    coloured(at(new THREE.CylinderGeometry(0.07, 0.07, 0.46, 8).rotateX(Math.PI / 2), 0.4, 0.5, 0), TOWEL),
  ];
}

export function loungerShape() {
  return mergeShapes([...frame(), ...slats(), ...towel()]);
}
