// Unit tests for the rebuilt floodlight, bunting pennant, sponsor stand and TV van (M7d4c3): their parts and
// materials, their footprint within PROP_REACH, no NaN, and their triangle counts. Run without a browser, with the
// same stand-in kit and import hook as kart-3d-kit-parts.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

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
const { buildFloodlight } = await import('../../host/games/kart-3d/kit/floodlight.js');
const { buildTvVan } = await import('../../host/games/kart-3d/kit/tv-van.js');
const { buildSponsorStand, buildSponsorStands } = await import('../../host/games/kart-3d/kit/sponsor-stand.js');
const { createPennant } = await import('../../host/games/kart-3d/kit/bunting-pennant.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

function fakeKit() {
  const marker = (name) => ({ name });
  return {
    keep: (thing) => thing,
    materials: { plastic: marker('plastic'), painted: marker('painted'), iron: marker('iron'), glass: marker('glass') },
    sponsors: marker('sponsors'),
  };
}

const trianglesOf = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;

// The most the geometries reach from the piece's middle along x and z.
function reachOf(geometries) {
  const box = new THREE.Box3();
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox);
  });
  return Math.max(Math.abs(box.min.x), box.max.x, Math.abs(box.min.z), box.max.z);
}

function assertClean(geometry, label) {
  assert.ok(!geometry.attributes.position.array.some(Number.isNaN), `${label} has no NaN`);
  assert.ok(geometry.attributes.normal && geometry.attributes.uv, `${label} has normals and uvs`);
}

test('the floodlight keeps its two parts, steel and glass, and its footprint', () => {
  const kit = fakeKit();
  const parts = buildFloodlight(kit);
  assert.deepEqual(parts.map((part) => part.material), [kit.materials.iron, kit.materials.glass]);
  parts.forEach((part, index) => assertClean(part.geometry, `floodlight part ${index}`));
  assert.ok(reachOf(parts.map((part) => part.geometry)) <= PROP_REACH.floodlight, 'within its reach');
  assert.ok(trianglesOf(parts[0].geometry) < 20000, 'the mast stays light');
});

test('the TV van keeps its painted shape and its printed boards, within its reach', () => {
  const kit = fakeKit();
  const parts = buildTvVan(kit);
  assert.deepEqual(parts.map((part) => part.material), [kit.materials.painted, kit.sponsors]);
  parts.forEach((part, index) => assertClean(part.geometry, `van part ${index}`));
  assert.ok(reachOf(parts.map((part) => part.geometry)) <= PROP_REACH['tv-van'], 'within its reach');
  assert.ok(parts[0].geometry.attributes.color, 'the shape is coloured per vertex');
});

test('a sponsor stand is a frame and one board, within its reach, and the stands merge into two meshes', () => {
  const stand = buildSponsorStand(2);
  assertClean(stand.frame, 'frame');
  assertClean(stand.boards, 'board');
  assert.equal(trianglesOf(stand.boards), 2, 'one flat board');
  assert.ok(stand.frame.attributes.color, 'the frame is coloured per vertex');
  assert.ok(reachOf([stand.frame]) <= PROP_REACH['sponsor-stand'], 'within its reach');
  const meshes = buildSponsorStands(fakeKit(), [new THREE.Matrix4(), new THREE.Matrix4()]);
  assert.equal(meshes.length, 2);
});

test('a pennant has two one-sided layers with normals leaning up, and stays small', () => {
  const pennant = createPennant(0.36, 0xb48cff);
  assertClean(pennant, 'pennant');
  assert.ok(pennant.attributes.color, 'coloured per vertex');
  assert.ok(trianglesOf(pennant) <= 120, 'a string has dozens of them');
  const cloth = pennant.attributes.normal;
  let leaning = 0;
  for (let index = 0; index < cloth.count; index += 1) {
    leaning += cloth.getY(index) > 0 ? 1 : 0;
  }
  assert.ok(leaning > cloth.count * 0.8, 'the cloth leans up on both layers (the hem is round)');
});
