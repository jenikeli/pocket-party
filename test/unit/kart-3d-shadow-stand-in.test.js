// Unit tests for the kart's shadow stand-in (M10 O, karts/shadow-stand-in.js), which run without a browser: it is a
// few hundred triangles, fits round its kart, is as tall as each design, and is drawn only by the shadow pass.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The karts import Three.js by its bare name, which the browser's import map points at the vendored copy; a resolve
// hook does the same here (as in kart-3d-kart-designs.test.js).
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
const { KART_DESIGNS } = await import('../../host/games/kart-3d/karts/kart-designs.js');
const { buildKartParts, buildDesignShapes } = await import('../../host/games/kart-3d/karts/design-shapes.js');
const { WHEELS } = await import('../../host/games/kart-3d/karts/kart-layout.js');
const { MATERIAL_KINDS } = await import('../../host/games/kart-3d/karts/part-shapes.js');
const { buildShadowStandIn, createShadowCaster, createStandInMaterial } = await import('../../host/games/kart-3d/karts/shadow-stand-in.js');

// A kart's own meshes are about 18,000 triangles; its stand-in must stay a small fraction of that.
const TRIANGLE_BUDGET = 400;
const TOLERANCE = 1e-6;

const kartParts = buildKartParts();
const stands = KART_DESIGNS.map((design) => {
  const shapes = buildDesignShapes(design, kartParts);
  return { design, shapes, standIn: buildShadowStandIn(shapes) };
});

// The box round every vertex of the design's shapes and its wheels' boxes (the wheels are separate meshes in the
// kart, not in buildDesignShapes).
function kartBounds(shapes) {
  const bounds = new THREE.Box3();
  MATERIAL_KINDS.forEach((kind) => {
    shapes[kind].computeBoundingBox();
    if (!shapes[kind].boundingBox.isEmpty()) {
      bounds.union(shapes[kind].boundingBox);
    }
  });
  WHEELS.forEach(({ x, z, radius, width }) => {
    bounds.expandByPoint(new THREE.Vector3(x + width / 2, 0, z - radius)).expandByPoint(new THREE.Vector3(x - width / 2, 2 * radius, z + radius));
  });
  return bounds;
}

test('every design has a stand-in of a few hundred triangles, position only', () => {
  stands.forEach(({ design, standIn }) => {
    const triangles = standIn.index.count / 3;
    assert.ok(triangles > 100 && triangles <= TRIANGLE_BUDGET, `${design.id}: ${triangles} triangles`);
    assert.deepEqual(Object.keys(standIn.attributes), ['position'], `${design.id}: only positions`);
  });
});

test('a stand-in fits inside its kart and wheels', () => {
  stands.forEach(({ design, shapes, standIn }) => {
    standIn.computeBoundingBox();
    const bounds = kartBounds(shapes);
    ['x', 'y', 'z'].forEach((axis) => {
      assert.ok(standIn.boundingBox.min[axis] >= bounds.min[axis] - TOLERANCE, `${design.id}: ${axis} min`);
      assert.ok(standIn.boundingBox.max[axis] <= bounds.max[axis] + TOLERANCE, `${design.id}: ${axis} max`);
    });
  });
});

test('a stand-in is as tall as its design, so a tall hat casts its long shadow', () => {
  stands.forEach(({ design, shapes, standIn }) => {
    standIn.computeBoundingBox();
    assert.ok(Math.abs(standIn.boundingBox.max.y - kartBounds(shapes).max.y) < TOLERANCE, design.id);
  });
  const heights = stands.map(({ standIn }) => standIn.boundingBox.max.y);
  assert.ok(Math.max(...heights) - Math.min(...heights) > 0.3, 'designs differ in height');
});

test('a stand-in covers the kart from the road to its top, with no gap between its driver bands', () => {
  stands.forEach(({ design, standIn }) => {
    // The boxes are stacked: every height between the pods and the top is inside some box's range.
    const heights = [];
    const position = standIn.attributes.position;
    for (let index = 0; index < position.count; index += 1) {
      heights.push(position.getY(index));
    }
    const levels = [...new Set(heights.map((height) => Math.round(height * 1000) / 1000))].sort((a, b) => a - b);
    for (let index = 1; index < levels.length; index += 1) {
      assert.ok(levels[index] - levels[index - 1] < 0.45, `${design.id}: gap above y ${levels[index - 1]}`);
    }
  });
});

test('the caster draws nothing until the shadow pass opens it, and closes again after each draw', () => {
  const material = createStandInMaterial();
  const caster = createShadowCaster(stands[0].standIn, material);
  const geometry = caster.geometry;
  assert.equal(caster.castShadow, true);
  assert.ok(geometry.drawRange.count < 0, 'closed: a negative range is skipped before any draw call');
  assert.equal(material.colorWrite, false);
  assert.equal(material.depthWrite, false);
  caster.onBeforeShadow(null, caster, null, null, geometry);
  assert.equal(geometry.drawRange.count, Infinity, 'open while the shadow pass draws it');
  caster.onAfterShadow(null, caster, null, null, geometry);
  assert.ok(geometry.drawRange.count < 0, 'closed for the colour pass again');
});
