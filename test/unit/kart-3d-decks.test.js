// Unit tests for the seaside decks (M7d4c5), which run without a browser: the deck-maps textures are drawn on a
// stand-in canvas (a bare object that keeps its size), so their sizes and the materials they feed can be checked;
// a deck builds with a coping and a darker band on its sides, reaches no further than its depth, and has no NaN.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name; a resolve hook does what the browser's import map does (as in
// kart-3d-palm.test.js).
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    return specifier === 'three' ? next(`${threeFolder}three.module.js`, context) : next(specifier, context);
  },
});

// A canvas that holds pixels but draws nothing: enough for the pixel images to write to and Three.js to wrap.
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => ({
      createImageData: (width, height) => ({ width, height, data: new Uint8ClampedArray(width * height * 4) }),
      putImageData() {},
    }),
  }),
};

const THREE = await import('three');
const { buildPlatforms } = await import('../../host/games/kart-3d/kit/platform.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { TEST_TRACK } = await import('../../host/games/kart-3d/test-track.js');

const DEPTH = 9;

// Each deck is built once: drawing its maps is the slow part.
const decks = {};
function buildDeck(ground) {
  decks[ground] ??= drawDeck(ground);
  return decks[ground];
}

function drawDeck(ground) {
  const world = new THREE.Group();
  const keep = (thing) => thing;
  const track = buildTrack(TEST_TRACK);
  buildPlatforms({ world, track, keep, textures: { grass: { name: 'grass' }, concrete: { name: 'concrete' } } }, [{ fromS: 4, toS: 58, side: 'right', depth: DEPTH, ground }], -20);
  return { world };
}

test('boards, paving and sand decks take their own relief and shade maps; grass keeps the shared tile', () => {
  for (const ground of ['boards', 'paving', 'sand']) {
    const top = buildDeck(ground).world.children[0].material;
    assert.ok(top.normalMap && top.aoMap && top.map, `${ground} has colour, relief and shade`);
    for (const texture of [top.map, top.normalMap, top.aoMap]) {
      assert.deepEqual([texture.image.width, texture.image.height], [512, 512]);
    }
  }
  const grass = buildDeck('grass').world.children[0].material;
  assert.equal(grass.map.name, 'grass');
  assert.ok(!grass.normalMap);
});

test('the sides are built in three bands: a pale coping, the wall and a darker foot', () => {
  const sides = buildDeck('boards').world.children[1].geometry;
  const colors = sides.attributes.color;
  const tones = new Set(Array.from({ length: colors.count }, (_, index) => colors.getX(index).toFixed(3)));
  assert.equal(tones.size, 3);
});

test('a deck reaches no further out than its depth and has no NaN', () => {
  const { world } = buildDeck('paving');
  const track = buildTrack(TEST_TRACK);
  for (const mesh of world.children.filter((child) => child.geometry)) {
    const { position } = mesh.geometry.attributes;
    assert.ok(!position.array.some(Number.isNaN));
    for (let index = 0; index < position.count; index += 1) {
      const point = new THREE.Vector3().fromBufferAttribute(position, index);
      const nearest = track.stations.reduce((best, station) => Math.min(best, point.distanceTo(new THREE.Vector3(station.point.x, station.point.y, station.point.z))), Infinity);
      assert.ok(nearest < track.stations[0].halfWidth + 20 + DEPTH, 'a vertex stays near the road');
    }
  }
});
