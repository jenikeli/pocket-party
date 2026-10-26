// The kit's block curbs (M7d2), as at Koopa Cape: a row of raised blocks with round studs on top like toy bricks,
// green and yellow in turn, about half a kart high, along the road's edge. Returns { add(segment, side),
// end(station, index, side, facing), meshes() } for kit/barriers.js: no block reaches past the row's ends, so
// the row stops on a whole block where it meets the next barrier.

import * as THREE from 'three';
import { frameAt, facingAlong, edgeLateral, placeInstances } from './frames.js';
import { at, mergeShapes } from '../shape-utils.js';

const COLORS = [0x2fae3a, 0xffd21e];
const BLOCK_OUT = 0.42;
// A block every this far along the row, so they sit end to end on the inside of a bend and the outside alike.
const BLOCK_SPACING = 1;
// A block's length along the row.
const BLOCK_LENGTH = 0.96;

export function createBlockCurbs({ keep }) {
  const blocks = [];
  const colors = [];
  const sides = [];
  // How far each side's row has run past its last block, by side.
  const runOn = new Map([[-1, BLOCK_SPACING], [1, BLOCK_SPACING]]);
  // Where each row starts or stops: [{ side, point }]. Ends are found as the course is walked, and a row may
  // end at the lap's start before its last blocks are added, so blocks are checked against them at the end.
  const rowEnds = [];
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
        sides.push(side);
      }
      runOn.set(side, length - (along - BLOCK_SPACING));
    },
    end(station, index, side) {
      rowEnds.push({ side, point: new THREE.Vector3().setFromMatrixPosition(frameAt(station, edgeLateral(station, side) + side * BLOCK_OUT, 0, facingAlong(station))) });
    },
    meshes() {
      const plastic = keep(new THREE.MeshStandardMaterial({ roughness: 0.3 }));
      const clear = blocks.map((block, index) => {
        const middle = new THREE.Vector3().setFromMatrixPosition(block);
        return rowEnds.every((rowEnd) => rowEnd.side !== sides[index] || rowEnd.point.distanceTo(middle) >= BLOCK_LENGTH / 2);
      });
      const kept = (list) => list.filter((_, index) => clear[index]);
      return [placeInstances(keep(buildBlock()), plastic, kept(blocks), kept(colors))];
    },
  };
}

// A block 0.84 wide, 0.5 high and 0.96 long (along the road) with four studs on top; white, coloured per
// instance.
function buildBlock() {
  const studs = [-0.22, 0.22].flatMap((x) => [-0.24, 0.24].map((z) => at(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 6), x, 0.55, z)));
  return mergeShapes([at(new THREE.BoxGeometry(0.84, 0.5, BLOCK_LENGTH), 0, 0.25, 0), ...studs]);
}
