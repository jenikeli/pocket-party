// Unit tests for the apron's ground vehicles (M9 task J): each builds one painted shape within 4,000 triangles,
// stands on the ground, keeps inside its PROP_REACH about its middle, and is registered as a prop.

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

const THREE = await import('three');
const { PROP_BUILDERS } = await import('../../host/games/kart-3d/kit/props.js');
const { followMeCarShape } = await import('../../host/games/kart-3d/kit/airport-carts.js');
const { mergeShapes } = await import('../../host/games/kart-3d/shape-utils.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

const VEHICLES = ['baggage-train', 'uld-dolly', 'stair-truck', 'belt-loader', 'fuel-truck', 'follow-me-car'];
const MAX_TRIANGLES = 4000;
const kit = { keep: (thing) => thing, materials: { painted: new THREE.MeshStandardMaterial({ vertexColors: true }) } };

// The follow-me car's roof board is a texture (a canvas, which Node lacks), so its body shape is tested alone.
function shapeOf(name) {
  if (name === 'follow-me-car') {
    return mergeShapes(followMeCarShape());
  }
  const parts = PROP_BUILDERS[name](kit);
  assert.equal(parts.length, 1);
  assert.equal(parts[0].material, kit.materials.painted);
  return parts[0].geometry;
}

for (const name of VEHICLES) {
  test(`the ${name} is one painted shape within budget, on the ground and inside its reach`, () => {
    assert.ok(PROP_BUILDERS[name], 'registered in PROP_BUILDERS');
    const geometry = shapeOf(name);
    assert.ok(geometry.attributes.color && geometry.attributes.uv && geometry.attributes.normal);
    for (const value of geometry.attributes.position.array) {
      assert.ok(Number.isFinite(value));
    }
    const triangles = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
    assert.ok(triangles <= MAX_TRIANGLES, `${triangles} triangles`);
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    assert.ok(Math.abs(min.y) < 0.05, `foot at y ${min.y}`);
    const reach = Math.max(-min.x, max.x, -min.z, max.z);
    assert.ok(reach <= PROP_REACH[name], `extends ${reach.toFixed(2)}, reach ${PROP_REACH[name]}`);
    assert.ok(reach >= PROP_REACH[name] - 0.6, `reach ${PROP_REACH[name]} is far beyond the ${reach.toFixed(2)} it needs`);
  });
}
