// Bruno (M7d5), a CPU racer: a big friendly brown bear with round ears, a light round muzzle and a black nose, in a
// red and black buffalo check shirt open at the collar, blue jeans, and big furry paws on the wheel and in the nose.
// His emblem is a brown paw print on a honey disc. His kart is brown, honey and near black. One entry of
// kart-designs.js's KART_DESIGNS; his own parts (the check, the muzzle, the ears) are in bruno-parts.js.

import * as THREE from 'three';
import { partList, ball, limb, painted, emblemDisc } from '../part-shapes.js';
import { head, arm, leg } from '../driver-parts.js';
import { eyes, eyebrows, cheeks } from '../driver-face.js';
import { CHECK_RED, buffaloCheck, checkedLimb, muzzle, ears } from './bruno-parts.js';

const BROWN = 0x8b5a2b;
const HONEY = 0xe8c48c;
const NEAR_BLACK = 0x2a2220;
// His fur, light muzzle, inner ears, chest and soles are in the skin kind, whose faint glow in each part's own
// colour keeps them warm and bright in the kart's shade.
const FUR = BROWN;
const DARK_FUR = 0x3a2010;
const DENIM = 0x3d5f8f;

// Bigger than Blaze's, as he is a big bear, still about as wide as his broad shoulders.
const HEAD_RADIUS = 0.36;

export const BRUNO = Object.freeze({
  id: 'bruno',
  name: 'Bruno',
  slot: 9,
  palette: Object.freeze({ main: BROWN, second: HONEY, third: NEAR_BLACK }),
  drawEmblem,
  buildDriver,
});

// A brown paw print on a honey disc: a broad rounded pad and four round toes in an arc above it.
function drawEmblem(context, size) {
  context.fillStyle = '#e8c48c';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#6b3f1c';
  context.beginPath();
  context.ellipse(size * 0.5, size * 0.64, size * 0.2, size * 0.16, 0, 0, Math.PI * 2);
  context.fill();
  [[0.27, 0.45, -0.5], [0.4, 0.31, -0.15], [0.6, 0.31, 0.15], [0.73, 0.45, 0.5]].forEach(([x, y, turn]) => {
    context.beginPath();
    context.ellipse(size * x, size * y, size * 0.075, size * 0.095, turn, 0, Math.PI * 2);
    context.fill();
  });
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  addBody(parts, seat.hip);
  addLimbs(parts, seat);
  addHead(parts, head([x, y + 0.92, z + 0.04], HEAD_RADIUS, FUR));
  return parts;
}

// A big round checked shirt over his tummy, sitting on blue jeans, open at the collar to the honey fur of his
// chest, with three buttons down its front, the emblem on its breast and a bigger one on its back, so a chasing
// player sees whose it is; the neck up to the head.
function addBody(parts, [x, y, z]) {
  const shirt = new THREE.SphereGeometry(0.37, 32, 16).scale(1, 0.85, 0.78).translate(x, y + 0.34, z);
  parts.cloth.push(buffaloCheck(shirt, { columns: 16, rows: 8 }));
  parts.cloth.push(ball(0.36, [1, 0.5, 0.85], [x, y + 0.08, z], DENIM, { detail: 20, crease: 0.3 }));
  const collar = new THREE.TorusGeometry(0.15, 0.045, 8, 24).rotateX(Math.PI / 2 - 0.25).translate(x, y + 0.63, z + 0.02);
  parts.cloth.push(painted(collar, CHECK_RED, { crease: 0.1 }));
  parts.skin.push(ball(0.11, [1.1, 1, 0.6], [x, y + 0.6, z + 0.13], HONEY, { detail: 14, crease: 0 }));
  parts.skin.push(limb([x, y + 0.56, z], [x, y + 0.72, z + 0.03], 0.13, FUR));
  [0.2, 0.32, 0.44].forEach((up) => {
    // How far forward the shirt's surface is at this height: on the ball 0.37 round, 0.85 as tall, 0.78 as deep.
    const front = 0.78 * 0.37 * Math.sqrt(1 - ((up - 0.34) / (0.85 * 0.37)) ** 2);
    parts.matte.push(ball(0.018, [1, 1, 0.5], [x, y + up, z + front + 0.004], 0xf1e6cf, { detail: 8, crease: 0 }));
  });
  parts.decal.push(emblemDisc(0.07, [0.3, 0.35, 1], [x + 0.14, y + 0.47, z + 0.245]));
  parts.decal.push(emblemDisc(0.11, [0, 0.3, -1], [x, y + 0.42, z - 0.29]));
}

// Thick checked sleeves bent to big furry paws on the wheel; jeans bent up into the nose to furry feet with honey
// soles.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const shoulder = [x + side * 0.33, y + 0.52, z];
    const options = { radius: 0.1, bend: 0.1, sleeve: CHECK_RED, cuff: NEAR_BLACK, glove: 0.115, gloveHex: FUR };
    const { sleeves, gloves } = arm(shoulder, hand, options);
    // arm's own sleeves are plain: Bruno's are checked, along the same bend from the shoulder to the cuff.
    sleeves.slice(0, 2).forEach((shape) => shape.dispose());
    const { elbow, wrist } = armBend(shoulder, hand, options);
    parts.cloth.push(checkedLimb(shoulder, elbow, 0.1), checkedLimb(elbow, wrist, 0.095), sleeves[2]);
    parts.skin.push(...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const { leg: legParts, shoe } = leg([x + side * 0.15, y + 0.05, z + 0.1], foot, { radius: 0.11, lift: 0.18, cloth: DENIM, shoe: 0.3, shoeHex: FUR, soleHex: HONEY });
    parts.cloth.push(...legParts);
    // The furry foot and its honey sole.
    parts.skin.push(...shoe);
  });
}

// The elbow and wrist of an arm as driver-parts.js's arm bends it, so the checked sleeves follow the same line.
function armBend(shoulder, hand, { bend, glove }) {
  const side = Math.sign(hand[0]);
  const elbow = [(shoulder[0] + hand[0]) / 2 + side * bend, (shoulder[1] + hand[1]) / 2 - bend, (shoulder[2] + hand[2]) / 2];
  const handAt = new THREE.Vector3(...hand);
  const elbowAt = new THREE.Vector3(...elbow);
  const wrist = handAt.clone().lerp(elbowAt, (glove * 1.3) / handAt.distanceTo(elbowAt));
  return { elbow, wrist: wrist.toArray() };
}

// The brown head with its round ears, big warm eyes, dark brows, a soft blush and the muzzle.
function addHead(parts, face) {
  parts.skin.push(face.shape, ...ears(face, { size: 0.13, hex: FUR, innerHex: HONEY }));
  parts.glossy.push(...eyes(face, { size: 0.15, across: 0.2, up: 0.14, iris: 0x8a5220 }));
  parts.matte.push(...eyebrows(face, { across: 0.22, up: 0.42, length: 0.085, thickness: 0.036, tilt: 0.12, hex: DARK_FUR }));
  parts.skin.push(...cheeks(face, { across: 0.52, up: -0.12, radius: 0.05, blushHex: 0xc0705a, freckleHex: FUR }).blush);
  const snout = muzzle(face, { radius: 0.18, hex: HONEY });
  parts.skin.push(...snout.skin);
  parts.glossy.push(...snout.glossy);
  parts.matte.push(...snout.matte);
}
