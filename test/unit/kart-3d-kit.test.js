// Unit tests for the 3D race's kit of building blocks (M7d2) that run without a browser: the repeating noise its
// textures are made from (noise.js), where the kit road's markings and panels go (kit/road-marks.js), the grid
// places it paints (race.js's gridSpot), the start lights (kit/start-light-states.js), which barrier stands on
// each wall (kit/layout-rules.js), and the Test track's layout (test-track-layout.js): every piece shows, and
// every deck, prop and string of bunting stands where it can.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTileNoise, createLayeredNoise } from '../../host/games/kart-3d/noise.js';
import { createRandom } from '../../host/games/kart-3d/random.js';
import {
  curbSpots,
  middleDashes,
  gridBrackets,
  startLineChecks,
  rampSpans,
  dashPanelRects,
  antiGravityPanelRects,
  EDGE_LINE_INSET,
} from '../../host/games/kart-3d/kit/road-marks.js';
import { startLightStates, LAMP_STATES } from '../../host/games/kart-3d/kit/start-light-states.js';
import { BARRIER_STYLES, PROP_REACH, barrierStyleAt, sideSign } from '../../host/games/kart-3d/kit/layout-rules.js';
import { BARRIER_RUNS, PLATFORMS, GRANDSTAND, BUNTING, PROPS } from '../../host/games/kart-3d/test-track-layout.js';
import { createRace, gridSpot, FIELD_SIZE, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { stationIndexAt, wrapDistance } from '../../host/games/kart-3d/track.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { DASH_PANEL_LENGTH, DASH_PANEL_WIDTH } from '../../host/games/kart-3d/kart-boosts.js';
import { dot, subtract } from '../../host/games/kart-3d/vector.js';

const testTrack = buildTrack(TEST_TRACK);
const { OFF, RED, GREEN } = LAMP_STATES;
// How far the thickest barrier (the padded wall and its fence) reaches out from the edge of the ground.
const BARRIER_REACH = 0.7;
// The grandstand's depth, from its front to its back wall.
const GRANDSTAND_DEPTH = 7.2;

const stationAt = (track, s) => track.stations[stationIndexAt(track, wrapDistance(track, s))];
const near = (track, spots, s, range = 15) => spots.filter((spot) => Math.abs(track.stations[spot.index].s - s) < range);

// The stations a stretch from fromS to toS covers.
function stationsBetween(track, fromS, toS) {
  return track.stations.filter((station) => station.s >= fromS && station.s < toS);
}

test('tile noise stays in 0..1, repeats every 1 in both directions and changes smoothly', () => {
  for (const noise of [createTileNoise(createRandom(1), 5, 3), createLayeredNoise(createRandom(2), 3, 3)]) {
    for (let index = 0; index < 200; index += 1) {
      const x = index * 0.137;
      const y = index * 0.071;
      const value = noise(x, y);
      assert.ok(value >= 0 && value <= 1);
      assert.ok(Math.abs(noise(x + 1, y) - value) < 1e-9, 'repeats across');
      assert.ok(Math.abs(noise(x, y - 1) - value) < 1e-9, 'repeats down');
      assert.ok(Math.abs(noise(x + 0.001, y) - value) < 0.05, 'no jumps');
    }
  }
});

test('curbs line the inside of each corner, and none on straights, in gaps or in anti-gravity sections', () => {
  const spots = curbSpots(testTrack);
  assert.ok(near(testTrack, spots, 150).every((spot) => spot.side === 1) && near(testTrack, spots, 150).length > 20, 'the first turn turns right');
  assert.ok(near(testTrack, spots, 312).every((spot) => spot.side === 1) && near(testTrack, spots, 312).length > 20, 'the hairpin turns right');
  assert.ok(near(testTrack, spots, 407).every((spot) => spot.side === -1) && near(testTrack, spots, 407).length > 20, 'the banked curve turns left');
  for (const s of [25, 205, 470]) {
    assert.equal(near(testTrack, spots, s, 10).length, 0, `no curb on the straight at ${s}`);
  }
  for (const spot of spots) {
    const station = testTrack.stations[spot.index];
    assert.ok(!station.gap && !station.antiGravity);
  }
});

test('the middle line runs only on wide straights, clear of the grid, the ramp and the dash panels', () => {
  const dashes = middleDashes(testTrack);
  const covered = [...rampSpans(testTrack), ...dashPanelRects(testTrack), { fromS: gridSpot(testTrack, FIELD_SIZE - 1).s, toS: testTrack.startLine }];
  assert.ok(dashes.some((dash) => dash.fromS > testTrack.startLine && dash.toS < 60), 'on the start straight after the line');
  assert.ok(dashes.some((dash) => dash.fromS > 440 && dash.toS < 520), 'on the off-road straight');
  assert.equal(dashes.filter((dash) => dash.fromS > 125 && dash.toS < 180).length, 0, 'none in the first turn');
  for (const dash of dashes) {
    assert.ok(covered.every((span) => dash.toS < span.fromS || dash.fromS > span.toS), `the dash at ${dash.fromS} is clear`);
    assert.ok(stationsBetween(testTrack, dash.fromS, dash.toS).every((station) => !station.gap && !station.antiGravity));
  }
});

test('the kit paints a bracket in front of every grid place, where the race puts its karts', () => {
  const race = createRace(testTrack, ['ana'], 3, 150);
  race.karts.forEach((kart, gridIndex) => {
    assert.ok(Math.abs(kart.distance - (gridSpot(testTrack, gridIndex).s - testTrack.startLine)) < 1e-9);
  });
  const brackets = gridBrackets(testTrack);
  assert.equal(brackets.length, FIELD_SIZE * 3, 'a bar and two legs each');
  for (let gridIndex = 0; gridIndex < FIELD_SIZE; gridIndex += 1) {
    const { s, lateral } = gridSpot(testTrack, gridIndex);
    const [bar, ...legs] = brackets.slice(gridIndex * 3, gridIndex * 3 + 3);
    assert.ok(bar.fromS > s + 1, 'the bar is in front of the kart\'s nose (a kart is 2 long)');
    assert.ok(bar.fromLateral < lateral - 0.8 && bar.toLateral > lateral + 0.8, 'wider than the kart');
    assert.ok(legs.every((leg) => leg.toS <= bar.fromS && leg.fromS < bar.fromS), 'the legs point back from the bar');
    assert.ok(Math.abs(bar.fromLateral) < 8 - EDGE_LINE_INSET && Math.abs(bar.toLateral) < 8 - EDGE_LINE_INSET, 'inside the edge lines');
  }
});

test('the start line is two rows of checks across the whole road, centred on the line', () => {
  const checks = startLineChecks(testTrack);
  assert.equal(checks.length, 32);
  assert.equal(Math.min(...checks.map((check) => check.fromLateral)), -8);
  assert.equal(Math.max(...checks.map((check) => check.toLateral)), 8);
  assert.equal(Math.min(...checks.map((check) => check.fromS)) + Math.max(...checks.map((check) => check.toS)), 2 * testTrack.startLine);
  assert.equal(checks.filter((check) => check.dark).length, 16);
  assert.notEqual(checks[0].dark, checks[1].dark, 'neighbours differ across');
  assert.notEqual(checks[0].dark, checks[16].dark, 'and along');
});

test('a ramp plate covers each jump\'s ramp up to its lip, and an anti-gravity panel starts each anti-gravity section', () => {
  const [ramp] = rampSpans(testTrack);
  assert.equal(rampSpans(testTrack).length, 1);
  assert.ok(Math.abs(ramp.fromS - 225) < 2 && Math.abs(ramp.toS - 242) < 1, 'the 16-long ramp before the gap');
  assert.ok(stationAt(testTrack, ramp.toS + 0.01).gap && !stationAt(testTrack, ramp.toS - 0.5).gap, 'it ends at the lip');
  assert.equal(rampSpans(buildTrack(SEASIDE_SKYWAY)).length, 1);
  const [panel] = antiGravityPanelRects(testTrack);
  assert.equal(antiGravityPanelRects(testTrack).length, 1);
  assert.ok(stationAt(testTrack, panel.fromS).antiGravity && !stationAt(testTrack, panel.fromS - 2).antiGravity, 'just inside the section');
  assert.deepEqual([panel.fromLateral, panel.toLateral], [-8, 8], 'across the whole road');
  for (const [rect, spot] of dashPanelRects(testTrack).map((rect, index) => [rect, TEST_TRACK.dashPanels[index]])) {
    assert.deepEqual([rect.toS - rect.fromS, rect.toLateral - rect.fromLateral], [DASH_PANEL_LENGTH, DASH_PANEL_WIDTH]);
    assert.equal((rect.fromS + rect.toS) / 2, spot.s);
  }
});

test('the start lights light red one by one with the countdown, all green at GO, then go out', () => {
  const at = (time, phase = time < 3 ? RACE_PHASES.COUNTDOWN : RACE_PHASES.RACING) => startLightStates({ time, phase });
  assert.deepEqual(startLightStates(null), [OFF, OFF, OFF], 'the setup screen');
  assert.deepEqual(at(0), [RED, OFF, OFF], '"3"');
  assert.deepEqual(at(1.5), [RED, RED, OFF], '"2"');
  assert.deepEqual(at(2.99), [RED, RED, RED], '"1"');
  assert.deepEqual(at(3), [GREEN, GREEN, GREEN], 'GO');
  assert.deepEqual(at(5.9), [GREEN, GREEN, GREEN]);
  assert.deepEqual(at(6), [OFF, OFF, OFF]);
  assert.deepEqual(at(4, RACE_PHASES.RESULTS), [OFF, OFF, OFF], 'the results');
});

test('a wall gets the style of the first run that covers it on its side, or the plain (or anti-gravity) wall', () => {
  const runs = [
    { fromS: 0, toS: 10, side: 'left', style: BARRIER_STYLES.GUARDRAIL },
    { fromS: 5, toS: 20, side: 'both', style: BARRIER_STYLES.RAIL_FENCE },
  ];
  const station = (s, antiGravity = false) => ({ s, antiGravity });
  assert.equal(barrierStyleAt(runs, station(7), -1), BARRIER_STYLES.GUARDRAIL);
  assert.equal(barrierStyleAt(runs, station(7), 1), BARRIER_STYLES.RAIL_FENCE);
  assert.equal(barrierStyleAt(runs, station(3), 1), BARRIER_STYLES.WALL);
  assert.equal(barrierStyleAt(runs, station(20), -1), BARRIER_STYLES.WALL, 'toS is not part of a run');
  assert.equal(barrierStyleAt(runs, station(25, true), 1), BARRIER_STYLES.ANTI_GRAVITY_WALL);
  assert.deepEqual([sideSign('left'), sideSign('right')], [-1, 1]);
});

test('the Test track shows every barrier style and every prop', () => {
  const shown = new Set();
  testTrack.stations.forEach((station) => {
    for (const side of [-1, 1]) {
      if (!station.gap && (side > 0 ? station.wallRight : station.wallLeft)) {
        shown.add(barrierStyleAt(BARRIER_RUNS, station, side));
      }
    }
  });
  assert.deepEqual([...shown].sort(), Object.values(BARRIER_STYLES).sort());
  assert.deepEqual([...new Set(PROPS.map((spot) => spot.piece))].sort(), Object.keys(PROP_REACH).sort());
});

test('the Test track\'s decks run outside walls on level road, and never over the road', () => {
  for (const platform of PLATFORMS) {
    const side = sideSign(platform.side);
    for (const station of stationsBetween(testTrack, platform.fromS, platform.toS)) {
      assert.ok(side > 0 ? station.wallRight : station.wallLeft, `a wall beside the deck at ${station.s.toFixed(0)}`);
      assert.ok(!station.gap && !station.antiGravity && station.normal.y > 0.95, 'on level, plain road');
      for (const out of [BARRIER_REACH, platform.depth / 2, platform.depth]) {
        const point = deckPoint(station, side, out);
        assert.ok(!overRoad(point), `the deck at ${station.s.toFixed(0)}, ${out} out, is clear of the road`);
      }
    }
  }
});

test('every prop, the grandstand and the bunting stand where they can', () => {
  for (const spot of [...PROPS, { ...GRANDSTAND, piece: 'grandstand' }]) {
    const reach = spot.piece === 'grandstand' ? 0 : PROP_REACH[spot.piece];
    const along = spot.piece === 'grandstand' ? spot.length / 2 : reach;
    const deep = spot.piece === 'grandstand' ? GRANDSTAND_DEPTH : reach;
    const deck = PLATFORMS.find((platform) => platform.side === spot.side && spot.s - along >= platform.fromS && spot.s + along <= platform.toS);
    assert.ok(deck, `the ${spot.piece} at ${spot.s} is on a deck`);
    assert.ok(spot.out - reach >= BARRIER_REACH, `the ${spot.piece} at ${spot.s} is clear of the barrier`);
    assert.ok(spot.out + deep <= deck.depth, `the ${spot.piece} at ${spot.s} does not hang off the deck`);
  }
  for (const s of BUNTING) {
    const station = stationAt(testTrack, s);
    assert.ok(station.wallLeft && station.wallRight && !station.antiGravity, `the bunting at ${s} hangs between two walls`);
  }
});

// A point on the deck `out` beyond the edge of the ground at `station`, on `side`.
function deckPoint(station, side, out) {
  const lateral = side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft) + out);
  return { x: station.point.x + station.right.x * lateral, y: station.point.y + station.right.y * lateral, z: station.point.z + station.right.z * lateral };
}

// Whether `point` lies on (or within a barrier of) any part of the road, near its height.
function overRoad(point) {
  return testTrack.stations.some((station) => {
    if (station.gap) {
      return false;
    }
    const offset = subtract(point, station.point);
    const along = dot(offset, station.tangent);
    const lateral = dot(offset, station.right);
    const edge = Math.max(station.halfWidth + station.shoulderLeft, station.halfWidth + station.shoulderRight);
    return Math.abs(along) < station.segmentLength && Math.abs(lateral) < edge && Math.abs(dot(offset, station.normal)) < 3;
  });
}
