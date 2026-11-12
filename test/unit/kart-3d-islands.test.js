// Unit tests for the beach islands' rocks rebuilt in M7d4d (kit/beach-island.js and kit/rock-maps.js), which run
// without a browser: the one rock material per course, the rock's map sizes, that the rocks reach no further than
// before (the seaside layout tests count on it), and that the palms and huts drawn after the rocks stand where
// they stood.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy. Node
// has no import map, so a resolve hook does the same here (as in kart-3d-kit-parts.test.js).
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

// The rock's maps are drawn on a canvas; a stand-in document gives one that holds nothing.
globalThis.document = {
  createElement: () => ({ getContext: () => ({ createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData() {} }) }),
};

const { buildBeachIslands } = await import('../../host/games/kart-3d/kit/beach-island.js');
const { rockMaterial, ROCK_SIZE } = await import('../../host/games/kart-3d/kit/rock-maps.js');

const SEA_LEVEL = -14;
// An outline wobbles out to at most this many times its radius (as the seaside layout tests assume).
const WOBBLE = 1.19;

// A stand-in for kit/kit.js's createKit, with what the islands use. Each call is a course of its own. The tests
// share one course, so the rock's maps (about a second to draw in Node) are drawn once.
function fakeKit() {
  return { keep: (thing) => thing, textures: { grass: { name: 'grass' }, sand: { name: 'sand' } } };
}
const kit = fakeKit();

// Every corner of a geometry as [x, y, z].
function corners(geometry) {
  const { position } = geometry.attributes;
  return Array.from({ length: position.count }, (_, index) => [position.getX(index), position.getY(index), position.getZ(index)]);
}

function assertFinite(geometry, label) {
  for (const name of ['position', 'normal', 'uv', 'color']) {
    assert.ok(geometry.attributes[name].array.every(Number.isFinite), `${label}: every ${name} is a number`);
  }
}

test('the beach rocks use the rock material of the kit, one per course', () => {
  const beach = buildBeachIslands(kit, [{ x: 0, z: 0, radius: 16, height: 5, palms: 2, huts: 1 }], SEA_LEVEL);
  const rock = rockMaterial(kit);
  assert.equal(beach.parts[1].material, rock, 'the beach rocks share the kit rock');
  assert.equal(rockMaterial({ ...kit, world: 'another part' }), rock, 'a copy of the kit (kitPart) finds the same material');
  assert.notEqual(rockMaterial(fakeKit()), rock, 'another course draws its own');
});

test('the rock has four maps, each 512 by 512', () => {
  assert.equal(ROCK_SIZE, 512);
  const rock = rockMaterial(kit);
  for (const name of ['map', 'normalMap', 'aoMap', 'roughnessMap']) {
    assert.equal(rock[name].image.width, ROCK_SIZE, name);
    assert.equal(rock[name].image.height, ROCK_SIZE, name);
  }
});

test('the beach rocks stay within the old rocks\' reach and height, and are few triangles each', () => {
  const island = { x: 40, z: -20, radius: 20, height: 5, palms: 0, huts: 0 };
  const rocks = buildBeachIslands(kit, [island], SEA_LEVEL).parts[1].geometry;
  assertFinite(rocks, 'beach rocks');
  // The old rocks: up to 2.2 across, stretched 1.3 times one way, at up to 1.12 times the shore's radius out; their
  // tops 0.85 times their size above the sea.
  for (const [x, y, z] of corners(rocks)) {
    assert.ok(Math.hypot(x - island.x, z - island.z) <= island.radius * WOBBLE * 1.12 + 2.2 * 1.3);
    assert.ok(y <= SEA_LEVEL + 0.85 * 2.2);
  }
  const count = Math.round(island.radius / 4);
  assert.ok(rocks.index.count / 3 / count <= 250, 'each rock two slabs of a few hundred triangles at most');
});

test('the palms and huts stand where they stood before the rocks were rebuilt', () => {
  const islands = [{ x: 40, z: -20, radius: 16, height: 5, palms: 3, huts: 2 }, { x: -60, z: 30, radius: 22, height: 6, palms: 2, huts: 1 }];
  const { palms, huts } = buildBeachIslands(kit, islands, SEA_LEVEL);
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} is ${expected}`);
  close(palms[0].x, 33.510400443880656);
  close(palms[0].z, -19.7009699540866);
  close(palms[4].x, -56.86123744435993);
  close(palms[4].turn, 5.979864961035385);
  close(huts[0].x, 59.6811040348634);
  close(huts[2].z, 55.36860573196335);
});
