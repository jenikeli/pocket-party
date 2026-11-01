// Unit tests for the promenade railing's and the padded sponsor wall's shapes (M7d4c3), which run without a
// browser (their textures need a canvas, so only the shapes are checked): the railing's posts and pillars stand
// on y = 0, stay clear of the road and inside the ledge, fit their triangle budget, and the lantern stands on the
// pillar; the fence post has its foot plate and stays on the pad.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The shapes import Three.js by its bare name, which the browser's import map points at the vendored copy; Node
// has no import map, so a resolve hook does the same here.
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

const shapes = await import('../../host/games/kart-3d/kit/promenade-shapes.js');
const { RAIL_OUT } = await import('../../host/games/kart-3d/kit/promenade-rail.js');
const { buildFencePost } = await import('../../host/games/kart-3d/kit/sponsor-wall-post.js');

// The ledge under every barrier is this wide (kit/barriers.js's LEDGE_WIDTH).
const LEDGE_WIDTH = 0.95;
const MIN_ROAD_GAP = 0.05;

function boundsOf(geometry) {
  geometry.computeBoundingBox();
  return geometry.boundingBox;
}

function triangles(geometry) {
  return geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
}

test('every promenade shape has finite positions and stands on or above y = 0', () => {
  for (const [name, build] of Object.entries({
    post: shapes.buildPost,
    shaft: shapes.buildPillarShaft,
    trim: shapes.buildPillarTrim,
    discs: shapes.buildPlaqueDiscs,
    rims: shapes.buildPlaqueRims,
    lanternIron: shapes.buildLanternIron,
    lanternGlass: shapes.buildLanternGlass,
  })) {
    const geometry = build();
    assert.ok(geometry.attributes.position.array.every(Number.isFinite), `${name} has no NaN`);
    assert.ok(boundsOf(geometry).min.y >= -1e-6, `${name} does not go below the road`);
  }
});

test('the post is fat, with a ball cap twice the shaft width, and light enough to repeat along the course', () => {
  const geometry = shapes.buildPost();
  const post = boundsOf(geometry);
  assert.ok(post.max.x >= 0.15, 'the ball is at least 0.15 in radius');
  assert.ok(post.max.y > 1.1 && post.max.y < 1.5, 'the post is about as tall as the top rail plus its ball');
  assert.ok(triangles(geometry) < 1200, `a post has few triangles (${triangles(geometry)})`);
});

test('the pillar is 0.7 square, over a plinth, with its cap clear of the road and inside the ledge', () => {
  const shaft = boundsOf(shapes.buildPillarShaft());
  assert.ok(Math.abs(shaft.max.x - shaft.min.x - 0.7) < 1e-3, 'the shaft is 0.7 square');
  const trim = boundsOf(shapes.buildPillarTrim());
  assert.ok(Math.abs(trim.min.y) < 1e-6, 'the plinth stands on the ground');
  assert.ok(trim.max.x <= shapes.PILLAR_REACH + 1e-6, 'the pillar reaches no further than PILLAR_REACH');
  assert.ok(RAIL_OUT - trim.max.x >= MIN_ROAD_GAP - 1e-6, 'the pillar is at least 0.05 from the road');
  assert.ok(RAIL_OUT + trim.max.x <= LEDGE_WIDTH, 'the pillar stands on the ledge');
});

test('the plaque has a disc on each face across the road, and its rim stands out from the disc', () => {
  const discs = boundsOf(shapes.buildPlaqueDiscs());
  const rims = boundsOf(shapes.buildPlaqueRims());
  assert.ok(discs.max.x > 0.35 && discs.min.x < -0.35, 'a disc on each face');
  assert.ok(rims.max.x > discs.max.x, 'the rim stands out from the disc');
});

test('the lantern stands on the pillar top, its glass inside its iron', () => {
  const iron = boundsOf(shapes.buildLanternIron());
  const glass = boundsOf(shapes.buildLanternGlass());
  assert.ok(iron.min.y >= shapes.PILLAR_TOP - 1e-6, 'the lantern starts at the pillar top');
  assert.ok(glass.min.y > shapes.PILLAR_TOP && glass.max.y < iron.max.y, 'the glass is under the roof');
  assert.ok(glass.max.x < iron.max.x, 'the glass is inside the frame and roof');
});

test('the fence post has a foot plate on the pad and rises above the top rail', () => {
  const padTop = 1.42;
  const fenceTop = 3.4;
  const post = buildFencePost(padTop, fenceTop);
  const bounds = boundsOf(post);
  assert.ok(bounds.min.y < padTop - 0.05 && bounds.min.y > padTop - 0.15, 'the plate reaches a little below the ridge');
  assert.ok(bounds.max.y > fenceTop, 'the cap is above the top rail');
  assert.ok(bounds.max.x - bounds.min.x < 0.25, 'the post stays slim: nothing wider than the plate');
  assert.ok(post.attributes.position.array.every(Number.isFinite), 'no NaN');
});
