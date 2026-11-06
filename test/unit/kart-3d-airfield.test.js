// Unit tests for the airfield's fittings, barrier styles and baggage conveyor (M9 task K): each prop builds within
// 2,500 triangles on the ground and inside its PROP_REACH, the two barrier styles run the whole airport lap with
// finite geometry, and the conveyor stays within 20,000 triangles, moves its cargo in update and keeps it on the belt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// Three.js is imported by its bare name, which the browser's import map resolves; Node needs a hook for it.
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

// Node has no canvas: a stand-in whose drawing calls do nothing, so the drawn textures can be made.
const context = new Proxy({}, {
  get: (target, name) => (name === 'createImageData' ? (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }) : target[name] ?? (() => {})),
  set: (target, name, value) => ((target[name] = value), true),
});
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

const THREE = await import('three');
const { PROP_BUILDERS } = await import('../../host/games/kart-3d/kit/props.js');
const { PROP_REACH, BARRIER_STYLES } = await import('../../host/games/kart-3d/kit/layout-rules.js');
const { buildBarriers } = await import('../../host/games/kart-3d/kit/barriers.js');
const { buildBaggageConveyor } = await import('../../host/games/kart-3d/kit/baggage-conveyor.js');
const { buildTrack } = await import('../../host/games/kart-3d/track-builder.js');
const { PALM_BAY_AIRPORT } = await import('../../host/games/kart-3d/palm-bay-airport.js');

const kitFor = (extra = {}) => ({
  keep: (thing) => thing,
  materials: { painted: new THREE.MeshStandardMaterial({ vertexColors: true }), iron: new THREE.MeshStandardMaterial({ vertexColors: true }), glass: new THREE.MeshStandardMaterial() },
  textures: {},
  ...extra,
});
const trianglesOf = (geometry) => (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;

const PROPS = ['runway-light', 'taxiway-sign', 'windsock', 'airport-floodlight'];

for (const name of PROPS) {
  test(`the ${name} is built within budget, on the ground and inside its reach`, () => {
    assert.ok(PROP_BUILDERS[name], 'registered in PROP_BUILDERS');
    const parts = PROP_BUILDERS[name](kitFor());
    const total = parts.reduce((sum, part) => sum + trianglesOf(part.geometry), 0);
    assert.ok(total <= 2500, `${total} triangles`);
    const bounds = new THREE.Box3();
    for (const { geometry } of parts) {
      for (const value of geometry.attributes.position.array) {
        assert.ok(Number.isFinite(value));
      }
      geometry.computeBoundingBox();
      bounds.union(geometry.boundingBox);
    }
    assert.ok(Math.abs(bounds.min.y) < 0.05, `foot at y ${bounds.min.y}`);
    const reach = Math.max(-bounds.min.x, bounds.max.x, -bounds.min.z, bounds.max.z);
    assert.ok(reach <= PROP_REACH[name], `extends ${reach.toFixed(2)}, reach ${PROP_REACH[name]}`);
    assert.ok(reach >= PROP_REACH[name] - 0.6, `reach ${PROP_REACH[name]} is far beyond the ${reach.toFixed(2)} it needs`);
  });
}

for (const style of [BARRIER_STYLES.APRON_RAIL, BARRIER_STYLES.PADDED_BARRIER]) {
  test(`the ${style} barrier runs the airport's lap with finite shapes`, () => {
    const track = buildTrack(PALM_BAY_AIRPORT);
    const world = new THREE.Group();
    const kit = kitFor({ world, track, textures: { concrete: null, concreteRelief: null } });
    buildBarriers(kit, [{ fromS: 0, toS: track.length, side: 'both', style }]);
    const meshes = [];
    world.traverse((object) => object.isMesh && meshes.push(object));
    assert.ok(meshes.length >= 3, `${meshes.length} meshes`);
    for (const { geometry } of meshes) {
      assert.ok(trianglesOf(geometry) > 0);
      for (const value of geometry.attributes.position.array) {
        assert.ok(Number.isFinite(value));
      }
    }
  });
}

test('the baggage conveyor is within budget, moves its cargo and keeps it on the belt', () => {
  const length = 40;
  const { object, update } = buildBaggageConveyor(kitFor(), { length });
  let triangles = 0;
  const cargo = [];
  object.traverse((child) => {
    if (child.isMesh) {
      triangles += trianglesOf(child.geometry) * (child.isInstancedMesh ? child.count : 1);
      child.isInstancedMesh && cargo.push(child);
    }
  });
  assert.ok(triangles <= 20000, `${triangles} triangles`);
  assert.equal(cargo.length, 2);
  const positionOf = (mesh, index) => new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().fromArray(mesh.instanceMatrix.array, index * 16));
  update(0.5, {});
  const before = positionOf(cargo[0], 0).z;
  update(0.5, {});
  assert.notEqual(positionOf(cargo[0], 0).z, before, 'the cargo moves');
  for (let step = 0; step < 400; step += 1) {
    update(0.1, {});
    for (const mesh of cargo) {
      for (let index = 0; index < mesh.count; index += 1) {
        const { x, y, z } = positionOf(mesh, index);
        assert.ok(Math.abs(x) < 1.5 && Math.abs(z) < length / 2 && Math.abs(y - 0.84) < 0.01, `cargo at ${x}, ${y}, ${z}`);
      }
    }
  }
});
