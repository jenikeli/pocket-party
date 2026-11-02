// Pip (M7d5), our blue racer: a round little penguin, black-blue with a white face mask and belly, big eyes over a
// soft orange beak that smiles, in a blue knitted beanie with a white band and a big white pom-pom, a small red and
// white striped scarf, blue mittens on short flipper arms and orange webbed feet in the nose. Her emblem is a
// snowflake on a white disc. Her kart is blue, snow white and black-blue. One entry of kart-designs.js's
// KART_DESIGNS; her own parts are in pip-parts.js.

import { partList, ball, limb, emblemDisc, twoToneShaded } from '../part-shapes.js';
import { head, arm, scarf } from '../driver-parts.js';
import { eyes, eyebrows, cheeks } from '../driver-face.js';
import { frontOval, faceMask, beak, beanie, webbedFoot, striped } from './pip-parts.js';

const BLUE = 0x3498db;
const SNOW = 0xf4f7fb;
const INK = 0x1e2a44;
const WHITE = 0xffffff;
const SCARF_RED = 0xe0413a;

const HEAD_RADIUS = 0.32;

export const PIP = Object.freeze({
  id: 'pip',
  name: 'Pip',
  slot: 1,
  palette: Object.freeze({ main: BLUE, second: SNOW, third: INK }),
  drawEmblem,
  buildDriver,
});

// A six-armed snowflake, blue on a white disc: each arm a rounded stroke with two pairs of short branches.
function drawEmblem(context, size) {
  context.fillStyle = '#f4f7fb';
  context.fillRect(0, 0, size, size);
  context.strokeStyle = '#2b7fd0';
  context.lineCap = 'round';
  context.lineWidth = size * 0.075;
  context.translate(size / 2, size / 2);
  for (let arm = 0; arm < 6; arm += 1) {
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(0, -size * 0.36);
    [0.17, 0.27].forEach((along) => {
      const branch = size * (0.4 - along) * 0.55;
      context.moveTo(-branch, -size * along - branch);
      context.lineTo(0, -size * along);
      context.lineTo(branch, -size * along - branch);
    });
    context.stroke();
    context.rotate(Math.PI / 3);
  }
  context.setTransform(1, 0, 0, 1, 0, 0);
}

function buildDriver(seat) {
  const parts = partList();
  const [x, y, z] = seat.hip;
  // One round egg of a body, black-blue with a white belly across its front, and the head sitting down on it, in
  // the skin kind, whose faint glow in each part's own colour keeps the white belly and mask white in the kart's
  // shade, where the matte kind turned them grey.
  const bodyAt = [x, y + 0.33, z];
  const bodyStretch = [1, 1.1, 0.82];
  const egg = ball(0.33, bodyStretch, bodyAt, WHITE, { detail: 28, crease: 0.25 });
  parts.skin.push(twoToneShaded(egg, bodyAt, bodyStretch, SNOW, INK, frontOval(0.95, 1.2, 0.15)));
  const face = head([x, y + 0.86, z + 0.04], HEAD_RADIUS, INK);
  parts.skin.push(face.shape);
  parts.cloth.push(...striped(scarf([x, y + 0.6, z + 0.02], { radius: 0.21, thickness: 0.06, length: 0.42, width: 0.1, hex: WHITE }), { hex: SCARF_RED, otherHex: SNOW, rollCount: 14, tailCount: 5 }));
  addLimbs(parts, seat);
  addFace(parts, face);
  const cap = beanie(face, { scale: 1.05, tilt: 0.55, hex: BLUE, bandHex: SNOW });
  parts.cloth.push(...cap.cloth);
  parts.decal.push(emblemDisc(0.06, cap.emblemNormal, cap.emblemAt));
  return parts;
}

// Short black-blue flippers bent to blue mittens with white cuffs on the wheel; short legs bent up into the nose
// to orange webbed feet.
function addLimbs(parts, seat) {
  const [x, y, z] = seat.hip;
  seat.hands.forEach((hand) => {
    const side = Math.sign(hand[0]);
    const { sleeves, gloves } = arm([x + side * 0.27, y + 0.52, z + 0.04], hand, { radius: 0.08, bend: 0.06, sleeve: INK, cuff: SNOW, glove: 0.1, gloveHex: BLUE });
    const [upper, lower, cuff] = sleeves;
    parts.matte.push(upper, lower);
    parts.cloth.push(cuff, ...gloves);
  });
  seat.feet.forEach((foot) => {
    const side = Math.sign(foot[0]);
    const hip = [x + side * 0.14, y + 0.06, z + 0.12];
    const ankle = [foot[0], foot[1] + 0.07, foot[2] - 0.1];
    const knee = [(hip[0] + ankle[0]) / 2 + side * 0.02, Math.max(hip[1], ankle[1]) + 0.14, (hip[2] + ankle[2]) / 2];
    parts.matte.push(limb(hip, knee, 0.09, INK), limb(knee, ankle, 0.08, INK));
    parts.skin.push(...webbedFoot(foot, 0.3));
  });
}

// The white mask, big blue eyes and dark brows on it, soft pink blush, and the smiling beak between them.
function addFace(parts, face) {
  parts.skin.push(faceMask(face, { width: 0.6, height: 0.5, up: -0.12, hex: SNOW }));
  parts.glossy.push(...eyes(face, { size: 0.17, across: 0.2, up: 0.1, iris: 0x2f6fd0 }));
  parts.matte.push(...eyebrows(face, { across: 0.22, up: 0.4, length: 0.08, thickness: 0.03, tilt: 0.12, hex: INK }));
  parts.skin.push(...cheeks(face, { across: 0.44, up: -0.2, radius: 0.05, blushHex: 0xffb2c0 }).blush);
  const { skin, matte } = beak(face, { up: -0.34, width: 0.18 });
  parts.skin.push(...skin);
  parts.matte.push(...matte);
}
