// Turning a canvas into a Three.js texture, the one way every 3D race texture is made: textures are drawn on
// small canvases while the game starts, so there are no image files to load. Used by the kit's pieces (kit/).

import * as THREE from 'three';

// willReadFrequently keeps the canvas in plain memory: it is only drawn once and then copied into WebGL, and a
// canvas kept on the GPU stalled the next WebGL resize by seconds in a software-drawn browser.
export function createCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return { canvas, context: canvas.getContext('2d', { willReadFrequently: true }) };
}

// A colour texture from `canvas`, sharp at the low angles a chase camera sees the road at (Three.js lowers the
// anisotropy to what the GPU allows).
export function canvasTexture(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

// The same, repeating in both directions (a tile).
export function repeatingTexture(canvas) {
  const texture = canvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// A texture whose colours are numbers, not colours, so they are read as they are (no colour space): a normal map
// (M7d4), whose colours are surface directions, or since M7d4b2 a shade (ambient occlusion) or roughness map;
// repeating like its colour map, or not.
export function dataTexture(canvas, repeat) {
  const texture = repeat ? repeatingTexture(canvas) : canvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}
