// The floodlight tower's lamp head (M7d4c3): a light-grey box in a darker frame with a grid of round lamps, each
// sunk in a hood (a rim and a visor) with a dark reflector behind its glass. Used by kit/floodlight.js. Facing +z,
// standing on y = 0 like the tower; returns the head's steel (coloured per vertex) and its glass, merged.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';

export const TOWER_HEIGHT = 15;
export const HEAD_BOTTOM = TOWER_HEIGHT + 0.95;
const HEAD_WIDTH = 3.2;
const HEAD_HEIGHT = 2.4;
const HEAD_MIDDLE = HEAD_BOTTOM + HEAD_HEIGHT / 2;
const BOX = 0xd8dadf;
const FRAME = 0x565b64;
const COLUMNS = 5;
const ROWS = 3;
const SPACING = 0.58;
const LAMP_Z = 0.6;

export function buildLampHead() {
  const steel = [
    coloured(at(roundedBox(HEAD_WIDTH, HEAD_HEIGHT, 0.5, 0.06, { chamfered: true }), 0, HEAD_MIDDLE, 0.3), BOX),
    ...frame(),
  ];
  const glass = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const x = (column - (COLUMNS - 1) / 2) * SPACING;
      const y = HEAD_MIDDLE + (1 - row) * SPACING;
      steel.push(...hood(x, y));
      glass.push(at(new THREE.SphereGeometry(0.2, 10, 4, 0, 2 * Math.PI, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.5), x, y, LAMP_Z + 0.02));
    }
  }
  return { steel, glass: mergeShapes(glass) };
}

// The frame round the head's front: four bars standing proud of its face.
function frame() {
  const [halfWidth, halfHeight] = [HEAD_WIDTH / 2, HEAD_HEIGHT / 2];
  const bar = (width, height, x, y) => coloured(at(roundedBox(width, height, 0.12, 0.03, { chamfered: true }), x, HEAD_MIDDLE + y, 0.58), FRAME);
  return [
    bar(HEAD_WIDTH + 0.1, 0.14, 0, halfHeight),
    bar(HEAD_WIDTH + 0.1, 0.14, 0, -halfHeight),
    bar(0.14, HEAD_HEIGHT, -halfWidth, 0),
    bar(0.14, HEAD_HEIGHT, halfWidth, 0),
  ];
}

// One lamp's hood at (x, y): a dark reflector disc, a rim round the lamp and a visor above it.
function hood(x, y) {
  const reflector = new THREE.CylinderGeometry(0.28, 0.28, 0.04, 12).rotateX(Math.PI / 2);
  const rim = new THREE.TorusGeometry(0.28, 0.035, 5, 12);
  const visor = roundedBox(0.62, 0.05, 0.22, 0.015, { chamfered: true });
  return [
    coloured(at(reflector, x, y, LAMP_Z - 0.03), 0x2a2d33),
    coloured(at(rim, x, y, LAMP_Z + 0.03), FRAME),
    coloured(at(visor, x, y + 0.31, LAMP_Z + 0.06), FRAME),
  ];
}
