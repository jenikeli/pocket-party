// Unit tests for the beach props (M7d4c4): each builder returns one part with the kit's material, no NaN
// positions, a footprint within the layout's reach and a triangle count that stays modest.

import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The browser maps 'three' with an import map; Node has none, so a resolve hook does the same.
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

const { buildParasol, buildLounger, buildSurfboards, buildLifebuoyPost, buildBarrels } = await import('../../host/games/kart-3d/kit/beach-props.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

const kit = {
  keep: (thing) => thing,
  materials: { plastic: { name: 'plastic' }, painted: { name: 'painted' } },
};
const PIECES = {
  parasol: [buildParasol, 'painted', 6000],
  lounger: [buildLounger, 'painted', 4000],
  surfboards: [buildSurfboards, 'plastic', 3000],
  'lifebuoy-post': [buildLifebuoyPost, 'painted', 3000],
  barrels: [buildBarrels, 'painted', 6000],
};

test('each beach prop is one part with its material, valid positions and colours', () => {
  for (const [name, [build, material]] of Object.entries(PIECES)) {
    const parts = build(kit);
    assert.equal(parts.length, 1, name);
    assert.equal(parts[0].material, kit.materials[material], name);
    const { position, color } = parts[0].geometry.attributes;
    assert.ok(position.count > 0 && color.count === position.count, `${name} is coloured per vertex`);
    assert.ok(!position.array.some(Number.isNaN), `${name} has no NaN`);
  }
});

test('each beach prop stands on the ground, keeps within its reach and its triangle budget', () => {
  for (const [name, [build, , budget]] of Object.entries(PIECES)) {
    const geometry = build(kit)[0].geometry;
    geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;
    assert.ok(min.y > -0.05 && min.y < 0.1, `${name} stands on y = 0 (${min.y})`);
    const reach = Math.max(Math.abs(min.x), max.x);
    assert.ok(reach <= PROP_REACH[name] + 0.35, `${name} reach ${reach}`);
    const triangles = (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
    assert.ok(triangles < budget, `${name} has ${triangles} triangles`);
  }
});
