// Wisp (M7d5), a CPU racer in lavender white: a little ghost, a soft round white body shading to pale lavender,
// no legs, a wavy tail curling up out of the seat beside it, stubby arms reaching the wheel, big friendly violet
// eyes, a small open smile and pink blush, and a long red-orange scarf streaming behind. Its emblem is a crescent moon and a star on a night-blue disc. Its kart is lavender white,
// violet and red-orange. One entry of kart-designs.js's KART_DESIGNS; its own parts are in wisp-parts.js.

import { partList, ball, limb, emblemDisc } from '../part-shapes.js';
import { head, scarf } from '../driver-parts.js';
import { eyes, eyebrows, cheeks, smile } from '../driver-face.js';
import { sweep, bodyRadius, tailRadius, shadeGhost } from './wisp-parts.js';

const LAVENDER_WHITE = 0xe8e4f4;
const VIOLET = 0x5b4bb0;
const SCARF = 0xf0532a;
// The ghost is drawn in the skin kind: its faint glow, in the ghost's own colour, keeps it soft and bright in the
// kart's shade, where the matte kind turns white grey and the glossy kind's clear coat a chrome grey.
const GHOST_TOP = 0xece7fa;
const GHOST_TAIL = 0xc8bdf0;

const HEAD_RADIUS = 0.34;

export const WISP = Object.freeze({
  id: 'wisp',
  name: 'Wisp',
  slot: 11,
  palette: Object.freeze({ main: LAVENDER_WHITE, second: VIOLET, third: SCARF }),
  drawEmblem,
  buildDriver,
});

// A pale yellow crescent moon and a small star beside it, on a night-blue disc.
function drawEmblem(context, size) {
  context.fillStyle = '#2f2a6b';
  context.fillRect(0, 0, size, size);
  // The crescent: a full moon with a disc of the night cut out of its right side.
  context.fillStyle = '#ffe48a';
  context.beginPath();
  context.arc(size * 0.44, size * 0.5, size * 0.27, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#2f2a6b';
  context.beginPath();
  context.arc(size * 0.56, size * 0.43, size * 0.23, 0, Math.PI * 2);
  context.fill();
  // A five-pointed star up to the right of the moon's hollow.
  context.fillStyle = '#ffe48a';
  context.beginPath();
  for (let point = 0; point < 10; point += 1) {
    const angle = -Math.PI / 2 + (point * Math.PI) / 5;
    const reach = size * (point % 2 === 0 ? 0.11 : 0.045);
    context.lineTo(size * 0.68 + Math.cos(angle) * reach, size * 0.56 + Math.sin(angle) * reach);
  }
  context.fill();
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  const face = head([x, y + 0.86, z + 0.05], HEAD_RADIUS, GHOST_TOP);
  const shade = { topHex: GHOST_TOP, bottomHex: GHOST_TAIL, low: y - 0.05, high: y + 1.0 };
  parts.skin.push(...[face.shape, ...ghostBody(seat.hip)].map((shape) => shadeGhost(shape, shade)));
  parts.decal.push(emblemDisc(0.09, [0, 0.4, -1], [x, y + 0.36, z - 0.29]));
  parts.cloth.push(...scarf([x, y + 0.57, z + 0.02], { radius: 0.22, thickness: 0.075, length: 1.0, width: 0.14, hex: SCARF }));
  addArms(parts, seat, shade);
  addFace(parts, face);
  return parts;
}

// The body, from inside the head down through a narrow neck to a round belly sitting in the seat, and the tail
// leaving the belly's side low down, out over the seat's left bolster and rising beside it in an S, its tip
// flicking outward like a wisp of smoke, where it shows from behind and the side (inside the kart's nose it would
// be hidden).
function ghostBody([x, y, z]) {
  const spine = [[0, 0.82, 0.05], [0, 0.58, 0.03], [0, 0.3, 0.0], [0, -0.02, -0.02]];
  const body = sweep(spine.map(([px, py, pz]) => [x + px, y + py, z + pz]), (share) => bodyRadius(share, { neck: 0.2, belly: 0.28 }), { width: 1.1, depth: 0.92, steps: 36 });
  const tailPath = [[0.05, 0.12], [0.28, 0.02], [0.46, 0.1], [0.5, 0.3], [0.44, 0.48], [0.5, 0.62], [0.62, 0.64]];
  const tail = sweep(tailPath.map(([px, py]) => [x + px, y + py, z - 0.08]), (share) => tailRadius(share, 0.14), { across: [0, 0, 1], steps: 40, ring: 18 });
  return [body, tail];
}

// Stubby round arms out of the body's sides, thick at the shoulder and thinning to a round nub of a hand on the
// wheel with a little thumb on top, in the ghost's own soft white.
function addArms(parts, seat, shade) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const shoulder = [x + side * 0.2, y + 0.4, z + 0.06];
    const elbow = [(shoulder[0] + hand[0]) / 2 + side * 0.06, (shoulder[1] + hand[1]) / 2 - 0.05, (shoulder[2] + hand[2]) / 2];
    const arm = [
      limb(shoulder, elbow, 0.1, GHOST_TOP, { detail: 12 }),
      limb(elbow, hand, 0.085, GHOST_TOP, { detail: 12 }),
      ball(0.095, [1, 0.9, 1.1], hand, GHOST_TOP, { detail: 14 }),
      ball(0.045, [1, 0.8, 1.2], [hand[0] - side * 0.03, hand[1] + 0.07, hand[2] + 0.01], GHOST_TOP, { detail: 10 }),
    ];
    parts.skin.push(...arm.map((shape) => shadeGhost(shape, shade)));
  });
}

// Big friendly violet eyes under soft lavender brows, pink blush, and a small open smile; no nose.
function addFace(parts, face) {
  parts.glossy.push(...eyes(face, { size: 0.17, across: 0.2, up: 0.06, iris: 0x6a4fd8 }));
  parts.matte.push(...eyebrows(face, { across: 0.22, up: 0.4, length: 0.07, thickness: 0.022, tilt: 0.05, hex: 0xa494d8 }));
  parts.skin.push(...cheeks(face, { across: 0.42, up: -0.2, radius: 0.06, blushHex: 0xffb0cc, freckleHex: 0xffb0cc }).blush);
  parts.matte.push(...smile(face, { width: 0.13, up: -0.3 }));
}
