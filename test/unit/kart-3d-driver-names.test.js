// Checks that the plain slot -> driver name list in kart-roster.js (which the setup view uses, and which loads in
// Node) matches the kart designs, which need Three.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The designs import Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-kart-designs.test.js).
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

const { KART_DESIGNS } = await import('../../host/games/kart-3d/karts/kart-designs.js');
const { DRIVER_NAMES } = await import('../../host/games/kart-3d/karts/kart-roster.js');
const { PLAYER_COLORS } = await import('../../host/roster.js');

test('DRIVER_NAMES lists the design of each colour slot', () => {
  DRIVER_NAMES.forEach((driverName, slot) => {
    const design = KART_DESIGNS.find((candidate) => candidate.slot === slot);
    assert.equal(design?.name, driverName, `slot ${slot}`);
  });
});

test('every driver has a colour slot a player can pick', () => {
  assert.equal(DRIVER_NAMES.length, KART_DESIGNS.length);
  assert.equal(PLAYER_COLORS.length, KART_DESIGNS.length);
});
