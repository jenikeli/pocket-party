// The sponsor wall's chain-link fence as maps (M7d4c3): a tile of woven diagonal wire, drawn pixel by pixel as
// round wire (a height field, so its relief is a normal map and its shade an occlusion map) in galvanised grey,
// with the pixels between the wires cut out (alpha). Where two wires cross, one passes over the other in turn.
// Used by kit/sponsor-wall.js.

import * as THREE from 'three';
import { createCanvas, repeatingTexture } from '../canvas-texture.js';
import { createPixelImage } from './pixel-image.js';

const SIZE = 128;
// Wires run along x - y and x + y at multiples of this many pixels: two diamonds across and down per tile.
const SPACING = SIZE / 4;
const WIRE_RADIUS = 3.4;
const GALVANISED = [150, 156, 164];

// `keep(thing)` registers what must be disposed. Returns the fence's material (seen from both sides).
export function createChainLinkMaterial(keep) {
  const { color, heights } = drawWire();
  const maps = {
    map: keep(repeatingTexture(color)),
    normalMap: keep(heights.toReliefTexture({ depth: 5, repeat: true })),
    aoMap: keep(heights.toShadeTexture({ reach: 3, strength: 1.2, repeat: true })),
  };
  return keep(new THREE.MeshStandardMaterial({ ...maps, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.55 }));
}

// How high a round wire stands `distance` pixels from its middle (0 outside it).
function wireHeight(distance) {
  const share = distance / WIRE_RADIUS;
  return share < 1 ? Math.sqrt(1 - share * share) : 0;
}

// The tile's colour canvas (alpha 0 between the wires) and its height image.
function drawWire() {
  const { canvas, context } = createCanvas(SIZE, SIZE);
  const image = context.createImageData(SIZE, SIZE);
  const heights = createPixelImage(SIZE, SIZE);
  heights.fill((x, y) => {
    const [across, along] = [(x - y) / SPACING, (x + y) / SPACING];
    const [wireA, wireB] = [Math.round(across), Math.round(along)];
    const [heightA, heightB] = [wireA, wireB].map((wire, index) => wireHeight((Math.abs([across, along][index] - wire) * SPACING) / Math.SQRT2));
    // Where both are present, the wire whose turn it is lies on top.
    const aOver = (wireA + wireB) % 2 === 0;
    const height = Math.max(heightA * (aOver ? 1 : 0.55), heightB * (aOver ? 0.55 : 1));
    const offset = (y * SIZE + x) * 4;
    const tone = 0.55 + 0.45 * height;
    GALVANISED.forEach((channel, index) => (image.data[offset + index] = channel * tone));
    image.data[offset + 3] = height > 0 ? 255 : 0;
    return [height * 255, height * 255, height * 255];
  });
  context.putImageData(image, 0, 0);
  return { color: canvas, heights };
}
