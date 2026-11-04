// Unit tests for M8c's magnet and push looks, which run without a browser: the horseshoe's triangle budget, the
// drawing showing a horseshoe, rings and one field line set per pulled kart while a magnet runs (and none for a
// kart behind it), a bubble and shockwave rings while a push runs, everything hidden with no effect or no race,
// and the scene empty once disposed.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The drawing imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-item-looks.test.js).
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') {
      return next(`${threeFolder}three.module.js`, context);
    }
    if (specifier.startsWith('three/addons/')) {
      return next(`${threeFolder}addons/${specifier.slice('three/addons/'.length)}`, context);
    }
    return next(specifier, context);
  },
});

// The maps are drawn on canvases, which Node lacks: a canvas that keeps nothing stands in for them (the tests
// check shapes and numbers, not pictures).
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData() {},
      createRadialGradient: () => ({ addColorStop() {} }),
      fillRect() {},
    }),
  }),
};

const THREE = await import('three');
const { KART_ITEMS } = await import('../../shared/protocol.js');
const { tuning, resetTuning } = await import('../../host/games/kart-3d/tuning.js');
const { createKart } = await import('../../host/games/kart-3d/kart-physics.js');
const { kartPose } = await import('../../host/games/kart-3d/race-views.js');
const { createItemDrawing } = await import('../../host/games/kart-3d/items/item-drawing.js');
const { createHorseshoeSet } = await import('../../host/games/kart-3d/items/magnet-look.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { TEST_TRACK } = await import('../../host/games/kart-3d/test-track.js');

const STEP = 1 / 60;
const TRIANGLE_BUDGET = 2000;

afterEach(() => resetTuning());

// A kart on the test track at `s` (also its distance), with `item` running for `elapsed` seconds if given.
function kartAt(track, s, lateral, item = null, elapsed = 1) {
  const kart = createKart(track, s, lateral);
  kart.distance = s;
  kart.item = { held: null, rollLeft: 0, effect: item ? { item, left: tuning.itemEffectSeconds - elapsed } : null };
  return kart;
}

// A scene and a drawing, and a function drawing `race` once.
function setUp(track) {
  const scene = new THREE.Scene();
  const drawing = createItemDrawing(scene);
  const draw = (race) => drawing.update(race, track, race ? race.karts.map((kart) => kartPose(kart, 1)) : [], STEP);
  return { scene, drawing, draw };
}

const raceOf = (karts) => ({ karts, items: { allowed: [], random: 1, boxes: [], objects: [] } });
const shown = (scene, test) => scene.children.filter((child) => child.visible && test(child));
const hexOf = (mesh) => mesh.material.uniforms?.color.value.getHex();
const isRing = (mesh, hex) => mesh.isMesh && hexOf(mesh) === hex;
const isBubble = (mesh) => mesh.isMesh && hexOf(mesh) === 0x8fe6ff;
const triangles = (group) => group.children.reduce((sum, part) => sum + part.geometry.index.count / 3, 0);

test('the horseshoe stays within its triangle budget', () => {
  assert.ok(triangles(createHorseshoeSet().make()) < TRIANGLE_BUDGET);
});

test('a magnet shows a horseshoe, rings and lines to the karts it pulls, none to a kart behind it', () => {
  const track = buildTrack(TEST_TRACK);
  const { scene, drawing, draw } = setUp(track);
  const race = raceOf([
    kartAt(track, 60, 0, KART_ITEMS.MAGNET),
    kartAt(track, 66, -3),
    kartAt(track, 72, 3),
    kartAt(track, 54, 3),
    kartAt(track, 60 + tuning.magnetReach + 20, 0),
  ]);
  draw(race);
  assert.equal(shown(scene, (child) => child.isGroup).length, 1, 'one horseshoe');
  assert.equal(shown(scene, (child) => child.isLine).length, 5 * 2, 'five lines to each of the two karts in reach');
  assert.ok(shown(scene, (child) => isRing(child, 0xff6a5c)).length >= 2, 'rings pulse');
  race.karts[0].item.effect = null;
  draw(race);
  assert.equal(shown(scene, (child) => child.isGroup || child.isLine).length, 0, 'nothing once the magnet ends');
  drawing.dispose();
  assert.equal(scene.children.length, 0);
});

test('a push shows a bubble round its kart and shockwave rings, and nothing without it', () => {
  const track = buildTrack(TEST_TRACK);
  const { scene, drawing, draw } = setUp(track);
  const race = raceOf([kartAt(track, 60, 0, KART_ITEMS.PUSH), kartAt(track, 62, 3)]);
  draw(race);
  const bubbles = shown(scene, (child) => isBubble(child));
  assert.equal(bubbles.length, 1);
  assert.ok(bubbles[0].scale.x > 1, 'the bubble is bigger than a kart');
  assert.equal(shown(scene, (child) => isRing(child, 0xbff4ff)).length, 2, 'two waves');
  draw(null);
  assert.equal(shown(scene, (child) => isBubble(child) && child.scale.x > 0.01).length, 0);
  drawing.dispose();
  assert.equal(scene.children.length, 0);
});

test('the rings follow the tuned reaches', () => {
  const track = buildTrack(TEST_TRACK);
  const { scene, draw } = setUp(track);
  tuning.pushReach = 20;
  const race = raceOf([kartAt(track, 60, 0, KART_ITEMS.PUSH, 0.45)]);
  draw(race);
  const waves = shown(scene, (child) => isRing(child, 0xbff4ff));
  assert.ok(Math.max(...waves.map((wave) => wave.scale.x)) > 12 && waves.every((wave) => wave.scale.x <= 20));
});
