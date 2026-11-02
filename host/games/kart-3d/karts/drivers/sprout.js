// Sprout (M7d5), our lime racer: a turnip-headed kid, the head a round white turnip turning pale purple toward its
// point with a tuft of big green leaves sprouting from it, in lime overalls over a cream shirt, tan gardening
// gloves and brown boots. The emblem is a seed sprouting from the soil on a cream disc. The kart is lime, cream and
// soil brown. One entry of kart-designs.js's KART_DESIGNS; the turnip, its leaves, the overalls' bib and straps and
// the boots are in sprout-parts.js.

import * as THREE from 'three';
import { partList, limb, painted, emblemDisc } from '../part-shapes.js';
import { body, arm, leg } from '../driver-parts.js';
import { eyes, eyebrows, nose, cheeks, smile } from '../driver-face.js';
import { turnipHead, leafTuft, bibs, straps, bootTop } from './sprout-parts.js';

const LIME = 0xa3e048;
const CREAM = 0xf4ecd6;
const SOIL = 0x553823;
// The turnip is drawn in the skin kind: its faint glow, in the turnip's own white and purple, keeps it bright in
// the kart's shade, where the matte kind turned the white grey.
const TURNIP = 0xfaf6ee;
const TURNIP_PURPLE = 0xb98ae0;
const TURNIP_DEEP = 0x8a4cc4;
const LEAF = 0x4cbb3c;
const LEAF_RIB = 0xa6e070;
const LEAF_GREEN_DARK = 0x2f6b28;
const GLOVE = 0xe0b469;
const BOOT = 0x8a5632;
const BRASS = 0xd8b04a;

const HEAD_RADIUS = 0.34;
// The chest's shape, as driver-parts.js's body takes it.
const BODY = { width: 0.6, height: 0.66, depth: 0.46 };
// The leaves, as sprout-parts.js's leaf takes them: a tall one leaning back, two out to the back corners, two out
// over the sides and a small one tipped forward, so the tuft reads from behind as well as in front.
const LEAVES = [
  { turn: Math.PI, lean: 0.4, length: 0.44, width: 0.27, curl: 0.25 },
  { turn: Math.PI - 1.1, lean: 0.75, length: 0.4, width: 0.25, curl: 0.3 },
  { turn: Math.PI + 1.1, lean: 0.75, length: 0.4, width: 0.25, curl: 0.3 },
  { turn: 0.9, lean: 0.95, length: 0.34, width: 0.25, curl: 0.3 },
  { turn: -0.9, lean: 0.95, length: 0.34, width: 0.25, curl: 0.3 },
  { turn: 0.15, lean: 0.5, length: 0.26, width: 0.18, curl: 0.35 },
];

export const SPROUT = Object.freeze({
  id: 'sprout',
  name: 'Sprout',
  slot: 8,
  palette: Object.freeze({ main: LIME, second: CREAM, third: SOIL }),
  drawEmblem,
  buildDriver,
});

// A seed sprouting from a mound of soil, two leaves on its curved stem, on a cream disc.
function drawEmblem(context, size) {
  context.fillStyle = '#f4ecd6';
  context.fillRect(0, 0, size, size);
  context.save();
  context.scale(size, size);
  // The soil: a low mound across the disc's foot.
  context.beginPath();
  context.ellipse(0.5, 0.86, 0.36, 0.14, 0, Math.PI, 0);
  context.fillStyle = '#6b4428';
  context.fill();
  // The stem curving up from the seed, and a leaf either side at its top.
  context.beginPath();
  context.moveTo(0.5, 0.72);
  context.bezierCurveTo(0.5, 0.56, 0.44, 0.48, 0.5, 0.36);
  context.lineWidth = 0.05;
  context.lineCap = 'round';
  context.strokeStyle = '#4caf3a';
  context.stroke();
  [[0.33, 0.3, -0.5, '#7ccf3a'], [0.67, 0.27, 0.5, '#4caf3a']].forEach(([leafX, leafY, tilt, colour]) => {
    context.beginPath();
    context.ellipse(leafX, leafY, 0.17, 0.085, tilt, 0, Math.PI * 2);
    context.fillStyle = colour;
    context.fill();
  });
  // The seed, half sunk in the soil.
  context.beginPath();
  context.ellipse(0.5, 0.75, 0.1, 0.07, -0.3, 0, Math.PI * 2);
  context.fillStyle = '#c8955a';
  context.fill();
  context.restore();
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  addBody(parts, seat.hip);
  addLimbs(parts, seat);
  const { face, top } = turnipHead([x, y + 0.86, z + 0.05], HEAD_RADIUS, { white: TURNIP, purple: TURNIP_PURPLE, deepPurple: TURNIP_DEEP });
  parts.skin.push(face.shape);
  addFace(parts, face);
  parts.matte.push(...leafTuft(top, LEAVES, { leafHex: LEAF, ribHex: LEAF_RIB }));
  return parts;
}

// A lime belly and seat under a cream shirt, with the overalls' bib on the chest and its panel on the back, the
// emblem on each (bigger on the back, for a chasing player), the straps over the shoulders with brass buttons, a
// cream collar, and the turnip's root as the neck.
function addBody(parts, hip) {
  const [x, y, z] = hip;
  parts.cloth.push(...body([x, y - 0.02, z], { ...BODY, lower: LIME, upper: CREAM }));
  // body's chest is a ball this big round this middle.
  const chest = { at: [x, y - 0.02 + BODY.height * 0.68, z], radii: [BODY.width / 2, BODY.height / 4, BODY.depth / 2] };
  const bibTop = 0.85;
  parts.cloth.push(...bibs(chest, { top: bibTop, hex: LIME }));
  const { straps: bands, buttons } = straps(chest, { across: 0.42, bibTop, hex: LIME, buttonHex: BRASS });
  parts.cloth.push(...bands);
  parts.metal.push(...buttons);
  parts.decal.push(emblemDisc(0.065, [0, 0.2, 1], [x, chest.at[1] - 0.02, z + chest.radii[2] * 1.03 + 0.005]));
  parts.decal.push(emblemDisc(0.09, [0, 0.3, -1], [x, chest.at[1], z - chest.radii[2] * 1.03 - 0.008]));
  parts.skin.push(limb([x, y + 0.5, z], [x, y + 0.62, z + 0.03], 0.1, TURNIP));
  const collar = new THREE.TorusGeometry(0.12, 0.035, 8, 24).rotateX(Math.PI / 2).translate(x, y + 0.57, z + 0.02);
  parts.cloth.push(painted(collar, CREAM, { crease: 0.1 }));
}

// Cream shirt sleeves to tan gardening gloves with lime cuffs on the wheel; lime overall legs bent up into the
// nose, rolled up over brown boots.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.29, y + 0.5, z], hand, { radius: 0.085, bend: 0.1, sleeve: CREAM, cuff: LIME, glove: 0.1, gloveHex: GLOVE });
    parts.cloth.push(...sleeves, ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const legHip = [x + side * 0.14, y + 0.04, z + 0.1];
    const lift = 0.18;
    const { leg: legParts, shoe } = leg(legHip, foot, { radius: 0.095, lift, cloth: LIME, shoe: 0.3, shoeHex: BOOT, soleHex: SOIL });
    // leg's knee, so the boot's shaft runs up the shin toward it.
    const knee = [(legHip[0] + foot[0]) / 2 + side * 0.02, Math.max(legHip[1], foot[1]) + lift, (legHip[2] + foot[2]) / 2];
    const { boot, cuff } = bootTop(foot, knee, { radius: 0.105, shoe: 0.3, bootHex: BOOT, cuffHex: LIME });
    parts.cloth.push(...legParts, cuff);
    parts.matte.push(...shoe, boot);
  });
}

// The shared face on the turnip: violet eyes, green brows, a little round nose, pink blush and a wide smile.
function addFace(parts, face) {
  parts.glossy.push(...eyes(face, { size: 0.16, across: 0.19, up: 0.1, iris: 0x8a62d0 }));
  parts.matte.push(...eyebrows(face, { across: 0.21, up: 0.4, length: 0.085, thickness: 0.032, tilt: 0.12, hex: LEAF_GREEN_DARK }));
  parts.skin.push(nose(face, { radius: 0.055, up: -0.08, hex: 0xfbeee8 }));
  // A turnip has no freckles: only the blush is kept.
  const { blush } = cheeks(face, { across: 0.42, up: -0.2, radius: 0.055, blushHex: 0xf7a3b4, freckleHex: TURNIP });
  parts.skin.push(...blush);
  parts.matte.push(...smile(face, { width: 0.17, up: -0.4 }));
}
