// The 3D race's textures, drawn on small canvases while the game starts, so there are no image files to load:
// asphalt grain, corner arrow boards, the start gate's checks, and ripples for the sea. Used by track-mesh.js,
// trackside.js and seaside-scenery.js; each caller disposes what it asked for.

import * as THREE from 'three';
import { createRandom } from './random.js';

const SIZE = 256;

// Grey speckles and soft blotches around 0.9, to multiply over the road's colours: asphalt grain that repeats
// every few units along the road. Worked out pixel by pixel and written once: drawing shapes and reading them
// back took seconds in a software-drawn canvas.
export function createGrainTexture() {
  const random = createRandom(7);
  const blotches = Array.from({ length: 60 }, () => ({
    x: random() * SIZE,
    y: random() * SIZE,
    radius: 8 + random() * 30,
    shade: (random() - 0.5) * 40,
  }));
  const { canvas, context } = createCanvas(SIZE, SIZE);
  const image = context.createImageData(SIZE, SIZE);
  // How far apart two coordinates are across the tile, the short way round, so a blotch cut by an edge carries
  // on across the opposite edge and the tile repeats without a seam.
  const across = (a, b) => Math.min(Math.abs(a - b), SIZE - Math.abs(a - b));
  for (let py = 0; py < SIZE; py += 1) {
    for (let px = 0; px < SIZE; px += 1) {
      let value = 232 + (random() - 0.5) * 50;
      for (const blotch of blotches) {
        const distance = Math.hypot(across(px, blotch.x), across(py, blotch.y));
        if (distance < blotch.radius) {
          value += blotch.shade * (1 - distance / blotch.radius);
        }
      }
      const grey = Math.max(0, Math.min(255, value));
      image.data.set([grey, grey, grey, 255], (py * SIZE + px) * 4);
    }
  }
  context.putImageData(image, 0, 0);
  return repeating(canvas);
}

// White arrows on red, pointing right; `mirrored` points them left (a left turn's boards).
export function createArrowTexture(mirrored) {
  const { canvas, context } = createCanvas(SIZE, SIZE / 2);
  context.fillStyle = '#d8302a';
  context.fillRect(0, 0, SIZE, SIZE / 2);
  context.fillStyle = '#ffffff';
  for (let left = 16; left < SIZE; left += 80) {
    context.beginPath();
    context.moveTo(left, 16);
    context.lineTo(left + 32, 16);
    context.lineTo(left + 64, SIZE / 4);
    context.lineTo(left + 32, SIZE / 2 - 16);
    context.lineTo(left, SIZE / 2 - 16);
    context.lineTo(left + 32, SIZE / 4);
    context.fill();
  }
  const texture = finished(canvas);
  if (mirrored) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = -1;
  }
  return texture;
}

// Black and white checks, 16 across and 2 down, for the start gate's banner.
export function createCheckerTexture() {
  const { canvas, context } = createCanvas(SIZE, SIZE / 8);
  const cell = SIZE / 16;
  for (let column = 0; column < 16; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      context.fillStyle = (column + row) % 2 === 0 ? '#ffffff' : '#111111';
      context.fillRect(column * cell, row * cell, cell, cell);
    }
  }
  return finished(canvas);
}

// A normal map of small crossing ripples, for the sea to catch the sun in sparkles. Every wave fits a whole
// number of times across the tile, so the tile repeats without a seam.
export function createRippleTexture() {
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
  const texture = repeating(canvas);
  // A normal map holds directions, not colours.
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

// willReadFrequently keeps the canvas in plain memory: it is only drawn once and then copied into WebGL, and a
// canvas kept on the GPU stalled the next WebGL resize by seconds in a software-drawn browser.
function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
}

function finished(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Sharp at the low angles a chase camera sees the road at; Three.js lowers it to what the GPU allows.
  texture.anisotropy = 8;
  return texture;
}

function repeating(canvas) {
  const texture = finished(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
