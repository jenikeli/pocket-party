// Turning a canvas into a Three.js texture, the one way every 3D race texture is made: textures are drawn on
// small canvases while the game starts, so there are no image files to load; the ones that take long to draw are drawn
// once per game and kept (drawnOnce, below). Used by the kit's pieces (kit/).

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

// Textures of the kit that are drawn once per game, not at every build of a course: drawing them in JS pixel loops
// is most of a course's build time (M7d4d: about 14 s of Seaside Skyway's in software), and they come out the same
// each time. Kept by key, so there is one set per distinct map however many courses are built, and freed together
// when the game stops (disposeKitMaps, called from renderer.js's destroy).
const drawnMaps = new Map();
const kitMapTextures = new Set();

// What `draw()` returns for `key`: drawn the first time, the same value afterwards. It is shared by every course, so
// callers must not change its textures (no repeat, offset or wrap). It may be a texture, or an array or object holding
// textures (a surface's four maps), which are all remembered as kit maps. The key names the map and every argument
// that changes how it is drawn.
export function drawnOnce(key, draw) {
  if (!drawnMaps.has(key)) {
    const drawn = draw();
    texturesIn(drawn).forEach((texture) => kitMapTextures.add(texture));
    drawnMaps.set(key, drawn);
  }
  return drawnMaps.get(key);
}

// True for a texture drawnOnce keeps: a course must not dispose it when it is replaced (scenery.js).
export function isKitMap(thing) {
  return kitMapTextures.has(thing);
}

// Frees every kept map and forgets them, so the next game draws them again.
export function disposeKitMaps() {
  kitMapTextures.forEach((texture) => texture.dispose());
  kitMapTextures.clear();
  drawnMaps.clear();
}

function texturesIn(value) {
  if (value?.isTexture) {
    return [value];
  }
  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(texturesIn);
  }
  return [];
}
