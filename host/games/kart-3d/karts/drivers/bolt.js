// Bolt (M7d5), our yellow racer: a friendly tin robot with a round glass dome for a head (a dark face plate seen
// through pale cyan glass, two big glowing eyes and a glowing smile on it, a red-tipped antenna on top), a boxy
// yellow tin body with rivets and a dial on its chest, ribbed chrome arms ending in chrome mitts, navy boots and a
// brass wind-up key in its back. His emblem is a lightning bolt on a navy disc. His kart is yellow, silver and
// navy. One entry of kart-designs.js's KART_DESIGNS; his head and arms are in bolt-parts.js.

import * as THREE from 'three';
import { roundedBox, roundedCylinder } from '../../shape-utils.js';
import { partList, ball, limb, painted, facing, emblemDisc } from '../part-shapes.js';
import { leg } from '../driver-parts.js';
import { YELLOW, CHROME, NAVY, addDome, addFace, addArm } from './bolt-parts.js';

const SILVER = 0xd9dee4;
const PANEL = 0xe3b10b;
const BRASS = 0xd4a73a;
const DIAL_FACE = 0xfdf6e3;

export const BOLT = Object.freeze({
  id: 'bolt',
  name: 'Bolt',
  slot: 3,
  palette: Object.freeze({ main: YELLOW, second: SILVER, third: NAVY }),
  drawEmblem,
  buildDriver,
});

// A yellow lightning bolt edged in white on a navy disc.
function drawEmblem(context, size) {
  context.fillStyle = '#23324a';
  context.fillRect(0, 0, size, size);
  const corners = [[0.56, 0.08], [0.27, 0.55], [0.47, 0.55], [0.37, 0.93], [0.74, 0.42], [0.53, 0.42], [0.71, 0.08]];
  context.beginPath();
  corners.forEach(([x, y]) => context.lineTo(x * size, y * size));
  context.closePath();
  context.lineJoin = 'round';
  context.lineWidth = size * 0.05;
  context.strokeStyle = '#ffffff';
  context.stroke();
  context.fillStyle = '#f9d01c';
  context.fill();
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  // About as wide as the shoulders, sitting down on them.
  const head = { at: [x, y + 0.86, z + 0.05], radius: 0.33 };
  addBody(parts, seat.hip);
  addChest(parts, seat.hip);
  addKey(parts, seat.hip);
  addDome(parts, head);
  addFace(parts, head);
  seat.hands.forEach((hand) => addArm(parts, [x + Math.sign(hand[0]) * 0.31, y + 0.5, z], hand));
  // Legs in navy fabric covers, mostly hidden in the nose, and navy boots.
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const { leg: legParts, shoe } = leg([x + side * 0.14, y + 0.06, z + 0.1], foot, { radius: 0.085, lift: 0.18, cloth: NAVY, shoe: 0.3, shoeHex: NAVY, soleHex: SILVER });
    parts.cloth.push(...legParts);
    parts.glossy.push(...shoe);
  });
  return parts;
}

// The boxy tin body, rounded at every edge, with a chrome band round its waist and a chrome neck up into the dome.
function addBody(parts, [x, y, z]) {
  const torso = roundedBox(0.62, 0.56, 0.46, 0.12).translate(x, y + 0.32, z);
  parts.glossy.push(painted(torso, YELLOW, { crease: 0.3 }));
  const band = roundedBox(0.64, 0.06, 0.48, 0.03).translate(x, y + 0.16, z);
  parts.metal.push(painted(band, CHROME, { crease: 0 }));
  parts.metal.push(limb([x, y + 0.52, z + 0.02], [x, y + 0.66, z + 0.04], 0.12, CHROME, { detail: 10, crease: 0.2 }));
}

// A darker riveted panel on the chest, a dial and the emblem on it, and a row of three buttons below.
function addChest(parts, [x, y, z]) {
  const front = z + 0.255;
  parts.glossy.push(painted(roundedBox(0.46, 0.36, 0.04, 0.018).translate(x, y + 0.34, z + 0.235), PANEL, { crease: 0.1 }));
  [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0]].forEach(([across, up]) => {
    parts.metal.push(ball(0.016, [1, 1, 0.6], [x + across * 0.2, y + 0.34 + up * 0.15, front], CHROME, { detail: 6, crease: 0 }));
  });
  addDial(parts, [x - 0.08, y + 0.42, front]);
  parts.decal.push(emblemDisc(0.06, [0, 0, 1], [x + 0.1, y + 0.42, front + 0.004]));
  [0xe8402e, 0x3ac15a, 0x2f8ee0].forEach((hex, index) => {
    const button = roundedCylinder(0.024, 0.026, 0.02, 0.008, 10).rotateX(Math.PI / 2).translate(x + (index - 1) * 0.07, y + 0.24, front + 0.008);
    parts.glossy.push(painted(button, hex, { crease: 0 }));
  });
}

// A round gauge: a chrome rim, a cream face and a red needle pointing up and to one side.
function addDial(parts, at) {
  const rim = facing(new THREE.TorusGeometry(0.06, 0.013, 5, 16), [0, 0, 1], at);
  const face = facing(new THREE.CircleGeometry(0.058, 20), [0, 0, 1], [at[0], at[1], at[2] + 0.002]);
  const needle = roundedBox(0.012, 0.05, 0.008, 0.004).translate(0, 0.022, 0).rotateZ(-0.6).translate(at[0], at[1], at[2] + 0.008);
  parts.metal.push(painted(rim, CHROME, { crease: 0 }), ball(0.01, [1, 1, 0.6], [at[0], at[1], at[2] + 0.01], CHROME, { detail: 6, crease: 0 }));
  parts.glossy.push(painted(face, DIAL_FACE, { crease: 0 }), painted(needle, 0xd62a1e, { crease: 0 }));
}

// A brass wind-up key out of his upper back, high enough to clear the seat's back, so the chase camera sees it.
function addKey(parts, [x, y, z]) {
  const keyY = y + 0.54;
  const bowZ = z - 0.47;
  parts.metal.push(limb([x, keyY, z - 0.2], [x, keyY, bowZ], 0.026, BRASS, { crease: 0 }));
  parts.metal.push(ball(0.045, [1, 1, 0.7], [x, keyY, bowZ], BRASS, { detail: 10, crease: 0 }));
  [1, -1].forEach((side) => {
    const loop = new THREE.TorusGeometry(0.065, 0.024, 5, 14).scale(1.15, 0.9, 1).translate(x + side * 0.1, keyY, bowZ);
    parts.metal.push(painted(loop, BRASS, { crease: 0 }));
  });
}
