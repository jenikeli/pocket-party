// The kit's concrete (M7d2): pale grey with soft stains, fine grit and small pits, multiplied by each part's own
// colour, and since M7d4 its relief (a normal map), so the pits and grit catch the sun. A tile that repeats
// every 8 units. Used for the road's underside and sides (kit/road.js), the decks beside the road
// (kit/platform.js) and the barriers (shared through kit/kit.js).

import { createPixelImage } from './pixel-image.js';
import { drawnOnce } from '../canvas-texture.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;

// Returns { map, relief }: the colour texture and its normal map.
export function createConcreteTexture() {
  return drawnOnce('concrete', drawConcreteTexture);
}

function drawConcreteTexture() {
  const random = createRandom(47);
  const image = createPixelImage(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  const stains = createLayeredNoise(random, 3, 4);
  const lumps = createLayeredNoise(random, 12, 2);
  image.fill((x, y) => {
    const value = 214 + (stains(x / SIZE, y / SIZE) - 0.5) * 50 + (random() - 0.5) * 18;
    return [value, value - 2, value - 6];
  });
  heights.fill((x, y) => {
    const value = 150 + (lumps(x / SIZE, y / SIZE) - 0.5) * 60 + (random() - 0.5) * 30;
    return [value, value, value];
  });
  for (let index = 0; index < 600; index += 1) {
    const [x, y, radius] = [random() * SIZE, random() * SIZE, between(random, 0.3, 0.9)];
    image.dot(x, y, radius, [168, 165, 158]);
    heights.dot(x, y, radius + 0.4, [40, 40, 40]);
  }
  return { map: image.toTexture(), relief: heights.toReliefTexture({ depth: 2 }) };
}
