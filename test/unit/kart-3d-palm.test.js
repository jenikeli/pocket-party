// Unit tests for the kit's palm geometry (M7d4c2), which run without a browser (the textures need a canvas, so
// only the shapes are checked): it stands on y = 0 and leans toward +x as the spec says, stays inside the
// reach layout-rules.js gives palms, has the texture coordinates its materials need, fits its triangle
// budget and builds the same every time.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The palm imports Three.js by its bare name, which the browser's import map points at the vendored copy. Node
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

const { buildPalm } = await import('../../host/games/kart-3d/kit/palm.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

// About the Blender palm's 4,128 (M7d4c4 matched its trunk of 32 columns round and its crown).
const TRIANGLE_BUDGET = 4200;

function triangles(geometry) {
  return geometry.index.count / 3;
}

function positionsOf(geometry) {
  const { position } = geometry.attributes;
  return Array.from({ length: position.count }, (_, index) => [position.getX(index), position.getY(index), position.getZ(index)]);
}

test('the trunk stands on y = 0 with a foot no wider than the palm reach', () => {
  const points = positionsOf(buildPalm().trunk);
  assert.ok(Math.abs(Math.min(...points.map((point) => point[1]))) < 0.01);
  const foot = points.filter((point) => point[1] < 0.3);
  const reach = Math.max(...foot.map((point) => Math.hypot(point[0], point[2])));
  assert.ok(reach <= PROP_REACH.palm, `foot reach ${reach}`);
});

test('the trunk rises to about 8.5 and leans toward +x', () => {
  const points = positionsOf(buildPalm().trunk);
  const top = Math.max(...points.map((point) => point[1]));
  assert.ok(top > 8.4 && top < 9.2, `top ${top}`);
  const crown = points.filter((point) => point[1] > top - 0.2);
  const centreX = crown.reduce((sum, point) => sum + point[0], 0) / crown.length;
  assert.ok(Math.abs(centreX - 1.6) < 0.3, `crown at x ${centreX}`);
});

test('the trunk has uv and colour, the fronds uv', () => {
  const { trunk, fronds } = buildPalm();
  assert.ok(trunk.attributes.uv && trunk.attributes.color);
  assert.ok(fronds.attributes.uv);
});

test('trunk and fronds fit the triangle budget together', () => {
  const { trunk, fronds } = buildPalm();
  assert.ok(triangles(trunk) + triangles(fronds) <= TRIANGLE_BUDGET, `${triangles(trunk)} + ${triangles(fronds)}`);
});

test('building twice gives the same shapes', () => {
  const [first, second] = [buildPalm(), buildPalm()];
  assert.deepEqual(positionsOf(first.trunk), positionsOf(second.trunk));
  assert.deepEqual(positionsOf(first.fronds), positionsOf(second.fronds));
});
