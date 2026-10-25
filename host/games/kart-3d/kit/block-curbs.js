// The kit's block curbs (M7d2), as at Koopa Cape: a row of raised blocks with round studs on top like toy bricks,
// green and yellow in turn, about half a kart high, along the road's edge. Returns { add(segment, side),
// meshes() } for kit/barriers.js.

import * as THREE from 'three';
import { frameAt, facingAlong, edgeLateral, placeInstances } from './frames.js';
import { at, mergeShapes } from '../shape-utils.js';

const COLORS = [0x2fae3a, 0xffd21e];
const BLOCK_OUT = 0.42;
// A block every this far along the row, so they sit end to end on the inside of a bend and the outside alike.
const BLOCK_SPACING = 1;

export function createBlockCurbs({ keep }) {
  const blocks = [];
  const colors = [];
  // How far each side's row has run past its last block, by side.
  const runOn = new Map([[-1, BLOCK_SPACING], [1, BLOCK_SPACING]]);
  return {
    add({ station, next }, side) {
      const from = frameAt(station, edgeLateral(station, side) + side * BLOCK_OUT, 0, facingAlong(station));
      const to = frameAt(next, edgeLateral(next, side) + side * BLOCK_OUT, 0, facingAlong(next));
      const start = new THREE.Vector3().setFromMatrixPosition(from);
      const end = new THREE.Vector3().setFromMatrixPosition(to);
      const length = start.distanceTo(end);
      // Blocks between the two stations, each standing as the first station's frame does.
      let along = BLOCK_SPACING - runOn.get(side);
      for (; along < length; along += BLOCK_SPACING) {
        blocks.push(from.clone().setPosition(start.clone().lerp(end, along / length)));
        colors.push(COLORS[blocks.length % 2]);
      }
      runOn.set(side, length - (along - BLOCK_SPACING));
    },
    meshes() {
      const plastic = keep(new THREE.MeshStandardMaterial({ roughness: 0.3 }));
      return [placeInstances(keep(buildBlock()), plastic, blocks, colors)];
    },
  };
}

// A block 0.84 wide, 0.5 high and 0.96 long (along the road) with four studs on top; white, coloured per
// instance.
function buildBlock() {
  const studs = [-0.22, 0.22].flatMap((x) => [-0.24, 0.24].map((z) => at(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12), x, 0.55, z)));
  return mergeShapes([at(new THREE.BoxGeometry(0.84, 0.5, 0.96), 0, 0.25, 0), ...studs]);
}
