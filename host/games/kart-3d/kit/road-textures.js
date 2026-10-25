// The kit road's textures (M7d2), from the look study in docs/mk8dx-reference.md: coarse asphalt in three tones
// (a mid-grey base, light stones, dark gaps between them), worn paint that shows the stones through it, riveted
// metal plates for anti-gravity road, and grass with blades in it. Each is a tile that repeats without a seam,
// laid over the world by the strip builder (one tile per 8 units). Used by kit/road.js, kit/road-paint.js and
// kit/kit.js (the decks' grass).

import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 512;
const SMALL = 256;
// The asphalt's tile is laid twice over the strip builder's 8 units, so its stones come out small enough.
const ASPHALT_REPEAT = 2;

// A stone near the camera is about 0.04 units across (a tenth of a rear tyre's width): about 2.5 pixels here.
// The base's own mottling is soft; the large patches that hide the tile's repeat are the road's vertex colours.
export function createAsphaltTexture() {
  const random = createRandom(31);
  const image = createPixelImage(SIZE, SIZE);
  const mottle = createLayeredNoise(random, 4, 3);
  image.fill((x, y) => {
    const value = 104 + (mottle(x / SIZE, y / SIZE) - 0.5) * 30 + (random() - 0.5) * 18;
    return [value, value, value + 2];
  });
  for (let index = 0; index < 14000; index += 1) {
    image.dot(random() * SIZE, random() * SIZE, between(random, 0.4, 1.2), [56, 56, 58]);
  }
  for (let index = 0; index < 18000; index += 1) {
    const value = between(random, 130, 200);
    const tint = (random() - 0.5) * 12;
    image.dot(random() * SIZE, random() * SIZE, between(random, 0.4, 1.2), [value + tint, value, value - tint]);
  }
  const texture = image.toTexture();
  texture.repeat.set(ASPHALT_REPEAT, ASPHALT_REPEAT);
  return texture;
}

// Nearly white, multiplied by each mark's own colour: dark specks where the asphalt's gaps show through, and
// worn patches where the paint is thin.
export function createPaintTexture() {
  const random = createRandom(37);
  const image = createPixelImage(SMALL, SMALL);
  const wear = createLayeredNoise(random, 3, 3);
  image.fill((x, y) => {
    const worn = Math.max(0, 0.42 - wear(x / SMALL, y / SMALL)) * 2.2;
    const value = 238 - worn * 70 + (random() - 0.5) * 14;
    return [value, value, value];
  });
  for (let index = 0; index < 2000; index += 1) {
    image.dot(random() * SMALL, random() * SMALL, between(random, 0.2, 0.6), [120, 120, 124]);
  }
  return image.toTexture();
}

// Anti-gravity road: brushed metal plates 2 units square with dark seams and a rivet every half unit along
// their edges, multiplied by the road's blue tint.
export function createMetalTexture() {
  const random = createRandom(41);
  const image = createPixelImage(SIZE, SIZE);
  const plate = SIZE / 4;
  const brush = createLayeredNoise(random, 8, 2);
  image.fill((x, y) => {
    const value = 196 + (brush(x / SIZE, (y / SIZE) * 0.15) - 0.5) * 30 + (random() - 0.5) * 8;
    return [value, value, value];
  });
  for (let line = 0; line < SIZE; line += plate) {
    image.rect(line, 0, 3, SIZE, [70, 74, 82]);
    image.rect(0, line, SIZE, 3, [70, 74, 82]);
    image.rect(line + 3, 0, 1, SIZE, [235, 238, 242]);
    image.rect(0, line + 3, SIZE, 1, [235, 238, 242]);
  }
  for (let along = 0; along < SIZE; along += plate / 4) {
    for (let across = 0; across < SIZE; across += plate) {
      for (const [x, y] of [[across + 10, along + 8], [along + 8, across + 10]]) {
        image.dot(x, y, 2.6, [120, 124, 132]);
        image.dot(x - 0.8, y - 0.8, 1.2, [250, 250, 252]);
      }
    }
  }
  return image.toTexture();
}

// Bright grass with short blades in lighter and darker greens, leaning a little.
export function createGrassTexture() {
  const random = createRandom(43);
  const image = createPixelImage(SMALL, SMALL);
  const patches = createLayeredNoise(random, 4, 2);
  image.fill((x, y) => {
    const shade = (patches(x / SMALL, y / SMALL) - 0.5) * 40 + (random() - 0.5) * 16;
    return [92 + shade * 0.6, 168 + shade, 58 + shade * 0.4];
  });
  for (let index = 0; index < 7000; index += 1) {
    const x = random() * SMALL;
    const y = random() * SMALL;
    const lean = (random() - 0.5) * 0.8;
    const light = random() < 0.5;
    const color = light ? [150, 214, 92] : [52, 112, 34];
    const blade = Math.round(between(random, 2, 6));
    for (let step = 0; step < blade; step += 1) {
      image.mix(x + lean * step, y - step, color, 0.75 * (1 - step / blade / 2));
    }
  }
  return image.toTexture();
}
