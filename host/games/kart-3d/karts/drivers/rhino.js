// Rhino (M7d5), a CPU racer in steel grey: a rhino with grey hide, a broad pale snout with a big horn and a small
// one, small ears and a wrinkled brow, in an open-face motocross helmet (white with an orange stripe, a peak and
// goggles), a padded grey racing suit with orange chest and back plates, shoulder cups and knee pads, dark gloves
// and chunky white boots. His emblem is an orange horn on a white disc. His kart is steel grey, white and orange. One
// entry of kart-designs.js's KART_DESIGNS; his head and helmet are in rhino-parts.js.

import * as THREE from 'three';
import { partList, ball, limb, painted, along, emblemDisc } from '../part-shapes.js';
import { body, arm, leg } from '../driver-parts.js';
import { addRhinoHead, addHelmet } from './rhino-parts.js';

const STEEL = 0x7f8c8d;
const WHITE = 0xf2f1ec;
const ORANGE = 0xf07a1c;
const HIDE = 0xbcc6ca;
const SNOUT = 0xdde2e4;
const WRINKLE = 0x5f696d;
const HORN = 0xeee4cc;
const SUIT = 0x55616a;
const CHARCOAL = 0x2c3034;
const BOOT = 0xeceef0;

const HEAD_RADIUS = 0.31;

export const RHINO = Object.freeze({
  id: 'rhino',
  name: 'Rhino',
  slot: 10,
  palette: Object.freeze({ main: STEEL, second: WHITE, third: ORANGE }),
  drawEmblem,
  buildDriver,
});

// A big orange horn curving back from a grey snout, outlined in charcoal, on a white disc.
function drawEmblem(context, size) {
  context.fillStyle = '#f2f1ec';
  context.fillRect(0, 0, size, size);
  context.lineWidth = size * 0.035;
  context.lineJoin = 'round';
  context.strokeStyle = '#2c3034';
  context.beginPath();
  context.ellipse(size * 0.5, size * 0.84, size * 0.34, size * 0.11, 0, 0, Math.PI * 2);
  context.fillStyle = '#98a3a7';
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(size * 0.26, size * 0.8);
  context.bezierCurveTo(size * 0.28, size * 0.48, size * 0.44, size * 0.22, size * 0.72, size * 0.1);
  context.bezierCurveTo(size * 0.6, size * 0.32, size * 0.64, size * 0.58, size * 0.76, size * 0.8);
  context.closePath();
  context.fillStyle = '#f07a1c';
  context.fill();
  context.stroke();
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  addSuit(parts, seat.hip);
  addLimbs(parts, seat);
  const face = addRhinoHead(parts, [x, y + 0.84, z + 0.05], HEAD_RADIUS, { hide: HIDE, snout: SNOUT, wrinkle: WRINKLE, horn: HORN, iris: 0xb0661f });
  addHelmet(parts, face, { shell: WHITE, stripe: ORANGE, rim: 0x8d959a, frame: CHARCOAL, lens: 0x6fb6e8, strap: ORANGE });
  return parts;
}

// The padded suit: grey, a charcoal kidney belt round the waist, glossy orange plates over the chest and back with
// the emblem on each, and orange cups on the shoulders; the grey neck up to the head.
function addSuit(parts, hip) {
  const [x, y, z] = hip;
  parts.cloth.push(...body([x, y - 0.02, z], { width: 0.62, height: 0.66, depth: 0.46, lower: SUIT, upper: SUIT }));
  parts.cloth.push(painted(new THREE.TorusGeometry(0.28, 0.05, 5, 20).rotateX(Math.PI / 2).scale(1, 1.4, 0.82).translate(x, y + 0.2, z), CHARCOAL, { crease: 0 }));
  [1, -1].forEach((facingSide) => {
    parts.glossy.push(ball(0.2, [1.15, 1, 0.42], [x, y + 0.42, z + facingSide * 0.17], ORANGE, { detail: 14, crease: 0.1 }));
  });
  parts.decal.push(emblemDisc(0.065, [0, 0.15, 1], [x, y + 0.45, z + 0.252]));
  parts.decal.push(emblemDisc(0.1, [0, 0.2, -1], [x, y + 0.44, z - 0.252]));
  [1, -1].forEach((side) => {
    parts.glossy.push(ball(0.12, [1.05, 0.72, 1.12], [x + side * 0.27, y + 0.56, z], ORANGE, { detail: 12, crease: 0.15 }));
  });
  parts.matte.push(limb([x, y + 0.5, z], [x, y + 0.62, z + 0.03], 0.1, HIDE));
}

// Grey sleeves with orange cuffs to dark gloves on the wheel; grey legs bent up into the nose with orange knee pads,
// into chunky white boots with a tall shaft, a charcoal band at its top and charcoal soles.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.3, y + 0.5, z], hand, { radius: 0.088, bend: 0.1, sleeve: SUIT, cuff: ORANGE, glove: 0.1, gloveHex: CHARCOAL });
    parts.cloth.push(...sleeves, ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const hip = [x + side * 0.14, y + 0.04, z + 0.1];
    const shoeLength = 0.33;
    const { leg: legParts, shoe } = leg(hip, foot, { radius: 0.095, lift: 0.18, cloth: SUIT, shoe: shoeLength, shoeHex: BOOT, soleHex: CHARCOAL });
    parts.cloth.push(...legParts);
    parts.glossy.push(...shoe);
    // The knee and ankle where leg() puts them.
    const knee = new THREE.Vector3((hip[0] + foot[0]) / 2 + side * 0.02, Math.max(hip[1], foot[1]) + 0.18, (hip[2] + foot[2]) / 2);
    const ankle = new THREE.Vector3(foot[0], foot[1] + shoeLength * 0.35, foot[2] - shoeLength * 0.3);
    parts.glossy.push(ball(0.085, [1, 0.85, 1], knee.clone().add(new THREE.Vector3(0, 0.03, 0.04)).toArray(), ORANGE, { detail: 10, crease: 0.1 }));
    const shaftTop = ankle.clone().lerp(knee, 0.5);
    parts.glossy.push(limb(ankle.toArray(), shaftTop.toArray(), 0.11, BOOT, { detail: 10, crease: 0.1 }));
    const band = along(new THREE.CylinderGeometry(0.118, 0.118, 0.04, 14), ankle, shaftTop).translate(...shaftTop.clone().sub(ankle).multiplyScalar(0.32).toArray());
    parts.matte.push(painted(band, CHARCOAL, { crease: 0 }));
  });
}
