// The kit's sea (M7d3, with M7c's ripples): small crossing ripples on the plain sea of scenery.js, drifting so
// the water catches the sun in moving sparkles. Used by the seaside surroundings.

import * as THREE from 'three';
import { createRandom } from '../random.js';
import { createCanvas, repeatingTexture } from '../canvas-texture.js';

const SIZE = 256;
// The ripples repeat every this many units and drift this many repeats a second.
const RIPPLE_TILE = 36;
const RIPPLE_DRIFT = 0.012;

// Gives `sea` (scenery.js's mesh) its ripples; `keep(thing)` registers what must be disposed with the world.
// Returns { update(dt) }.
export function dressSea(sea, keep) {
  const ripples = keep(createRippleTexture());
  ripples.repeat.set(sea.geometry.parameters.width / RIPPLE_TILE, sea.geometry.parameters.height / RIPPLE_TILE);
  Object.assign(sea.material, { normalMap: ripples, roughness: 0.2, needsUpdate: true });
  sea.material.normalScale.set(0.35, 0.35);
  let time = 0;
  return {
    update(dt) {
      time += dt;
      ripples.offset.set(time * RIPPLE_DRIFT, time * RIPPLE_DRIFT * 0.6);
    },
  };
}

// A normal map of small crossing ripples. Every wave fits a whole number of times across the tile, so the tile
// repeats without a seam.
function createRippleTexture() {
  const random = createRandom(11);
  const waves = Array.from({ length: 6 }, () => ({
    x: Math.round((random() - 0.5) * 12),
    y: Math.round((random() - 0.5) * 12),
    phase: random() * 2 * Math.PI,
  }));
  const { canvas, context } = createCanvas(SIZE, SIZE);
  const image = context.createImageData(SIZE, SIZE);
  // The ripple height's slope in x and y at a pixel, summed over the waves.
  const slope = (px, py) => {
    let dx = 0;
    let dy = 0;
    for (const wave of waves) {
      const angle = (2 * Math.PI * (wave.x * px + wave.y * py)) / SIZE + wave.phase;
      dx += wave.x * Math.cos(angle);
      dy += wave.y * Math.cos(angle);
    }
    return [dx * 0.02, dy * 0.02];
  };
  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      const [dx, dy] = slope(px, py);
      const length = Math.hypot(dx, dy, 1);
      const offset = (py * SIZE + px) * 4;
      image.data.set([((-dx / length) * 0.5 + 0.5) * 255, ((-dy / length) * 0.5 + 0.5) * 255, (0.5 / length + 0.5) * 255, 255], offset);
    }
  }
  context.putImageData(image, 0, 0);
  const texture = repeatingTexture(canvas);
  // A normal map holds directions, not colours.
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
