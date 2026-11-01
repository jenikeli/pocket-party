// Three surfboards stuck in a mound of sand (M7d4c4): each an outline with a rounded tail and a pointed nose,
// extruded with rounded rails, with a stripe, a stringer line and a fin on its back. Facing +z. Used by
// kit/beach-props.js.

import * as THREE from 'three';
import { extruded } from './extruded.js';
import { at, coloured, mergeShapes } from '../shape-utils.js';

const BOARD_LENGTH = 2.1;
const HALF_WIDTH = 0.26;
const TAIL_FRACTION = 0.4;
const SAND = 0xe6cf9a;
const BOARDS = [
  { body: 0xffd21e, stripe: 0xe8402f },
  { body: 0x2f9be8, stripe: 0xf6f4ee },
  { body: 0xff8fc8, stripe: 0x8a4fd8 },
];

// A board's half width at `along` (0 tail, 1 nose): a round tail and a nose coming to a point.
function halfWidth(along) {
  const fromWidest = along < TAIL_FRACTION ? (TAIL_FRACTION - along) / TAIL_FRACTION : (along - TAIL_FRACTION) / (1 - TAIL_FRACTION);
  const sharpness = along < TAIL_FRACTION ? 2.2 : 1.7;
  return HALF_WIDTH * Math.pow(1 - Math.pow(fromWidest, sharpness), 0.6);
}

// The outline of the board between `from` and `to` along it, `inset` narrower: x across, y up the board.
function outline(from, to, inset) {
  const steps = 16;
  const along = Array.from({ length: steps + 1 }, (_, step) => from + ((to - from) * step) / steps);
  const left = along.map((value) => new THREE.Vector2(-(halfWidth(value) - inset), value * BOARD_LENGTH));
  const right = along.map((value) => new THREE.Vector2(halfWidth(value) - inset, value * BOARD_LENGTH)).reverse();
  return new THREE.Shape([...left, ...right]);
}

function extrudeOutline(shape, thickness, bevel) {
  return extruded(shape, { depth: thickness, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
}

// One board standing on y = 0 with its centre on x = 0 and its tail up out of the sand a little.
function board({ body, stripe }) {
  const parts = [
    coloured(extrudeOutline(outline(0, 1, 0.02), 0.03, 0.02), body),
    coloured(at(extrudeOutline(outline(0.5, 0.64, 0.02), 0.012, 0), 0, 0, 0.045), stripe),
    coloured(at(extrudeOutline(new THREE.Shape([new THREE.Vector2(-0.012, 0.15), new THREE.Vector2(0.012, 0.15), new THREE.Vector2(0.012, 1.75), new THREE.Vector2(-0.012, 1.75)]), 0.012, 0), 0, 0, 0.045), stripe),
  ];
  parts.push(coloured(fin(), 0x3a3a40));
  return mergeShapes(parts);
}

// A fin on the board's back near the tail, a thin swept plate: drawn flat (x along the board, y out from it),
// then stood up so it reaches out of the back (-z).
function fin() {
  const sweep = new THREE.Shape([new THREE.Vector2(-0.55, 0), new THREE.Vector2(-0.3, 0), new THREE.Vector2(-0.32, 0.22)]);
  const plate = extruded(sweep, { depth: 0.015, bevelEnabled: false });
  const { position } = plate.attributes;
  for (let index = 0; index < position.count; index += 1) {
    position.setXYZ(index, position.getZ(index) - 0.0075, -position.getX(index), -position.getY(index));
  }
  plate.computeVertexNormals();
  return plate;
}

export function surfboardsShape() {
  const parts = BOARDS.map((colors, index) => {
    const lean = (index - 1) * 0.16;
    const x = (index - 1) * 0.6;
    return at(board(colors).translate(0, -0.15, -0.015).rotateZ(-lean), x, 0.25, 0);
  });
  // The mound of sand they stand in, flat and wide.
  const mound = new THREE.SphereGeometry(0.9, 12, 6, 0, 2 * Math.PI, 0, Math.PI / 2).scale(1, 0.28, 0.5);
  return mergeShapes([...parts, coloured(mound, SAND)]);
}
