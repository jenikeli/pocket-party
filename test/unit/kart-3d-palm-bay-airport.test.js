// Unit tests for the 3D race's Palm Bay Airport course (host/games/kart-3d/palm-bay-airport.js, M9): its pieces
// close into a lap of about 1551 units, its glide gap glides, and where the figure-8 crosses itself the tunnel
// runs far enough under the runway for a roof.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import { jumps } from '../../host/games/kart-3d/racing-line-pins.js';

const track = buildTrack(PALM_BAY_AIRPORT);

test('the airport closes into a lap of about 1551 units', () => {
  assert.ok(Math.abs(track.length - 1551.4) < 1, `lap ${track.length}`);
  assert.equal(track.scenery, 'airport');
  assert.equal(track.spinPosts.length, 4);
  assert.equal(track.itemBoxRows.length, 2);
});

// Distances run along the 3D centre line, so past the cutting's and the ring's slopes they are a few units
// longer than the pieces' lengths seen from above (the course file's s values).
test('it has two jumps: the plain one over the conveyor, then the glide over the bay', () => {
  const found = jumps(track);
  const near = (actual, planned) => Math.abs(actual - planned) < 10;
  assert.equal(found.length, 2);
  assert.equal(found[0].glide, false);
  assert.ok(near(found[0].lipS, 612), `jump lip ${found[0].lipS}`);
  assert.equal(found[1].glide, true);
  assert.ok(near(found[1].lipS, 1109), `glide lip ${found[1].lipS}`);
  assert.ok(near(found[1].landingS, 1199), `glide landing ${found[1].landingS}`);
});

test('where the lap crosses itself, the tunnel runs at least 7 below the runway', () => {
  let crossing = null;
  for (const low of track.stations) {
    if (low.s < 452 || low.s > 596) continue;
    for (const high of track.stations) {
      if (high.s < 913 || high.s > 1095) continue;
      const apart = Math.hypot(low.point.x - high.point.x, low.point.z - high.point.z);
      if (!crossing || apart < crossing.apart) crossing = { apart, low, high };
    }
  }
  assert.ok(crossing.apart < 1, `the two roads cross (closest ${crossing.apart.toFixed(2)} apart)`);
  const clearance = crossing.high.point.y - crossing.low.point.y;
  assert.ok(clearance >= 7, `clearance ${clearance.toFixed(2)} at s ${crossing.low.s.toFixed(0)}`);
});
