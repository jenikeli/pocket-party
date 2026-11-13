// Unit tests for the kit's maps drawn once per game (M10 Q, host/games/kart-3d/canvas-texture.js): a map is drawn the
// first time it is asked for and shared after, every texture inside what was drawn is remembered as a kit map (so a
// course does not free it), and stopping the game frees them all and forgets them. Also the shade map's running
// box average (kit/pixel-image.js), made faster for the same first drawing, against the plain sum it replaced.

import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-lighthouse.test.js).
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    return next(specifier === 'three' ? `${threeFolder}three.module.js` : specifier, context);
  },
});

const THREE = await import('three');
const { drawnOnce, isKitMap, disposeKitMaps } = await import('../../host/games/kart-3d/canvas-texture.js');
const { boxAverage } = await import('../../host/games/kart-3d/kit/pixel-image.js');

// A texture that counts how often it is disposed.
function countedTexture() {
  const texture = new THREE.Texture();
  texture.disposals = 0;
  texture.addEventListener('dispose', () => (texture.disposals += 1));
  return texture;
}

beforeEach(() => disposeKitMaps());

test('a map is drawn the first time and shared after', () => {
  let draws = 0;
  const draw = () => {
    draws += 1;
    return { map: countedTexture() };
  };
  const first = drawnOnce('stone', draw);
  const second = drawnOnce('stone', draw);
  assert.equal(draws, 1);
  assert.equal(second, first);
});

test('different keys are drawn separately', () => {
  const rail = drawnOnce('rail:4', countedTexture);
  const longerRail = drawnOnce('rail:6', countedTexture);
  assert.notEqual(longerRail, rail);
});

test('every texture inside what was drawn is a kit map, a texture or anything else is not', () => {
  const [single, inArray, inObject, nested, loose] = Array.from({ length: 5 }, countedTexture);
  drawnOnce('single', () => single);
  drawnOnce('array', () => [inArray]);
  drawnOnce('object', () => ({ map: inObject }));
  drawnOnce('nested', () => ({ maps: { normal: nested } }));
  for (const texture of [single, inArray, inObject, nested]) {
    assert.equal(isKitMap(texture), true);
  }
  assert.equal(isKitMap(loose), false);
  assert.equal(isKitMap({ dispose() {} }), false);
});

test('a draw that returns something without textures is still kept once', () => {
  let draws = 0;
  drawnOnce('plain', () => ((draws += 1), { depth: 4 }));
  drawnOnce('plain', () => ((draws += 1), { depth: 4 }));
  assert.equal(draws, 1);
});

test('stopping the game frees every kit map once and the next game draws them again', () => {
  const first = { map: countedTexture(), normalMap: countedTexture() };
  drawnOnce('maps', () => first);
  disposeKitMaps();
  assert.deepEqual([first.map.disposals, first.normalMap.disposals], [1, 1]);
  assert.equal(isKitMap(first.map), false);
  const second = drawnOnce('maps', () => ({ map: countedTexture() }));
  assert.notEqual(second, first);
  disposeKitMaps();
  disposeKitMaps();
  assert.equal(second.map.disposals, 1);
  assert.equal(first.map.disposals, 1);
});

// The sum the running one replaced: every pixel adds up its whole window.
function plainBoxAverage(values, width, height, reach, alongRows) {
  const wrap = (index, size) => ((index % size) + size) % size;
  return values.map((unused, index) => {
    const [x, y] = [index % width, Math.floor(index / width)];
    let sum = 0;
    for (let step = -reach; step <= reach; step += 1) {
      sum += alongRows ? values[y * width + wrap(x + step, width)] : values[wrap(y + step, height) * width + x];
    }
    return sum / (2 * reach + 1);
  });
}

test('the running box average matches the plain sum, along rows and columns, even where the window wraps past the edge twice', () => {
  const [width, height] = [13, 9];
  const values = Float32Array.from({ length: width * height }, (unused, index) => ((index * 7919) % 255) + 0.25);
  for (const reach of [1, 3, 6]) {
    for (const alongRows of [true, false]) {
      const running = boxAverage(values, width, height, reach, alongRows);
      const plain = plainBoxAverage(values, width, height, reach, alongRows);
      running.forEach((value, index) => assert.ok(Math.abs(value - plain[index]) < 1e-3, `reach ${reach}, rows ${alongRows}, pixel ${index}`));
    }
  }
});
