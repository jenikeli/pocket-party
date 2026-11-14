// The stilt hut's white posts (M7d4d), as at the reference beach course: round white posts with a cap along the deck's
// front rail and along the walkway, and a rope that sags between the walkway's posts. Returns a list of coloured
// shapes for the hut's painted part. Used by kit/stilt-hut.js.

import * as THREE from 'three';
import { at, between as stretch, coloured, roundedCylinder } from '../shape-utils.js';
import { DECK, FLOOR } from './stilt-hut-wood.js';

const POST = 0xf4f0e6;
const ROPE = 0xe0d0a8;
const WALKWAY_TOP = DECK + 0.02;
const WALKWAY_POSTS = [2.3, 3.7, 5.2];

export function buildPosts() {
  const parts = [];
  for (const x of [-2.1, -1.4, -0.65, 0.65, 1.4, 2.1]) {
    parts.push(post(x, 2.06, FLOOR, 0.85));
  }
  for (const x of [-0.55, 0.55]) {
    for (const z of WALKWAY_POSTS) {
      parts.push(post(x, z, WALKWAY_TOP, 0.8));
    }
    parts.push(...rope(x));
  }
  return parts;
}

// A post standing on `base`, `height` tall, with a rounded cap.
function post(x, z, base, height) {
  return coloured(at(roundedCylinder(0.07, 0.08, height, 0.025, 8), x, base + height / 2, z), POST);
}

// A rope from the top of each walkway post to the next, hanging a little in the middle (two straight pieces).
function rope(x) {
  const parts = [];
  const top = WALKWAY_TOP + 0.72;
  for (let index = 0; index < WALKWAY_POSTS.length - 1; index += 1) {
    const [from, to] = [WALKWAY_POSTS[index], WALKWAY_POSTS[index + 1]];
    const middle = [x, top - 0.1, (from + to) / 2];
    for (const [start, end] of [[[x, top, from], middle], [middle, [x, top, to]]]) {
      parts.push(coloured(stretch(new THREE.CylinderGeometry(0.03, 0.03, 1, 5), start, end), ROPE));
    }
  }
  return parts;
}
