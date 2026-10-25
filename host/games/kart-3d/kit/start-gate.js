// The kit's start gate (M7d2), themed like Mario Kart Stadium's: two chunky posts behind the walls either side
// of the start line, a big yellow sign across the road between them reading MARIO KART (drawn on a canvas) on both
// faces, with a red stripe along its foot and checks at its ends, and a round mushroom badge on top. The start
// lights (kit/start-lights.js) hang under the sign's middle. Used by the courses' dressings.

import * as THREE from 'three';
import { startGateIndex } from '../trackside-spots.js';
import { frameAt, facingBack, edgeLateral, withShadows } from './frames.js';
import { roundedBox, at, coloured, mergeShapes } from '../shape-utils.js';
import { createCanvas, canvasTexture } from '../canvas-texture.js';

const POST_WIDTH = 1.3;
// The thickest barrier (the padded wall with its fence) reaches this far out from the edge of the ground.
const BARRIER_CLEARANCE = 0.7;
const SIGN_BOTTOM = 6.6;
const SIGN_HEIGHT = 2.6;
const SIGN_DEPTH = 1;
const BADGE_RADIUS = 1.3;
const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';

// Adds the gate over the start line; `kit` is the course's { world, track, keep } (kit/kit.js).
// Returns the frame (a Matrix4) the start lights hang from: y up, z toward the karts on the grid.
export function buildStartGate({ world, track, keep }) {
  const station = track.stations[startGateIndex(track)];
  const frame = frameAt(station, 0, 0, facingBack(station));
  // The posts stand just behind the barriers on either side, clear of their boards and fences.
  const halfSpan = Math.max(-edgeLateral(station, -1), edgeLateral(station, 1)) + BARRIER_CLEARANCE + POST_WIDTH / 2;
  const painted = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }));
  const signMaterial = keep(new THREE.MeshStandardMaterial({ map: keep(drawSign()), roughness: 0.45 }));
  const badgeMaterial = keep(new THREE.MeshStandardMaterial({ map: keep(drawBadge()), roughness: 0.4 }));
  const signWidth = 2 * halfSpan + POST_WIDTH;
  const signMiddle = SIGN_BOTTOM + SIGN_HEIGHT / 2;
  const badgeMiddle = SIGN_BOTTOM + SIGN_HEIGHT + BADGE_RADIUS - 0.2;
  // The printed faces, front (toward the grid) and back, a hair in front of the sign's body.
  const faces = mergeFaces(signWidth - 0.5, SIGN_HEIGHT - 0.4, signMiddle, SIGN_DEPTH / 2 + 0.01);
  const badgeFaces = mergeFaces(2 * BADGE_RADIUS, 2 * BADGE_RADIUS, badgeMiddle, 0.13, new THREE.CircleGeometry(BADGE_RADIUS, 32));
  const parts = [
    new THREE.Mesh(keep(buildFrame(halfSpan, signWidth, signMiddle, badgeMiddle)), painted),
    new THREE.Mesh(keep(faces), signMaterial),
    new THREE.Mesh(keep(badgeFaces), badgeMaterial),
  ];
  for (const part of parts) {
    part.matrixAutoUpdate = false;
    part.matrix.copy(frame);
    world.add(withShadows(part));
  }
  return frame.clone().multiply(new THREE.Matrix4().makeTranslation(0, SIGN_BOTTOM, 0));
}

// The posts (white, a red band, a yellow cap), the sign's yellow body and the badge's red rim, as one shape.
function buildFrame(halfSpan, signWidth, signMiddle, badgeMiddle) {
  const posts = [-1, 1].flatMap((side) => [
    coloured(at(roundedBox(POST_WIDTH, SIGN_BOTTOM, POST_WIDTH, 0.15), side * halfSpan, SIGN_BOTTOM / 2, 0), 0xf4f4f0),
    coloured(at(roundedBox(POST_WIDTH + 0.1, 0.6, POST_WIDTH + 0.1, 0.1), side * halfSpan, 2.8, 0), 0xd8302a),
  ]);
  const rim = new THREE.TorusGeometry(BADGE_RADIUS, 0.16, 8, 32);
  return mergeShapes([
    ...posts,
    coloured(at(roundedBox(signWidth, SIGN_HEIGHT, SIGN_DEPTH, 0.25), 0, signMiddle, 0), 0xffc61e),
    coloured(at(new THREE.CylinderGeometry(BADGE_RADIUS, BADGE_RADIUS, 0.24, 32).rotateX(Math.PI / 2), 0, badgeMiddle, 0), 0xffffff),
    coloured(at(rim, 0, badgeMiddle, 0), 0xd8302a),
  ]);
}

// A printed face toward +z and the same turned to face -z (so it reads the right way round from behind too),
// `away` from the middle, centred at height `middle`.
function mergeFaces(width, height, middle, away, shape = new THREE.PlaneGeometry(width, height)) {
  const front = shape.clone().translate(0, middle, away);
  const back = shape.clone().rotateY(Math.PI).translate(0, middle, -away);
  shape.dispose();
  return mergeShapes([front, back]);
}

// MARIO KART in white with a dark red outline on yellow, a red stripe along the foot, checks at both ends.
function drawSign() {
  const { canvas, context } = createCanvas(1024, 256);
  context.fillStyle = '#ffd21e';
  context.fillRect(0, 0, 1024, 256);
  context.fillStyle = '#d8302a';
  context.fillRect(0, 206, 1024, 50);
  for (const left of [0, 1024 - 64]) {
    for (let row = 0; row < 6; row += 1) {
      for (let column = 0; column < 2; column += 1) {
        context.fillStyle = (row + column) % 2 === 0 ? '#ffffff' : '#1a1a1e';
        context.fillRect(left + column * 32, row * 32 + 14, 32, 32);
      }
    }
  }
  context.font = `italic 900 150px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 22;
  context.strokeStyle = '#a3141a';
  context.strokeText('MARIO KART', 512, 108, 840);
  context.fillStyle = '#ffffff';
  context.fillText('MARIO KART', 512, 108, 840);
  return canvasTexture(canvas);
}

// A red-capped mushroom with white spots and a smiling face, on white: the badge on top of the gate.
function drawBadge() {
  const { canvas, context } = createCanvas(256, 256);
  const fill = (color, path) => {
    context.beginPath();
    path();
    context.fillStyle = color;
    context.fill();
  };
  fill('#ffffff', () => context.rect(0, 0, 256, 256));
  fill('#f6dcb4', () => context.ellipse(128, 168, 52, 48, 0, 0, 2 * Math.PI));
  fill('#e8302a', () => context.ellipse(128, 118, 96, 72, 0, Math.PI, 2 * Math.PI));
  fill('#e8302a', () => context.rect(32, 117, 192, 20));
  for (const [x, y, radius] of [[128, 76, 24], [70, 112, 18], [186, 112, 18]]) {
    fill('#ffffff', () => context.arc(x, y, radius, 0, 2 * Math.PI));
  }
  for (const x of [110, 146]) {
    fill('#1a1a1e', () => context.ellipse(x, 166, 7, 14, 0, 0, 2 * Math.PI));
  }
  return canvasTexture(canvas);
}
