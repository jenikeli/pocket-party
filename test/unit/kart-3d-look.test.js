// Unit tests for the 3D race's look (M7c) that run without a browser: the quality levels and where the choice is
// kept (quality.js), the gaps between split-screen views (view-layout.js), the seeded random source (random.js),
// how much the road turns ahead and where its start line is (track.js), the front wheels following the steering
// (kart-body.js), the course's scenery passed through the track (track-builder.js), and the look's sliders
// (tuning.js), the dash panels' glow (M7d1) included. The M7d kit has its own file (kart-3d-kit.test.js), and so
// has Seaside Skyway's dressing (kart-3d-seaside.test.js).

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { QUALITY_LEVELS, DEFAULT_QUALITY, QUALITY_STORAGE_KEY, loadQuality, saveQuality } from '../../host/games/kart-3d/quality.js';
import { viewRects, gapRects } from '../../host/games/kart-3d/view-layout.js';
import { createRandom } from '../../host/games/kart-3d/random.js';
import { turnAhead, startLineIndex } from '../../host/games/kart-3d/track.js';
import { freshBody, moveBody } from '../../host/games/kart-3d/kart-body.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { TUNABLES } from '../../host/games/kart-3d/tuning.js';

const seaside = buildTrack(SEASIDE_SKYWAY);

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

test('startLineIndex is the station whose segment holds the start line', () => {
  const station = seaside.stations[startLineIndex(seaside)];
  assert.ok(station.s <= seaside.startLine && station.s + station.segmentLength > seaside.startLine);
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

test('a course\'s scenery is passed through to its track, and a track built without one has none', () => {
  assert.equal(seaside.scenery, 'seaside');
  assert.equal(buildTrack(TEST_TRACK).scenery, 'test-track');
  assert.equal(buildTrack({ ...TEST_TRACK, scenery: undefined }).scenery, null);
});

test('the look has sliders: bloom strength, radius and threshold, exposure, and the dash panels\' glow', () => {
  const look = TUNABLES.filter((tunable) => tunable.group === 'Look').map((tunable) => [tunable.key, tunable.value]);
  assert.deepEqual(look, [['bloomStrength', 0.2], ['bloomRadius', 0.3], ['bloomThreshold', 1], ['exposure', 1], ['dashPanelGlow', 1.6]]);
});
