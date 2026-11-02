// Inky (M7d5), our teal racer: a cheerful octopus with a big round mantle dotted with pale spots, large purple eyes
// and a small smile, a white sailor cap with a navy band on top, a navy sailor collar with a red knot and its
// striped flap down his back, and eight tapering tentacles with pale undersides: two wrap the steering wheel, two
// reach the pedals, two drape over the seat's sides and two over its back, all curling at the tips. His emblem is a
// navy anchor on a white disc. His kart is teal, white and navy. One entry of kart-designs.js's KART_DESIGNS; his
// own parts are in inky-parts.js.

import * as THREE from 'three';
import { partList, ball, painted, emblemDisc } from '../part-shapes.js';
import { head, onHead } from '../driver-parts.js';
import { eyes, eyebrows, cheeks, smile } from '../driver-face.js';
import { mantled, topOf, tentacle, sailorCap, sailorCollar, neckerchief } from './inky-parts.js';
import { STEERING } from '../kart-layout.js';

const TEAL = 0x1abc9c;
const WHITE = 0xf6f7f9;
const NAVY = 0x1f2d55;
const SKIN = 0x33ccb0;
const UNDERSIDE = 0xc4f1e6;
const SPOT = 0x93e4d3;
const DEEP_TEAL = 0x0b6656;
const RED = 0xe0413a;

const HEAD_RADIUS = 0.37;

export const INKY = Object.freeze({
  id: 'inky',
  name: 'Inky',
  slot: 6,
  palette: Object.freeze({ main: TEAL, second: WHITE, third: NAVY }),
  drawEmblem,
  buildDriver,
});

// A navy anchor on a white disc: a ring on top, the shank and its stock, and two curved arms ending in flukes.
function drawEmblem(context, size) {
  context.fillStyle = '#f6f7f9';
  context.fillRect(0, 0, size, size);
  context.scale(size, size);
  context.strokeStyle = '#1f2d55';
  context.fillStyle = '#1f2d55';
  context.lineCap = 'round';
  context.lineWidth = 0.05;
  context.beginPath();
  context.arc(0.5, 0.2, 0.065, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 0.075;
  context.beginPath();
  context.moveTo(0.5, 0.28);
  context.lineTo(0.5, 0.83);
  context.moveTo(0.33, 0.37);
  context.lineTo(0.67, 0.37);
  context.stroke();
  context.lineWidth = 0.065;
  context.beginPath();
  context.arc(0.5, 0.52, 0.29, Math.PI * 0.18, Math.PI * 0.82);
  context.stroke();
  [1, -1].forEach((side) => {
    context.beginPath();
    context.moveTo(0.5 + side * 0.31, 0.49);
    context.lineTo(0.5 + side * 0.19, 0.6);
    context.lineTo(0.5 + side * 0.33, 0.66);
    context.closePath();
    context.fill();
  });
  context.setTransform(1, 0, 0, 1, 0, 0);
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  // The bundle of tentacle roots under the head, where a body would be; the collar round its top, a red
  // neckerchief knot at its front and the anchor on its back flap.
  parts.skin.push(ball(0.25, [1, 1.3, 0.95], [x, y + 0.24, z + 0.03], SKIN, { detail: 18, crease: 0.2 }));
  parts.cloth.push(...sailorCollar([x, y + 0.48, z + 0.04], 0.2, {
    flap: { top: y + 0.5, bottom: y + 0.24, topRadius: 0.23, bottomRadius: 0.29, halfAngle: 0.8 },
    hex: NAVY, stripeHex: WHITE,
  }));
  parts.cloth.push(...neckerchief([x, y + 0.45, z + 0.25], RED));
  parts.decal.push(emblemDisc(0.07, [0, 0.2, -1], [x, y + 0.36, z - 0.27]));
  addTentacles(parts, seat);
  const face = addHead(parts, [x, y + 0.78, z + 0.06]);
  const cap = sailorCap(capSpot(face), { size: 1.15, tilt: -0.25, lean: 0.1, hex: WHITE, bandHex: NAVY });
  parts.cloth.push(...cap.cloth);
  parts.decal.push(emblemDisc(0.062, cap.emblemNormal, cap.emblemAt));
  return parts;
}

// The head with its face, stretched into the mantle together; pale spots over the mantle's top and back, so the
// chasing player sees an octopus. Returns the head ({ at, radius, shape }), its shape stretched.
function addHead(parts, at) {
  const face = head(at, HEAD_RADIUS, SKIN);
  const stretch = (shape) => mantled(shape, at, HEAD_RADIUS);
  parts.skin.push(stretch(face.shape));
  parts.glossy.push(...eyes(face, { size: 0.22, across: 0.21, up: 0.02, iris: 0xa070ff }).map(stretch));
  parts.matte.push(...eyebrows(face, { across: 0.22, up: 0.34, length: 0.08, thickness: 0.026, tilt: 0.1, hex: DEEP_TEAL }).map(stretch));
  parts.skin.push(...cheeks(face, { across: 0.45, up: -0.2, radius: 0.055, blushHex: 0xffa9b8, freckleHex: 0xffa9b8 }).blush.map(stretch));
  parts.matte.push(...smile(face, { width: 0.14, up: -0.33 }).map(stretch));
  const spots = [[0.75, 0.55, 0.06], [-0.6, 0.75, 0.05], [1.5, 0.3, 0.05], [-1.45, 0.45, 0.06], [2.2, 0.6, 0.06], [-2.3, 0.35, 0.05],
    [Math.PI, 0.7, 0.07], [2.75, 0.15, 0.045], [-2.8, 0.05, 0.05], [0.15, 1.0, 0.045]];
  spots.forEach(([across, up, radius]) => {
    const spot = painted(new THREE.CircleGeometry(radius, 14), SPOT, { crease: 0 });
    parts.skin.push(stretch(onHead(spot, face, { across, up, lift: 0.003 })));
  });
  return face;
}

// Where the cap sits: on the mantle's top, sunk in a little so its rim hugs the curve.
function capSpot(face) {
  const [x, y, z] = topOf(face.shape);
  return [x, y - 0.07, z];
}

// The eight tentacles, a pair of each: wrapped round the steering wheel's grips, down into the nose to the pedals,
// over the seat's side bolsters and over its back, each curling at its tip.
function addTentacles(parts, seat) {
  const [x, y, z] = seat.hip;
  const look = { hex: SKIN, undersideHex: UNDERSIDE };
  [1, -1].forEach((side) => {
    const reach = [[x + side * 0.15, y + 0.42, z + 0.12], [x + side * 0.3, y + 0.42, z + 0.24], [x + side * 0.3, y + 0.36, z + 0.44], [x + side * 0.22, y + 0.4, z + 0.54]];
    parts.skin.push(tentacle([...reach, ...gripCoil(side)], { root: 0.075, tip: 0.026, steps: 40, ...look }));
    const pedal = [[x + side * 0.13, y + 0.12, z + 0.16], [x + side * 0.17, y + 0.2, z + 0.52], [x + side * 0.15, y + 0.06, z + 0.85],
      [x + side * 0.13, y - 0.06, z + 1.02], [x + side * 0.13, y - 0.07, z + 1.12], [x + side * 0.13, y + 0.01, z + 1.16], [x + side * 0.13, y + 0.05, z + 1.1]];
    parts.skin.push(tentacle(pedal, { root: 0.08, tip: 0.03, steps: 26, ...look }));
    const draped = [[x + side * 0.16, y + 0.2, z], [x + side * 0.3, y + 0.26, z + 0.04], [x + side * 0.42, y + 0.12, z + 0.14], [x + side * 0.5, y + 0.08, z + 0.25],
      [x + side * 0.56, y + 0.08, z + 0.38], [x + side * 0.64, y + 0.02, z + 0.44], [x + side * 0.68, y - 0.06, z + 0.42], [x + side * 0.65, y - 0.08, z + 0.36], [x + side * 0.62, y - 0.04, z + 0.34]];
    parts.skin.push(tentacle(draped, { root: 0.075, tip: 0.026, steps: 26, ...look }));
    const behind = [[x + side * 0.1, y + 0.26, z - 0.12], [x + side * 0.16, y + 0.48, z - 0.26], [x + side * 0.24, y + 0.52, z - 0.38], [x + side * 0.32, y + 0.48, z - 0.48],
      [x + side * 0.38, y + 0.56, z - 0.56], [x + side * 0.38, y + 0.66, z - 0.54], [x + side * 0.34, y + 0.68, z - 0.48], [x + side * 0.32, y + 0.62, z - 0.46]];
    parts.skin.push(tentacle(behind, { root: 0.075, tip: 0.026, steps: 28, ...look }));
  });
}

// A tentacle's tip winding a turn and a bit round the steering wheel's rim at its `side` grip (kart-layout.js's
// STEERING): round the rim's own direction there, from the driver's side, rising along it as it goes.
function gripCoil(side) {
  const [middleX, middleY, middleZ] = STEERING.middle;
  const grip = new THREE.Vector3(middleX + side * STEERING.radius, middleY, middleZ);
  const towardDriver = new THREE.Vector3(0, Math.sin(STEERING.lean), -Math.cos(STEERING.lean));
  const outward = new THREE.Vector3(side, 0, 0);
  const alongRim = new THREE.Vector3().crossVectors(towardDriver, outward).multiplyScalar(side);
  return Array.from({ length: 9 }, (unused, step) => {
    const share = step / 8;
    const angle = Math.PI / 3 - share * Math.PI * 2.3;
    return grip.clone()
      .addScaledVector(outward, Math.cos(angle) * 0.058)
      .addScaledVector(towardDriver, Math.sin(angle) * 0.058)
      .addScaledVector(alongRim, -0.05 + share * 0.1)
      .toArray();
  });
}
