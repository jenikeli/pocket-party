// The kit's sponsor stand (M7d2): an A-frame of two printed boards (kit/sponsors.js) leaning together on white
// legs, set beside the road as at Mario Kart Stadium. Each stand shows its own brand, so the stands are merged
// into one shape with their own texture coordinates rather than instanced. Used by kit/props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes } from '../shape-utils.js';
import { withShadows } from './frames.js';
import { sponsorUv } from './sponsors.js';

const WIDTH = 2.6;
const BOARD_HEIGHT = 0.82;
// How far each board leans back from upright.
const LEAN = 0.32;

// Every stand merged into two meshes (legs and boards), each stand showing its own brand. `frames` are the stands'
// placing matrices (props.js's spotFrame). Returns the meshes to add to the world.
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

// Returns { frame, boards }: the legs (coloured per vertex) and the two boards showing brand `brand`, facing +z
// and -z, standing on y = 0.
export function buildSponsorStand(brand) {
  const boards = [1, -1].map((facing) => {
    const board = new THREE.PlaneGeometry(WIDTH, BOARD_HEIGHT);
    const uv = board.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) {
      uv.setXY(index, ...sponsorUv(brand, uv.getX(index), uv.getY(index)));
    }
    board.rotateX(-LEAN).translate(0, BOARD_HEIGHT / 2 + 0.25, 0.08 + Math.sin(LEAN) * (BOARD_HEIGHT / 2));
    return facing > 0 ? board : board.rotateY(Math.PI);
  });
  const legs = [-1, 1].flatMap((side) => [1, -1].map((facing) => {
    const leg = new THREE.BoxGeometry(0.08, 1.25, 0.06).rotateX(-LEAN * facing);
    return coloured(at(leg, side * (WIDTH / 2 - 0.05), 0.6, facing * 0.22), 0xf4f4f0);
  }));
  return { frame: mergeShapes(legs), boards: mergeShapes(boards) };
}
