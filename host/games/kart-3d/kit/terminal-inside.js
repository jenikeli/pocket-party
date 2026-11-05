// The terminal's hall seen through its glass (M9), after the inside of Sunshine Airport's: a pale floor, tall
// yellow columns with coral feet branching into struts under the ceiling, rows of blue seats, and lit departure
// boards on the back wall. Only what reads through dark glass from the apron. Returns shapes by part, as
// kit/terminal-body.js does.

import * as THREE from 'three';
import { at, between, coloured, roundedBox, roundedCylinder } from '../shape-utils.js';
import { HALL_BACK, HALL_TOP, PLINTH_TOP } from './terminal-body.js';
import { BAND_PERIOD, CORAL, SUN_YELLOW } from './terminal-maps.js';

const COLUMN_X = -5;
const SEATS_X = -10;
const BOARD_SIZE = [7, 3.5];
// A board every this many units along the back wall.
const BOARD_EVERY = 32;

export function buildTerminalInside(length) {
  const floor = new THREE.PlaneGeometry(-HALL_BACK, length - 2).rotateX(-Math.PI / 2);
  const painted = [coloured(at(floor, HALL_BACK / 2, PLINTH_TOP + 0.01, 0), 0xe8e2d4)];
  // The columns stand halfway between the piers outside, so each is seen framed by the glass.
  for (let z = -length / 2 + BAND_PERIOD / 2; z < length / 2; z += BAND_PERIOD) {
    painted.push(...buildColumn(z), ...buildSeats(z));
  }
  const boards = [];
  for (let z = -length / 2 + BOARD_EVERY / 2; z < length / 2; z += BOARD_EVERY) {
    const board = new THREE.PlaneGeometry(...BOARD_SIZE).rotateY(Math.PI / 2);
    // Just proud of its frame's face.
    boards.push(coloured(at(board, HALL_BACK + 0.27, 6, z), 0xffffff));
    painted.push(coloured(at(roundedBox(0.3, BOARD_SIZE[1] + 0.4, BOARD_SIZE[0] + 0.4, 0.1), HALL_BACK + 0.1, 6, z), 0x2a2f38));
  }
  return { painted, board: boards };
}

// A yellow column on a coral foot, branching at its top into four struts under the ceiling.
function buildColumn(z) {
  const height = HALL_TOP - PLINTH_TOP;
  const top = [COLUMN_X, HALL_TOP - 1.6, z];
  const struts = [[-1.6, -1.6], [-1.6, 1.6], [1.6, -1.6], [1.6, 1.6]].map(([dx, dz]) =>
    coloured(between(new THREE.CylinderGeometry(0.16, 0.16, 1, 8), top, [COLUMN_X + dx, HALL_TOP, z + dz]), SUN_YELLOW));
  return [
    coloured(at(roundedCylinder(0.45, 0.45, height - 1.6, 0.08, 14), COLUMN_X, PLINTH_TOP + (height - 1.6) / 2, z), SUN_YELLOW),
    coloured(at(roundedCylinder(0.62, 0.66, 1.2, 0.1, 14), COLUMN_X, PLINTH_TOP + 0.6, z), CORAL),
    coloured(at(roundedCylinder(0.58, 0.45, 0.4, 0.08, 14), ...top), SUN_YELLOW),
    ...struts,
  ];
}

// Two back-to-back rows of seats, low blue blocks.
function buildSeats(z) {
  return [-0.55, 0.55].map((dx) => coloured(at(roundedBox(0.9, 0.9, 6, 0.2, { chamfered: true }), SEATS_X + dx, PLINTH_TOP + 0.45, z), 0x2a62c8));
}
