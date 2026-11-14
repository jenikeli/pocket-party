// Unit tests for the airport's planes (M9), which run without a browser (their liveries
// are drawn on canvases, so the shapes are checked): every part is whole, each plane fits its triangle budget,
// stands on its wheels at y = 0 inside the footprint it reports and faces out, the airliner's front door is at
// the jet bridges' sill, and the take-off plane's path is right on the runway, rising, low and gone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-airport-landmarks.test.js).
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

const { airlinerGeometry, AIRLINER_DOOR, AIRLINER_FOOTPRINT, AIRLINER_LIVERIES } = await import('../../host/games/kart-3d/kit/airliner.js');
const { GEAR_PIVOT_Y } = await import('../../host/games/kart-3d/kit/airliner-gear.js');
const { propPlaneGeometry, PROP_PLANE_FOOTPRINT } = await import('../../host/games/kart-3d/kit/prop-plane.js');
const { createTakeOffPath, takeOffPose, takeOffTimeAt } = await import('../../host/games/kart-3d/kit/take-off-plane.js');
const { BRIDGE_DOOR } = await import('../../host/games/kart-3d/kit/terminal-bridges.js');

// The spec's budgets.
const AIRLINER_BUDGET = 60000;
const PROP_PLANE_BUDGET = 15000;

const airliner = airlinerGeometry();
// The gear's mesh stands it at its pivot (kit/airliner.js).
airliner.gear.translate(0, GEAR_PIVOT_Y, 0);
const propPlane = propPlaneGeometry();

function triangles(parts) {
  return Object.values(parts).reduce((sum, geometry) => sum + geometry.index.count / 3, 0);
}

function bounds(parts) {
  const boxes = Object.values(parts).map((geometry) => {
    geometry.computeBoundingBox();
    return geometry.boundingBox;
  });
  const pick = (end, axis, choose) => choose(...boxes.map((box) => box[end][axis]));
  return {
    min: { x: pick('min', 'x', Math.min), y: pick('min', 'y', Math.min), z: pick('min', 'z', Math.min) },
    max: { x: pick('max', 'x', Math.max), y: pick('max', 'y', Math.max), z: pick('max', 'z', Math.max) },
  };
}

function assertWhole(parts) {
  for (const [name, geometry] of Object.entries(parts)) {
    const { position, color, uv, normal } = geometry.attributes;
    assert.ok(color && uv && normal && geometry.index, `${name} lacks colours, normals, texture coordinates or an index`);
    assert.ok(position.array.every(Number.isFinite), `${name} has a NaN position`);
    assert.ok(uv.array.every(Number.isFinite), `${name} has a NaN texture coordinate`);
  }
}

// The normal of the vertex of `geometry` nearest to `point` ([x, y, z]).
function normalNear(geometry, point) {
  const { position, normal } = geometry.attributes;
  let best = 0;
  let bestDistance = Infinity;
  for (let index = 0; index < position.count; index += 1) {
    const distance = Math.hypot(position.getX(index) - point[0], position.getY(index) - point[1], position.getZ(index) - point[2]);
    if (distance < bestDistance) {
      [best, bestDistance] = [index, distance];
    }
  }
  return [normal.getX(best), normal.getY(best), normal.getZ(best)];
}

function assertInside(parts, footprint) {
  const box = bounds(parts);
  assert.ok(Math.abs(box.min.y) < 0.02, `wheels' foot at ${box.min.y}`);
  assert.ok(box.min.x >= footprint.minX - 0.01 && box.max.x <= footprint.maxX + 0.01, `x from ${box.min.x} to ${box.max.x}`);
  assert.ok(Math.max(-box.min.z, box.max.z) <= footprint.halfWidth + 0.01, `z from ${box.min.z} to ${box.max.z}`);
  assert.ok(box.max.y <= footprint.height + 0.01, `top at ${box.max.y}`);
  return box;
}

test('every part of both planes is whole', () => {
  assertWhole(airliner);
  assertWhole(propPlane);
});

test('each plane fits its triangle budget', () => {
  assert.ok(triangles(airliner) < AIRLINER_BUDGET, `airliner: ${triangles(airliner)} triangles`);
  assert.ok(triangles(propPlane) < PROP_PLANE_BUDGET, `prop plane: ${triangles(propPlane)} triangles`);
});

test('the airliner is about 45 long and 42 across, stands on its wheels, inside its footprint', () => {
  const box = assertInside(airliner, AIRLINER_FOOTPRINT);
  assert.ok(box.max.x - box.min.x > 43 && box.max.x - box.min.x < 47, 'length');
  assert.ok(box.max.z - box.min.z > 40 && box.max.z - box.min.z < 44, 'span');
});

test('the prop plane is about 14 long, stands on its wheels, inside its footprint', () => {
  const box = assertInside(propPlane, PROP_PLANE_FOOTPRINT);
  assert.ok(box.max.x - box.min.x > 13 && box.max.x - box.min.x < 16, 'length');
});

test('the skins face out: the fuselage\'s top and the wings\' tops face up, the fin\'s sides face out', () => {
  assert.ok(normalNear(airliner.body, [0, 7.1, 0])[1] > 0.9, 'fuselage top');
  assert.ok(normalNear(airliner.body, [0, 4.1, -3])[2] < -0.9, 'fuselage left side');
  assert.ok(normalNear(airliner.wing, [-2, 3.4, -7.5])[1] > 0.5, 'left wing top');
  assert.ok(normalNear(airliner.wing, [-2, 3.4, 7.5])[1] > 0.5, 'right wing top');
  assert.ok(normalNear(airliner.fin, [-15, 9, 0.4])[2] > 0.5, 'fin right side');
  assert.ok(normalNear(propPlane.body, [0, 3.75, 0])[1] > 0.9, 'prop plane top');
});

test('the airliner\'s front left door is on its left side at the jet bridges\' sill', () => {
  assert.ok(Math.abs(AIRLINER_DOOR.y - BRIDGE_DOOR.y) < 0.05, `sill at ${AIRLINER_DOOR.y}`);
  assert.ok(AIRLINER_DOOR.z < -2.3 && AIRLINER_DOOR.z > -3.2, `door at z ${AIRLINER_DOOR.z}`);
  assert.ok(AIRLINER_DOOR.x > 10 && AIRLINER_DOOR.x < 18, 'near the nose');
});

test('there are three liveries of our own airlines', () => {
  assert.deepEqual(Object.values(AIRLINER_LIVERIES).map((livery) => livery.name), ['PALM AIR', 'CORAL WINGS', 'SKIPJACK AIR']);
});

// A runway heading west (-x) from x = 400, lifting off 200 units on.
const path = createTakeOffPath({ from: { x: 400, y: 0, z: 10 }, to: { x: 200, y: 0, z: 10 }, height: 12 });

test('the take-off plane waits, then rolls down the runway with its gear down', () => {
  assert.ok(path.cycleSeconds >= 45 && path.cycleSeconds < 50, `a take-off every ${path.cycleSeconds} s`);
  const waiting = takeOffPose(path, 1);
  assert.deepEqual([waiting.position.x, waiting.position.y, waiting.position.z], [400, 0, 10]);
  assert.equal(waiting.pitch, 0);
  const rolling = takeOffPose(path, path.waitSeconds + path.rollSeconds / 2);
  assert.ok(rolling.position.x < 400 && rolling.position.x > 200 && rolling.position.y === 0 && rolling.position.z === 10, 'on the runway');
  assert.equal(rolling.gear, 1);
  assert.ok(Math.abs(Math.cos(path.heading) + 1) < 1e-9, 'facing west');
});

test('the take-off plane lifts off at `to`, rises to its low height and folds its gear', () => {
  const liftOff = takeOffPose(path, path.waitSeconds + path.rollSeconds);
  assert.ok(Math.abs(liftOff.position.x - 200) < 1e-6 && Math.abs(liftOff.position.y) < 1e-9, 'leaves the ground at to');
  assert.ok(liftOff.pitch > 0, 'nose up');
  const rising = takeOffPose(path, path.waitSeconds + path.rollSeconds + 1);
  assert.ok(rising.position.y > 0 && rising.position.y < 12, `rising at ${rising.position.y}`);
  const low = takeOffPose(path, path.waitSeconds + path.rollSeconds + 4);
  assert.ok(Math.abs(low.position.y - 12) < 0.01, `low over the runway at ${low.position.y}`);
  assert.ok(low.position.x < 0, 'past the runway');
  assert.ok(low.gear < 1 && takeOffPose(path, path.waitSeconds + path.rollSeconds + 6).gear === 0, 'gear folds');
});

test('the take-off plane climbs away until it is far over the bay, then comes back to wait', () => {
  const climbing = takeOffPose(path, path.waitSeconds + path.rollSeconds + 12);
  assert.ok(climbing.position.y > 50, `climbing at ${climbing.position.y}`);
  const last = takeOffPose(path, path.cycleSeconds - 0.01);
  assert.ok(200 - last.position.x > 990 && last.position.y > 140, `last seen at x ${last.position.x}, ${last.position.y} high`);
  assert.deepEqual(takeOffPose(path, path.cycleSeconds + 1).position, takeOffPose(path, 1).position);
});

test('takeOffTimeAt finds when the plane is a distance past its lift-off', () => {
  assert.ok(Math.abs(takeOffPose(path, takeOffTimeAt(path, 300)).position.x - (200 - 300)) < 1e-6);
});
