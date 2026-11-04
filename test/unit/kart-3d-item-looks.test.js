// Unit tests for M8's item looks, which run without a browser: the kart's size over an effect's time
// (kartLookScale: big and small wobble in and blink out, bouncy squashes and keeps its bulk), bouncy's coat
// (kartRubbery), a broken box's size as it comes back (boxScale), the chase camera pulling back behind a big kart,
// the item drawing building, drawing a made-up race and leaving the scene empty when disposed, and the box's
// triangle budget.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The drawing imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-palm.test.js).
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

// The box's maps and the bursts' dot are drawn on canvases, which Node lacks: a canvas that keeps nothing stands
// in for them (the tests check shapes and numbers, not pictures).
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
const { tuning, setTuning, resetTuning } = await import('../../host/games/kart-3d/tuning.js');
const { kartLookScale, kartRubbery } = await import('../../host/games/kart-3d/items/kart-effect-looks.js');
const { boxScale } = await import('../../host/games/kart-3d/items/item-box-look.js');
const { buildShell, buildQuestionMark } = await import('../../host/games/kart-3d/items/item-box-shapes-look.js');
const { createItemDrawing } = await import('../../host/games/kart-3d/items/item-drawing.js');
const { createChaseCamera, followKart } = await import('../../host/games/kart-3d/chase-camera.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { TEST_TRACK } = await import('../../host/games/kart-3d/test-track.js');

const STEP = 1 / 60;
const TRIANGLE_BUDGET = 2000;

afterEach(() => resetTuning());

// A kart with the running effect `item`, `elapsed` seconds in.
function kartWith(item, elapsed) {
  return { item: { held: null, rollLeft: 0, effect: { item, left: tuning.itemEffectSeconds - elapsed } } };
}

const scaleAt = (item, elapsed) => kartLookScale(null, kartWith(item, elapsed));
const near = (actual, expected, slack = 0.01) => Math.abs(actual - expected) < slack;

test('a kart with no effect, or with no item at all, is drawn at its own size and without a coat', () => {
  assert.deepEqual(kartLookScale(null, {}), { x: 1, y: 1, z: 1 });
  assert.deepEqual(kartLookScale(null, { item: { held: null, rollLeft: 0, effect: null } }), { x: 1, y: 1, z: 1 });
  assert.equal(kartRubbery(null, {}), false);
});

test('big grows from its own size in a wobble past bigSize, settles there, and blinks back in its last second', () => {
  assert.ok(near(scaleAt(KART_ITEMS.BIG, 0).y, 1));
  const peak = Math.max(...Array.from({ length: 40 }, (unused, frame) => scaleAt(KART_ITEMS.BIG, frame * STEP).y));
  assert.ok(peak > tuning.bigSize + 0.1, `it overshoots to ${peak}`);
  const settled = scaleAt(KART_ITEMS.BIG, 1.5);
  assert.ok(near(settled.y, tuning.bigSize) && settled.x === settled.y && settled.z === settled.y, JSON.stringify(settled));
  const lastSecond = Array.from({ length: 16 }, (unused, step) => scaleAt(KART_ITEMS.BIG, tuning.itemEffectSeconds - 0.97 + step / 16).y);
  assert.ok(lastSecond.some((size) => near(size, 1)) && lastSecond.some((size) => near(size, tuning.bigSize)), 'it flickers between sizes');
  setTuning('bigSize', 2);
  assert.ok(near(scaleAt(KART_ITEMS.BIG, 2).y, 2), 'it reads the tuned size');
});

test('small shrinks to smallSize and settles there', () => {
  assert.ok(near(scaleAt(KART_ITEMS.SMALL, 2).y, tuning.smallSize));
  assert.ok(scaleAt(KART_ITEMS.SMALL, 0.05).y < 1);
});

test('bouncy squashes and stretches all the time, keeping its bulk, and its coat blinks in the last second', () => {
  const heights = Array.from({ length: 120 }, (unused, frame) => scaleAt(KART_ITEMS.BOUNCY, 1 + frame * STEP));
  assert.ok(heights.some(({ y }) => y > 1.05) && heights.some(({ y }) => y < 0.95), 'taller and flatter by turns');
  heights.forEach(({ x, y, z }) => assert.ok(near(x * y * z, 1, 1e-9)));
  assert.equal(kartRubbery(null, kartWith(KART_ITEMS.BOUNCY, 1)), true);
  assert.equal(kartRubbery(null, kartWith(KART_ITEMS.BIG, 1)), false);
  const coats = Array.from({ length: 16 }, (unused, step) => kartRubbery(null, kartWith(KART_ITEMS.BOUNCY, tuning.itemEffectSeconds - 0.97 + step / 16)));
  assert.ok(coats.includes(true) && coats.includes(false));
});

test('a broken box is gone, then grows back over its last half second, overshooting a little', () => {
  assert.equal(boxScale(0), 1);
  assert.equal(boxScale(2), 0);
  assert.equal(boxScale(0.5), 0);
  const growing = Array.from({ length: 50 }, (unused, step) => boxScale(0.5 - step * 0.01));
  assert.ok(growing.some((size) => size > 1.02), 'it pops past its size');
  assert.ok(growing.every((size, index) => index === 0 || size >= growing[index - 1] || size > 1), 'it grows until it overshoots');
});

test('the chase camera pulls back and up behind a big kart, eased, and stays put for a small one', () => {
  const pose = { position: { x: 0, y: 0, z: 0 }, forward: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } };
  const settle = (size) => {
    const camera = createChaseCamera();
    followKart(camera, pose, STEP, false, size);
    const first = { ...camera.position };
    for (let frame = 0; frame < 300; frame += 1) {
      followKart(camera, pose, STEP, false, size);
    }
    return { first, last: camera.position };
  };
  const normal = settle(1).last;
  const big = settle(1.6);
  assert.ok(big.first.x > big.last.x + 1, 'it eases back rather than jumping');
  assert.ok(near(big.last.x, normal.x * 1.6, 0.05) && near(big.last.y, normal.y * 1.6, 0.05), JSON.stringify(big.last));
  assert.deepEqual(settle(0.6).last, normal);
});

test('the item box stays within its triangle budget', () => {
  const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
  const total = triangles(buildShell()) + triangles(buildQuestionMark());
  assert.ok(total < TRIANGLE_BUDGET, `${total} triangles`);
});

test('the item drawing builds, draws boxes breaking and effects starting, and leaves the scene empty when disposed', () => {
  const track = buildTrack(TEST_TRACK);
  const scene = new THREE.Scene();
  const drawing = createItemDrawing(scene);
  assert.ok(scene.children.length > 0);
  const boxes = [0, -3, 3].map((lateral) => ({ s: 30, lateral, returnLeft: 0 }));
  const karts = [{ item: { held: null, rollLeft: 0, effect: null } }];
  const race = { karts, items: { allowed: [KART_ITEMS.SMALL], random: 1, boxes } };
  const poses = [{ position: { x: 0, y: 0, z: 0 }, up: { x: 0, y: 1, z: 0 } }];
  drawing.update(null, track, [], STEP);
  drawing.update(race, track, poses, STEP);
  const shells = scene.children.find((child) => child.isInstancedMesh && child.count === boxes.length);
  assert.ok(shells?.visible, 'the boxes are drawn');
  boxes[1].returnLeft = tuning.itemBoxReturnSeconds;
  karts[0].item.effect = { item: KART_ITEMS.SMALL, left: tuning.itemEffectSeconds };
  drawing.update(race, track, poses, STEP);
  const shown = scene.children.filter((child) => child.visible);
  assert.ok(shown.some((child) => child.isPoints), 'sparkles or smoke are flying');
  drawing.update({ ...race, items: { ...race.items, boxes: [] } }, track, poses, STEP);
  assert.equal(shells.visible, false, 'items off: no boxes');
  drawing.dispose();
  assert.equal(scene.children.length, 0);
});
