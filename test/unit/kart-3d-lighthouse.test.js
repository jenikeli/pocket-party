// Unit tests for the kit's lighthouse (M7d4d), which run without a browser (its textures need a canvas, so the
// shapes and the stone surface's pixels are checked): the parts merge, nothing has a NaN position, the tower
// keeps its height and footprint, the weathervane stays under lighthouseTop, and the stone tile is the size the
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
const { lighthouseTop } = await import('../../host/games/kart-3d/kit/lighthouse.js');
const { buildShaft, buildTowerPainted, buildTowerPanes, buildTowerGloss, PLINTH_HEIGHT } = await import('../../host/games/kart-3d/kit/lighthouse-tower.js');
const { buildTopPainted, buildTopGloss, buildDome, buildVane, buildGlass } = await import('../../host/games/kart-3d/kit/lighthouse-top.js');
const { drawStoneSurface, STONE_SIZE } = await import('../../host/games/kart-3d/kit/stone-texture.js');
const { LIGHTHOUSE } = await import('../../host/games/kart-3d/seaside-landmarks.js');

const HEIGHT = LIGHTHOUSE.tower;
const TRIANGLE_BUDGET = 40000;

function everything() {
  return {
    painted: mergeShapes([...buildTowerPainted(HEIGHT), ...buildTowerPanes(HEIGHT), ...buildTopPainted(HEIGHT), ...buildVane(HEIGHT)]),
    gloss: mergeShapes([...buildTowerGloss(), ...buildTopGloss(HEIGHT)]),
    dome: mergeShapes(buildDome(HEIGHT)),
    glass: mergeShapes(buildGlass(HEIGHT)),
    shaft: buildShaft(HEIGHT),
  };
}

test('every part has finite positions, and the coloured parts all carry colours', () => {
  for (const [name, geometry] of Object.entries(everything())) {
    assert.ok(geometry.attributes.position.array.every(Number.isFinite), `${name} positions`);
    assert.equal(Boolean(geometry.attributes.color), name !== 'glass', `${name} colours`);
  }
});

test('the lighthouse stands on y = 0 and its weathervane stays under lighthouseTop', () => {
  const boxes = Object.values(everything()).map((geometry) => geometry.computeBoundingBox() ?? geometry.boundingBox);
  assert.ok(Math.abs(Math.min(...boxes.map((box) => box.min.y))) < 0.01);
  const top = Math.max(...boxes.map((box) => box.max.y));
  assert.ok(top <= lighthouseTop(HEIGHT) && top > lighthouseTop(HEIGHT) - 0.3, `top ${top}`);
  assert.ok(PLINTH_HEIGHT < 2);
});

test('nothing reaches further from the tower than its plinth, inside the island', () => {
  for (const [name, geometry] of Object.entries(everything())) {
    const { position } = geometry.attributes;
    let reach = 0;
    for (let index = 0; index < position.count; index += 1) {
      reach = Math.max(reach, Math.hypot(position.getX(index), position.getZ(index)));
    }
    assert.ok(reach <= 4.5, `${name} reaches ${reach}`);
  }
});

test('the whole lighthouse fits its triangle budget', () => {
  const total = Object.values(everything()).reduce((sum, geometry) => sum + geometry.index.count / 3, 0);
  assert.ok(total < TRIANGLE_BUDGET, `${total} triangles`);
});

test('the stone surface is one 512 tile, with mortar lower than the stones', () => {
  const surface = drawStoneSurface();
  assert.equal(STONE_SIZE, 512);
  assert.equal(surface.width, STONE_SIZE);
  assert.equal(surface.height, STONE_SIZE);
  const heights = [];
  for (let index = 0; index < STONE_SIZE * STONE_SIZE; index += 97) {
    heights.push(surface.heightAt(index % STONE_SIZE, Math.floor(index / STONE_SIZE)));
  }
  assert.ok(heights.every(Number.isFinite));
  assert.ok(Math.max(...heights) - Math.min(...heights) > 100, 'relief between mortar and stone');
});
