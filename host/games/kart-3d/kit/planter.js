// The kit's planter (M7d4c5, to the study of MK8DX's Daisy Circuit flower pots): a long terracotta pot, tapered,
// with a thick rim and a dark crease under it, full of soil, a ring of leaves and five-petal flowers in four
// colours. 1.8 long along x, 0.8 deep, about 0.85 tall with the flowers, on y = 0. Used by kit/props.js.

import * as THREE from 'three';
import { at, coloured, mergeShapes, roundedBox, shaded } from '../shape-utils.js';
import { createRandom, between } from '../random.js';
import { buildLeafScale } from './leaf-scale.js';
import { buildFlower } from './flowers.js';

const TERRACOTTA = 0xc8643a;
const RIM = 0xd97a4a;
const FLOWER_COLORS = [0xff7ab8, 0xffe14a, 0xffffff, 0xff5a5a];
const POT_HEIGHT = 0.5;

// One geometry for the whole planter: it has no maps, so the kit's painted material colours it.
export function buildPlanter(kit) {
  return [{ geometry: kit.keep(planterShape()), material: kit.materials.painted }];
}

function planterShape() {
  return mergeShapes([...potShapes(), ...leafShapes(), ...flowerShapes()]);
}

// The pot (a tapered body, a rim over it, soil in the rim); the body is darkest under the rim.
function potShapes() {
  const body = at(roundedBox(1.6, POT_HEIGHT, 0.64, 0.07), 0, POT_HEIGHT / 2, 0);
  const rim = at(roundedBox(1.8, 0.14, 0.8, 0.05), 0, POT_HEIGHT + 0.02, 0);
  const soil = at(roundedBox(1.62, 0.1, 0.62, 0.03), 0, POT_HEIGHT + 0.07, 0);
  return [
    shaded(coloured(body, TERRACOTTA), (x, y) => 0.55 + 0.45 * (1 - Math.max(y - 0.25, 0) / 0.25 * 0.5)),
    coloured(rim, RIM),
    coloured(soil, 0x4a3220),
  ];
}

// A ring of leaves standing up out of the soil, so the flowers have something green behind them.
function leafShapes() {
  const random = createRandom(109);
  return Array.from({ length: 16 }, (_, index) => {
    const x = -0.7 + (index / 15) * 1.4;
    const side = index % 2 === 0 ? 1 : -1;
    return buildLeafScale({
      length: between(random, 0.4, 0.55),
      width: 0.28,
      pitch: between(random, 0.5, 0.9),
      droop: 0.3,
      turn: side > 0 ? 0 : Math.PI,
      position: [x, POT_HEIGHT + 0.1, side * 0.1],
      base: 0x1d5a26,
      tip: 0x4fae38,
    });
  });
}

// Flowers on top of the leaves, each facing up and a little outward.
function flowerShapes() {
  const random = createRandom(107);
  return Array.from({ length: 9 }, (_, index) => {
    const x = -0.72 + (index / 8) * 1.44;
    return buildFlower({
      position: [x, between(random, 0.68, 0.78), between(random, -0.18, 0.18)],
      normal: [between(random, -0.3, 0.3), 1, between(random, -0.2, 0.3)],
      size: between(random, 0.16, 0.2),
      petalColor: FLOWER_COLORS[index % FLOWER_COLORS.length],
      spin: random() * 6,
    });
  });
}
