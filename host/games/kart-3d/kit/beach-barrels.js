// The barrels (M7d4c4): yellow oil drums turned on a lathe, with rolling hoops (ribs), a lid with a raised rim and
// a bung, and a printed label (a checkered flag, or a mushroom on the one lying on top). Three stand and one
// lies along x; labels face +z. Used by kit/beach-props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';

const YELLOW = 0xf2c11b;
const STEEL = 0x8a8a8e;
const RADIUS = 0.36;
const HEIGHT = 0.9;
const CELL_COUNT = 5;

// The drum's profile, from the bottom axis out and up: a rolled foot, two raised hoops, a lid rim round a sunken lid.
function drumProfile() {
  const half = HEIGHT / 2;
  const hoop = (y) => [[RADIUS, y - 0.07], [RADIUS + 0.025, y - 0.045], [RADIUS + 0.025, y + 0.045], [RADIUS, y + 0.07]];
  return [
    [0, -half], [RADIUS - 0.04, -half], [RADIUS, -half + 0.04],
    ...hoop(-0.27), ...hoop(0.27),
    [RADIUS, half - 0.04], [RADIUS + 0.02, half - 0.04], [RADIUS + 0.02, half], [RADIUS - 0.04, half],
    [RADIUS - 0.05, half - 0.04], [0, half - 0.04],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
}

function drum() {
  const body = new THREE.LatheGeometry(drumProfile(), 14);
  const bung = new THREE.CylinderGeometry(0.05, 0.05, 0.05, 8);
  return [coloured(body, YELLOW), coloured(at(bung, 0.17, HEIGHT / 2 - 0.02, 0), STEEL)];
}

// A cylinder segment of the drum's side `width` radians wide and `height` tall, centred on +z at height `y`.
function labelPiece(width, height, y, centre, lift) {
  return at(new THREE.CylinderGeometry(RADIUS + lift, RADIUS + lift, height, 6, 1, true, centre - width / 2, width), 0, y, 0);
}

// A white label with a checkered flag: a grid of black cells in two rows.
function flagLabel() {
  const cell = 0.3;
  const parts = [coloured(labelPiece(cell * CELL_COUNT, 0.3, 0, 0, 0.006), 0xf6f4ee)];
  for (let column = 0; column < CELL_COUNT; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      if ((column + row) % 2 === 0) {
        parts.push(coloured(labelPiece(cell, 0.15, row === 0 ? 0.075 : -0.075, (column - 2) * cell, 0.012), 0x2a2a30));
      }
    }
  }
  return parts;
}

// A white label with a red mushroom: a flat dome for the cap, a block for the stem.
function mushroomLabel() {
  const cap = new THREE.SphereGeometry(0.1, 10, 6, 0, 2 * Math.PI, 0, Math.PI / 2).rotateX(Math.PI / 2).scale(1, 1, 0.3);
  return [
    coloured(labelPiece(1.5, 0.3, 0, 0, 0.006), 0xf6f4ee),
    coloured(at(cap, 0, 0.04, RADIUS + 0.01), 0xe8402f),
    coloured(at(new THREE.BoxGeometry(0.08, 0.1, 0.02), 0, -0.07, RADIUS + 0.012), 0xe9d6a8),
  ];
}

// One drum with its label, standing or (turned about z, so the label stays facing +z) lying, at x, y, z.
function barrel(x, y, z, label, lying) {
  const shapes = [...drum(), ...label()].map((shape) => (lying ? shape.rotateZ(Math.PI / 2) : shape));
  return shapes.map((shape) => shape.translate(x, y, z));
}

export function barrelsShape() {
  return mergeShapes([
    ...barrel(-0.42, 0.45, 0, flagLabel, false),
    ...barrel(0.42, 0.45, 0, flagLabel, false),
    ...barrel(0, 0.45, -0.72, flagLabel, false),
    ...barrel(0, 1.27, -0.3, mushroomLabel, true),
  ]);
}
