// Unit tests for the kit's grandstand (M7d4c3), which run without a browser: it keeps to the footprint the layout
// checks give it (within its length, from its front at z = 0 back to GRANDSTAND_DEPTH, nothing in front of its
// front below 4 high, the roof reaching at most 1 past it, about 9 high), its crowd sits on seats on both decks
// and hops without leaving them, and its seats, of which there are hundreds, stay light.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The grandstand imports Three.js by its bare name, which the browser's import map points at the vendored copy.
// Node has no import map and Three.js is not an npm dependency, so a resolve hook does the same here.
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

// The fascia's sign is drawn on a canvas, which Node lacks: a canvas whose drawing does nothing stands in for it
// (the test checks shapes, not pictures).
globalThis.document = {
  createElement: () => ({
    width: 0,
    height: 0,
    getContext: () => new Proxy({}, { get: (target, name) => (name in target ? target[name] : () => {}), set: (target, name, value) => ((target[name] = value), true) }),
  }),
};

const THREE = await import('three');
const { buildGrandstand } = await import('../../host/games/kart-3d/kit/grandstand.js');
const { seatSpots, buildSeat } = await import('../../host/games/kart-3d/kit/grandstand-structure.js');
const { mergeShapes } = await import('../../host/games/kart-3d/shape-utils.js');

// As test/helpers/kit-layout-checks.js gives it, and the two courses' lengths (the layouts' GRANDSTAND).
const GRANDSTAND_DEPTH = 7.2;
const LENGTHS = [44, 36];
const SLACK = 1e-6;

function build(length) {
  const material = new THREE.MeshStandardMaterial();
  return buildGrandstand(length, { keep: (thing) => thing, sponsors: material, textures: { concrete: null, concreteRelief: null } });
}

// Every vertex of every mesh in `object`, in the stand's frame, each instance of an instanced mesh where it is.
function pointsOf(object) {
  const points = [];
  object.traverse((mesh) => {
    if (!mesh.isMesh) {
      return;
    }
    const matrices = mesh.isInstancedMesh ? instanceMatrices(mesh) : [new THREE.Matrix4()];
    const { position } = mesh.geometry.attributes;
    for (const matrix of matrices) {
      for (let index = 0; index < position.count; index += 1) {
        points.push(new THREE.Vector3().fromBufferAttribute(position, index).applyMatrix4(matrix));
      }
    }
  });
  return points;
}

function instanceMatrices(mesh) {
  return Array.from({ length: mesh.count }, (_, index) => {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(index, matrix);
    return matrix;
  });
}

for (const length of LENGTHS) {
  test(`a stand ${length} long keeps to its footprint`, () => {
    const points = pointsOf(build(length).object);
    assert.ok(points.length > 0);
    for (const point of points) {
      assert.ok([point.x, point.y, point.z].every(Number.isFinite), 'no NaN');
      assert.ok(Math.abs(point.x) <= length / 2 + SLACK, `x ${point.x}`);
      assert.ok(point.z >= -GRANDSTAND_DEPTH - SLACK, `z ${point.z} behind its back`);
      assert.ok(point.z <= 1 + SLACK, `z ${point.z} reaches too far toward the road`);
      assert.ok(point.y >= -SLACK && point.y <= 9, `y ${point.y}`);
      if (point.y < 4) {
        assert.ok(point.z <= SLACK, `in front of its front at ${point.y} high: z ${point.z}`);
      }
    }
  });
}

test('there are seats on both decks, the upper one higher and farther back', () => {
  const seats = seatSpots(44);
  const [lower, upper] = [0, 1].map((deck) => seats.filter((seat) => seat.deck === deck));
  assert.ok(lower.length > 100 && upper.length > 100, `${lower.length} and ${upper.length}`);
  assert.ok(Math.min(...upper.map((seat) => seat.y)) > Math.max(...lower.map((seat) => seat.y)) + 1);
  assert.ok(Math.max(...upper.map((seat) => seat.z)) < Math.min(...lower.map((seat) => seat.z)));
});

test('the crowd sits on seats on both decks, and hopping moves them only up from their seats', () => {
  const length = 44;
  const seats = seatSpots(length);
  const stand = build(length);
  const bodies = stand.object.children.filter((child) => child.isInstancedMesh && child.userData.keepWhole);
  assert.equal(bodies.length, 4, 'bodies, faces, caps, eyes and spots');
  const body = bodies[0];
  const placesOf = () => instanceMatrices(body).map((matrix) => new THREE.Vector3().setFromMatrixPosition(matrix));
  const before = placesOf();
  const seatUnder = (place) => seats.find((seat) => Math.abs(seat.x - place.x) < 0.01 && Math.abs(seat.z - place.z) < 0.1);
  const decks = new Set();
  for (const place of before) {
    const seat = seatUnder(place);
    assert.ok(seat, `a spectator at ${place.x}, ${place.z} has no seat`);
    assert.ok(place.y >= seat.y - SLACK && place.y < seat.y + 0.5, `sits at ${place.y} on a seat at ${seat.y}`);
    decks.add(seat.deck);
  }
  assert.deepEqual([...decks].sort(), [0, 1]);
  assert.ok(body.count > 0.7 * seats.length && body.count < seats.length, `${body.count} of ${seats.length} seats taken`);
  stand.update(0.7);
  const after = placesOf();
  let moved = 0;
  after.forEach((place, index) => {
    assert.equal(place.x, before[index].x);
    assert.equal(place.z, before[index].z);
    assert.ok(place.y >= seatUnder(place).y - SLACK);
    moved += place.y !== before[index].y ? 1 : 0;
  });
  assert.ok(moved > 0, 'someone hopped');
});

test('a seat, repeated hundreds of times, stays under 200 triangles', () => {
  const seat = mergeShapes(buildSeat());
  assert.ok(seat.index.count / 3 <= 200, `${seat.index.count / 3} triangles`);
});

test('building twice gives the same stand', () => {
  const [first, second] = [build(36), build(36)];
  assert.deepEqual(pointsOf(first.object).map((point) => point.toArray()), pointsOf(second.object).map((point) => point.toArray()));
});
