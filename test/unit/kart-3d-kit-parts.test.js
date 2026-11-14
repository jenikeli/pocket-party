// Unit tests for how the kit's pieces make their own parts (M7d4c3), which run without a browser: every prop
// builder takes the kit and returns parts with a geometry and a material, the sea and sky builders do the same, and
// buildProps adds the meshes the Test track's layout calls for. A stand-in kit is used (the real one draws its
// textures on a canvas), with the materials as plain markers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy. Node
// has no import map, so a resolve hook does the same here (as in kart-3d-palm.test.js).
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

// The round tree and hedge draw their maps on a canvas, and the follow-me car's board draws text on one; a
// stand-in document gives them a canvas that holds nothing (any drawing call it is not given does nothing).
const drawing = { createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData() {} };
globalThis.document = {
  createElement: () => ({ getContext: () => new Proxy(drawing, { get: (target, name) => (name in target ? target[name] : () => {}) }) }),
};

const THREE = await import('three');
const { PROP_BUILDERS, buildProps } = await import('../../host/games/kart-3d/kit/props.js');
const { buildSailboat } = await import('../../host/games/kart-3d/kit/sailboat.js');
const { buildCloud } = await import('../../host/games/kart-3d/kit/clouds.js');
const { buildBalloon } = await import('../../host/games/kart-3d/kit/balloon.js');
const { buildBeachIslands } = await import('../../host/games/kart-3d/kit/beach-island.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { TEST_TRACK } = await import('../../host/games/kart-3d/test-track.js');
const { PROPS } = await import('../../host/games/kart-3d/test-track-layout.js');

// A stand-in for kit/kit.js's createKit: the same fields, with each material a plain marker.
function fakeKit() {
  const marker = (name) => ({ name });
  return {
    world: new THREE.Group(),
    track: buildTrack(TEST_TRACK),
    keep: (thing) => thing,
    materials: { plastic: marker('plastic'), painted: marker('painted'), iron: marker('iron'), glass: marker('glass') },
    sponsors: marker('sponsors'),
    palm: { trunk: marker('trunk'), fronds: marker('fronds') },
    textures: { sand: marker('sand'), grass: marker('grass') },
  };
}

// How many parts each prop has: the TV van, the lantern lamp, the floodlight, the palm, and since M7d4c5 the
// round tree and hedge have two, the triple lamp three (its stone pedestal, M7d4c4), and since M9 the follow-me car
// two (its lettered board), the runway light and taxiway sign two (glass, faces), the airport floodlight three (glass,
// ribbon), the rest one.
const PARTS_BEFORE = { 'tv-van': 2, 'lantern-lamp': 2, 'triple-lamp': 3, floodlight: 2, palm: 2, 'round-tree': 2, hedge: 2, 'follow-me-car': 2, 'runway-light': 2, 'taxiway-sign': 2, 'airport-floodlight': 3 };

function assertParts(parts, label) {
  assert.ok(Array.isArray(parts) && parts.length > 0, `${label} returns parts`);
  for (const { geometry, material } of parts) {
    assert.ok(geometry.isBufferGeometry && geometry.attributes.position.count > 0, `${label} has a geometry`);
    assert.ok(material, `${label} has a material`);
    assert.ok(!geometry.attributes.position.array.some(Number.isNaN), `${label} has no NaN in its positions`);
  }
}

test('every prop builder returns parts, each with a geometry and a material', () => {
  for (const [name, buildPiece] of Object.entries(PROP_BUILDERS)) {
    const parts = buildPiece(fakeKit());
    assertParts(parts, name);
    assert.equal(parts.length, PARTS_BEFORE[name] ?? 1, `${name} keeps its part count`);
  }
});

test('the props use the kit\'s shared materials, the sponsors\' and the palm\'s', () => {
  const kit = fakeKit();
  assert.equal(PROP_BUILDERS.cone(kit)[0].material, kit.materials.plastic);
  assert.equal(PROP_BUILDERS['tyre-stack'](kit)[0].material, kit.materials.painted);
  assert.deepEqual(PROP_BUILDERS['lantern-lamp'](kit).map((part) => part.material), [kit.materials.iron, kit.materials.glass]);
  assert.deepEqual(PROP_BUILDERS['tv-van'](kit).map((part) => part.material), [kit.materials.painted, kit.sponsors]);
  assert.deepEqual(PROP_BUILDERS.palm(kit).map((part) => part.material), [kit.palm.trunk, kit.palm.fronds]);
});

test('buildProps adds one mesh per part of each prop the Test track uses, and two for the sponsor stands', () => {
  const kit = fakeKit();
  buildProps(kit, PROPS);
  const used = new Set(PROPS.map((spot) => spot.piece));
  let expected = used.has('sponsor-stand') ? 2 : 0;
  for (const piece of Object.keys(PROP_BUILDERS)) {
    expected += used.has(piece) ? (PARTS_BEFORE[piece] ?? 1) : 0;
  }
  assert.ok(expected > 5, 'the layout uses several props');
  assert.equal(kit.world.children.length, expected);
});

test('the sailboat, cloud and balloon builders return parts', () => {
  assertParts(buildSailboat(fakeKit()), 'sailboat');
  assertParts(buildCloud(fakeKit()), 'cloud');
  assertParts(buildBalloon(fakeKit(), [0xe8402f, 0xffd21e]), 'balloon');
});

test('the beach islands return their parts, the foam material to animate and their palm and hut spots', () => {
  const island = { x: 0, z: 0, radius: 16, height: 5, palms: 3, huts: 1 };
  const built = buildBeachIslands(fakeKit(), [island], -14);
  assertParts(built.parts, 'beach islands');
  assert.equal(built.parts.length, 4, 'land, rocks, shallows and foam');
  assert.equal(built.parts[3].material, built.foam, 'the last part is the foam');
  assert.equal(built.parts.filter((part) => part.receiveShadow).length, 1, 'only the land takes shadows');
  assert.equal(built.palms.length, 3);
  assert.equal(built.huts.length, 1);
});
