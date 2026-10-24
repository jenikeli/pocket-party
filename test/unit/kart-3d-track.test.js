// Unit tests for the 3D race's track maths (host/games/kart-3d/track-builder.js and track.js) and the M6b test
// track: the loop closes, the surface, normal, edges and walls are where the pieces say, and finding a point
// walks from where it was, so a bridge over the road cannot confuse it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import {
  locate,
  surfaceAt,
  wallOnSide,
  pointAt,
  stationIndexAt,
  progressBetween,
  SURFACES,
} from '../../host/games/kart-3d/track.js';
import { addScaled, dot } from '../../host/games/kart-3d/vector.js';

const track = buildTrack(TEST_TRACK);
const DEGREES = Math.PI / 180;

// Distance along the centre line of a known point of the test track (from the plan view in test-track.js),
// found by walking from a nearby station. Distances are measured along the 3D centre line, so they run a little
// longer than the pieces' lengths seen from above.
function distanceAt(x, y, z, roughS) {
  return locate(track, { x, y, z }, stationIndexAt(track, roughS)).s;
}
const HILL_TOP = distanceAt(90, 8, 0, 90);
const RAMP_START = distanceAt(160, 0, 80, 225);
const GAP_START = distanceAt(160, 4, 96, 240);
const HAIRPIN_START = distanceAt(160, 0, 138, 280);
// Halfway round the banked left turn, whose centre is at (90, 98), radius 30.
const BANK_MIDDLE = distanceAt(90 + 30 * Math.SQRT1_2, 0, 98 - 30 * Math.SQRT1_2, 400);
const SHOULDERS_START = distanceAt(90, 0, 68, 430);
// Halfway round the anti-gravity half circle, whose centre is at (0, 34), radius 34.
const WALL_MIDDLE = distanceAt(-34, 0, 34, 580);

// The contact for the point `lateral` right of the centre line at `s` and `height` above the road.
function contactAt(s, lateral = 0, height = 0) {
  const spot = pointAt(track, s, lateral);
  return locate(track, addScaled(spot.position, spot.normal, height), spot.index);
}

function close(actual, expected, tolerance, message) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${message}: ${actual} is not within ${tolerance} of ${expected}`);
}

test('the test track is a closed loop of stations about one unit apart', () => {
  close(track.length, 631.2, 0.5, 'lap length');
  for (const station of track.stations) {
    assert.ok(station.segmentLength > 0.9 && station.segmentLength < 1.1, `segment ${station.segmentLength}`);
  }
  const last = track.stations.at(-1);
  close(last.s + last.segmentLength, track.length, 1e-9, 'the last segment joins the first');
});

test('pieces that do not end where they started are refused', () => {
  assert.throws(() => buildTrack({ halfWidth: 8, startLine: 0, pieces: [{ straight: 50 }, { turn: 180, radius: 10 }] }), /not back at the start/);
});

test('a point on the road is found again at the same distance, offset and height', () => {
  for (const s of [5, HILL_TOP, RAMP_START + 8, HAIRPIN_START + 30, BANK_MIDDLE, WALL_MIDDLE, 620]) {
    const contact = contactAt(s, 3, 0.25);
    // Off the centre line in a tight bend the cross-sections fan out, so s is a little off there.
    close(contact.s, s, 0.1, `s at ${s}`);
    close(contact.lateral, 3, 0.05, `lateral at ${s}`);
    close(contact.height, 0.25, 0.01, `height at ${s}`);
  }
});

test('the hill rises 8, the ramp slopes 14 degrees to its lip, and the gap has no road', () => {
  close(pointAt(track, HILL_TOP).position.y, 8, 0.05, 'hill top');
  // The last segment before the gap still has the ramp's full slope, so karts take off at 14 degrees.
  const lip = contactAt(GAP_START - 0.5);
  close(Math.acos(lip.normal.y) / DEGREES, Math.atan(4 / 16) / DEGREES, 0.1, 'slope at the lip');
  assert.equal(surfaceAt(lip), SURFACES.ROAD);
  assert.equal(surfaceAt(contactAt(GAP_START + 6)), null);
});

test('the banked curve leans 20 degrees into the left turn; the wall section rolls up to vertical', () => {
  const bank = contactAt(BANK_MIDDLE);
  close(Math.acos(bank.normal.y) / DEGREES, 20, 0.5, 'bank angle');
  assert.ok(bank.right.y > 0, 'the left edge is the lower one');
  assert.equal(bank.station.antiGravity, false);
  const wall = contactAt(WALL_MIDDLE);
  close(wall.normal.y, 0, 0.01, 'the road is vertical');
  // The turn's centre is at (0, 34); the road faces it, so karts drive on the inside of the wall.
  const towardCentre = { x: -wall.centre.x, y: 0, z: 34 - wall.centre.z };
  assert.ok(dot(wall.normal, towardCentre) > 0);
  assert.equal(wall.station.antiGravity, true);
});

test('road, off-road shoulders, edges and walls', () => {
  assert.equal(surfaceAt(contactAt(10, 7)), SURFACES.ROAD);
  assert.equal(surfaceAt(contactAt(10, 9)), null, 'no shoulders on the start straight');
  assert.equal(surfaceAt(contactAt(SHOULDERS_START + 40, -11)), SURFACES.OFF_ROAD);
  assert.equal(surfaceAt(contactAt(SHOULDERS_START + 40, 15)), null);
  assert.equal(wallOnSide(contactAt(10, 7)), true);
  assert.equal(wallOnSide(contactAt(10, -7)), true);
  assert.equal(wallOnSide(contactAt(HILL_TOP, 7)), false, 'the hill has no walls');
  assert.equal(wallOnSide(contactAt(HILL_TOP, -7)), false);
});

test('a bridge over the road: the same point is found on whichever road the kart was on', () => {
  // A figure of eight whose second straight crosses the first at (30, 0), 6 higher.
  const figureEight = buildTrack({
    halfWidth: 4,
    startLine: 0,
    pieces: [
      { straight: 60 },
      { turn: -270, radius: 30, height: 6 },
      { straight: 60 },
      { turn: 270, radius: 30, height: 0 },
    ],
  });
  const lower = pointAt(figureEight, 30);
  const bridge = pointAt(figureEight, 60 + 45 * Math.PI + 30);
  close(bridge.position.x, 30, 1e-6, 'the bridge crosses at x 30');
  close(bridge.position.y, 6, 1e-6, 'the bridge is 6 higher');
  // Just above the bridge's surface: from the bridge it is on the bridge; from the road below it is 6 above it.
  const point = addScaled(bridge.position, bridge.normal, 0.2);
  const onBridge = locate(figureEight, point, bridge.index);
  close(onBridge.height, 0.2, 1e-6, 'height above the bridge');
  close(onBridge.s, 60 + 45 * Math.PI + 30, 0.01, 'distance along the bridge');
  const fromBelow = locate(figureEight, point, lower.index);
  close(fromBelow.height, 6.2, 1e-6, 'height above the road below');
  close(fromBelow.s, 30, 0.01, 'distance along the road below');
});

test('lap progress goes the short way round, across the start line too', () => {
  close(progressBetween(track, 10, 12), 2, 1e-9, 'forward');
  close(progressBetween(track, 12, 10), -2, 1e-9, 'backward');
  close(progressBetween(track, track.length - 1, 1), 2, 1e-9, 'over the line');
  close(progressBetween(track, 1, track.length - 1), -2, 1e-9, 'back over the line');
  assert.equal(stationIndexAt(track, 0), 0);
  assert.equal(stationIndexAt(track, track.length - 0.01), track.stations.length - 1);
  const index = stationIndexAt(track, 300);
  assert.ok(track.stations[index].s <= 300 && track.stations[index + 1].s > 300);
});
