// Unit tests for the kit's cross-section tools (M7d4, kit/extrude.js) that run without a browser: corners rounded
// off, a profile pushed out of its shape, a tube's ring, a station between two stations, and smooth shading
// round a tube where it is extruded along the road.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roundProfile, offsetProfile, tubeProfile, stationBetween, extrudeSegment } from '../../host/games/kart-3d/kit/extrude.js';

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} is not ${expected}`);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// A straight, level piece of road along +z from s 10, 8 wide, with no grass: right is -x (facing +z with y up).
const station = { point: { x: 0, y: 0, z: 0 }, right: { x: -1, y: 0, z: 0 }, normal: { x: 0, y: 1, z: 0 }, tangent: { x: 0, y: 0, z: 1 }, halfWidth: 4, shoulderLeft: 0, shoulderRight: 0, s: 10, segmentLength: 2 };
const next = { ...station, point: { x: 0, y: 0, z: 2 }, halfWidth: 5, s: 12 };

test('rounding a profile keeps its open ends, cuts each corner into a curve and never eats more than 45% of a face', () => {
  const wall = [[0, 0], [0, 1], [0.5, 1], [0.5, 0]];
  const rounded = roundProfile(wall, 0.1, 3);
  assert.deepEqual(rounded[0], [0, 0]);
  assert.deepEqual(rounded.at(-1), [0.5, 0]);
  assert.equal(rounded.length, 2 + 2 * 4, 'each of the two corners becomes four points');
  assert.ok(!rounded.some((point) => distance(point, [0, 1]) < 1e-9), 'the sharp corner is gone');
  // A right angle with radius 0.1 starts 0.1 along each face.
  assert.deepEqual(rounded[1].map((value) => Math.round(value * 1e6) / 1e6), [0, 0.9]);
  const tight = roundProfile([[0, 0], [0, 0.1], [1, 0.1]], 1);
  assert.ok(distance(tight[1], [0, 0.1]) <= 0.045 + 1e-9, 'at most 45% of the short face');
});

test('a closed profile stays closed when rounded, its first corner rounded too', () => {
  const square = [[0, 0], [0, 1], [1, 1], [1, 0], [0, 0]];
  const rounded = roundProfile(square, 0.2, 2);
  assert.deepEqual(rounded[0], rounded.at(-1));
  assert.equal(rounded.length, 4 * 3 + 1);
  assert.ok(!rounded.some((point) => distance(point, [0, 0]) < 1e-9), 'the first corner is rounded off');
});

test('a profile is pushed out of its shape along its faces\' normals', () => {
  const wall = [[0, 0], [0, 1], [1, 1], [1, 0]];
  const pushed = offsetProfile(wall, 0.1);
  // Up the inner face, its normal toward the road (less out); over the top, up; down the back, out.
  assert.deepEqual(pushed[0].map((value) => Math.round(value * 1e6) / 1e6), [-0.1, 0]);
  close(pushed[1][0], -0.1 / Math.SQRT2, 'the corner goes out along both faces');
  close(pushed[1][1], 1 + 0.1 / Math.SQRT2, 'the corner goes up along both faces');
  assert.deepEqual(pushed[3].map((value) => Math.round(value * 1e6) / 1e6), [1.1, 0]);
});

test('a tube\'s ring is closed, oval when asked, and goes round the right way', () => {
  const ring = tubeProfile(1, 2, 0.1, 8, 0.2);
  assert.equal(ring.length, 9);
  assert.deepEqual(ring[0], ring.at(-1));
  for (const [out, lift] of ring) {
    close(((out - 1) / 0.1) ** 2 + ((lift - 2) / 0.2) ** 2, 1, 'on the oval');
  }
  // Listed with the shape on its right, as every profile is, so the faces point out: the first face's normal
  // points away from the middle.
  const pushed = offsetProfile(ring, 0.05);
  assert.ok(distance(pushed[2], [1, 2]) > distance(ring[2], [1, 2]), 'pushed out, not in');
});

test('a station between two stations sits between them, its s counted on from the first', () => {
  assert.equal(stationBetween({ station, next }, 0), station);
  const middle = stationBetween({ station, next }, 0.25);
  close(middle.point.z, 0.5, 'a quarter of the way');
  close(middle.halfWidth, 4.25, 'its width blended');
  close(middle.s, 10.5, 'its s');
  close(stationBetween({ station, next }, 1).s, 12, 'the end');
});

test('a smooth tube shades round: each corner\'s normal points straight out from its middle', () => {
  const corners = [];
  const builder = { quad: (quad) => corners.push(...quad) };
  extrudeSegment(builder, { station, next }, 1, tubeProfile(0.3, 0.6, 0.1, 8), 0xffffff, { smooth: true });
  for (const { point, normal } of corners.filter((corner) => corner.point.z === 0)) {
    // On the right side out is along right (-x); the tube's middle is 4.3 out and 0.6 up.
    const [out, lift] = [-point.x - 4.3, point.y - 0.6];
    close(normal.x * -out + normal.y * lift, Math.hypot(out, lift), 'the normal points out from the middle');
  }
  const flat = [];
  extrudeSegment({ quad: (quad) => flat.push(...quad) }, { station, next }, 1, [[0, 0], [0, 1], [1, 1]], 0xffffff, { smooth: true });
  const top = flat.filter((corner) => corner.point.y === 1 && corner.point.x === -4);
  assert.ok(top.some((corner) => corner.normal.y === 1) && top.some((corner) => corner.normal.x === 1), 'a right angle stays sharp');
});
