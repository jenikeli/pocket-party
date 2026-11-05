// Unit tests for the karts' glider (M9, host/games/kart-3d/karts/glider.js), which run without a browser (the
// canopy's picture needs a canvas, so only the shapes are checked): it opens over 0.3 s and folds over 0.2 s,
// smoothly, from kart.gliding, and is not drawn folded; every design's glider fits its budget, is painted in its
// design's colours, shades safely on the GPU, and spreads over its driver's head.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The karts import Three.js by its bare name, which the browser's import map points at the vendored copy (as in
// kart-3d-kart-designs.test.js).
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

const THREE = await import('three');
const { KART_DESIGNS } = await import('../../host/games/kart-3d/karts/kart-designs.js');
const { buildKartParts, buildDesignShapes } = await import('../../host/games/kart-3d/karts/design-shapes.js');
const { MATERIAL_KINDS } = await import('../../host/games/kart-3d/karts/part-shapes.js');
const { countBadTriangles } = await import('../../host/games/kart-3d/karts/safe-normals.js');
const { easedShare } = await import('../../host/games/kart-3d/karts/anti-gravity.js');
const glider = await import('../../host/games/kart-3d/karts/glider.js');

const { GLIDER_OPEN_SECONDS, GLIDER_FOLD_SECONDS, GLIDER_PIVOT, nextGliderShare, placeGlider } = glider;

// The spec's budget for a kart's glider: 2,000 triangles in at most 2 draw calls (the canopy and the frame).
const TRIANGLE_BUDGET = 2000;
const FRAME = 1 / 60;

const canopy = glider.buildGliderCanopy();
const frames = KART_DESIGNS.map((design) => glider.buildGliderFrame(design.palette));

function triangles(geometry) {
  return geometry.index.count / 3;
}

// How many frames of 1/60 s the share takes to go from `from` to its end, checking that no frame moves the eased
// share by more than a fifth.
function framesToEnd(from, gliding) {
  let share = from;
  let count = 0;
  const end = gliding ? 1 : 0;
  while (share !== end) {
    const next = nextGliderShare(share, gliding, FRAME);
    assert.ok(Math.abs(easedShare(next) - easedShare(share)) < 0.2, 'not snapped');
    share = next;
    count += 1;
  }
  return count;
}

test('the glider opens over 0.3 s once the kart glides and folds over 0.2 s after it lands, smoothly', () => {
  assert.equal(GLIDER_OPEN_SECONDS, 0.3);
  assert.equal(GLIDER_FOLD_SECONDS, 0.2);
  assert.ok(Math.abs(framesToEnd(0, true) - 18) <= 1, 'opens in about 18 frames');
  assert.ok(Math.abs(framesToEnd(1, false) - 12) <= 1, 'folds in about 12 frames');
  // Landing half way through opening folds it back from there.
  assert.ok(nextGliderShare(0.5, false, FRAME) < 0.5);
  assert.equal(nextGliderShare(0, false, FRAME), 0);
  assert.equal(nextGliderShare(1, true, FRAME), 1);
});

test('folded, the glider is not drawn; opening, it swings up from lying back and spreads its wings', () => {
  const group = new THREE.Group();
  placeGlider(group, 0);
  assert.equal(group.visible, false);
  placeGlider(group, 0.2);
  assert.equal(group.visible, true);
  assert.deepEqual(group.position.toArray(), [...GLIDER_PIVOT]);
  const tiltWhileOpening = group.rotation.x;
  const spreadWhileOpening = group.scale.x;
  assert.ok(tiltWhileOpening < 0, 'tipped back over the tail');
  placeGlider(group, 1);
  assert.ok(group.rotation.x === 0, 'upright when open');
  assert.deepEqual(group.scale.toArray(), [1, 1, 1]);
  assert.ok(spreadWhileOpening < 1);
});

test('every design\'s glider fits 2,000 triangles in two draw calls', () => {
  frames.forEach((frame, index) => {
    const total = triangles(canopy) + triangles(frame);
    assert.ok(total <= TRIANGLE_BUDGET, `${KART_DESIGNS[index].id}: ${total} triangles`);
  });
  // One canopy shape for every design (its picture is the design's material) and one frame each.
  assert.equal(new Set(frames).size, KART_DESIGNS.length);
});

test('the frame is painted in its design\'s third colour and shades safely; the canopy faces up', () => {
  frames.forEach((frame, index) => {
    const { color } = frame.attributes;
    const third = new THREE.Color(KART_DESIGNS[index].palette.third);
    let found = false;
    for (let vertex = 0; vertex < color.count && !found; vertex += 1) {
      found = Math.abs(color.getX(vertex) - third.r) < 1e-4 && Math.abs(color.getY(vertex) - third.g) < 1e-4 && Math.abs(color.getZ(vertex) - third.b) < 1e-4;
    }
    assert.ok(found, `${KART_DESIGNS[index].id}'s frame has its third colour`);
    assert.equal(countBadTriangles(frame), 0, `${KART_DESIGNS[index].id}'s frame`);
  });
  assert.equal(countBadTriangles(canopy), 0);
  const { normal } = canopy.attributes;
  for (let vertex = 0; vertex < normal.count; vertex += 1) {
    assert.ok(normal.getY(vertex) > 0.5, 'the canopy\'s fronts point up');
  }
  const { uv } = canopy.attributes;
  for (let vertex = 0; vertex < uv.count; vertex += 1) {
    assert.ok(uv.getX(vertex) >= 0 && uv.getX(vertex) <= 1 && uv.getY(vertex) >= 0 && uv.getY(vertex) <= 1);
  }
});

test('the open canopy spreads wider than the kart, over every driver\'s head', () => {
  canopy.computeBoundingBox();
  const box = canopy.boundingBox;
  assert.ok(box.max.x - box.min.x > 3.5, 'about twice as wide as the kart with its wheels');
  const kartParts = buildKartParts();
  KART_DESIGNS.forEach((design) => {
    const shapes = buildDesignShapes(design, kartParts);
    const headTop = Math.max(...MATERIAL_KINDS.map((kind) => {
      shapes[kind].computeBoundingBox();
      return shapes[kind].boundingBox.max.y;
    }));
    // The canopy's middle, over the driver, in the kart's axes (the canopy is built round the pivot).
    const [, middleY] = glider.canopyPoint(0, 0.5);
    assert.ok(middleY - headTop > 0.3, `${design.id}: canopy ${middleY.toFixed(2)} over a head at ${headTop.toFixed(2)}`);
  });
});
