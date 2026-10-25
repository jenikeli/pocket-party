// The kit's concrete (M7d2): pale grey with soft stains, fine grit and small pits, multiplied by each part's own
// colour. A tile that repeats every 8 units. Used for the road's underside and sides (kit/road.js), the decks
// beside the road (kit/platform.js) and the barriers (shared through kit/kit.js).

import { createPixelImage } from './pixel-image.js';
import { createLayeredNoise } from '../noise.js';
import { createRandom, between } from '../random.js';

const SIZE = 256;

export function createConcreteTexture() {
  const random = createRandom(47);
  const image = createPixelImage(SIZE, SIZE);
  const stains = createLayeredNoise(random, 3, 4);
  image.fill((x, y) => {
    const value = 214 + (stains(x / SIZE, y / SIZE) - 0.5) * 50 + (random() - 0.5) * 18;
    return [value, value - 2, value - 6];
  });
  for (let index = 0; index < 600; index += 1) {
    image.dot(random() * SIZE, random() * SIZE, between(random, 0.3, 0.9), [168, 165, 158]);
  }
  return image.toTexture();
}
