// The kit's seaside textures (M7d3): weathered wooden planks, beach sand, straw thatch and stone blocks, for the
// boardwalks, fences, huts and lighthouse of a seaside course (MK8DX's Cheep Cheep Beach, Koopa Cape and Daisy
// Circuit). Each is a tile that repeats without a seam; wood and stone are pale, so a part's own colour tints
// them. Wood and sand are shared through kit/kit.js; the others are drawn by the pieces that use them.

import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise, createTileNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;

// Four planks down the tile, running across it: grain streaks along each, a dark gap between them, a joint
// where two planks meet end to end (staggered from plank to plank), and a nail head either side of each joint.
export function createWoodTexture() {
  const random = createRandom(61);
  const image = createPixelImage(SIZE, SIZE);
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
  for (let plank = 0; plank < planks; plank += 1) {
    const top = plank * plankHeight;
    image.rect(0, top, SIZE, 2, [70, 58, 46], 0.85);
    image.rect(0, top + 2, SIZE, 1, [230, 220, 200], 0.25);
    for (const end of [joints[plank], joints[plank] + SIZE / 2]) {
      image.rect(end, top, 2, plankHeight, [80, 66, 52], 0.8);
      for (const nail of [end - 5, end + 6]) {
        image.dot(nail, top + plankHeight * 0.3, 1.3, [90, 90, 96]);
        image.dot(nail, top + plankHeight * 0.7, 1.3, [90, 90, 96]);
      }
    }
  }
  return image.toTexture();
}

// Pale beach sand: fine grains, soft wind ripples across the tile, a few darker specks and white shell bits.
export function createSandTexture() {
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

// Straw thatch in overlapping rows down the tile: strands running down each row, darker toward the row's top
// where the row above overlaps it, with a shadowed lip at its bottom edge.
export function createThatchTexture() {
  const random = createRandom(71);
  const image = createPixelImage(SIZE, SIZE);
  const rows = 4;
  const rowHeight = SIZE / rows;
  const strands = createTileNoise(random, 96, 6);
  image.fill((x, y) => {
    const inRow = (y % rowHeight) / rowHeight;
    const strand = (strands(x / SIZE, y / SIZE) - 0.5) * 70;
    const value = 150 + strand + inRow * 70 + (random() - 0.5) * 16;
    return [value * 1.05, value * 0.86, value * 0.5];
  });
  for (let row = 0; row < rows; row += 1) {
    image.rect(0, (row + 1) * rowHeight - 3, SIZE, 3, [70, 52, 26], 0.6);
  }
  return image.toTexture();
}

// Stone blocks in courses, each block its own shade with rounded, darker edges and a pale mortar line between,
// as on a seaside lighthouse. Eight courses down the tile and four blocks across, offset every other course.
export function createStoneTexture() {
  const random = createRandom(73);
  const image = createPixelImage(SIZE, SIZE);
  const courses = 8;
  const across = 4;
  const courseHeight = SIZE / courses;
  const blockWidth = SIZE / across;
  const shades = Array.from({ length: courses * across }, () => between(random, -22, 18));
  const grit = createLayeredNoise(random, 6, 3);
  image.fill((x, y) => {
    const course = Math.floor(y / courseHeight);
    const shifted = (x + (course % 2) * (blockWidth / 2)) % SIZE;
    const block = Math.floor(shifted / blockWidth);
    // How near the block's edge the pixel is (0 at the edge, 1 in the middle), for the rounded edge.
    const edge = Math.min(shifted % blockWidth, blockWidth - (shifted % blockWidth), y % courseHeight, courseHeight - (y % courseHeight));
    if (edge < 1.5) {
      return [228, 222, 208];
    }
    const rounding = Math.min(1, edge / 5);
    const value = 170 + shades[course * across + block] + (grit(x / SIZE, y / SIZE) - 0.5) * 40 - (1 - rounding) * 40;
    return [value, value * 0.96, value * 0.88];
  });
  return image.toTexture();
}
