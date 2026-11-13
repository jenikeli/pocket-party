// Unit tests for the kit's boats (M7d4d): the sailboat and the motor yacht build one coloured part each, nothing has
// a NaN position, they keep to their footprint and height (the seaside layout test allows 3.5 round and 7.5 up
// for a boat), the hulls' faces point outward, the triangles stay in budget, and every boat in BOATS has a kind
// that has a builder; and (M10) addBoats, which both courses use, puts each kind in one instanced mesh per part, each
// boat at its spot and rocking out of step with its neighbours.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-palm.test.js).
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
const { buildSailboat, SAILBOAT_HULL } = await import('../../host/games/kart-3d/kit/sailboat.js');
const { buildMotorYacht, YACHT_HULL } = await import('../../host/games/kart-3d/kit/motor-yacht.js');
const { hullBand, hullTransom, hullDeck } = await import('../../host/games/kart-3d/kit/boat-hull.js');
const { BOATS } = await import('../../host/games/kart-3d/seaside-landmarks.js');
const { addBoats } = await import('../../host/games/kart-3d/seaside-surroundings.js');
const { BOATS: AIRPORT_BOATS } = await import('../../host/games/kart-3d/airport-layout.js');

const kit = { keep: (thing) => thing };
const boxOf = (geometry) => geometry.computeBoundingBox() ?? geometry.boundingBox;
const triangles = (geometry) => geometry.index.count / 3;

for (const [name, build] of [['sailboat', buildSailboat], ['motor yacht', buildMotorYacht]]) {
  test(`the ${name} is one coloured part with no NaN position`, () => {
    const parts = build(kit);
    assert.equal(parts.length, 1);
    const { geometry, material } = parts[0];
    assert.ok(material.vertexColors, 'coloured per vertex');
    assert.ok(geometry.attributes.color, 'has colours');
    assert.ok(geometry.attributes.position.array.every(Number.isFinite), 'finite positions');
    assert.ok(geometry.attributes.normal.array.every(Number.isFinite), 'finite normals');
  });
}

test('the sailboat keeps its size and the yacht fits the boats\' room', () => {
  const sailboat = boxOf(buildSailboat(kit)[0].geometry);
  assert.ok(sailboat.max.z <= 3.1 && sailboat.min.z >= -3.1, 'about 6 long');
  assert.ok(sailboat.max.x <= 1.4 && sailboat.min.x >= -1.4, 'under 2.8 wide');
  assert.ok(sailboat.max.y <= 7.1 && sailboat.min.y >= -1, 'masthead near 7, keel under the water');
  const yacht = boxOf(buildMotorYacht(kit)[0].geometry);
  assert.ok(yacht.max.z <= 3.8 && yacht.min.z >= -4.3, 'under 8.1 long with its swim platform');
  assert.ok(yacht.max.x <= 1.5 && yacht.min.x >= -1.5, 'under 3 wide');
  assert.ok(yacht.max.y <= 4.5 && yacht.min.y >= -1, 'under 4.5 high');
});

test('the yacht stands taller than the sailboat\'s hull and has more parts than a plain hull', () => {
  assert.ok(boxOf(buildMotorYacht(kit)[0].geometry).max.y > 3, 'a flybridge with a frame over it');
  assert.ok(triangles(buildMotorYacht(kit)[0].geometry) > 1000);
});

test('boats stay within their triangle budget (a few of each are drawn)', () => {
  assert.ok(triangles(buildSailboat(kit)[0].geometry) < 6000, 'sailboat');
  assert.ok(triangles(buildMotorYacht(kit)[0].geometry) < 12000, 'motor yacht');
});

test('a hull\'s sides face outward, its deck up and its transom aft', () => {
  const normalsOf = (geometry) => {
    const { position, normal } = geometry.attributes;
    return Array.from({ length: position.count }, (_, index) => ({ at: new THREE.Vector3().fromBufferAttribute(position, index), normal: new THREE.Vector3().fromBufferAttribute(normal, index) }));
  };
  for (const spec of [SAILBOAT_HULL, YACHT_HULL]) {
    const side = normalsOf(hullBand(spec, 0.3, 0.5, 0xffffff)).filter(({ at }) => Math.abs(at.x) > 0.2);
    assert.ok(side.every(({ at, normal }) => normal.x * Math.sign(at.x) > 0), 'sides outward');
    // The stem's tip is a point where the deck's width closes to nothing, so its normal is zero.
    const deck = normalsOf(hullDeck(spec, 0xffffff)).filter(({ at }) => at.z < spec.length / 2 - 0.01);
    assert.ok(deck.every(({ normal }) => normal.y > 0.3), 'deck up');
    // The keel's point is where the transom's two edges meet, so one vertex has no normal.
    const transom = normalsOf(hullTransom(spec, 0xffffff)).filter(({ normal }) => normal.length() > 0.5);
    assert.ok(transom.every(({ normal }) => normal.z < -0.99), 'transom aft');
  }
});

test('BOATS has sailboats and about as many yachts, each of a kind with a builder', () => {
  const kinds = BOATS.map((boat) => boat.kind);
  assert.ok(kinds.every((kind) => kind === 'sailboat' || kind === 'motor-yacht'));
  const yachts = kinds.filter((kind) => kind === 'motor-yacht').length;
  assert.ok(yachts >= BOATS.length / 3 && yachts <= BOATS.length / 2 + 1, `${yachts} yachts of ${BOATS.length}`);
});

// addBoats takes a course's boat spots, so the airport's go through the same code as Seaside Skyway's.
const SEA_LEVEL = -8.2;
const boatsKit = () => ({ world: new THREE.Group(), keep: (thing) => thing });
const countOf = (spots, kind) => spots.filter((boat) => boat.kind === kind).length;

// Where the instance `slot` of `mesh` stands.
function placeOf(mesh, slot) {
  const matrix = new THREE.Matrix4();
  mesh.getMatrixAt(slot, matrix);
  return new THREE.Vector3().setFromMatrixPosition(matrix);
}

test('addBoats makes one instanced mesh per kind, with an instance per boat of that kind, for either course\'s boats', () => {
  for (const spots of [BOATS, AIRPORT_BOATS]) {
    const fleetKit = boatsKit();
    addBoats(fleetKit, SEA_LEVEL, spots);
    const meshes = fleetKit.world.children;
    assert.ok(meshes.every((mesh) => mesh.isInstancedMesh && mesh.userData.keepWhole), 'instanced, never cut into cells');
    assert.deepEqual(meshes.map((mesh) => mesh.count).sort(), [countOf(spots, 'motor-yacht'), countOf(spots, 'sailboat')].sort());
  }
});

test('addBoats puts each boat at its spot, rocking out of step with its neighbours as time passes', () => {
  const fleetKit = boatsKit();
  const fleet = addBoats(fleetKit, SEA_LEVEL, AIRPORT_BOATS);
  const spots = AIRPORT_BOATS.filter((boat) => boat.kind === 'sailboat');
  const sailboats = fleetKit.world.children.find((mesh) => mesh.count === spots.length);
  spots.forEach((spot, slot) => {
    const place = placeOf(sailboats, slot);
    assert.ok(Math.abs(place.x - spot.x) < 1e-4 && Math.abs(place.z - spot.z) < 1e-4, `boat ${slot} is at its spot`);
  });
  const heightsAt = () => spots.map((spot, slot) => placeOf(sailboats, slot).y);
  const atRest = heightsAt();
  assert.ok(new Set(atRest.map((height) => height.toFixed(3))).size > 1, 'out of step at rest');
  fleet.bob(1.7);
  assert.notDeepEqual(heightsAt(), atRest, 'moved with time');
  assert.ok(heightsAt().every((height) => Math.abs(height - SEA_LEVEL) <= 0.2 + 1e-6), 'within 0.2 of the sea level');
});
