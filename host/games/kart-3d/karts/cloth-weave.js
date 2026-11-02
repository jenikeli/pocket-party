// The weave in the drivers' clothes (M7d5): a small repeating relief of threads going over and under each other,
// as a normal map, so cloth catches the light as fabric does instead of as smooth plastic. Drawn once while the
// race starts. Used by kart-materials.js.

import { createPixelImage } from '../kit/pixel-image.js';
import { grey } from '../kit/surface-maps.js';

const SIZE = 64;
// Threads across the tile, each way.
const THREADS = 8;
// How many times the tile repeats over a part's texture coordinates (a ball's run 0 to 1 once round it).
export const WEAVE_REPEAT = [14, 8];

// Returns a repeating normal map of a plain weave: each thread a rounded ridge, rising where it passes over the
// thread across it and sinking where it passes under, checkerwise.
export function createWeaveMap() {
  const heights = createPixelImage(SIZE, SIZE);
  const pitch = SIZE / THREADS;
  heights.fill((x, y) => {
    const [threadX, threadY] = [Math.floor(x / pitch), Math.floor(y / pitch)];
    // Across each thread its ridge rounds off toward its edges.
    const acrossX = Math.sin(((x % pitch) + 0.5) / pitch * Math.PI);
    const acrossY = Math.sin(((y % pitch) + 0.5) / pitch * Math.PI);
    const warpOnTop = (threadX + threadY) % 2 === 0;
    return grey(warpOnTop ? 0.35 + 0.65 * acrossX : 0.35 + 0.65 * acrossY);
  });
  const map = heights.toReliefTexture({ depth: 2.5 });
  map.repeat.set(...WEAVE_REPEAT);
  return map;
}
