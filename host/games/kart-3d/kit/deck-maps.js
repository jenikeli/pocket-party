// The maps for the tops of the seaside decks (M7d4c5), drawn pixel by pixel from a colour picture and a height
// field, from which the relief (a normal map) and the shade (ambient occlusion) are worked out: boards with seams,
// grain and nail heads, laid stones with their joints sunk, and sand in ripples. Used by kit/platform.js. Each
// returns { map, normalMap, aoMap }, a tile that repeats without a seam; the colour is pale, so the deck's tint
// multiplies it.

import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise, createTileNoise } from '../noise.js';
import { createRandom, between } from '../random.js';
import { drawnOnce } from '../canvas-texture.js';

const SIZE = 512;
// A pixel's height as a grey [r, g, b].
const level = (value) => [value, value, value];
const smooth = (share) => share * share * (3 - 2 * share);

// The three maps from a colour picture and its height field; `depth` is the relief's steepness, `reach` and
// `strength` the shade's (kit/pixel-image.js).
function mapsOf(colors, heights, { depth, reach, strength }) {
  return {
    map: colors.toTexture(),
    normalMap: heights.toReliefTexture({ depth }),
    aoMap: heights.toShadeTexture({ reach, strength }),
  };
}

// Eight planks across a tile (4 units: half a unit each) running across the deck, each cut in two lengths with
// its joint staggered from the next plank's, the gaps between them sunk and dark, each plank's edges worn round,
// the grain in fine ridges, and two nail heads either side of every joint.
export function createBoardsMaps() {
  return drawnOnce('deck-boards', drawBoardsMaps);
}

function drawBoardsMaps() {
  const random = createRandom(71);
  const colors = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  const planks = 8;
  const plankHeight = SIZE / planks;
  const lengthPixels = SIZE / 2;
  const grain = createTileNoise(random, 4, 96);
  const knots = createLayeredNoise(random, 3, 3);
  const tints = Array.from({ length: planks * 2 }, () => between(random, -16, 16));
  const joints = Array.from({ length: planks }, () => Math.floor(random() * SIZE));
  colors.fill((x, y) => {
    const plank = Math.floor(y / plankHeight);
    const length = Math.floor((x - joints[plank] + SIZE) % SIZE / lengthPixels);
    const streak = (grain(x / SIZE, y / SIZE) - 0.5) * 50 + (knots(x / SIZE, y / SIZE) - 0.5) * 22;
    const value = 198 + tints[plank * 2 + length] + streak + (random() - 0.5) * 8;
    return [value, value * 0.93, value * 0.84];
  });
  heights.fill((x, y) => {
    const fromEdge = Math.min(y % plankHeight, plankHeight - 1 - (y % plankHeight));
    const alongJoint = (x - joints[Math.floor(y / plankHeight)] + SIZE) % lengthPixels;
    const fromEnd = Math.min(alongJoint, lengthPixels - 1 - alongJoint);
    const worn = (1 - smooth(Math.min(Math.min(fromEdge, fromEnd) / 9, 1))) * 60;
    return level(180 - worn + (grain(x / SIZE, y / SIZE) - 0.5) * 36);
  });
  for (let plank = 0; plank < planks; plank += 1) {
    const top = plank * plankHeight;
    colors.rect(0, top, SIZE, 3, [62, 50, 40], 0.9);
    heights.rect(0, top, SIZE, 3, level(20));
    for (const end of [joints[plank], joints[plank] + lengthPixels]) {
      colors.rect(end - 1, top, 3, plankHeight, [66, 54, 42], 0.9);
      heights.rect(end - 1, top, 3, plankHeight, level(20));
      for (const nail of [end - 12, end + 12]) {
        for (const share of [0.3, 0.7]) {
          colors.dot(nail, top + plankHeight * share, 2.6, [64, 60, 58]);
          heights.dot(nail, top + plankHeight * share, 2.6, level(235));
        }
      }
    }
  }
  return mapsOf(colors, heights, { depth: 5, reach: 6, strength: 1.6 });
}

// Stones laid in rows across a tile (4 units: four rows of a unit), each row cut into stones of different
// lengths so the joints never line up; each stone a little different in tone and height, its edges rounded
// down to a deep joint, with chips and specks on it.
export function createPavingMaps() {
  return drawnOnce('deck-paving', drawPavingMaps);
}

function drawPavingMaps() {
  const random = createRandom(73);
  const colors = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  const rows = 4;
  const rowHeight = SIZE / rows;
  const tone = createLayeredNoise(random, 4, 3);
  const stones = [];
  for (let row = 0; row < rows; row += 1) {
    const cuts = [0, 0.3 + random() * 0.15, 0.62 + random() * 0.12].map((share) => Math.floor(share * SIZE + row * 90) % SIZE);
    stones.push(cuts.sort((a, b) => a - b).map((start) => ({ start, tint: between(random, -14, 10), lift: between(random, -12, 12) })));
  }
  const stoneAt = (x, row) => {
    const list = stones[row];
    const before = list.filter((stone) => stone.start <= x);
    const stone = before.length ? before[before.length - 1] : list[list.length - 1];
    const next = list[(list.indexOf(stone) + 1) % list.length];
    return { stone, fromStart: (x - stone.start + SIZE) % SIZE, toNext: (next.start - x + SIZE) % SIZE || SIZE };
  };
  const draw = (x, y) => {
    const row = Math.floor(y / rowHeight);
    const { stone, fromStart, toNext } = stoneAt(x, row);
    const inside = Math.min(fromStart, toNext - 1, y % rowHeight, rowHeight - 1 - (y % rowHeight));
    return { stone, rise: smooth(Math.min(inside / 7, 1)), joint: inside < 3 };
  };
  colors.fill((x, y) => {
    const { stone, joint } = draw(x, y);
    const value = joint ? 120 : 222 + stone.tint + (tone(x / SIZE, y / SIZE) - 0.5) * 24 + (random() - 0.5) * 16;
    return [value, value * 0.98, value * 0.93];
  });
  heights.fill((x, y) => {
    const { stone, rise } = draw(x, y);
    return level(60 + rise * 130 + stone.lift + (random() - 0.5) * 8);
  });
  for (let chip = 0; chip < 220; chip += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, between(random, 0.8, 2.2)];
    colors.dot(x, y, radius, [150, 146, 138]);
    heights.dot(x, y, radius, level(110));
  }
  return mapsOf(colors, heights, { depth: 5, reach: 7, strength: 1.8 });
}

// Sand in wind ripples across a tile (6 units: nine ripples, two-thirds of a unit each): each ripple a long gentle slope and a short steep one, crests wandering, with specks and shell bits.
export function createSandMaps() {
  return drawnOnce('deck-sand', drawSandMaps);
}

function drawSandMaps() {
  const random = createRandom(79);
  const colors = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  const wander = createTileNoise(random, 3, 3);
  const patches = createLayeredNoise(random, 3, 3);
  const ripples = 9;
  const ripple = (x, y) => {
    const phase = (y / SIZE) * ripples + (wander(x / SIZE, y / SIZE) - 0.5) * 0.9 + Math.sin((x / SIZE) * 2 * Math.PI * 2) * 0.12;
    const along = phase - Math.floor(phase);
    return along < 0.7 ? along / 0.7 : (1 - along) / 0.3;
  };
  colors.fill((x, y) => {
    const value = 222 + ripple(x, y) * 14 + (patches(x / SIZE, y / SIZE) - 0.5) * 24 + (random() - 0.5) * 18;
    return [value, value * 0.93, value * 0.76];
  });
  heights.fill((x, y) => level(90 + ripple(x, y) * 80 + (random() - 0.5) * 10));
  for (let index = 0; index < 2400; index += 1) {
    colors.dot(random() * SIZE, random() * SIZE, between(random, 0.4, 1), [170, 150, 112]);
  }
  for (let index = 0; index < 220; index += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, between(random, 0.7, 1.6)];
    colors.dot(x, y, radius, [252, 248, 240]);
    heights.dot(x, y, radius, level(210));
  }
  return mapsOf(colors, heights, { depth: 4, reach: 8, strength: 1.2 });
}
