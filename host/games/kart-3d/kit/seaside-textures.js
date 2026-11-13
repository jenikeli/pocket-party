// The kit's seaside textures (M7d3): weathered wooden planks and beach sand, for the boardwalks, fences and huts
// of a seaside course (MK8DX's Cheep Cheep Beach, Koopa Cape and Daisy Circuit). Each is a tile that repeats
// without a seam; wood is pale, so a part's own colour tints it. Shared through kit/kit.js. (The thatch and the
// stone moved to kit/thatch-texture.js and kit/stone-texture.js in M7d4c3.)

import { createPixelImage } from './pixel-image.js';
import { drawnOnce } from '../canvas-texture.js';
import { createLayeredNoise, createTileNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;

// Four planks down the tile, running across it: grain streaks along each, a dark gap between them, a joint
// where two planks meet end to end (staggered from plank to plank), and a nail head either side of each joint.
// Since M7d4 with its relief: the gaps sunk, each plank's edges worn round, the grain in fine ridges and the
// nail heads standing up. Returns { map, relief }: the colour texture and its normal map.
export function createWoodTexture() {
  return drawnOnce('wood', drawWoodTexture);
}

function drawWoodTexture() {
  const random = createRandom(61);
  const image = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  const planks = 4;
  const plankHeight = SIZE / planks;
  const grain = createTileNoise(random, 4, 48);
  const knots = createLayeredNoise(random, 3, 3);
  const shades = Array.from({ length: planks * 2 }, () => between(random, -16, 16));
  const joints = Array.from({ length: planks }, () => Math.floor(random() * SIZE));
  image.fill((x, y) => {
    const plank = Math.floor(y / plankHeight);
    const half = (x - joints[plank] + SIZE) % SIZE < SIZE / 2 ? 0 : 1;
    const streak = (grain(x / SIZE, y / SIZE) - 0.5) * 46 + (knots(x / SIZE, y / SIZE) - 0.5) * 20;
    const value = 196 + shades[plank * 2 + half] + streak + (random() - 0.5) * 10;
    return [value, value * 0.93, value * 0.84];
  });
  heights.fill((x, y) => {
    // Rounded toward each plank's long edges, over its outer 6 pixels.
    const fromEdge = Math.min(y % plankHeight, plankHeight - (y % plankHeight));
    const value = 170 - Math.max(0, 6 - fromEdge) * 14 + (grain(x / SIZE, y / SIZE) - 0.5) * 50;
    return [value, value, value];
  });
  for (let plank = 0; plank < planks; plank += 1) {
    const top = plank * plankHeight;
    image.rect(0, top, SIZE, 2, [70, 58, 46], 0.85);
    image.rect(0, top + 2, SIZE, 1, [230, 220, 200], 0.25);
    heights.rect(0, top - 1, SIZE, 3, [10, 10, 10]);
    for (const end of [joints[plank], joints[plank] + SIZE / 2]) {
      image.rect(end, top, 2, plankHeight, [80, 66, 52], 0.8);
      heights.rect(end - 1, top, 3, plankHeight, [30, 30, 30]);
      for (const nail of [end - 5, end + 6]) {
        for (const share of [0.3, 0.7]) {
          image.dot(nail, top + plankHeight * share, 1.3, [90, 90, 96]);
          heights.dot(nail, top + plankHeight * share, 1.6, [240, 240, 240]);
        }
      }
    }
  }
  return { map: image.toTexture(), relief: heights.toReliefTexture({ depth: 4 }) };
}

// Pale beach sand: fine grains, soft wind ripples across the tile, a few darker specks and white shell bits.
export function createSandTexture() {
  return drawnOnce('sand', drawSandTexture);
}

function drawSandTexture() {
  const random = createRandom(67);
  const image = createPixelImage(SIZE, SIZE);
  const patches = createLayeredNoise(random, 3, 3);
  image.fill((x, y) => {
    const ripple = Math.sin(((y + 6 * Math.sin((x / SIZE) * 2 * Math.PI * 2)) / SIZE) * 2 * Math.PI * 9) * 7;
    const value = 228 + ripple + (patches(x / SIZE, y / SIZE) - 0.5) * 26 + (random() - 0.5) * 22;
    return [value, value * 0.93, value * 0.76];
  });
  for (let index = 0; index < 900; index += 1) {
    image.dot(random() * SIZE, random() * SIZE, between(random, 0.3, 0.8), [170, 150, 112]);
  }
  for (let index = 0; index < 120; index += 1) {
    image.dot(random() * SIZE, random() * SIZE, between(random, 0.5, 1.1), [252, 248, 240]);
  }
  return image.toTexture();
}
