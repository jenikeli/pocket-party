// Unit tests for the kit's stilt hut geometry (M7d4d), which run without a browser (textures need a canvas, so only
// the shapes are checked): three parts with colours and texture coordinates, a footprint no bigger than the old
// hut's, no NaN, a triangle budget, and the same shapes every time.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The hut imports Three.js by its bare name, which the browser's import map points at the vendored copy; Node has
// no import map, so a resolve hook does the same here.
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

const { buildStiltHutGeometry } = await import('../../host/games/kart-3d/kit/stilt-hut.js');

const TRIANGLE_BUDGET = 25000;

function triangles(geometry) {
  return geometry.index.count / 3;
}

function boundsOf(geometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox;
}

test('every part has position, colour and texture coordinates, and no NaN', () => {
  for (const [name, geometry] of Object.entries(buildStiltHutGeometry())) {
    assert.ok(geometry.attributes.uv && geometry.attributes.color, `${name} lacks uv or colour`);
    assert.ok(geometry.attributes.position.array.every(Number.isFinite), `${name} has a NaN`);
    assert.ok(geometry.attributes.uv.array.every(Number.isFinite), `${name} has a NaN uv`);
  }
});

test('the hut keeps its old footprint and height', () => {
  const { wood, painted, thatch } = buildStiltHutGeometry();
  const all = [wood, painted, thatch].map(boundsOf);
  const [minX, maxX] = [Math.min(...all.map((box) => box.min.x)), Math.max(...all.map((box) => box.max.x))];
  assert.ok(minX >= -2.6 && maxX <= 2.6, `x from ${minX} to ${maxX}`);
  assert.ok(Math.min(...all.map((box) => box.min.z)) >= -2.8);
  assert.ok(Math.max(...all.map((box) => box.max.z)) <= 6.1);
  assert.ok(Math.abs(boundsOf(wood).min.y + 1.5) < 0.01, 'the stilts end 1.5 below the sea');
  assert.ok(boundsOf(thatch).max.y <= 8.0, `roof top ${boundsOf(thatch).max.y}`);
});

test('the roof is the tallest part and wider than the walls (a thick eave)', () => {
  const { wood, thatch } = buildStiltHutGeometry();
  assert.ok(boundsOf(thatch).max.y > boundsOf(wood).max.y);
  const roof = boundsOf(thatch);
  assert.ok(roof.max.x - roof.min.x > 4.4);
});

test('the hut fits its triangle budget', () => {
  const total = Object.values(buildStiltHutGeometry()).reduce((sum, geometry) => sum + triangles(geometry), 0);
  assert.ok(total < TRIANGLE_BUDGET, `${total} triangles`);
});

test('the hut builds the same every time', () => {
  const first = buildStiltHutGeometry().thatch.attributes.position.array;
  const second = buildStiltHutGeometry().thatch.attributes.position.array;
  assert.deepEqual(Array.from(first), Array.from(second));
});
