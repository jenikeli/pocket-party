// The kit's turn boards (M7d3), as round the outside of MK8DX's corners (Mario Circuit's last turn): red boards
// with white chevrons pointing the way the road turns, turned to face the karts coming into the corner, on two
// posts that stand clear of the barrier on the ledge, which widens under them (kit/barriers.js). Placed by
// turnBoardSpots (kit/layout-rules.js). Since M7d4 built up as MK8DX's signs are (docs/mk8dx-reference.md, "The
// kit's objects up close"): a thick board whose rounded edges catch the light round its white rim, held to its
// posts by clamps, on round posts with caps and foot plates. Two instanced meshes for the boards (one per direction) and
// one for the posts and fittings. Used by the courses' dressings.

import * as THREE from 'three';
import { frameAt, facingBack, edgeLateral, placeInstances } from './frames.js';
import { at, coloured, mergeShapes, roundedBox, roundedCylinder } from '../shape-utils.js';
import { createCanvas, canvasTexture } from '../canvas-texture.js';

const WIDTH = 2.2;
const HEIGHT = 1.1;
const DEPTH = 0.1;
const BOTTOM = 1;
// The board's middle stands this far out on the ledge. Turned as it is, its posts stand about 0.72 either side
// of that across the road: the inner one clear of every low barrier (the striped rail reaches 0.48 out), the
// outer one well inside the wide ledge (BOARD_LEDGE, 2.7).
const OUT = 1.5;
// How far the board turns from facing straight back down the road toward the road's middle (tan of the angle).
const TURN_IN = 0.5;
// The posts stand this far either side of the board's middle, a little behind it.
const POST_SPREAD = WIDTH / 2 - 0.3;
const POST_BEHIND = -0.11;
const STEEL = 0x9aa0a8;

// Adds a board at each of `spots` ([{ index, side, turnsRight }]); `kit` is the course's { world, track, keep }.
export function buildTurnBoards({ world, track, keep }, spots) {
  const frames = spots.map((spot) => {
    const station = track.stations[spot.index];
    const facing = facingBack(station).addScaledVector(new THREE.Vector3(station.right.x, station.right.y, station.right.z), -spot.side * TURN_IN);
    return { frame: frameAt(station, edgeLateral(station, spot.side) + spot.side * OUT, 0, facing), turnsRight: spot.turnsRight };
  });
  const board = keep(buildBoard());
  for (const turnsRight of [true, false]) {
    const mine = frames.filter((spot) => spot.turnsRight === turnsRight).map((spot) => spot.frame);
    if (mine.length > 0) {
      const material = keep(new THREE.MeshStandardMaterial({ map: keep(drawChevrons(turnsRight)), roughness: 0.5 }));
      world.add(placeInstances(board, material, mine));
    }
  }
  const fittings = keep(buildFittings());
  world.add(placeInstances(fittings, keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.6 })), frames.map((spot) => spot.frame)));
}

// The board: a thick plate with rounded edges, its picture laid straight on from the front (so its edges show
// the picture's white rim, stretched round them), facing +z.
function buildBoard() {
  const board = at(roundedBox(WIDTH, HEIGHT, DEPTH, 0.04), 0, BOTTOM + HEIGHT / 2, 0);
  const { position, uv } = board.attributes;
  for (let index = 0; index < position.count; index += 1) {
    uv.setXY(index, position.getX(index) / WIDTH + 0.5, (position.getY(index) - BOTTOM) / HEIGHT);
  }
  return board;
}

// Two round steel posts behind the board, each on a foot plate with a cap on top, and two clamps holding the
// board to each post.
function buildFittings() {
  const top = BOTTOM + HEIGHT + 0.1;
  return mergeShapes(
    [-1, 1].flatMap((place) => {
      const x = place * POST_SPREAD;
      return [
        coloured(at(roundedCylinder(0.055, 0.055, top, 0.015, 6), x, top / 2, POST_BEHIND), STEEL),
        coloured(at(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 8), x, top + 0.02, POST_BEHIND), 0x6c7078),
        coloured(at(new THREE.BoxGeometry(0.28, 0.04, 0.28), x, 0.02, POST_BEHIND), 0x6c7078),
        ...[0.25, 0.75].map((share) => coloured(at(new THREE.BoxGeometry(0.16, 0.08, 0.14), x, BOTTOM + HEIGHT * share, POST_BEHIND + 0.03), 0x6c7078)),
      ];
    }),
  );
}

// Three white chevrons on red inside a white border, pointing right (or left), seen from the front: by the karts
// coming, so a right turn's board points right and a left turn's left, the way the road goes. A dark line just
// inside the border, and a bolt head in each corner.
function drawChevrons(pointRight) {
  const { canvas, context } = createCanvas(256, 128);
  context.fillStyle = '#f6f6f2';
  context.fillRect(0, 0, 256, 128);
  context.fillStyle = '#7a1a16';
  context.fillRect(9, 9, 238, 110);
  context.fillStyle = '#d8302a';
  context.fillRect(11, 11, 234, 106);
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
  for (const [x, y] of [[5, 5], [251, 5], [5, 123], [251, 123]]) {
    context.beginPath();
    context.arc(x, y, 2.5, 0, 2 * Math.PI);
    context.fillStyle = '#8a9098';
    context.fill();
  }
  return canvasTexture(canvas);
}
