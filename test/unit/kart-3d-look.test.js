// Unit tests for the 3D race's look (M7c) that run without a browser: the quality levels and where the choice is
// kept (quality.js), the gaps between split-screen views (view-layout.js), the seeded random source (random.js),
// where the trackside dressing stands (trackside-spots.js), where Seaside Skyway's scenery stands
// (seaside-layout.js), the front wheels following the steering (kart-body.js), the course's scenery passed
// through the track (track-builder.js), and the look's sliders (tuning.js).

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_LEVELS, DEFAULT_QUALITY, QUALITY_STORAGE_KEY, loadQuality, saveQuality } from '../../host/games/kart-3d/quality.js';
import { viewRects, gapRects } from '../../host/games/kart-3d/view-layout.js';
import { createRandom } from '../../host/games/kart-3d/random.js';
import { turnAhead, boardSpots, poleSpots, startGateIndex } from '../../host/games/kart-3d/trackside-spots.js';
import { ISLANDS, LIGHTHOUSE, BOATS, islandHeightAt } from '../../host/games/kart-3d/seaside-layout.js';
import { freshBody, moveBody } from '../../host/games/kart-3d/kart-body.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { TUNABLES } from '../../host/games/kart-3d/tuning.js';

const seaside = buildTrack(SEASIDE_SKYWAY);
// scenery.js's sea level: the road floats this far above the sea.
const SEA_LEVEL = -30;
// An island's shore wobbles out to about 1.19 times its radius (seaside-scenery.js).
const SHORE_WOBBLE = 1.19;
// The biggest palm (size 1.2) is under 12 tall.
const TALLEST_PALM = 12;
// The road's underside is this far below its surface (track-mesh.js).
const ROAD_THICKNESS = 0.6;

const savedStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
afterEach(() => {
  if (savedStorage) {
    Object.defineProperty(globalThis, 'localStorage', savedStorage);
  } else {
    delete globalThis.localStorage;
  }
});

// Puts a stand-in localStorage on globalThis for one test (afterEach puts Node's own back).
function fakeStorage(storage) {
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true, writable: true });
}

// How far the point (x, z) is from the road's centre line, seen from above, and the station nearest it.
function nearestStation(track, x, z) {
  let best = { distance: Infinity, station: null };
  for (const station of track.stations) {
    const distance = Math.hypot(station.point.x - x, station.point.z - z);
    if (distance < best.distance) {
      best = { distance, station };
    }
  }
  return best;
}

test('quality levels drop bloom first, then resolution; High is the default', () => {
  assert.deepEqual(Object.keys(QUALITY_LEVELS), ['high', 'medium', 'low']);
  assert.equal(DEFAULT_QUALITY, 'high');
  assert.deepEqual({ ...QUALITY_LEVELS.high, label: undefined }, { label: undefined, bloom: true, pixelRatio: 1 });
  assert.deepEqual({ ...QUALITY_LEVELS.medium, label: undefined }, { label: undefined, bloom: false, pixelRatio: 1 });
  assert.equal(QUALITY_LEVELS.low.bloom, false);
  assert.ok(QUALITY_LEVELS.low.pixelRatio < 1);
});

test('the quality choice is kept in localStorage, and anything odd falls back to the default', (t) => {
  const kept = new Map();
  fakeStorage({ getItem: (key) => kept.get(key) ?? null, setItem: (key, value) => kept.set(key, value) });
  assert.equal(loadQuality(), 'high', 'nothing saved yet');
  saveQuality('low');
  assert.equal(kept.get(QUALITY_STORAGE_KEY), 'low');
  assert.equal(loadQuality(), 'low');
  kept.set(QUALITY_STORAGE_KEY, 'toString');
  assert.equal(loadQuality(), 'high', 'not a level, even if every object has it');
  const errors = t.mock.method(console, 'error', () => {});
  fakeStorage({
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  });
  assert.equal(loadQuality(), 'high');
  saveQuality('medium');
  assert.equal(errors.mock.callCount(), 2, 'both failures are logged, not thrown');
});

test('the gaps between views are what the views leave of the canvas', () => {
  assert.deepEqual(gapRects(1, 1920, 1080), []);
  for (const viewCount of [2, 4]) {
    const views = viewRects(viewCount, 1921, 1081);
    const gaps = gapRects(viewCount, 1921, 1081);
    const area = (rects) => rects.reduce((sum, rect) => sum + rect.width * rect.height, 0);
    // The two gaps of 4 views cross in the middle, so that square is counted twice.
    const overlap = viewCount === 4 ? gaps[0].height * gaps[1].width : 0;
    assert.equal(area(views) + area(gaps) - overlap, 1921 * 1081, `${viewCount} views`);
    for (const gap of gaps) {
      assert.ok(gap.width > 0 && gap.height > 0);
      for (const view of views) {
        const apart = gap.x >= view.x + view.width || view.x >= gap.x + gap.width || gap.y >= view.y + view.height || view.y >= gap.y + gap.height;
        assert.ok(apart, 'a gap never covers a view');
      }
    }
  }
});

test('the seeded random source gives the same numbers for the same seed, all in 0..1', () => {
  const first = createRandom(42);
  const again = createRandom(42);
  const other = createRandom(43);
  const numbers = Array.from({ length: 1000 }, () => first());
  assert.deepEqual(Array.from({ length: 1000 }, () => again()), numbers);
  assert.notDeepEqual(Array.from({ length: 1000 }, () => other()), numbers);
  assert.ok(numbers.every((number) => number >= 0 && number < 1));
  const mean = numbers.reduce((sum, number) => sum + number, 0) / numbers.length;
  assert.ok(Math.abs(mean - 0.5) < 0.05);
});

test('turnAhead is positive in a right turn, negative in a left one, and about zero on a straight', () => {
  const clockwise = buildTrack({ halfWidth: 8, startLine: 0, pieces: [{ straight: 50 }, { turn: 180, radius: 20 }, { straight: 50 }, { turn: 180, radius: 20 }] });
  const indexAt = (track, s) => track.stations.findIndex((station) => station.s >= s);
  assert.ok(turnAhead(clockwise, indexAt(clockwise, 70)) > 0.3);
  assert.ok(Math.abs(turnAhead(clockwise, indexAt(clockwise, 10))) < 0.01);
  // Seaside Skyway's hairpin turns left.
  assert.ok(turnAhead(seaside, indexAt(seaside, 730)) < -0.3);
});

test('arrow boards stand on the wall round the outside of every corner, pointing the way it turns', () => {
  const spots = boardSpots(seaside);
  for (const spot of spots) {
    const station = seaside.stations[spot.index];
    assert.equal(spot.side, spot.turnsRight ? -1 : 1, 'on the outside');
    assert.ok(spot.side > 0 ? station.wallRight : station.wallLeft, 'on a wall');
    assert.ok(!station.gap && !station.antiGravity && station.normal.y > 0.95, 'on level, normal road');
    assert.equal(spot.lateral, spot.side * (station.halfWidth + (spot.side > 0 ? station.shoulderRight : station.shoulderLeft)));
  }
  const near = (s) => spots.filter((spot) => Math.abs(seaside.stations[spot.index].s - s) < 30);
  assert.ok(near(190).every((spot) => spot.turnsRight) && near(190).length > 0, 'the first corner, right');
  assert.ok(near(730).every((spot) => !spot.turnsRight) && near(730).length > 0, 'the hairpin, left');
  assert.ok(near(1180).length > 0, 'the last corner');
  assert.equal(near(600).length, 0, 'none on the bridge, which has no walls');
  assert.equal(near(905).length, 0, 'none on the anti-gravity wall');
});

test('flag poles stand on the walls along the straights, clear of the start gate', () => {
  const spots = poleSpots(seaside);
  const gate = seaside.stations[startGateIndex(seaside)];
  assert.ok(Math.abs(gate.s - seaside.startLine) <= 1);
  assert.ok(spots.length > 10);
  for (const spot of spots) {
    const station = seaside.stations[spot.index];
    assert.ok(Math.abs(turnAhead(seaside, spot.index)) <= (8 * Math.PI) / 180, 'not in a corner');
    assert.ok(Math.abs(station.s - seaside.startLine) >= 15, 'clear of the gate');
    assert.ok(spot.side > 0 ? station.wallRight : station.wallLeft);
  }
  assert.ok(spots.some((spot) => seaside.stations[spot.index].s > 60 && seaside.stations[spot.index].s < 150), 'on the start straight');
});

test('Seaside Skyway\'s scenery never reaches the road: islands and palms pass under it, the tall things stand clear', () => {
  for (const island of ISLANDS) {
    const { distance, station } = nearestStation(seaside, island.x, island.z);
    const reach = island.radius * SHORE_WOBBLE + station.halfWidth + 6;
    if (island.height > 20) {
      assert.ok(distance > reach + 30, `the hill at ${island.x}, ${island.z} is far from the road`);
    } else if (distance < reach) {
      // The road passes over this island: its top and tallest palm stay under the road's underside.
      assert.ok(SEA_LEVEL + island.height + TALLEST_PALM < station.point.y - ROAD_THICKNESS, `the island at ${island.x}, ${island.z}`);
    }
  }
  const lighthouseIsland = ISLANDS[LIGHTHOUSE.island];
  assert.ok(SEA_LEVEL + lighthouseIsland.height + LIGHTHOUSE.height > 0, 'the lamp shows above the road');
  assert.ok(nearestStation(seaside, lighthouseIsland.x, lighthouseIsland.z).distance > 40, 'the lighthouse stands clear of the road');
  for (const boat of BOATS) {
    for (const island of ISLANDS) {
      assert.ok(Math.hypot(boat.x - island.x, boat.z - island.z) > island.radius * SHORE_WOBBLE + 3, `the boat at ${boat.x}, ${boat.z} is in open water`);
    }
  }
});

test('an island rises from its beach to its top, and is flat sea beyond its radius', () => {
  const island = { radius: 20, height: 7 };
  assert.equal(islandHeightAt(island, 0), 7);
  assert.equal(islandHeightAt(island, 20), 0);
  assert.equal(islandHeightAt(island, 25), 0);
  assert.ok(Math.abs(islandHeightAt(island, 16) - 1) < 1e-9, 'the beach is 1 high where the hill starts');
  for (let distance = 1; distance <= 20; distance += 1) {
    assert.ok(islandHeightAt(island, distance) <= islandHeightAt(island, distance - 1), 'it only falls going out');
  }
});

test('the front wheels ease toward the steering and never turn past it', () => {
  const kart = { ...freshBody(), driftDirection: 0, hopping: false, driftHeld: false };
  const step = (steer, seconds) => {
    for (let index = 0; index < seconds * 60; index += 1) {
      moveBody(kart, { steer, accelerate: true, brake: false, drift: false }, 1 / 60);
      assert.ok(Math.abs(kart.wheelTurn) <= 1);
    }
  };
  step(1, 1 / 60);
  assert.ok(kart.wheelTurn > 0 && kart.wheelTurn < 0.5, 'not at once');
  step(1, 0.5);
  assert.ok(kart.wheelTurn > 0.99);
  step(-0.5, 0.5);
  assert.ok(Math.abs(kart.wheelTurn + 0.5) < 0.01);
});

test('a course\'s scenery is passed through to its track: Seaside Skyway is dressed, the Test track plain', () => {
  assert.equal(seaside.scenery, 'seaside');
  assert.equal(buildTrack(TEST_TRACK).scenery, null);
});

test('the look has sliders: bloom strength, radius and threshold, and exposure', () => {
  const look = TUNABLES.filter((tunable) => tunable.group === 'Look').map((tunable) => [tunable.key, tunable.value]);
  assert.deepEqual(look, [['bloomStrength', 0.4], ['bloomRadius', 0.2], ['bloomThreshold', 1], ['exposure', 1]]);
});
