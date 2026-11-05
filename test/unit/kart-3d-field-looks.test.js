// Unit tests for M8c's teleport and sticky walls looks, which run without a browser: a kart flickering in the
// teleport's warning and popping in from small after the hop, the sparkles set off once by a hop, the cyan rings
// shown only in the warning, the goo strips built along the walls only (none over a gap), growing with the sticky
// time, drying away, blobs on a held kart only, and the scene empty again when disposed.

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
const { tuning, resetTuning } = await import('../../host/games/kart-3d/tuning.js');
const { kartLookScale } = await import('../../host/games/kart-3d/items/kart-effect-looks.js');
const { TELEPORT_WARNING_SECONDS, TELEPORT_AFTER_SECONDS } = await import('../../host/games/kart-3d/items/teleport.js');
const { buildGooStrips } = await import('../../host/games/kart-3d/items/goo-strip-look.js');
const { createItemDrawing } = await import('../../host/games/kart-3d/items/item-drawing.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { TEST_TRACK } = await import('../../host/games/kart-3d/test-track.js');

const STEP = 1 / 60;

afterEach(() => resetTuning());

const racingKart = () => ({ finishTime: null, respawnIn: null, s: 10, lateral: 5, item: { effect: null, stuckLeft: 0 } });
const raceWith = (teleport, karts = [racingKart()]) => ({ karts, items: { teleport, stickyLeft: 0 } });
const pose = { position: { x: 0, y: 0, z: 0 }, forward: { x: 0, y: 0, z: 1 }, up: { x: 0, y: 1, z: 0 } };
const visibleOf = (scene, kind) => scene.children.filter((child) => child[kind] && child.visible);

test('a kart flickers between its size and a thin tall one in the warning, then pops in from small and settles', () => {
  const kart = racingKart();
  const seen = new Set();
  for (let left = TELEPORT_WARNING_SECONDS; left > 0; left -= STEP) {
    const { x, y } = kartLookScale(raceWith({ warningLeft: left, afterLeft: TELEPORT_AFTER_SECONDS, hops: [] }), kart);
    seen.add(`${x}/${y}`);
  }
  assert.equal(seen.size, 2, [...seen].join(' '));
  const popAt = (elapsed) => kartLookScale(raceWith({ warningLeft: 0, afterLeft: TELEPORT_AFTER_SECONDS - elapsed, hops: [{}] }), kart);
  assert.ok(popAt(0).x < 0.1, 'it starts small');
  const peak = Math.max(...Array.from({ length: 30 }, (unused, frame) => popAt(frame * STEP).x));
  assert.ok(peak > 1.02 && peak < 1.3, `it overshoots a little, to ${peak}`);
  assert.deepEqual(popAt(TELEPORT_AFTER_SECONDS), { x: 1, y: 1, z: 1 }, 'back to its own size');
  assert.deepEqual(kartLookScale(raceWith(null), kart), { x: 1, y: 1, z: 1 }, 'no teleport, no change');
  const finished = { ...racingKart(), finishTime: 30 };
  assert.deepEqual(kartLookScale(raceWith({ warningLeft: 0.1, afterLeft: 0.6, hops: [] }, [finished]), finished), { x: 1, y: 1, z: 1 });
});

test('the rings show in the warning and flash at the hop, and a hop sets off sparkles once', () => {
  const scene = new THREE.Scene();
  const drawing = createItemDrawing(scene);
  const track = buildTrack(TEST_TRACK);
  const teleport = { warningLeft: 0.5, afterLeft: TELEPORT_AFTER_SECONDS, hops: [] };
  const race = raceWith(teleport, [racingKart(), racingKart()]);
  drawing.update(race, track, [pose, pose], STEP);
  const rings = visibleOf(scene, 'isInstancedMesh').filter((mesh) => mesh.material.blending === THREE.AdditiveBlending);
  assert.equal(rings.length, 1);
  assert.equal(rings[0].count, 4, 'two rings under each of two karts');
  assert.equal(visibleOf(scene, 'isPoints').length, 0, 'no sparkles yet');
  teleport.warningLeft = 0;
  teleport.hops = [{ from: { x: 0, y: 0, z: 0 }, to: { x: 5, y: 0, z: 5 } }];
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(rings[0].count, 2, 'a flash ring at each end of the hop');
  teleport.afterLeft = 0.1;
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(rings[0].visible, false, 'the flash is over after 0.4 s');
  assert.equal(visibleOf(scene, 'isPoints').length, 1, 'sparkles at both ends of the hop');
  drawing.dispose();
  assert.equal(scene.children.length, 0, 'nothing is left in the scene');
});

test('goo strips run along the walls only, on both sides', () => {
  const track = buildTrack(TEST_TRACK);
  const strips = buildGooStrips(track);
  const triangles = strips.index.count / 3;
  assert.ok(triangles > 100, `${triangles} triangles`);
  const bare = buildTrack({ ...TEST_TRACK, pieces: TEST_TRACK.pieces.map((piece) => ({ ...piece, walls: 'none' })) });
  assert.equal(buildGooStrips(bare).index?.count ?? 0, 0, 'no walls, no goo');
  const left = buildTrack({ ...TEST_TRACK, pieces: TEST_TRACK.pieces.map((piece) => ({ ...piece, walls: 'left' })) });
  const one = buildGooStrips(left).index.count;
  assert.ok(one > 0 && one < strips.index.count, 'one side only has fewer strips');
});

test('the goo grows with the sticky time, dries away at its end, and the held kart has blobs', () => {
  const scene = new THREE.Scene();
  const drawing = createItemDrawing(scene);
  const track = buildTrack(TEST_TRACK);
  const held = racingKart();
  const race = { karts: [held, racingKart()], items: { teleport: null, stickyLeft: 0 } };
  const gooMesh = () => scene.children.find((child) => child.isMesh && !child.isInstancedMesh && child.material.onBeforeCompile.toString().includes('grow'));
  // The material hands its grow uniform to the shader Three.js compiles; a stand-in shader shows its value.
  const grow = () => {
    const shader = { uniforms: {}, vertexShader: '#include <common> #include <begin_vertex>' };
    gooMesh().material.onBeforeCompile(shader);
    return shader.uniforms.grow.value;
  };
  const strings = () => scene.children.find((child) => child.isInstancedMesh && child.geometry.type === 'CylinderGeometry' && child.visible && child.count > 0);
  const blobs = () => scene.children.find((child) => child.isInstancedMesh && child.geometry.type === 'IcosahedronGeometry' && child.visible && child.count > 0 && child.material.map);
  drawing.update(race, track, [pose, pose], STEP);
  assert.ok(gooMesh(), 'the strips are built from the track');
  race.items.stickyLeft = 0;
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(gooMesh().visible, false, 'hidden while the walls are not sticky');
  race.items.stickyLeft = tuning.itemEffectSeconds - 0.01;
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(gooMesh().visible, true);
  assert.ok(grow() < 0.1, 'just oozing in');
  race.items.stickyLeft = tuning.itemEffectSeconds - 1;
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(grow(), 1, 'fully down');
  race.items.stickyLeft = 0.3;
  drawing.update(race, track, [pose, pose], STEP);
  assert.ok(grow() > 0 && grow() < 1, 'drying away');
  assert.equal(blobs(), undefined, 'no blobs on a free kart');
  assert.equal(strings(), undefined);
  held.item.stuckLeft = 1;
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(blobs().count, 8, 'eight blobs on the held kart only');
  assert.equal(strings().count, 4, 'and four strings to the wall');
  race.items.stickyLeft = 0;
  held.item.stuckLeft = 0;
  drawing.update(race, track, [pose, pose], STEP);
  assert.equal(gooMesh().visible, false);
  assert.equal(blobs(), undefined);
  drawing.dispose();
  assert.equal(scene.children.length, 0, 'nothing is left in the scene');
});
