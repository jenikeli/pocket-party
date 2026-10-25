// The kit's MKTV van (M7d2): a white TV van with a blue stripe, dark windows, black wheels and a satellite dish on
// its roof, the MKTV board (kit/sponsors.js) on both its sides. Facing +z, standing on y = 0. Used by
// kit/props.js.

import * as THREE from 'three';
import { roundedBox, at, coloured, mergeShapes } from '../shape-utils.js';
import { sponsorUv } from './sponsors.js';

// The MKTV board's place among the sponsors (kit/sponsors.js).
const MKTV = 3;
const LENGTH = 4.6;
const WIDTH = 2;

// Returns { body, boards }: the van's shape (coloured per vertex) and its two printed boards (in the sponsor
// atlas's texture coordinates).
export function buildMktvVan() {
  const wheels = [-1, 1].flatMap((side) => [-1.45, 1.45].map((z) => coloured(at(new THREE.CylinderGeometry(0.42, 0.42, 0.3, 16).rotateZ(Math.PI / 2), side * 0.92, 0.42, z), 0x1d1d20)));
  const dish = new THREE.SphereGeometry(0.6, 16, 6, 0, 2 * Math.PI, 0, Math.PI / 3).rotateX(-0.9);
  const body = mergeShapes([
    coloured(at(roundedBox(WIDTH, 1.9, LENGTH, 0.22), 0, 1.38, 0), 0xf4f4f0),
    coloured(at(roundedBox(WIDTH + 0.04, 0.3, LENGTH + 0.04, 0.1), 0, 0.9, 0), 0x1d4fc4),
    coloured(at(roundedBox(WIDTH - 0.2, 0.6, 0.1, 0.05), 0, 1.85, LENGTH / 2), 0x1a2a44),
    ...wheels,
    coloured(at(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), 0, 2.55, -1), 0x9aa0a8),
    coloured(at(dish, 0, 2.8, -1), 0xe8eaee),
  ]);
  return { body, boards: buildBoards() };
}

// A board on each side of the van, facing out, reading left to right from beside it.
function buildBoards() {
  const boards = [-1, 1].map((side) => {
    const board = new THREE.PlaneGeometry(3, 0.94);
    const uv = board.attributes.uv;
    for (let index = 0; index < uv.count; index += 1) {
      uv.setXY(index, ...sponsorUv(MKTV, uv.getX(index), uv.getY(index)));
    }
    return board.rotateY((side * Math.PI) / 2).translate(side * (WIDTH / 2 + 0.01), 1.5, -0.3);
  });
  return mergeShapes(boards);
}
