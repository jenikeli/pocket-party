// Fern (M7d5), our green racer: a cheerful frog with a wide flattened head, big eyes bulging up on top of it, a wide
// smile and a pale yellow throat and belly, in a cream racing vest with green stripes over a darker green body, cream
// gloves on the wheel and long legs folded up into the nose with webbed feet. Her emblem is a lily pad with a pink
// flower. Her kart is green, pale yellow and deep green. One entry of kart-designs.js's KART_DESIGNS; her own parts
// (the squashed head, the two-tone skin, the vest's stripes, the frog's legs) are in fern-parts.js.

import * as THREE from 'three';
import { partList, limb, painted, emblemDisc } from '../part-shapes.js';
import { head, body, arm } from '../driver-parts.js';
import { eyes, eyebrows, cheeks, smile } from '../driver-face.js';
import { squashed, twoTone, vestStripes, frogLeg } from './fern-parts.js';

const GREEN = 0x2ecc71;
const BELLY = 0xf3e9a6;
const DEEP_GREEN = 0x1f5c38;
// Her skin is drawn in the glossy kind, not the skin kind: that one's warm glow (kept for peach faces in shade)
// turns green olive, and a frog's skin is wet and shiny anyway. Only the throat under the head and the blush,
// warm colours, are in the skin kind.
const SKIN = 0x62cc52;
const DARK_SKIN = 0x43a844;
const VEST = 0xf4eedb;
const GLOVE = 0xf6f1e0;

const HEAD_RADIUS = 0.33;
// The head squashed wide and flat, as a frog's is: this much wider, lower and deeper than a round head.
const HEAD_STRETCH = [1.22, 0.74, 1.04];

export const FERN = Object.freeze({
  id: 'fern',
  name: 'Fern',
  slot: 2,
  palette: Object.freeze({ main: GREEN, second: BELLY, third: DEEP_GREEN }),
  drawEmblem,
  buildDriver,
});

// A notched green lily pad with a pink flower on it, on a pale yellow disc.
function drawEmblem(context, size) {
  context.fillStyle = '#f3e9a6';
  context.fillRect(0, 0, size, size);
  const middle = size / 2;
  // The pad: a disc with a wedge cut out toward its top right, and its veins running out from the middle.
  context.beginPath();
  context.moveTo(middle, middle);
  context.arc(middle, middle, size * 0.4, -Math.PI * 0.32, -Math.PI * 0.18, true);
  context.closePath();
  context.fillStyle = '#2e9e4f';
  context.fill();
  context.strokeStyle = '#7fd38a';
  context.lineWidth = size * 0.025;
  [0.2, 0.55, 0.9, 1.25, 1.6].forEach((turn) => {
    context.beginPath();
    context.moveTo(middle, middle);
    context.lineTo(middle + Math.cos(turn) * size * 0.33, middle + Math.sin(turn) * size * 0.33);
    context.stroke();
  });
  // The flower: six pink petals round a yellow middle, a little left of and above the pad's middle.
  const [flowerX, flowerY] = [middle - size * 0.07, middle - size * 0.05];
  for (let petal = 0; petal < 6; petal += 1) {
    const turn = (petal / 6) * Math.PI * 2;
    context.beginPath();
    context.ellipse(flowerX + Math.cos(turn) * size * 0.1, flowerY + Math.sin(turn) * size * 0.1, size * 0.1, size * 0.055, turn, 0, Math.PI * 2);
    context.fillStyle = petal % 2 ? '#ff8fbf' : '#ff6fa8';
    context.fill();
  }
  context.beginPath();
  context.arc(flowerX, flowerY, size * 0.06, 0, Math.PI * 2);
  context.fillStyle = '#ffd23f';
  context.fill();
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  addBody(parts, seat.hip);
  addLimbs(parts, seat);
  addHead(parts, [x, y + 0.8, z + 0.06]);
  return parts;
}

// A pale yellow belly (green round the back) under a cream vest with twin green stripes front and back, a green
// collar, the emblem on the chest and a bigger one on the back, so a chasing player sees whose it is; the throat up
// to the head.
function addBody(parts, hip) {
  const [x, y, z] = hip;
  const shape = { width: 0.6, height: 0.66, depth: 0.46 };
  const [belly, vest] = body([x, y - 0.02, z], { ...shape, lower: BELLY, upper: VEST });
  parts.glossy.push(twoTone(belly, [x, y + 0.18, z], DARK_SKIN, (direction) => -direction.z * 2));
  parts.cloth.push(vest, ...vestStripes([x, y - 0.02 + shape.height * 0.68, z], shape, GREEN));
  const collar = new THREE.TorusGeometry(0.13, 0.04, 8, 24).rotateX(Math.PI / 2).translate(x, y + 0.58, z + 0.02);
  parts.cloth.push(painted(collar, GREEN, { crease: 0.1 }));
  parts.decal.push(emblemDisc(0.06, [0, 0.25, 1], [x, y + 0.47, z + 0.225]));
  parts.decal.push(emblemDisc(0.1, [0, 0.65, -1], [x, y + 0.5, z - 0.215]));
  parts.skin.push(limb([x, y + 0.48, z + 0.02], [x, y + 0.66, z + 0.05], 0.11, BELLY));
}

// Bare green arms out of the vest to cream gloves on the wheel; long green legs folded up beside the wheel and down
// into the nose, ending in webbed feet.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.27, y + 0.5, z], hand, { radius: 0.07, bend: 0.12, sleeve: DARK_SKIN, cuff: GREEN, glove: 0.1, gloveHex: GLOVE });
    // arm's sleeves are the upper arm, the forearm and the cuff: the first two are her bare skin.
    parts.glossy.push(...sleeves.slice(0, 2));
    parts.cloth.push(sleeves[2], ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    parts.glossy.push(...frogLeg([x + side * 0.15, y + 0.05, z + 0.08], foot, { skin: DARK_SKIN, toes: SKIN }));
  });
}

// The head: a round shared head with its smile and blush, squashed wide and flat together so the face keeps its
// place on it, pale yellow from the mouth's corners down; then two eye bumps on top, each a small round head of its own with
// one of the shared eyes and a brow on its front.
function addHead(parts, at) {
  const face = head(at, HEAD_RADIUS, SKIN);
  twoTone(face.shape, at, BELLY, (direction) => (-direction.y - 0.17) * 7);
  const mouth = smile(face, { width: 0.32, up: -0.2 });
  const { blush } = cheeks(face, { across: 0.62, up: -0.08, radius: 0.06, blushHex: 0xf59a8a, freckleHex: SKIN });
  parts.glossy.push(squashed(face.shape, at, HEAD_STRETCH));
  parts.skin.push(...blush.map((shape) => squashed(shape, at, HEAD_STRETCH)));
  mouth.forEach((shape) => parts.matte.push(squashed(shape, at, HEAD_STRETCH)));
  const bumpRadius = 0.145;
  [1, -1].forEach((side, index) => {
    const bump = head([at[0] + side * 0.16, at[1] + 0.2, at[2] + 0.07], bumpRadius, SKIN);
    parts.glossy.push(bump.shape);
    // The shared eyes and brows come in pairs, the head's left (+x) first: each bump takes the one on its own side,
    // turned a little outward, as a frog's eyes look.
    const half = (pair) => (index === 0 ? pair.slice(0, pair.length / 2) : pair.slice(pair.length / 2));
    parts.glossy.push(...half(eyes(bump, { size: 0.21, across: 0.22, up: 0.02, iris: 0xc98a1e })));
    parts.matte.push(...half(eyebrows(bump, { across: 0.24, up: 0.78, length: 0.07, thickness: 0.026, tilt: 0.15, hex: DEEP_GREEN })));
  });
}
