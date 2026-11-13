// The promenade railing's detail in textures (M7d4c3), drawn with kit/surface-maps.js: the pillar shaft's dressed
// stone blocks in courses, with mortar joints sunk between them and a little pitting; and the round plaque's
// flower (five rounded petals) in relief, gold on brown, inside a raised rim. Each comes as colour, relief, shade
// and roughness maps. Used by kit/promenade-rail.js.

import * as THREE from 'three';
import { createSurface, hexToRgb } from './surface-maps.js';
import { PILLAR } from './promenade-shapes.js';
import { drawnOnce } from '../canvas-texture.js';

const STONE_PIXELS_PER_UNIT = 128;
const COURSES = 5;
const MORTAR = 0x9a7e56;
const STONE = 0xd2a874;
// A joint's width, and how high a block stands over the mortar (0 to 255) and how its edges round.
const JOINT = 0.035;
const BLOCK_LIFT = 90;
const PLAQUE_PIXELS = 256;
const FIELD = 0x6b4423;
const GOLD = 0xd8b04a;
const FLOWER_CENTRE = 0x9a6a1e;
// The plaque is drawn in units of its disc (1 across): the rim's middle and half width.
const RIM = { middle: 0.45, half: 0.045 };

// `keep(thing)` registers what must be disposed. Returns { stone, plaque }: the shaft's and the plaque's materials.
export function createPromenadeDetail(keep) {
  const stoneMaps = drawnOnce('promenade-stone', drawStoneMaps);
  const plaqueMaps = drawnOnce('promenade-plaque', drawPlaqueMaps);
  [...Object.values(stoneMaps), ...Object.values(plaqueMaps)].forEach(keep);
  return {
    stone: keep(new THREE.MeshStandardMaterial({ ...stoneMaps, roughness: 1 })),
    plaque: keep(new THREE.MeshStandardMaterial({ ...plaqueMaps, roughness: 1, metalness: 0.3 })),
  };
}

// A number from 0 to 1 that looks random but is the same every time for the same inputs.
function hash(a, b, c = 0) {
  const value = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453;
  return value - Math.floor(value);
}

// The four faces side by side (as wrapUv lays them round the shaft), each a wall of blocks: every other course
// starts and ends with half blocks, so the joints stagger and the corners are bonded, as real stone's are.
function drawStoneMaps() {
  const { width, shaft } = PILLAR;
  const surface = createSurface(4 * width, shaft, STONE_PIXELS_PER_UNIT, { color: hexToRgb(MORTAR), roughness: 0.9, base: 40 });
  const courseHeight = shaft / COURSES;
  for (let course = 0; course < COURSES; course += 1) {
    const widths = course % 2 === 0 ? [width / 2, width / 2] : [width / 4, width / 2, width / 4];
    for (let face = 0; face < 4; face += 1) {
      let left = face * width;
      widths.forEach((blockWidth, index) => {
        const rect = { left: left + JOINT / 2, bottom: course * courseHeight + JOINT / 2, width: blockWidth - JOINT, height: courseHeight - JOINT };
        const tone = (0.9 + 0.2 * hash(course, face, index)) * (0.9 + 0.1 * (course / (COURSES - 1)));
        const color = hexToRgb(STONE).map((channel) => Math.min(255, channel * tone));
        surface.panel(rect, { lift: BLOCK_LIFT, bevel: 0.03, paint: { color, roughness: 0.85 } });
        left += blockWidth;
      });
    }
  }
  pitStone(surface);
  return surface.toMaps({ depth: 3, shade: { reach: 0.05, strength: 2 }, repeat: true });
}

// Scattered small pits in the stone, a dark fleck with a sunk middle.
function pitStone(surface) {
  for (let row = 0; row < surface.height; row += 1) {
    for (let column = 0; column < surface.width; column += 1) {
      const chance = hash(column, row);
      if (chance > 0.985) {
        surface.setHeight(column, row, surface.heightAt(column, row) - 30);
        surface.colors.mix(column, row, [110, 86, 56], 0.5);
      }
    }
  }
}

// The plaque's maps, once over the disc: a brown field, the raised gold rim, and Daisy's flower, five domed petals
// round a darker centre. Worked out pixel by pixel from the distance and angle from the middle.
function drawPlaqueMaps() {
  const surface = createSurface(1, 1, PLAQUE_PIXELS, { color: hexToRgb(FIELD), roughness: 0.6, base: 80 });
  const gold = hexToRgb(GOLD);
  const centre = hexToRgb(FLOWER_CENTRE);
  for (let row = 0; row < PLAQUE_PIXELS; row += 1) {
    for (let column = 0; column < PLAQUE_PIXELS; column += 1) {
      const [x, y] = [(column + 0.5) / PLAQUE_PIXELS - 0.5, 0.5 - (row + 0.5) / PLAQUE_PIXELS];
      const radius = Math.hypot(x, y);
      const rim = edge(RIM.half - Math.abs(radius - RIM.middle), 0.02);
      const petal = edge(petalReach(Math.atan2(y, x)) - radius, 0.03);
      const middle = edge(0.065 - radius, 0.02);
      surface.setHeight(column, row, 80 + 70 * rim + 85 * petal + 35 * middle);
      surface.colors.mix(column, row, gold, Math.max(rim, petal));
      surface.colors.mix(column, row, centre, middle);
      surface.roughnesses.mix(column, row, [80, 80, 80], Math.max(rim, petal));
    }
  }
  return surface.toMaps({ depth: 4, shade: { reach: 0.03, strength: 1.5 }, repeat: false });
}

// How far a petal reaches at `angle`: five rounded lobes with a notch between each.
function petalReach(angle) {
  return 0.09 + 0.17 * Math.abs(Math.cos(2.5 * angle)) ** 0.6;
}

// A share from 0 to 1 for how far inside a shape's edge a pixel is, `blur` units across, rounded off.
function edge(inside, blur) {
  const share = Math.min(Math.max(inside / blur, 0), 1);
  return share * share * (3 - 2 * share);
}
