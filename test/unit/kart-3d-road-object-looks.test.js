// Unit tests for M8b's road object looks, which run without a browser: the sandcastle dropping in with a bounce
// and slumping into a pile that sinks, its size against the rules' (BLOCKER_SIZE) and its triangle budget, and
// the drawing placing one instance per object, puffing sand as a castle lands, and leaving the scene empty when disposed.

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
const { tuning, setTuning, resetTuning } = await import('../../host/games/kart-3d/tuning.js');
const { BLOCKER_SIZE, OBJECT_VANISH_SECONDS } = await import('../../host/games/kart-3d/items/road-objects.js');
const { sandcastleMotion, DROP_SECONDS } = await import('../../host/games/kart-3d/items/road-object-motion.js');
const { buildSandcastle, buildSandPile, buildFlag } = await import('../../host/games/kart-3d/items/sandcastle-look.js');
const { createItemDrawing } = await import('../../host/games/kart-3d/items/item-drawing.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { TEST_TRACK } = await import('../../host/games/kart-3d/test-track.js');

const STEP = 1 / 60;
const TRIANGLE_BUDGET = 2000;

afterEach(() => resetTuning());

// The object's `left`, `elapsed` seconds after it was placed.
const after = (elapsed) => tuning.itemEffectSeconds - elapsed;
const near = (actual, expected, slack = 0.01) => Math.abs(actual - expected) < slack;
const castleAt = (elapsed) => sandcastleMotion(after(elapsed));
const triangles = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
const boundsOf = (geometry) => {
  geometry.computeBoundingBox();
  return geometry.boundingBox;
};

test('the sandcastle drops in from above, stretched, lands squashed, hops once and settles at its own size', () => {
  const start = castleAt(0);
  assert.ok(start.lift > 2 && start.height > 1 && !start.landed, JSON.stringify(start));
  const landing = castleAt(DROP_SECONDS);
  assert.ok(landing.landed && near(landing.lift, 0) && landing.height < 0.8 && landing.width > 1, JSON.stringify(landing));
  const hop = Math.max(...Array.from({ length: 30 }, (unused, frame) => castleAt(DROP_SECONDS + frame * STEP).lift));
  assert.ok(hop > 0.1 && hop < 0.6, `it hops ${hop} high`);
  const settledCastle = castleAt(1.5);
  assert.ok(near(settledCastle.lift, 0) && near(settledCastle.height, 1) && near(settledCastle.width, 1), JSON.stringify(settledCastle));
  assert.equal(settledCastle.pile, 0);
  for (let frame = 0; frame < 60; frame += 1) {
    const { height, width } = castleAt(DROP_SECONDS + frame * STEP);
    assert.ok(near(height * width * width, 1, 1e-9), 'it keeps its bulk as it wobbles');
  }
  setTuning('itemEffectSeconds', 8);
  assert.ok(near(castleAt(1.5).height, 1), 'it reads the tuned lifetime');
});

test('at its end the sandcastle slumps into a pile that sinks below the road', () => {
  const standing = sandcastleMotion(0.01);
  assert.ok(!standing.vanishing && standing.pile === 0);
  const slumping = sandcastleMotion(-OBJECT_VANISH_SECONDS * 0.25);
  assert.ok(slumping.vanishing && slumping.height < 0.8 && slumping.width > 1 && slumping.pile > 0.3, JSON.stringify(slumping));
  const slumped = sandcastleMotion(-OBJECT_VANISH_SECONDS * 0.5);
  assert.ok(slumped.height < 0.1 && near(slumped.pile, 1), JSON.stringify(slumped));
  const gone = sandcastleMotion(-OBJECT_VANISH_SECONDS);
  assert.ok(gone.sink > 0.62 * BLOCKER_SIZE.height / 1.6, `the pile (0.62 high) is under the road: sunk ${gone.sink}`);
});

test('the sandcastle is the size of BLOCKER_SIZE', () => {
  const castle = boundsOf(buildSandcastle());
  assert.ok(near(castle.max.y, BLOCKER_SIZE.height, 0.02), `castle ${castle.max.y} high`);
  assert.ok(near(Math.max(castle.max.x, castle.max.z, -castle.min.x, -castle.min.z), BLOCKER_SIZE.radius, 0.02));
  assert.ok(near(castle.min.y, 0, 0.06), 'it stands on the road');
});

test('each road object stays within its triangle budget', () => {
  const castle = triangles(buildSandcastle()) + triangles(buildSandPile()) + triangles(buildFlag());
  assert.ok(castle < TRIANGLE_BUDGET, `sandcastle ${castle} triangles`);
});

test('the drawing places one castle per blocker, puffs sand as a castle lands, and frees everything', () => {
  const track = buildTrack(TEST_TRACK);
  const scene = new THREE.Scene();
  const drawing = createItemDrawing(scene);
  const instanced = () => scene.children.filter((child) => child.isInstancedMesh && child.visible && child.count > 0);
  const objects = [
    { id: 0, item: KART_ITEMS.BLOCKER, s: 40, lateral: 2, left: tuning.itemEffectSeconds },
    { id: 1, item: KART_ITEMS.BLOCKER, s: 60, lateral: -2, left: tuning.itemEffectSeconds },
  ];
  const race = { karts: [], items: { allowed: [KART_ITEMS.BLOCKER], random: 1, boxes: [], objects } };
  drawing.update(null, track, [], STEP);
  assert.equal(instanced().length, 0, 'the setup screen shows none');
  drawing.update(race, track, [], STEP);
  const counts = instanced().map((mesh) => mesh.count).sort();
  assert.deepEqual(counts, [2, 2, 2], 'castles, piles, flags for two blockers');
  const smoke = () => scene.children.some((child) => child.isPoints && child.visible);
  for (let frame = 0; frame < Math.ceil(DROP_SECONDS / STEP) + 1; frame += 1) {
    objects.forEach((object) => (object.left -= STEP));
    drawing.update(race, track, [], STEP);
  }
  assert.ok(smoke(), 'a puff of sand as the castles land');
  for (let frame = 0; frame < 12; frame += 1) {
    objects.push({ id: 3 + frame, item: KART_ITEMS.BLOCKER, s: 100 + frame * 10, lateral: 0, left: tuning.itemEffectSeconds });
  }
  drawing.update(race, track, [], STEP);
  assert.ok(instanced().some((mesh) => mesh.count === 14), 'more objects than the meshes held are all drawn');
  race.items.objects = [];
  drawing.update(race, track, [], STEP);
  assert.equal(instanced().length, 0, 'no objects, nothing drawn');
  drawing.dispose();
  assert.equal(scene.children.length, 0);
});
