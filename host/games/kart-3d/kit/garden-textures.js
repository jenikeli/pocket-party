// The garden props' textures (M7d4c5), drawn with kit/surface-maps.js so each has colour, relief, shade and
// roughness maps: a leaf scale (a puffy blade with a midrib and veins, for the round tree) and a hedge's fur
// (a dense mat of short blades, light and dark, repeating). Used by kit/round-tree.js and kit/hedge.js.

import { createSurface } from './surface-maps.js';
import { createRandom, between } from '../random.js';

const LEAF_PIXELS = 256;
const LEAF_BASE = 150;
const LEAF_COLOR = [232, 248, 222];
const VEIN_COLOR = [140, 190, 120];

// Returns { map, normalMap, aoMap, roughnessMap } for a leaf scale, 1 by 1 units: u across, v up the leaf to
// its tip. Not repeating. The colour is a pale green that the vertex colours tint.
export function drawLeafScale() {
  const surface = createSurface(1, 1, LEAF_PIXELS, { color: LEAF_COLOR, roughness: 0.75, base: LEAF_BASE });
  surface.panel({ left: 0.03, bottom: 0.03, width: 0.94, height: 0.94 }, { lift: 40, bevel: 0.22, paint: { color: LEAF_COLOR, roughness: 0.75 } });
  surface.groove([0.5, 0.04], [0.5, 0.92], { size: 0.035, depth: 40, color: VEIN_COLOR, amount: 0.6, roughness: 0.85 });
  for (let vein = 0; vein < 5; vein += 1) {
    const y = 0.12 + vein * 0.15;
    for (const side of [-1, 1]) {
      surface.groove([0.5, y], [0.5 + side * 0.32, y + 0.2], { size: 0.02, depth: 22, color: VEIN_COLOR, amount: 0.5, roughness: 0.85 });
    }
  }
  return surface.toMaps({ depth: 4, shade: { reach: 0.06, strength: 1.6 }, repeat: false });
}

const FUR_UNITS = 1.28;
const FUR_PIXELS_PER_UNIT = 200;
const FUR_BLADES = 2600;
const FUR_COLORS = {
  base: [170, 214, 120],
  light: [236, 255, 170],
  dark: [58, 112, 48],
};

// Returns { map, normalMap, aoMap, roughnessMap } for the hedge's fur: FUR_UNITS square, repeating, a light
// green mat with thousands of short blades cut into it in two shades so it reads as fuzzy, not flat.
export function drawHedgeFur() {
  const random = createRandom(131);
  const surface = createSurface(FUR_UNITS, FUR_UNITS, FUR_PIXELS_PER_UNIT, { color: FUR_COLORS.base, roughness: 1, base: 140 });
  for (let blade = 0; blade < FUR_BLADES; blade += 1) {
    const from = [between(random, 0, FUR_UNITS), between(random, 0, FUR_UNITS)];
    const angle = between(random, 0, 2 * Math.PI);
    const length = between(random, 0.04, 0.09);
    const to = [from[0] + Math.cos(angle) * length, from[1] + Math.sin(angle) * length];
    const light = random() < 0.45;
    surface.groove(from, to, {
      size: between(random, 0.012, 0.022),
      depth: light ? 12 : between(random, 25, 50),
      color: light ? FUR_COLORS.light : FUR_COLORS.dark,
      amount: light ? 0.7 : 0.55,
      roughness: 1,
    });
  }
  return surface.toMaps({ depth: 5, shade: { reach: 0.03, strength: 1.8 }, repeat: true });
}
