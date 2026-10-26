// The kit's turn boards (M7d3), as round the outside of MK8DX's corners (Mario Circuit's last turn): red boards
// with white chevrons pointing the way the road turns, turned to face the karts coming into the corner, on two
// posts that stand clear of the barrier on the ledge, which widens under them (kit/barriers.js). Placed by
// turnBoardSpots (kit/layout-rules.js). Two instanced meshes for the boards (one per direction) and one for the
// posts. Used by the courses' dressings.

import * as THREE from 'three';
import { frameAt, facingBack, edgeLateral, placeInstances } from './frames.js';
import { at, mergeShapes } from '../shape-utils.js';
import { createCanvas, canvasTexture } from '../canvas-texture.js';

const WIDTH = 2.2;
const HEIGHT = 1.1;
const BOTTOM = 1;
// The board's middle stands this far out on the ledge. Turned as it is, its posts stand about 0.72 either side
// of that across the road: the inner one clear of every low barrier (the striped rail reaches 0.48 out), the
// outer one well inside the wide ledge (BOARD_LEDGE, 2.7).
const OUT = 1.5;
// How far the board turns from facing straight back down the road toward the road's middle (tan of the angle).
const TURN_IN = 0.5;

// Adds a board at each of `spots` ([{ index, side, turnsRight }]); `kit` is the course's { world, track, keep }.
export function buildTurnBoards({ world, track, keep }, spots) {
  const frames = spots.map((spot) => {
    const station = track.stations[spot.index];
    const facing = facingBack(station).addScaledVector(new THREE.Vector3(station.right.x, station.right.y, station.right.z), -spot.side * TURN_IN);
    return { frame: frameAt(station, edgeLateral(station, spot.side) + spot.side * OUT, 0, facing), turnsRight: spot.turnsRight };
  });
  const board = keep(at(new THREE.BoxGeometry(WIDTH, HEIGHT, 0.08), 0, BOTTOM + HEIGHT / 2, 0));
  for (const turnsRight of [true, false]) {
    const mine = frames.filter((spot) => spot.turnsRight === turnsRight).map((spot) => spot.frame);
    if (mine.length > 0) {
      const material = keep(new THREE.MeshStandardMaterial({ map: keep(drawChevrons(turnsRight)), roughness: 0.5 }));
      world.add(placeInstances(board, material, mine));
    }
  }
  const posts = keep(mergeShapes([-1, 1].map((side) => at(new THREE.BoxGeometry(0.1, BOTTOM + 0.2, 0.1), side * (WIDTH / 2 - 0.3), (BOTTOM + 0.2) / 2, -0.06))));
  world.add(placeInstances(posts, keep(new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.4, metalness: 0.6 })), frames.map((spot) => spot.frame)));
}

// Three white chevrons on red inside a white border, pointing right (or left), seen from the front: by the karts
// coming, so a right turn's board points right and a left turn's left, the way the road goes.
function drawChevrons(pointRight) {
  const { canvas, context } = createCanvas(256, 128);
  context.fillStyle = '#f6f6f2';
  context.fillRect(0, 0, 256, 128);
  context.fillStyle = '#d8302a';
  context.fillRect(8, 8, 240, 112);
  context.fillStyle = '#f6f6f2';
  for (const x of [56, 118, 180]) {
    const tip = pointRight ? 1 : -1;
    context.beginPath();
    context.moveTo(x - tip * 24, 20);
    context.lineTo(x + tip * 16, 64);
    context.lineTo(x - tip * 24, 108);
    context.lineTo(x - tip * 4, 108);
    context.lineTo(x + tip * 36, 64);
    context.lineTo(x - tip * 4, 20);
    context.fill();
  }
  return canvasTexture(canvas);
}
