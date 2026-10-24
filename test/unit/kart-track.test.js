// Unit tests for host/games/kart-2d/track.js: the stadium's road, lap positions, points along the track and
// the walls.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TRACK, LAP_LENGTH, isOnRoad, lapPosition, pointOnTrack, wallContact } from '../../host/games/kart-2d/track.js';

const { centerX, centerY, halfLength, innerRadius, outerRadius } = TRACK;
const MIDDLE = (innerRadius + outerRadius) / 2;

function assertClose(actual, expected, message) {
  assert.ok(Math.abs(actual - expected) < 1e-6, `${message ?? ''} expected ${expected}, got ${actual}`);
}

test('the road lies between the inner and outer radius, on the straights and round the bends', () => {
  assert.equal(isOnRoad(centerX, centerY + MIDDLE), true);
  assert.equal(isOnRoad(centerX, centerY), false, 'the infield');
  assert.equal(isOnRoad(centerX, centerY + outerRadius + 1), false, 'outside the outer wall');
  assert.equal(isOnRoad(centerX + halfLength + MIDDLE, centerY), true, 'far right of the right bend');
  assert.equal(isOnRoad(centerX + halfLength + innerRadius - 1, centerY), false, 'inside the right bend');
  // Diagonally out from the left end of the centre segment.
  const diagonal = MIDDLE / Math.SQRT2;
  assert.equal(isOnRoad(centerX - halfLength - diagonal, centerY - diagonal), true);
});

test('the lap position is 0 at the start line and grows in the driving direction', () => {
  const bendLength = Math.PI * MIDDLE;
  assertClose(lapPosition(centerX, centerY + MIDDLE), 0, 'start line');
  assertClose(lapPosition(centerX + 100, centerY + MIDDLE), 100, 'along the bottom straight');
  assertClose(lapPosition(centerX + halfLength + MIDDLE, centerY), halfLength + bendLength / 2, 'far right');
  assertClose(lapPosition(centerX, centerY - MIDDLE), LAP_LENGTH / 2, 'middle of the top straight');
  assertClose(lapPosition(centerX - halfLength - MIDDLE, centerY), LAP_LENGTH / 2 + halfLength + bendLength / 2, 'far left');
  assertClose(lapPosition(centerX - 100, centerY + MIDDLE), LAP_LENGTH - 100, 'just before the line');
});

test('a point off the middle line counts as level with the middle-line point beside it', () => {
  assertClose(lapPosition(centerX + 100, centerY + innerRadius + 5), 100);
  const outer = pointOnTrack(1500, 80);
  assertClose(lapPosition(outer.x, outer.y), 1500);
});

test('pointOnTrack and lapPosition agree all the way round, and the heading follows the road', () => {
  for (let distance = 0; distance < LAP_LENGTH; distance += 97) {
    const point = pointOnTrack(distance);
    assertClose(lapPosition(point.x, point.y), distance, `at ${distance}`);
    assert.equal(isOnRoad(point.x, point.y), true);
    // A small step along the heading moves the lap position forward by about that step.
    const ahead = lapPosition(point.x + Math.cos(point.heading), point.y + Math.sin(point.heading));
    assert.ok(Math.abs(ahead - distance - 1) < 0.01, `heading at ${distance}`);
  }
});

test('pointOnTrack wraps negative distances and moves sideways with the offset', () => {
  const behind = pointOnTrack(-50, -70);
  assertClose(behind.x, centerX - 50);
  assertClose(behind.y, centerY + MIDDLE - 70);
  assertClose(behind.heading, 0);
});

test('wallContact is null on the road and pushes a circle back from either wall', () => {
  assert.equal(wallContact(centerX, centerY + MIDDLE, 18), null);

  const outer = wallContact(centerX, centerY + outerRadius - 5, 18);
  assertClose(outer.y, centerY + outerRadius - 18);
  assert.deepEqual([outer.normalX, outer.normalY], [-0, -1], 'the outer wall pushes back towards the infield');

  const inner = wallContact(centerX + halfLength + innerRadius + 2, centerY, 18);
  assertClose(inner.x, centerX + halfLength + innerRadius + 18);
  assert.deepEqual([inner.normalX, inner.normalY], [1, 0], 'the inner wall pushes outwards');
});
