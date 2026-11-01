// Unit tests for the kit's Koopa shell (M7d4d), which run without a browser (its maps need a canvas, so the
// shapes and the scute surface's pixels are checked): the parts merge, nothing has a NaN position, the shell keeps
// its footprint (radius 1 at the rim, reach under 1.1 and height under 0.8), and the picture is the size the
// budget allows.

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

const { mergeShapes } = await import('../../host/games/kart-3d/shape-utils.js');
const { buildDome, buildLobes, buildUnderside } = await import('../../host/games/kart-3d/kit/koopa-shell.js');
const { drawScuteSurface, scuteAt, SCUTE_PIXELS } = await import('../../host/games/kart-3d/kit/koopa-shell-scutes.js');

const TRIANGLE_BUDGET = 12000;

function shell() {
  const lobes = buildLobes();
  return { lobes: lobes.length, merged: mergeShapes([buildDome(), ...lobes, buildUnderside()]) };
}

test('the shell merges into one geometry with no NaN positions, in the budget', () => {
  const { merged } = shell();
  assert.ok(merged.attributes.uv && merged.attributes.color);
  assert.ok(Array.from(merged.attributes.position.array).every(Number.isFinite));
  assert.ok(merged.index.count / 3 < TRIANGLE_BUDGET, `${merged.index.count / 3} triangles`);
});

test('the shell keeps its footprint and has a rim of twelve lobes', () => {
  const { lobes, merged } = shell();
  assert.equal(lobes, 12);
  merged.computeBoundingBox();
  const { min, max } = merged.boundingBox;
  assert.ok(Math.max(max.x, max.z, -min.x, -min.z) < 1.1, 'reach');
  assert.ok(max.y < 0.8 && max.y > 0.6, `height ${max.y}`);
});

test('a scute is a raised face in the middle and a groove where it meets the next', () => {
  assert.equal(scuteAt(0, 0).face, 1);
  assert.equal(scuteAt(0, 0).centre, 1);
  // Halfway between the middle scute and the one at angle 0 of the ring of six.
  assert.equal(scuteAt(0.25, 0).face, 0);
});

test('the scute picture stays within the 1024 square budget and its corners stay white', () => {
  const surface = drawScuteSurface();
  assert.equal(surface.width, SCUTE_PIXELS);
  assert.ok(surface.width * surface.height <= 1024 * 1024);
  assert.deepEqual(surface.colors.valueAt(2, 2), [255, 255, 255]);
});
