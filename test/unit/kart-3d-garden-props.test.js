// Unit tests for the garden props (M7d4c5): the round tree, hedge and planter's shapes (their textures need a
// canvas, so only the shapes are built): each stands on y = 0, stays inside its reach, has the attributes its
// material needs, and the tree fits the triangle budget the sky's many islands need.

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

const THREE = await import('three');
const { trunkShape, canopyShape } = await import('../../host/games/kart-3d/kit/round-tree.js');
const { loafShape, flowerShapes } = await import('../../host/games/kart-3d/kit/hedge.js');
const { buildPlanter } = await import('../../host/games/kart-3d/kit/planter.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

function triangles(geometry) {
  return (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
}

function boundsOf(geometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox;
}

function assertClean(geometry) {
  for (const value of geometry.attributes.position.array) {
    assert.ok(Number.isFinite(value));
  }
  assert.ok(geometry.attributes.color);
  assert.ok(geometry.attributes.uv);
}

test('the round tree stands on the ground, within its reach, under 1,500 triangles', () => {
  const [trunk, canopy] = [trunkShape(), canopyShape()];
  assertClean(canopy);
  const tree = new THREE.Box3().union(boundsOf(trunk)).union(boundsOf(canopy));
  assert.ok(Math.abs(tree.min.y) < 0.01);
  assert.ok(tree.max.y > 4.5 && tree.max.y < 6.5);
  assert.ok(Math.max(tree.max.x, tree.max.z, -tree.min.x, -tree.min.z) <= PROP_REACH['round-tree']);
  assert.ok(triangles(trunk) + triangles(canopy) < 1500);
});

test('the hedge is 2.4 long on the ground and its flowers stay in reach', () => {
  const loaf = loafShape();
  assertClean(loaf);
  const box = boundsOf(loaf);
  assert.ok(Math.abs(box.min.y) < 0.01);
  assert.ok(box.max.x - box.min.x > 2.2 && box.max.x - box.min.x < 2.5);
  const flowers = flowerShapes();
  assertClean(flowers);
  assert.ok(boundsOf(flowers).max.x <= PROP_REACH.hedge);
});

test('the planter is one painted part on the ground, within its reach', () => {
  const kit = { keep: (thing) => thing, materials: { painted: {} } };
  const parts = buildPlanter(kit);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].material, kit.materials.painted);
  const box = boundsOf(parts[0].geometry);
  assert.ok(Math.abs(box.min.y) < 0.01);
  assert.ok(Math.max(box.max.x, -box.min.x) <= PROP_REACH.planter);
  assertClean(parts[0].geometry);
});
