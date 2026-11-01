// The kit's stone-block texture (M7d3): a tile that repeats without a seam, for the lighthouse's tower. Pale, so a
// part's own colour tints it. Used by kit/lighthouse.js.

import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;

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
