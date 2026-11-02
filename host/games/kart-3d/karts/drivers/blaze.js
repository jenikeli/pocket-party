// Blaze (M7d5), our red racer: a round-faced kid with ginger hair and freckles, a brown leather aviator cap with a
// cream fleece rim and ear flaps, brass goggles pushed up on it, a red racing jacket, a yellow scarf streaming
// behind, cream gloves and red shoes. His emblem is a flame on a cream disc. His kart is red, cream and charcoal. One entry of
// kart-designs.js's KART_DESIGNS.

import * as THREE from 'three';
import { partList, ball, limb, painted, emblemDisc } from '../part-shapes.js';
import { head, headDirection, onHead, body, arm, leg, scarf } from '../driver-parts.js';
import { eyes, eyebrows, nose, cheeks, smile } from '../driver-face.js';

const RED = 0xd62a1e;
const CREAM = 0xf3e7cc;
const CHARCOAL = 0x34363d;
const SKIN = 0xffd2ae;
const HAIR = 0xd0602a;
const LEATHER = 0x7a4426;
const SCARF = 0xf5b82e;
const BRASS = 0xc8962e;

const HEAD_RADIUS = 0.33;
// The cap: how much bigger than the head, and how far it is tipped back (radians), so its rim crosses the forehead
// just above the brows and the nape at the back.
const CAP_SCALE = 1.08;
const CAP_TILT = 0.45;

export const BLAZE = Object.freeze({
  id: 'blaze',
  name: 'Blaze',
  slot: 0,
  palette: Object.freeze({ main: RED, second: CREAM, third: CHARCOAL }),
  drawEmblem,
  buildDriver,
});

// A flame, red round yellow, on a cream disc.
function drawEmblem(context, size) {
  context.fillStyle = '#f3e7cc';
  context.fillRect(0, 0, size, size);
  const flame = (scale, colour) => {
    // Drawn in a 0-1 square, shrunk round the flame's foot for the inner layers.
    context.save();
    context.translate(size * 0.5, size * 0.86);
    context.scale(size * scale, size * scale);
    context.translate(-0.5, -0.86);
    context.beginPath();
    context.moveTo(0.5, 0.88);
    context.bezierCurveTo(0.26, 0.88, 0.17, 0.66, 0.28, 0.48);
    context.bezierCurveTo(0.33, 0.39, 0.36, 0.3, 0.32, 0.17);
    context.bezierCurveTo(0.45, 0.25, 0.49, 0.35, 0.48, 0.43);
    context.bezierCurveTo(0.53, 0.3, 0.61, 0.2, 0.58, 0.07);
    context.bezierCurveTo(0.73, 0.21, 0.82, 0.4, 0.75, 0.55);
    context.bezierCurveTo(0.85, 0.72, 0.72, 0.88, 0.5, 0.88);
    context.fillStyle = colour;
    context.fill();
    context.restore();
  };
  flame(1, '#d62a1e');
  flame(0.66, '#f7931e');
  flame(0.36, '#ffd23f');
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  // About as wide as the shoulders, as in the references, sitting down on them.
  const face = head([x, y + 0.86, z + 0.05], HEAD_RADIUS, SKIN);
  parts.cloth.push(...body([x, y - 0.02, z], { width: 0.6, height: 0.66, depth: 0.46, lower: CHARCOAL, upper: RED }));
  // The jacket's zip down the chest, the emblem on its left breast, and the neck up to the head.
  parts.cloth.push(limb([x, y + 0.32, z + 0.23], [x, y + 0.58, z + 0.17], 0.018, CREAM));
  parts.decal.push(emblemDisc(0.065, [0.25, 0.25, 1], [x + 0.13, y + 0.48, z + 0.205]));
  parts.skin.push(limb([x, y + 0.5, z], [x, y + 0.62, z + 0.03], 0.1, SKIN));
  parts.cloth.push(...scarf([x, y + 0.57, z + 0.02], { radius: 0.13, thickness: 0.07, length: 0.75, width: 0.12, hex: SCARF }));
  addLimbs(parts, seat);
  addFace(parts, face);
  addHair(parts, face);
  addCap(parts, face);
  return parts;
}

// Red sleeves with cream cuffs to big cream gloves on the wheel; charcoal legs bent up into the nose; red shoes on
// cream soles.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.29, y + 0.5, z], hand, { radius: 0.085, bend: 0.1, sleeve: RED, cuff: CREAM, glove: 0.1, gloveHex: CREAM });
    parts.cloth.push(...sleeves, ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const { leg: legParts, shoe } = leg([x + side * 0.14, y + 0.04, z + 0.1], foot, { radius: 0.095, lift: 0.18, cloth: CHARCOAL, shoe: 0.3, shoeHex: RED, soleHex: CREAM });
    parts.cloth.push(...legParts);
    parts.glossy.push(...shoe);
  });
}

function addFace(parts, face) {
  parts.skin.push(face.shape);
  parts.glossy.push(...eyes(face, { size: 0.155, across: 0.19, up: 0.1, iris: 0x2f9a48 }));
  parts.matte.push(...eyebrows(face, { across: 0.21, up: 0.4, length: 0.085, thickness: 0.032, tilt: 0.12, hex: HAIR }));
  parts.skin.push(nose(face, { radius: 0.058, up: -0.08, hex: 0xffcfae }));
  const { blush, freckles } = cheeks(face, { across: 0.42, up: -0.2, radius: 0.05, blushHex: 0xffb9a2, freckleHex: 0xc77a46 });
  parts.skin.push(...blush);
  parts.matte.push(...freckles);
  // Low enough that the nose, seen from a little above, does not hide the middle of the teeth.
  parts.matte.push(...smile(face, { width: 0.17, up: -0.4 }));
}

// Big smooth clumps of ginger hair: a fringe swept to one side from under the cap's rim, clear of the eyes, and
// tufts at the temples and the nape.
function addHair(parts, face) {
  const clump = (length, thickness, turn, across, up) => {
    const shape = ball(1, [length, thickness, thickness * 0.8], [0, 0, thickness * 0.3], HAIR, { detail: 12, crease: 0.15 }).rotateZ(turn);
    parts.matte.push(onHead(shape, face, { across, up }));
  };
  // The fringe sweeps from the head's left toward its right, over the brow.
  clump(0.1, 0.045, -0.5, 0.1, 0.62);
  clump(0.09, 0.042, -0.6, -0.04, 0.6);
  clump(0.075, 0.038, -0.75, -0.17, 0.58);
  [1, -1].forEach((side) => clump(0.07, 0.04, side * 1.3, side * 1.05, 0.2));
  [-0.4, 0, 0.4].forEach((turn, index) => clump(0.06, 0.04, Math.PI / 2 + turn, Math.PI + (index - 1) * 0.45, 0.05));
}

// The aviator cap: a leather crown tipped back with a seam over it, a fleece rim, ear flaps, and the goggles
// pushed up on its front on their strap.
function addCap(parts, { at, radius }) {
  const capRadius = radius * CAP_SCALE;
  const onCap = (shape) => shape.rotateX(-CAP_TILT).translate(...at);
  const crown = new THREE.SphereGeometry(capRadius, 24, 10, 0, Math.PI * 2, 0, 1.55).scale(1, 0.96, 1);
  // One seam from the brow over the top to the nape.
  const seam = new THREE.TorusGeometry(capRadius * 1.004, 0.008, 4, 20, Math.PI * 0.9).rotateY(Math.PI / 2).scale(1, 0.96, 1);
  const rimRadius = capRadius * Math.sin(1.55);
  const rim = new THREE.TorusGeometry(rimRadius, 0.026, 8, 32).rotateX(Math.PI / 2).scale(1, 1.3, 1).translate(0, capRadius * Math.cos(1.55) * 0.96, 0);
  parts.matte.push(painted(onCap(crown), LEATHER, { crease: 0.1 }), painted(onCap(seam), 0x55301a, { crease: 0 }));
  parts.cloth.push(painted(onCap(rim), CREAM, { crease: 0 }));
  [1, -1].forEach((side) => {
    const flapAt = [at[0] + side * radius * 0.93, at[1] - radius * 0.22, at[2] - radius * 0.1];
    parts.matte.push(ball(radius * 0.36, [0.3, 1.15, 0.85], flapAt, LEATHER, { detail: 14, crease: 0.15 }));
  });
  addGoggles(parts, at, capRadius);
}

// Two round lenses in brass rims on the cap's front, high on the crown, joined by a bridge, on a charcoal strap
// round the cap.
function addGoggles(parts, at, capRadius) {
  const up = 0.66;
  const lensRadius = capRadius * 0.22;
  const strapHeight = Math.sin(up) * capRadius;
  const strap = new THREE.TorusGeometry(Math.cos(up) * capRadius + 0.015, 0.022, 6, 32).rotateX(Math.PI / 2);
  parts.cloth.push(painted(strap.translate(at[0], at[1] + strapHeight, at[2]), CHARCOAL, { crease: 0 }));
  [1, -1].forEach((side) => {
    const direction = headDirection(side * 0.36, up);
    const centre = new THREE.Vector3(...at).addScaledVector(direction, capRadius + 0.03);
    const facing = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    const ring = new THREE.TorusGeometry(lensRadius, lensRadius * 0.3, 6, 20).applyQuaternion(facing).translate(centre.x, centre.y, centre.z);
    const lens = new THREE.SphereGeometry(lensRadius, 14, 6).scale(1, 1, 0.35).applyQuaternion(facing).translate(centre.x, centre.y, centre.z);
    parts.metal.push(painted(ring, BRASS, { crease: 0 }));
    parts.glossy.push(painted(lens, 0x8fd2f2, { crease: 0 }));
  });
  const bridgeAt = new THREE.Vector3(...at).addScaledVector(headDirection(0, up), capRadius + 0.04).toArray();
  parts.metal.push(ball(0.028, [1.4, 0.7, 0.7], bridgeAt, BRASS, { detail: 10, crease: 0 }));
}
