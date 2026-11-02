// Grimble (M7d5), our purple racer: a garden gnome in a tall pointed purple hat that flops over at its tip, a big
// fluffy white beard over his chest, a big round nose and rosy cheeks, eyes peeking under bushy white brows, a
// blue-grey tunic with a brown belt and gold buckle, tan gloves and brown boots. His emblem is a red mushroom on a
// cream disc. His kart is purple, cream and slate. One entry of kart-designs.js's KART_DESIGNS; his own parts (the
// hat, the beard, the belt) are in grimble-parts.js.

import { partList, ball, limb, emblemDisc } from '../part-shapes.js';
import { head, onHead, body, arm, leg } from '../driver-parts.js';
import { eyes, eyebrows, nose, cheeks, smile } from '../driver-face.js';
import { floppyHat, beard, belt } from './grimble-parts.js';

const PURPLE = 0x9b59b6;
const CREAM = 0xf4efe2;
const SLATE = 0x4a5670;
const HAT = 0x8e44ad;
const HAT_BAND = 0x5e2d7a;
const BEARD = 0xf7f5f0;
const SKIN = 0xffc399;
const TUNIC = 0x4d6290;
const TROUSERS = 0x3e465c;
const LEATHER = 0x6e4524;
const GLOVE = 0xd6a66c;
const GOLD = 0xe0b23a;

const HEAD_RADIUS = 0.32;
// How far down the face the smile is (radians): below the big nose and the moustache, which the beard leaves clear.
const MOUTH_UP = -0.52;

export const GRIMBLE = Object.freeze({
  id: 'grimble',
  name: 'Grimble',
  slot: 4,
  palette: Object.freeze({ main: PURPLE, second: CREAM, third: SLATE }),
  drawEmblem,
  buildDriver,
});

// A red-capped mushroom with white spots on a cream stalk, standing on a tuft of grass, on a cream disc.
function drawEmblem(context, size) {
  context.fillStyle = '#f4efe2';
  context.fillRect(0, 0, size, size);
  const middle = size / 2;
  context.beginPath();
  context.ellipse(middle, size * 0.8, size * 0.3, size * 0.07, 0, 0, Math.PI * 2);
  context.fillStyle = '#5fae4a';
  context.fill();
  // The stalk, a little wider at its foot.
  context.beginPath();
  context.moveTo(middle - size * 0.1, size * 0.48);
  context.quadraticCurveTo(middle - size * 0.15, size * 0.72, middle - size * 0.13, size * 0.8);
  context.lineTo(middle + size * 0.13, size * 0.8);
  context.quadraticCurveTo(middle + size * 0.15, size * 0.72, middle + size * 0.1, size * 0.48);
  context.closePath();
  context.fillStyle = '#fbf6e6';
  context.fill();
  context.strokeStyle = '#c9b48a';
  context.lineWidth = size * 0.015;
  context.stroke();
  // The cap: a dome, its underside a flat curve.
  context.beginPath();
  context.moveTo(middle - size * 0.36, size * 0.5);
  context.bezierCurveTo(middle - size * 0.36, size * 0.12, middle + size * 0.36, size * 0.12, middle + size * 0.36, size * 0.5);
  context.quadraticCurveTo(middle, size * 0.58, middle - size * 0.36, size * 0.5);
  context.fillStyle = '#d8312a';
  context.fill();
  context.fillStyle = '#fffaf0';
  [[-0.18, 0.38, 0.05], [0, 0.27, 0.065], [0.18, 0.37, 0.05], [-0.07, 0.43, 0.035], [0.1, 0.45, 0.03]].forEach(([across, down, radius]) => {
    context.beginPath();
    context.arc(middle + size * across, size * down, size * radius, 0, Math.PI * 2);
    context.fill();
  });
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  const face = head([x, y + 0.84, z + 0.06], HEAD_RADIUS, SKIN);
  addBody(parts, seat.hip);
  addLimbs(parts, seat);
  addFace(parts, face);
  parts.skin.push(...beard(face, BEARD, MOUTH_UP));
  const hat = floppyHat(face, { radius: HEAD_RADIUS * 1.08, height: 0.72, tilt: 0.4, rise: 0.1, hex: HAT, bandHex: HAT_BAND });
  parts.cloth.push(...hat.felt, hat.band);
  return parts;
}

// A stout blue-grey tunic with a brown belt and gold buckle at the waist, the emblem big on its back for a chasing
// player to see, and the neck up to the head.
function addBody(parts, hip) {
  const [x, y, z] = hip;
  const shape = { width: 0.62, height: 0.66, depth: 0.48 };
  parts.cloth.push(...body([x, y - 0.02, z], { ...shape, lower: TUNIC, upper: TUNIC }));
  const { strap, buckle } = belt([x, y + 0.31, z], { width: shape.width + 0.02, depth: shape.depth + 0.02, hex: LEATHER, buckleHex: GOLD });
  parts.matte.push(strap);
  parts.metal.push(buckle);
  parts.decal.push(emblemDisc(0.1, [0, 0.65, -1], [x, y + 0.5, z - 0.22]));
  parts.skin.push(limb([x, y + 0.5, z], [x, y + 0.64, z + 0.04], 0.1, SKIN));
}

// Blue-grey sleeves with brown cuffs to tan gloves on the wheel; dark trousers bent up into the nose; brown boots.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.3, y + 0.5, z], hand, { radius: 0.09, bend: 0.1, sleeve: TUNIC, cuff: LEATHER, glove: 0.1, gloveHex: GLOVE });
    parts.cloth.push(...sleeves, ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const { leg: legParts, shoe } = leg([x + side * 0.14, y + 0.04, z + 0.1], foot, { radius: 0.095, lift: 0.18, cloth: TROUSERS, shoe: 0.3, shoeHex: LEATHER, soleHex: 0x3a2414 });
    parts.cloth.push(...legParts);
    parts.glossy.push(...shoe);
  });
}

// Blue eyes peeking out under big bushy white brows, a big round rosy nose, rosy cheeks, a smile under the
// moustache, and white hair at the nape under the hat. The brows and hair are white as the beard and, like it, in
// the skin kind.
function addFace(parts, face) {
  parts.skin.push(face.shape);
  parts.glossy.push(...eyes(face, { size: 0.14, across: 0.18, up: 0.06, iris: 0x3d7fd1 }));
  parts.skin.push(...eyebrows(face, { across: 0.21, up: 0.32, length: 0.1, thickness: 0.055, tilt: 0.1, hex: BEARD }));
  parts.skin.push(nose(face, { radius: 0.08, up: -0.08, hex: 0xffac8e }));
  const { blush } = cheeks(face, { across: 0.42, up: -0.14, radius: 0.065, blushHex: 0xff9f8a, freckleHex: SKIN });
  parts.skin.push(...blush);
  parts.matte.push(...smile(face, { width: 0.17, up: MOUTH_UP }));
  [-0.5, 0, 0.5].forEach((turn) => {
    parts.skin.push(onHead(ball(1, [0.12, 0.08, 0.05], [0, 0, 0], BEARD, { detail: 10, crease: 0.2 }), face, { across: Math.PI + turn, up: -0.3 }));
  });
}
