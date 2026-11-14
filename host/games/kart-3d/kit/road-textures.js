// The kit road's textures (M7d2), from the look study in docs/kart-reference.md: worn paint that shows the
// asphalt's stones through it, riveted metal plates for anti-gravity road, and grass with blades in it (the asphalt is photo-scanned, photo-asphalt.js). Each is a tile that repeats without a seam,
// laid over the world by the strip builder (one tile per 8 units). Used by kit/road.js, kit/road-paint.js and
// kit/kit.js (the decks' grass).

import { createPixelImage } from './pixel-image.js';
import { drawnOnce } from '../canvas-texture.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 512;
const SMALL = 256;

// Nearly white, multiplied by each mark's own colour: dark specks where the asphalt's gaps show through, and
// worn patches where the paint is thin.
export function createPaintTexture() {
  return drawnOnce('road-paint', drawPaintTexture);
}

function drawPaintTexture() {
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
  return drawnOnce('road-metal', drawMetalTexture);
}

function drawMetalTexture() {
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
  return drawnOnce('road-grass', drawGrassTexture);
}

function drawGrassTexture() {
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
