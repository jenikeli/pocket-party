// Unit tests for the kart-and-driver designs (M7d5, host/games/kart-3d/karts/), which run without a browser (the
// textures need a canvas, so only the shapes are checked): every design is complete and its own, the anti-gravity
// easing is smooth and takes a quarter second, and each design's kart fits its triangle and draw-call budgets,
// stands on the road, and seats its driver as high as the reference says.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The karts import Three.js by its bare name, which the browser's import map points at the vendored copy. Node
// has no import map and Three.js is not an npm dependency, so a resolve hook does the same here.
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

const { KART_DESIGNS } = await import('../../host/games/kart-3d/karts/kart-designs.js');
const { buildKartParts, buildDesignShapes } = await import('../../host/games/kart-3d/karts/design-shapes.js');
const { buildWheel } = await import('../../host/games/kart-3d/karts/wheels.js');
const { WHEELS, EXHAUST_SPOTS, EXHAUST_TIPS } = await import('../../host/games/kart-3d/karts/kart-layout.js');
const { MATERIAL_KINDS } = await import('../../host/games/kart-3d/karts/part-shapes.js');
const { nextAntiGravityShare, easedShare, ANTI_GRAVITY_SECONDS } = await import('../../host/games/kart-3d/karts/anti-gravity.js');

// 12 karts in every view: about 25,000 triangles and at most about 10 draw calls a kart with its driver.
const TRIANGLE_BUDGET = 25000;
const DRAW_CALL_BUDGET = 10;
// A kart is about 2 long; seated, the top of the driver's head is a little lower than that (docs/mk8dx-reference.md
// says about as high; the references' pictures, matched in M7d5's round 3, show a head about as wide as the
// shoulders, which sits a little lower).
const KART_LENGTH = 2;

const kartParts = buildKartParts();
const designShapes = KART_DESIGNS.map((design) => buildDesignShapes(design, kartParts));
const wheelShapes = WHEELS.map(buildWheel);

function triangles(geometry) {
  return geometry.index.count / 3;
}

test('every design has its own id and slot, three palette colours, an emblem and a driver', () => {
  assert.equal(new Set(KART_DESIGNS.map((design) => design.id)).size, KART_DESIGNS.length);
  assert.equal(new Set(KART_DESIGNS.map((design) => design.slot)).size, KART_DESIGNS.length);
  for (const design of KART_DESIGNS) {
    assert.match(design.id, /^[a-z-]+$/);
    assert.ok(Number.isInteger(design.slot) && design.slot >= 0 && design.slot < 12, `${design.id}'s slot`);
    assert.equal(typeof design.name, 'string');
    for (const role of ['main', 'second', 'third']) {
      const hex = design.palette[role];
      assert.ok(Number.isInteger(hex) && hex >= 0 && hex <= 0xffffff, `${design.id}'s ${role} colour`);
    }
    assert.equal(typeof design.drawEmblem, 'function');
    assert.equal(typeof design.buildDriver, 'function');
  }
  assert.equal(KART_DESIGNS.find((design) => design.id === 'blaze').slot, 0);
});

test('the wheels turn flat over a quarter second, smoothly, and back', () => {
  const frame = 1 / 60;
  let share = 0;
  let frames = 0;
  while (share < 1) {
    const next = nextAntiGravityShare(share, true, frame);
    // Not snapped: no frame moves the wheels more than a fifth of the way.
    assert.ok(easedShare(next) - easedShare(share) < 0.2);
    share = next;
    frames += 1;
  }
  // 15 frames of 1/60 s, or one more where the sum of fifteenths rounds just under 1.
  assert.ok(Math.abs(frames - ANTI_GRAVITY_SECONDS / frame) <= 1, `${frames} frames`);
  assert.equal(nextAntiGravityShare(1, true, frame), 1);
  assert.equal(nextAntiGravityShare(0.5, false, ANTI_GRAVITY_SECONDS / 2), 0);
  assert.equal(easedShare(0), 0);
  assert.equal(easedShare(0.5), 0.5);
  assert.equal(easedShare(1), 1);
});

test('a kart with its driver fits the triangle and draw-call budgets', () => {
  const wheelTriangles = wheelShapes.reduce((sum, wheel) => sum + triangles(wheel), 0);
  designShapes.forEach((shapes, index) => {
    const bodyTriangles = MATERIAL_KINDS.reduce((sum, kind) => sum + triangles(shapes[kind]), 0);
    assert.ok(bodyTriangles + wheelTriangles <= TRIANGLE_BUDGET, `${KART_DESIGNS[index].id}: ${bodyTriangles + wheelTriangles} triangles`);
    assert.ok(MATERIAL_KINDS.length + wheelShapes.length <= DRAW_CALL_BUDGET);
  });
});

test('the painted kinds are coloured per vertex and the decal maps its emblem', () => {
  for (const shapes of designShapes) {
    for (const kind of ['glossy', 'matte', 'skin', 'cloth', 'metal']) {
      assert.ok(shapes[kind].attributes.color, `${kind} has vertex colours`);
    }
    assert.equal(shapes.decal.attributes.color, undefined);
    assert.ok(shapes.decal.attributes.uv);
  }
});

test('the kart stands on the road and its driver\'s head tops out near the kart\'s length', () => {
  designShapes.forEach((shapes, index) => {
    const bounds = MATERIAL_KINDS.map((kind) => {
      shapes[kind].computeBoundingBox();
      return shapes[kind].boundingBox;
    });
    const lowest = Math.min(...bounds.map((box) => box.min.y));
    const highest = Math.max(...bounds.map((box) => box.max.y));
    assert.ok(lowest > 0 && lowest < 0.15, `${KART_DESIGNS[index].id}: lowest point ${lowest}`);
    assert.ok(highest > KART_LENGTH * 0.75 && highest < KART_LENGTH * 1.1, `${KART_DESIGNS[index].id}: top of the head at ${highest}`);
  });
});

test('every wheel stands on the road at its spot, rear tyres bigger', () => {
  WHEELS.forEach((spot, index) => {
    wheelShapes[index].computeBoundingBox();
    const { min, max } = wheelShapes[index].boundingBox;
    assert.ok(Math.abs(max.y - spot.radius) < 0.001 && Math.abs(min.y + spot.radius) < 0.001);
    assert.ok(Math.abs(max.x - min.x - spot.width) < 0.02);
  });
  assert.ok(WHEELS[2].radius > WHEELS[0].radius);
});

test('boost flames come out of the exhausts\' bell tips', () => {
  assert.deepEqual(EXHAUST_SPOTS, EXHAUST_TIPS.map((tip) => [...tip]));
});
