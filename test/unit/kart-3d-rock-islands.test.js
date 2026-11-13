// Unit tests for the bay's rocky islands (M9, docs/queue.md's task L: kit/rock-island.js and its plan, shapes and
// maps), which run without a browser: every island fits its triangle budget, is whole, the same for the same seed
// and different for another, stays inside the footprint it reports, its rock wound to face out (no face culled
// into a see-through gap), its palms on dry ground; the kinds have their beaches; the rock's tile repeats without
// a seam; and the material is made once per course.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-lighthouse.test.js).
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

// The rock's maps are drawn on a canvas; a stand-in document gives one that holds nothing (as in
// kart-3d-islands.test.js).
globalThis.document = {
  createElement: () => ({ getContext: () => ({ createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }), putImageData() {} }) }),
};

const THREE = await import('three');
const { rockIslandGeometry, rockIslandFootprint, buildRockIsland } = await import('../../host/games/kart-3d/kit/rock-island.js');
const { planRockIsland } = await import('../../host/games/kart-3d/kit/rock-island-plan.js');
const { drawIslandRockSurface, ISLAND_ROCK_SIZE } = await import('../../host/games/kart-3d/kit/rock-island-maps.js');
const { buildPalm } = await import('../../host/games/kart-3d/kit/palm.js');

// The spec's budget; M places 3 to 5 islands, of about these sizes.
const BUDGET = 40000;
const SEEDS = [1, 2, 3, 4, 5, 6];
const SIZES = [15, 25, 40];

const palm = buildPalm();
const triangles = (geometry) => (geometry ? geometry.index.count / 3 : 0);
const PALM_TRIANGLES = triangles(palm.trunk) + triangles(palm.fronds);

function islandTriangles({ parts, palms }) {
  return Object.values(parts).reduce((sum, geometry) => sum + triangles(geometry), 0) + palms.length * PALM_TRIANGLES;
}

function corners(geometry) {
  const { position } = geometry.attributes;
  return Array.from({ length: position.count }, (_, index) => [position.getX(index), position.getY(index), position.getZ(index)]);
}

test('every island fits its triangle budget at every size', () => {
  for (const seed of SEEDS) {
    for (const size of SIZES) {
      const count = islandTriangles(rockIslandGeometry({ seed, size }));
      assert.ok(count <= BUDGET, `seed ${seed} size ${size}: ${count} triangles`);
    }
  }
});

test('every part is whole: positions, normals, colours, texture coordinates and an index, no NaN', () => {
  for (const seed of SEEDS) {
    for (const [name, geometry] of Object.entries(rockIslandGeometry({ seed, size: 25 }).parts)) {
      if (!geometry) {
        continue;
      }
      const { position, normal, color, uv } = geometry.attributes;
      assert.ok(normal && color && uv && geometry.index, `seed ${seed} ${name} lacks an attribute`);
      for (const attribute of [position, normal, color, uv]) {
        assert.ok(attribute.array.every(Number.isFinite), `seed ${seed} ${name} has a NaN`);
      }
    }
  }
});

test('the same seed gives the same island, and the first three seeds give one of each kind', () => {
  const first = rockIslandGeometry({ seed: 2, size: 20 }).parts.rock.attributes.position.array;
  const again = rockIslandGeometry({ seed: 2, size: 20 }).parts.rock.attributes.position.array;
  assert.deepEqual(Array.from(first), Array.from(again));
  assert.deepEqual([1, 2, 3].map((seed) => planRockIsland({ seed, size: 20 }).kind).sort(), ['karst', 'mesa', 'stack']);
  const other = rockIslandGeometry({ seed: 5, size: 20 }).parts.rock.attributes.position.array;
  assert.notDeepEqual(Array.from(first.slice(0, 30)), Array.from(other.slice(0, 30)), 'seeds 2 and 5 are both mesas but differ');
});

test('an island stays inside its footprint: in the water from below the surface up to its grass', () => {
  for (const seed of SEEDS) {
    const size = 25;
    const { parts, palms } = rockIslandGeometry({ seed, size });
    const footprint = rockIslandFootprint({ seed, size });
    for (const [name, geometry] of Object.entries(parts)) {
      for (const [x, , z] of geometry ? corners(geometry) : []) {
        assert.ok(Math.hypot(x, z) <= footprint.radius + 0.01, `seed ${seed} ${name} reaches ${Math.hypot(x, z)}`);
      }
    }
    parts.rock.computeBoundingBox();
    const { min, max } = parts.rock.boundingBox;
    assert.ok(min.y < -1, `seed ${seed}: the rock goes on under the water`);
    assert.ok(max.y > 5 && max.y < footprint.height, `seed ${seed}: the rock's top at ${max.y}, its grass at ${footprint.height}`);
    for (const spot of palms) {
      assert.ok(Math.hypot(spot.x, spot.z) < footprint.radius, `seed ${seed}: a palm stands off the island`);
    }
  }
});

test('the water lies flat on the sea, see-through between 0 and 1', () => {
  const { water } = rockIslandGeometry({ seed: 3, size: 25 }).parts;
  assert.equal(water.attributes.color.itemSize, 4);
  for (const [, y] of corners(water)) {
    assert.ok(y > 0 && y < 0.1);
  }
  const alphas = Array.from({ length: water.attributes.color.count }, (_, index) => water.attributes.color.getW(index));
  assert.ok(alphas.every((alpha) => alpha >= 0 && alpha <= 1) && Math.max(...alphas) > 0.5);
});

// The volume a closed mesh holds is positive when its faces face out (the divergence theorem). The rock is open
// only at its foot, under the water, which takes a little off but cannot turn the sign.
test('the rock is wound to face out, so no face is culled into a see-through gap', () => {
  for (const seed of SEEDS) {
    const { rock } = rockIslandGeometry({ seed, size: 25 }).parts;
    const points = corners(rock);
    let volume = 0;
    for (let first = 0; first < points.length; first += 3) {
      const [a, b, c] = [0, 1, 2].map((corner) => new THREE.Vector3(...points[first + corner]));
      volume += a.dot(b.clone().cross(c)) / 6;
    }
    assert.ok(volume > 0, `seed ${seed}: volume ${volume}`);
  }
});

// Where two faces of the rock meet, their shared edge runs one way in one and the other way in the other, as on
// any surface wound one way all over: an edge run the same way twice is a face turned wrong, culled from outside.
test('every face of the rock is wound the same way as its neighbours', () => {
  for (const seed of SEEDS) {
    const points = corners(rockIslandGeometry({ seed, size: 25 }).parts.rock).map((point) => point.map((value) => value.toFixed(4)).join(','));
    const edges = new Set();
    for (let first = 0; first < points.length; first += 3) {
      for (let corner = 0; corner < 3; corner += 1) {
        const edge = `${points[first + corner]}>${points[first + ((corner + 1) % 3)]}`;
        assert.ok(!edges.has(edge), `seed ${seed}: the edge ${edge} runs the same way in two faces`);
        edges.add(edge);
      }
    }
  }
});

test('the stack has no beach, the mesa and the karst have one, and palms stand on dry ground', () => {
  const kinds = Object.fromEntries([1, 2, 3].map((seed) => [planRockIsland({ seed, size: 25 }).kind, rockIslandGeometry({ seed, size: 25 })]));
  assert.equal(kinds.stack.parts.sand, null);
  assert.ok(triangles(kinds.mesa.parts.sand) > 0 && triangles(kinds.karst.parts.sand) > 0);
  for (const { palms } of Object.values(kinds)) {
    assert.ok(palms.length >= 2);
    for (const spot of palms) {
      assert.ok(spot.y > 0, `a palm stands at ${spot.y}`);
    }
  }
});

// The step from the tile's last row (or column) to its first, where it repeats, is no bigger than the biggest
// step between two rows (columns) inside it: band edges and joints make steps, the repeat makes none of its own.
test("the rock's tile repeats without a seam, left to right and top to bottom", () => {
  const surface = drawIslandRockSurface();
  const size = ISLAND_ROCK_SIZE;
  const stepDown = (row) => Array.from({ length: size }, (_, x) => Math.abs(surface.heightAt(x, row + 1) - surface.heightAt(x, row))).reduce((a, b) => a + b);
  const stepAcross = (column) => Array.from({ length: size }, (_, y) => Math.abs(surface.heightAt(column + 1, y) - surface.heightAt(column, y))).reduce((a, b) => a + b);
  const inside = Array.from({ length: size - 1 }, (_, index) => index);
  assert.ok(stepDown(size - 1) <= Math.max(...inside.map(stepDown)), 'top to bottom');
  assert.ok(stepAcross(size - 1) <= Math.max(...inside.map(stepAcross)), 'left to right');
});

test('an island builds as a group, its materials made once per course and the surf moving', () => {
  const keep = (thing) => thing;
  const kit = {
    keep,
    textures: { grass: new THREE.Texture(), sand: new THREE.Texture() },
    palm: { trunk: new THREE.MeshStandardMaterial(), fronds: new THREE.MeshStandardMaterial() },
  };
  const first = buildRockIsland(kit, { seed: 2, size: 20 });
  const second = buildRockIsland(kit, { seed: 3, size: 20 });
  const materialsOf = (island) => island.object.children.map((child) => child.material);
  assert.ok(materialsOf(first).every((material) => materialsOf(second).includes(material)), 'the same materials');
  const water = first.object.children.find((child) => child.material.transparent);
  assert.equal(water.castShadow, false);
  const before = water.material.opacity;
  first.update(1);
  assert.notEqual(water.material.opacity, before);
});

test('a small island whose beach has only its two end corners still builds (seed 6 at size 12 used to throw)', () => {
  assert.doesNotThrow(() => rockIslandGeometry({ seed: 6, size: 12 }));
});
