// The kit's sponsor stand (M7d2, rebuilt in M7d4c3 to the study), as Mario Circuit's "Nintendo" board: one printed
// board (kit/sponsors.js) facing the road in a frame with a raised rim, on two bevelled legs with feet; the back
// is a plain painted panel. Set beside the road. Each stand shows its own brand, so the stands are merged into
// one shape with their own texture coordinates rather than instanced. Used by kit/props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox } from '../shape-utils.js';
import { withShadows } from './frames.js';
import { sponsorUv } from './sponsors.js';

// The board's size; the frame adds RIM on every side, so the stand stays within 1.35 of its spot (PROP_REACH).
const WIDTH = 2.5;
const BOARD_HEIGHT = 0.78;
const RIM = 0.08;
const BOARD_MIDDLE = 1.3;
const PAINT = 0xf4f4f0;
const BACK = 0xdcdcd6;
const SHOE = 0x7c828c;

// Every stand merged into two meshes (legs and frame, boards), each stand showing its own brand. `frames` are the
// stands' placing matrices (props.js's spotFrame). Returns the meshes to add to the world.
export function buildSponsorStands(kit, frames) {
  const built = frames.map((frame, index) => {
    const stand = buildSponsorStand(index * 5 + 1);
    return { frame: stand.frame.applyMatrix4(frame), boards: stand.boards.applyMatrix4(frame) };
  });
  return [
    withShadows(new THREE.Mesh(kit.keep(mergeShapes(built.map((stand) => stand.frame))), kit.materials.painted)),
    withShadows(new THREE.Mesh(kit.keep(mergeShapes(built.map((stand) => stand.boards))), kit.sponsors)),
  ];
}

// Returns { frame, boards }: the frame, back panel, legs and feet (coloured per vertex) and the board showing
// brand `brand`, facing +z, standing on y = 0.
export function buildSponsorStand(brand) {
  const board = new THREE.PlaneGeometry(WIDTH, BOARD_HEIGHT);
  const uv = board.attributes.uv;
  for (let index = 0; index < uv.count; index += 1) {
    uv.setXY(index, ...sponsorUv(brand, uv.getX(index), uv.getY(index)));
  }
  board.translate(0, BOARD_MIDDLE, 0.05);
  return { frame: mergeShapes([...frameParts(), ...legParts()]), boards: board };
}

// The back panel and the raised rim round the board: top and bottom bars, then the sides.
function frameParts() {
  const bar = (width, height, x, y, color = PAINT) => coloured(at(roundedBox(width, height, 0.16, 0.035, { chamfered: true }), x, BOARD_MIDDLE + y, 0.06), color);
  const [outerWidth, outerHeight] = [WIDTH + 2 * RIM, BOARD_HEIGHT + 2 * RIM];
  return [
    coloured(at(roundedBox(outerWidth, outerHeight, 0.08, 0.02, { chamfered: true }), 0, BOARD_MIDDLE, 0.0), BACK),
    bar(outerWidth, RIM, 0, (BOARD_HEIGHT + RIM) / 2),
    bar(outerWidth, RIM, 0, -(BOARD_HEIGHT + RIM) / 2),
    bar(RIM, BOARD_HEIGHT, -(WIDTH + RIM) / 2, 0),
    bar(RIM, BOARD_HEIGHT, (WIDTH + RIM) / 2, 0),
  ];
}

// Two bevelled legs from the ground up behind the frame, each on a flat foot with a steel shoe.
function legParts() {
  return [-1, 1].flatMap((side) => {
    const x = side * (WIDTH / 2 - 0.3);
    return [
      coloured(at(roundedBox(0.16, 0.95, 0.12, 0.03, { chamfered: true }), x, 0.6, -0.05), PAINT),
      coloured(at(roundedBox(0.34, 0.07, 0.7, 0.025, { chamfered: true }), x, 0.035, 0.0), PAINT),
      coloured(at(roundedBox(0.2, 0.1, 0.16, 0.02, { chamfered: true }), x, 0.12, -0.05), SHOE),
    ];
  });
}
