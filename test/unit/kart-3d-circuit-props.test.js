// Unit tests for the circuit props (M7d4c5): the cone, tyre stack, warp pipe and giant mushroom each return one
// part with the kit's material, stay within their height and footprint, have no NaN in their positions, and stay
// light (the cone and tyre stack are placed by the dozen). Run without a browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// Node has no import map, so a resolve hook points Three.js at the vendored copy (as in kart-3d-kit-parts.test.js).
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

const { buildCone } = await import('../../host/games/kart-3d/kit/cone.js');
const { buildTyreStack } = await import('../../host/games/kart-3d/kit/tyre-stack.js');
const { buildWarpPipe } = await import('../../host/games/kart-3d/kit/warp-pipe.js');
const { buildGiantMushroom } = await import('../../host/games/kart-3d/kit/giant-mushroom.js');
const { PROP_REACH } = await import('../../host/games/kart-3d/kit/layout-rules.js');

const kit = { keep: (thing) => thing, materials: { plastic: { name: 'plastic' }, painted: { name: 'painted' } } };

// `reach` is how far from its middle the shape may reach: PROP_REACH, except the cone, whose square foot (as
// before) reaches 0.37 at its corners.
const PROPS = [
  { piece: 'cone', build: buildCone, material: 'plastic', height: [0.7, 0.8], reach: 0.37, maxTriangles: 400 },
  { piece: 'tyre-stack', build: buildTyreStack, material: 'painted', height: [0.95, 1.05], reach: PROP_REACH['tyre-stack'], maxTriangles: 2200 },
  { piece: 'warp-pipe', build: buildWarpPipe, material: 'plastic', height: [2.7, 2.8], reach: PROP_REACH['warp-pipe'], maxTriangles: 1500 },
  { piece: 'giant-mushroom', build: buildGiantMushroom, material: 'plastic', height: [4.6, 5.2], reach: PROP_REACH['giant-mushroom'], maxTriangles: 4000 },
];

for (const { piece, build, material, height, reach, maxTriangles } of PROPS) {
  test(`${piece} is one part in the kit's ${material} material`, () => {
    const parts = build(kit);
    assert.equal(parts.length, 1);
    assert.equal(parts[0].material, kit.materials[material]);
  });

  test(`${piece} has no NaN, stands on the ground, and fits its height and reach`, () => {
    const { geometry } = build(kit)[0];
    const { position } = geometry.attributes;
    let lowest = Infinity;
    let highest = -Infinity;
    let widest = 0;
    for (let index = 0; index < position.count; index += 1) {
      const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
      assert.ok(Number.isFinite(x + y + z), `vertex ${index} is not a number`);
      lowest = Math.min(lowest, y);
      highest = Math.max(highest, y);
      widest = Math.max(widest, Math.hypot(x, z));
    }
    assert.ok(lowest > -0.01 && lowest < 0.05, `lowest point ${lowest}`);
    assert.ok(highest >= height[0] && highest <= height[1], `highest point ${highest}`);
    assert.ok(widest <= reach + 1e-6, `reaches ${widest}`);
    assert.ok(geometry.attributes.color && geometry.attributes.uv && geometry.attributes.normal);
  });

  test(`${piece} stays under ${maxTriangles} triangles`, () => {
    const { geometry } = build(kit)[0];
    assert.ok(geometry.index.count / 3 <= maxTriangles, `${geometry.index.count / 3} triangles`);
  });
}
