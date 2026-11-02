// Mochi (M7d5), our pink racer: a round white bunny with long floppy ears falling to her shoulders, pink inside, a
// big pink bow between them, a small pink nose over round whisker pads with a little smile and a hint of buck
// teeth, and round pink cheeks; in a pastel pink jacket with a fluffy white collar, white mittens on the wheel and
// small white feet in the nose. Her emblem is a carrot on a pale pink disc. Her kart is pink, snow white and berry.
// One entry of kart-designs.js's KART_DESIGNS; her own parts (the ears, the bow, the muzzle) are in mochi-parts.js.

import * as THREE from 'three';
import { partList, limb, painted, emblemDisc } from '../part-shapes.js';
import { head, body, arm, leg } from '../driver-parts.js';
import { eyes, eyebrows, cheeks } from '../driver-face.js';
import { floppyEar, bow, muzzle } from './mochi-parts.js';

const PINK = 0xff79b0;
const SNOW = 0xfdf5f8;
const BERRY = 0xa8325f;
// Her fur is drawn in the skin kind: its faint glow, in the fur's own colour, keeps the white soft in the shade of
// the kart and the ears, where the matte kind turned it grey.
const FUR = 0xfbf7f8;
const INNER_EAR = 0xffa9c9;
const JACKET = 0xffb3d1;

const HEAD_RADIUS = 0.34;

export const MOCHI = Object.freeze({
  id: 'mochi',
  name: 'Mochi',
  slot: 7,
  palette: Object.freeze({ main: PINK, second: SNOW, third: BERRY }),
  drawEmblem,
  buildDriver,
});

// An orange carrot leaning to the right with a green leafy top, on a pale pink disc.
function drawEmblem(context, size) {
  context.fillStyle = '#ffe3ee';
  context.fillRect(0, 0, size, size);
  context.translate(size / 2, size / 2);
  context.rotate(Math.PI / 5);
  // Three leaves fanned out of the top.
  context.fillStyle = '#3fae4a';
  [-0.45, 0, 0.45].forEach((turn) => {
    context.save();
    context.translate(0, -size * 0.2);
    context.rotate(turn);
    context.beginPath();
    context.ellipse(0, -size * 0.11, size * 0.05, size * 0.12, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
  // The root: wide at the top, rounding to a point at the bottom.
  context.beginPath();
  context.moveTo(-size * 0.11, -size * 0.2);
  context.quadraticCurveTo(0, -size * 0.27, size * 0.11, -size * 0.2);
  context.quadraticCurveTo(size * 0.06, size * 0.15, 0, size * 0.33);
  context.quadraticCurveTo(-size * 0.06, size * 0.15, -size * 0.11, -size * 0.2);
  context.fillStyle = '#f7871f';
  context.fill();
  // Its little ridges.
  context.strokeStyle = '#c9620e';
  context.lineCap = 'round';
  context.lineWidth = size * 0.022;
  [[-0.08, -0.08, 0.0], [0.07, 0.02, -0.01], [-0.05, 0.12, 0.0]].forEach(([start, at, end]) => {
    context.beginPath();
    context.moveTo(size * start, size * at);
    context.lineTo(size * end, size * (at + 0.02));
    context.stroke();
  });
  context.setTransform(1, 0, 0, 1, 0, 0);
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  addBody(parts, seat.hip);
  addLimbs(parts, seat);
  const face = head([x, y + 0.86, z + 0.05], HEAD_RADIUS, FUR);
  parts.skin.push(face.shape);
  addFace(parts, face);
  [1, -1].forEach((side) => parts.skin.push(floppyEar(face, side, { width: 0.24, thickness: 0.05, hex: FUR, innerHex: INNER_EAR })));
  parts.glossy.push(...bow(face, { size: 0.22, hex: PINK, knotHex: 0xf0609c }));
  return parts;
}

// A white furry belly and seat under a pastel pink jacket with a berry zip, a fluffy white collar round the neck,
// the emblem on her chest and a bigger one on her back.
function addBody(parts, hip) {
  const [x, y, z] = hip;
  const [belly, jacket] = body([x, y - 0.02, z], { width: 0.6, height: 0.66, depth: 0.46, lower: FUR, upper: JACKET });
  parts.skin.push(belly);
  parts.cloth.push(jacket);
  parts.cloth.push(limb([x, y + 0.3, z + 0.23], [x, y + 0.55, z + 0.18], 0.016, BERRY));
  parts.decal.push(emblemDisc(0.065, [0.25, 0.25, 1], [x + 0.13, y + 0.47, z + 0.205]));
  parts.decal.push(emblemDisc(0.1, [0, 0.6, -1], [x, y + 0.48, z - 0.215]));
  const collar = new THREE.TorusGeometry(0.15, 0.06, 10, 28).rotateX(Math.PI / 2).translate(x, y + 0.58, z + 0.02);
  parts.skin.push(painted(collar, FUR, { crease: 0.1 }));
}

// Pastel pink sleeves with pink cuffs to white mittens on the wheel; white furry legs bent up into the nose to
// small white feet on pink pads.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.29, y + 0.5, z], hand, { radius: 0.085, bend: 0.1, sleeve: JACKET, cuff: PINK, glove: 0.1, gloveHex: SNOW });
    parts.cloth.push(...sleeves, ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const { leg: legParts, shoe } = leg([x + side * 0.14, y + 0.04, z + 0.1], foot, { radius: 0.09, lift: 0.17, cloth: FUR, shoe: 0.25, shoeHex: FUR, soleHex: INNER_EAR });
    parts.skin.push(...legParts, ...shoe);
  });
}

// Big rose eyes and soft pink brows, round pink cheeks, and the muzzle.
function addFace(parts, face) {
  parts.glossy.push(...eyes(face, { size: 0.165, across: 0.2, up: 0.1, iris: 0xc23a72 }));
  parts.matte.push(...eyebrows(face, { across: 0.22, up: 0.43, length: 0.075, thickness: 0.022, tilt: 0.06, hex: 0xe57ba4 }));
  parts.skin.push(...cheeks(face, { across: 0.44, up: -0.18, radius: 0.06, blushHex: 0xffa3c3 }).blush);
  const { matte, skin } = muzzle(face, { up: -0.2, padRadius: 0.065, hex: FUR, noseHex: 0xff6aa2, mouthWidth: 0.16 });
  parts.matte.push(...matte);
  parts.skin.push(...skin);
}
