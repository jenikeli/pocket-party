// Unit tests for the kit's street lamps (M7d4c4), without a browser: each builds an iron and a glass part on the
// kit's materials, stands on y = 0, keeps its foot inside the reach layout-rules.js gives lamps, has no NaN, and
// stays light enough to stand in rows of dozens.

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

const { buildLanternLamp, buildTripleLamp } = await import('../../host/games/kart-3d/kit/street-lamps.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

const TRIANGLE_BUDGET = 2500;
const kit = { keep: (thing) => thing, materials: { iron: { name: 'iron' }, glass: { name: 'glass' } } };
const LAMPS = { 'lantern-lamp': buildLanternLamp, 'triple-lamp': buildTripleLamp };

test('each lamp is an iron part and a glass part with no NaN', () => {
  for (const [name, build] of Object.entries(LAMPS)) {
    const parts = build(kit);
    assert.deepEqual(parts.slice(0, 2).map((part) => part.material), [kit.materials.iron, kit.materials.glass], name);
    for (const { geometry } of parts) {
      assert.ok(!geometry.attributes.position.array.some(Number.isNaN), `${name} has no NaN`);
    }
  }
});

test('each lamp stands on y = 0 and its foot stays inside the reach', () => {
  for (const [name, build] of Object.entries(LAMPS)) {
    let lowest = Infinity;
    let widestFoot = 0;
    for (const { geometry } of build(kit)) {
      const { position } = geometry.attributes;
      for (let index = 0; index < position.count; index += 1) {
        lowest = Math.min(lowest, position.getY(index));
        if (position.getY(index) < 1) {
          widestFoot = Math.max(widestFoot, Math.hypot(position.getX(index), position.getZ(index)));
        }
      }
    }
    assert.ok(Math.abs(lowest) < 1e-6, `${name} stands on y = 0`);
    assert.ok(widestFoot <= PROP_REACH[name] + 1e-6, `${name} foot ${widestFoot} within ${PROP_REACH[name]}`);
  }
});

test('each lamp fits its triangle budget', () => {
  for (const [name, build] of Object.entries(LAMPS)) {
    const triangles = build(kit).reduce((sum, { geometry }) => sum + geometry.index.count / 3, 0);
    assert.ok(triangles <= TRIANGLE_BUDGET, `${name} has ${triangles} triangles`);
  }
});
