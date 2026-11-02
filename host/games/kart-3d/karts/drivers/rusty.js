// Rusty (M7d5), our orange racer: a fox with orange fur, a white muzzle, chest and cheek ruffs, tall pointed ears
// with dark tips, a long pointed snout with a black nose and a big bushy tail with a white tip curling up behind
// the seat. He wears a navy bandana with white dots round his neck and a short brown jacket open over his white
// chest; dark paws on the wheel and navy sneakers in the nose. His emblem is a fox's face on a cream disc. His kart
// is orange, cream and brown. One entry of kart-designs.js's KART_DESIGNS; his head and tail are in rusty-parts.js.

import * as THREE from 'three';
import { partList, ball, limb, painted, emblemDisc } from '../part-shapes.js';
import { body, arm, leg } from '../driver-parts.js';
import { addFoxHead, bushyTail } from './rusty-parts.js';

const ORANGE = 0xe67e22;
const CREAM = 0xf4ecdc;
const BROWN = 0x6b4126;
const FUR = 0xf28432;
const WHITE_FUR = 0xfffaf4;
const DARK_FUR = 0x3a241b;
const JACKET = 0x7d4c2b;
const JACKET_TRIM = 0x55321c;
const BANDANA = 0x22386a;
const SNEAKER = 0x22386a;

const HEAD_RADIUS = 0.32;

export const RUSTY = Object.freeze({
  id: 'rusty',
  name: 'Rusty',
  slot: 5,
  palette: Object.freeze({ main: ORANGE, second: CREAM, third: BROWN }),
  drawEmblem,
  buildDriver,
});

// A fox's face, orange with white cheeks, tall ears with dark insides, two eyes and a black nose, on a cream disc.
function drawEmblem(context, size) {
  context.fillStyle = '#f4ecdc';
  context.fillRect(0, 0, size, size);
  const shape = (colour, points) => {
    context.beginPath();
    context.moveTo(points[0][0] * size, points[0][1] * size);
    points.slice(1).forEach(([x, y]) => context.lineTo(x * size, y * size));
    context.closePath();
    context.fillStyle = colour;
    context.fill();
  };
  [1, -1].forEach((side) => {
    const across = (x) => 0.5 + side * x;
    shape('#e67e22', [[across(0.06), 0.36], [across(0.3), 0.1], [across(0.36), 0.44]]);
    shape('#3a241b', [[across(0.15), 0.36], [across(0.28), 0.2], [across(0.31), 0.4]]);
  });
  // The face: wide across the cheeks, narrowing to the snout's tip at the bottom.
  shape('#e67e22', [[0.12, 0.42], [0.3, 0.32], [0.7, 0.32], [0.88, 0.42], [0.8, 0.6], [0.5, 0.86], [0.2, 0.6]]);
  shape('#ffffff', [[0.12, 0.42], [0.36, 0.6], [0.5, 0.56], [0.64, 0.6], [0.88, 0.42], [0.8, 0.6], [0.5, 0.86], [0.2, 0.6]]);
  context.fillStyle = '#1b1416';
  [0.37, 0.63].forEach((x) => {
    context.beginPath();
    context.ellipse(x * size, 0.47 * size, size * 0.035, size * 0.05, 0, 0, Math.PI * 2);
    context.fill();
  });
  context.beginPath();
  context.ellipse(0.5 * size, 0.8 * size, size * 0.06, size * 0.045, 0, 0, Math.PI * 2);
  context.fill();
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  addBody(parts, seat.hip);
  addBandana(parts, [x, y + 0.57, z + 0.02]);
  addLimbs(parts, seat);
  addFoxHead(parts, [x, y + 0.84, z + 0.05], HEAD_RADIUS, { fur: FUR, white: WHITE_FUR, dark: DARK_FUR, brow: 0x6a3418, iris: 0xd88a14 });
  // Out from under the seat's back, back over the engine and curling up beside his head, a little to his left so
  // the chase camera still sees his ears.
  const tail = [[x + 0.04, y + 0.12, z - 0.3], [x + 0.12, y + 0.3, z - 0.62], [x + 0.2, y + 0.62, z - 0.86], [x + 0.24, y + 0.95, z - 0.82], [x + 0.22, y + 1.12, z - 0.6]];
  parts.skin.push(bushyTail(tail, 0.17, FUR, WHITE_FUR));
  return parts;
}

// Orange fur below a short brown jacket, open down the front over his white chest, with darker edges, the emblem
// on its left breast and a bigger one on its back; the neck up to the head.
function addBody(parts, hip) {
  const [x, y, z] = hip;
  const [belly, jacket] = body([x, y - 0.02, z], { width: 0.58, height: 0.66, depth: 0.46, lower: FUR, upper: JACKET });
  parts.skin.push(belly, ball(0.16, [1, 1.3, 0.55], [x, y + 0.42, z + 0.15], WHITE_FUR, { detail: 16, crease: 0.1 }));
  parts.cloth.push(jacket);
  [1, -1].forEach((side) => {
    parts.cloth.push(limb([x + side * 0.15, y + 0.24, z + 0.2], [x + side * 0.13, y + 0.56, z + 0.15], 0.025, JACKET_TRIM));
  });
  parts.cloth.push(painted(new THREE.TorusGeometry(0.27, 0.035, 6, 28).rotateX(Math.PI / 2).scale(1, 1, 0.8).translate(x, y + 0.24, z), JACKET_TRIM, { crease: 0 }));
  parts.decal.push(emblemDisc(0.06, [0.4, 0.2, 1], [x + 0.2, y + 0.42, z + 0.19]));
  parts.decal.push(emblemDisc(0.1, [0, 0.4, -1], [x, y + 0.42, z - 0.225]));
  parts.skin.push(limb([x, y + 0.5, z], [x, y + 0.62, z + 0.03], 0.1, FUR));
}

// A navy bandana: a roll round the neck and a soft triangle hanging down over the chest, dotted white.
function addBandana(parts, neck) {
  const [x, y, z] = neck;
  const roll = new THREE.TorusGeometry(0.135, 0.045, 8, 24).rotateX(Math.PI / 2).translate(x, y, z);
  parts.cloth.push(painted(roll, BANDANA, { crease: 0.1 }), painted(kerchief().translate(x, y - 0.08, z + 0.215), BANDANA, { crease: 0.1 }));
  const dots = [[0, -0.02], [-0.06, -0.06], [0.06, -0.06], [0, -0.11], [-0.09, 0.0], [0.09, 0.0]];
  dots.forEach(([across, down]) => {
    parts.cloth.push(ball(0.013, [1, 1, 0.4], [x + across, y - 0.06 + down, z + 0.258 - down * 0.3], 0xffffff, { detail: 8, crease: 0 }));
  });
}

// A ball pulled to a point at its bottom and flattened, leaning back onto the chest: a kerchief's front triangle.
function kerchief() {
  const shape = new THREE.SphereGeometry(1, 12, 8);
  const { position } = shape.attributes;
  for (let index = 0; index < position.count; index += 1) {
    const y = position.getY(index);
    const narrowing = y < 0 ? 1 + y * 0.9 : 1;
    position.setX(index, position.getX(index) * narrowing);
  }
  shape.computeVertexNormals();
  return shape.scale(0.15, 0.13, 0.045).rotateX(-0.3);
}

// Brown sleeves with darker cuffs to dark paws on the wheel; orange thighs and dark lower legs bent up into the
// nose, in navy sneakers on cream soles.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.28, y + 0.5, z], hand, { radius: 0.08, bend: 0.1, sleeve: JACKET, cuff: JACKET_TRIM, glove: 0.095, gloveHex: DARK_FUR });
    parts.cloth.push(...sleeves);
    parts.skin.push(...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const { leg: legParts, shoe } = leg([x + side * 0.14, y + 0.04, z + 0.1], foot, { radius: 0.09, lift: 0.18, cloth: FUR, shoe: 0.28, shoeHex: SNEAKER, soleHex: CREAM });
    parts.skin.push(legParts[0], painted(legParts[1], DARK_FUR));
    parts.glossy.push(...shoe);
  });
}
