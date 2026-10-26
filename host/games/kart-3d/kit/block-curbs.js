// The kit's block curbs (M7d2), as at Koopa Cape: a row of chunky raised blocks along the road's edge, green and
// yellow in turn, about half a kart high. Since M7d4 shaped as MK8DX's are (docs/mk8dx-reference.md, "The kit's
// objects up close"): each block about as tall as it is deep, with well rounded edges and no studs, lighter on
// top and darker at its foot, a little gap between one block and the next so the row bends round corners like a
// chain. Returns { add(segment, side), end(station, index, side, facing), meshes() } for kit/barriers.js: no
// block reaches past the row's ends, so the row stops on a whole block where it meets the next barrier.

import * as THREE from 'three';
import { frameAt, facingAlong, edgeLateral, placeInstances } from './frames.js';
import { at, coloured, roundedBox, shaded } from '../shape-utils.js';

const COLORS = [0x2fae3a, 0xffd21e];
const BLOCK_OUT = 0.42;
// A block every this far along the row, so they sit end to end on the inside of a bend and the outside alike.
const BLOCK_SPACING = 1;
// A block's size: across the road, up and along the row (a little shorter than the spacing, for the gap).
const BLOCK_WIDTH = 0.84;
const BLOCK_HEIGHT = 0.6;
const BLOCK_LENGTH = 0.88;

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
      const plastic = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }));
      const clear = blocks.map((block, index) => {
        const middle = new THREE.Vector3().setFromMatrixPosition(block);
        return rowEnds.every((rowEnd) => rowEnd.side !== sides[index] || rowEnd.point.distanceTo(middle) >= BLOCK_LENGTH / 2);
      });
      const kept = (list) => list.filter((_, index) => clear[index]);
      return [placeInstances(keep(buildBlock()), plastic, kept(blocks), kept(colors))];
    },
  };
}

// A rounded block, white (coloured per instance) shading to grey at its foot, where it meets the ledge.
function buildBlock() {
  const block = coloured(at(roundedBox(BLOCK_WIDTH, BLOCK_HEIGHT, BLOCK_LENGTH, 0.13), 0, BLOCK_HEIGHT / 2, 0), 0xffffff);
  return shaded(block, (x, y) => 0.68 + 0.32 * Math.min(1, y / (BLOCK_HEIGHT * 0.7)));
}
