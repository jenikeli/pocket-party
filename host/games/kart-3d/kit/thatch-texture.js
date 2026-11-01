// The kit's straw thatch texture (M7d3): a tile that repeats without a seam, for the stilt huts' roofs. Pale
// straw, so a part's own colour tints it. Used by kit/stilt-hut.js.

import { createPixelImage } from './pixel-image.js';
import { createTileNoise } from '../noise.js';
import { createRandom } from '../random.js';

const SIZE = 256;

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
