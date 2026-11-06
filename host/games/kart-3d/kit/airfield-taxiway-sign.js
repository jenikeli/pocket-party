// The taxiway sign (M9 task K): three fat boards in a row on two stout legs, as the signs beside real taxiways
// stand: a black board with a yellow letter (where you are) between two yellow boards with a black letter and an
// arrow (where to turn). The three faces are drawn in one picture (one map, one material). Takes the kit and
// returns the parts: the frame and legs (coloured per vertex) and the faces; facing +z, standing on y = 0, centred
// on its middle. Used by kit/props.js.

import * as THREE from 'three';
import { at, mergeShapes } from '../shape-utils.js';
import { createCanvas, canvasTexture } from '../canvas-texture.js';
import { PAINT, box } from './airport-vehicle-parts.js';

const BOARD_WIDTH = 1.5;
const BOARD_HEIGHT = 1.1;
const BOARD_GAP = 0.12;
const BOARD_BOTTOM = 0.9;
const DEPTH = 0.18;
const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
const TILE = [256, 192];
// The boards are drawn at TILE's size and scaled down by this into the map, so the map stays 512 wide (the 512 rule).
const MAP_SCALE = 2 / 3;
// What each board says, left to right: the letter, its colours and which way its arrow points (0 for none).
const BOARDS = [
  { letter: 'B', board: '#f5c21b', ink: '#16161a', arrow: -1 },
  { letter: 'A2', board: '#16161a', ink: '#f5c21b', arrow: 0 },
  { letter: 'C', board: '#f5c21b', ink: '#16161a', arrow: 1 },
];
const boardX = (index) => (index - 1) * (BOARD_WIDTH + BOARD_GAP);

// The frame and legs: a fat rounded frame behind each board, and two legs under the outer boards.
export function taxiwaySignFrame() {
  const middle = BOARD_BOTTOM + BOARD_HEIGHT / 2;
  return [
    ...BOARDS.map((unused, index) => box(PAINT.black, [BOARD_WIDTH, BOARD_HEIGHT, DEPTH], [boardX(index), middle, 0], 0.12)),
    ...[-1, 1].flatMap((side) => [
      box(PAINT.grey, [0.22, BOARD_BOTTOM + 0.1, 0.22], [side * boardX(2) * 0.85, (BOARD_BOTTOM + 0.1) / 2, 0], 0.07),
      box(PAINT.darkGrey, [0.55, 0.12, 0.55], [side * boardX(2) * 0.85, 0.06, 0], 0.05),
    ]),
  ];
}

// The faces: one geometry, a quad inside each frame, its texture coordinates on that board's third of the picture.
export function taxiwaySignFaces() {
  const quads = BOARDS.map((unused, index) => {
    const quad = new THREE.PlaneGeometry(BOARD_WIDTH - 0.16, BOARD_HEIGHT - 0.16);
    const { uv } = quad.attributes;
    for (let corner = 0; corner < uv.count; corner += 1) {
      uv.setX(corner, (index + uv.getX(corner)) / BOARDS.length);
    }
    return at(quad, boardX(index), BOARD_BOTTOM + BOARD_HEIGHT / 2, DEPTH / 2 + 0.005);
  });
  return mergeShapes(quads);
}

function drawBoards() {
  const { canvas, context } = createCanvas(TILE[0] * BOARDS.length * MAP_SCALE, TILE[1] * MAP_SCALE);
  context.scale(MAP_SCALE, MAP_SCALE);
  BOARDS.forEach(({ letter, board, ink, arrow }, index) => {
    const left = index * TILE[0];
    context.fillStyle = board;
    context.fillRect(left, 0, TILE[0], TILE[1]);
    context.strokeStyle = ink;
    context.lineWidth = 6;
    context.strokeRect(left + 8, 8, TILE[0] - 16, TILE[1] - 16);
    context.fillStyle = ink;
    context.font = `900 ${arrow === 0 ? 120 : 96}px ${FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(letter, left + TILE[0] / 2 - arrow * 30, TILE[1] / 2 + 6);
    if (arrow !== 0) {
      // A fat triangle on the side of the letter the arrow points to.
      const tip = left + TILE[0] / 2 + arrow * 86;
      context.beginPath();
      context.moveTo(tip, TILE[1] / 2);
      context.lineTo(tip - arrow * 46, TILE[1] / 2 - 36);
      context.lineTo(tip - arrow * 46, TILE[1] / 2 + 36);
      context.fill();
    }
  });
  return canvas;
}

export function buildTaxiwaySign(kit) {
  const faces = new THREE.MeshStandardMaterial({ map: kit.keep(canvasTexture(drawBoards())), roughness: 0.45 });
  return [
    { geometry: kit.keep(mergeShapes(taxiwaySignFrame())), material: kit.materials.painted },
    { geometry: kit.keep(taxiwaySignFaces()), material: kit.keep(faces) },
  ];
}
