// Unit tests for the CPU drivers' racing line (host/games/kart-3d/racing-line.js and racing-line-pins.js) on both
// courses: inside the road with its margin, straight down the middle over the jump, over the dash panels,
// out-in-out round Seaside Skyway's big sweeper, bending less than the centre line, quick to build and built once
// per track.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { COURSES } from '../../host/games/kart-3d/courses.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { stationIndexAt, progressBetween } from '../../host/games/kart-3d/track.js';
import { racingLineFor, LINE_MARGIN } from '../../host/games/kart-3d/racing-line.js';
import { jumps } from '../../host/games/kart-3d/racing-line-pins.js';
import { cross, dot } from '../../host/games/kart-3d/vector.js';

const tracks = COURSES.map((course) => ({ course, track: buildTrack(course) }));

// The line's lateral at the station holding distance `s`.
function lateralAt(track, s) {
  return racingLineFor(track).lateral[stationIndexAt(track, s)];
}

// The centre line's curvature at each station, measured as racing-line.js measures the line's: the turn between
// the tangents two stations either side, about the road's normal, over the distance between them.
function centreCurvatures(track) {
  const { stations } = track;
  const count = stations.length;
  return stations.map((station, index) => {
    const before = stations[(index - 2 + count) % count];
    const after = stations[(index + 2) % count];
    const turn = -Math.atan2(dot(cross(before.tangent, after.tangent), station.normal), dot(before.tangent, after.tangent));
    return turn / Math.abs(progressBetween(track, before.s, after.s));
  });
}

const sumOfSquares = (values) => values.reduce((sum, value) => sum + value * value, 0);

test('the racing line stays on the road, its margin inside each edge, on every course', () => {
  for (const { course, track } of tracks) {
    const { lateral, curvature } = racingLineFor(track);
    assert.equal(lateral.length, track.stations.length);
    assert.equal(curvature.length, track.stations.length);
    track.stations.forEach((station, index) => {
      const limit = station.halfWidth - LINE_MARGIN;
      assert.ok(Math.abs(lateral[index]) <= limit + 1e-9, `${course.id} s ${station.s.toFixed(0)}: ${lateral[index]} past ${limit}`);
      assert.ok(Number.isFinite(curvature[index]), `${course.id} s ${station.s.toFixed(0)}: curvature ${curvature[index]}`);
    });
  }
});

test('over each jump the line runs straight down the middle, from before the lip to past the landing', () => {
  for (const { course, track } of tracks) {
    const found = jumps(track);
    assert.equal(found.length, 1, `${course.id} has one jump`);
    for (const { lipS, landingS } of found) {
      for (let s = lipS - 25; s <= landingS + 5; s += 1) {
        assert.equal(lateralAt(track, s), 0, `${course.id} s ${s}`);
      }
    }
  }
});

test('the line runs over every dash panel', () => {
  for (const { course, track } of tracks) {
    assert.ok(track.dashPanels.length > 0);
    for (const panel of track.dashPanels) {
      for (let s = panel.s - 1.5; s <= panel.s + 1.5; s += 0.5) {
        assert.equal(lateralAt(track, s), panel.lateral, `${course.id} panel at s ${panel.s}`);
      }
    }
  }
});

test('round the big sweeper (a right turn) the line is out-in-out: wide on the left, in to the right, out again', () => {
  const track = tracks.find(({ course }) => course === SEASIDE_SKYWAY).track;
  assert.ok(lateralAt(track, 395) < -4, `before: ${lateralAt(track, 395)}`);
  assert.ok(lateralAt(track, 510) > 6, `apex: ${lateralAt(track, 510)}`);
  assert.ok(lateralAt(track, 590) < lateralAt(track, 510) - 5, `after: ${lateralAt(track, 590)}`);
});

test('the line bends less than the centre line: a smaller sum of squared curvature and lower curvature on long corners', () => {
  for (const { course, track } of tracks) {
    const line = sumOfSquares(racingLineFor(track).curvature);
    const centre = sumOfSquares(centreCurvatures(track));
    assert.ok(line < centre * 0.95, `${course.id}: line ${line.toFixed(3)}, centre ${centre.toFixed(3)}`);
  }
  // On Seaside Skyway, where no jump comes just before a corner, clearly lower: measured 0.24 against 0.34.
  const seaside = tracks.find(({ course }) => course === SEASIDE_SKYWAY).track;
  assert.ok(sumOfSquares(racingLineFor(seaside).curvature) < sumOfSquares(centreCurvatures(seaside)) * 0.8);
  // Round the big sweeper (radius 45 on the centre line) the line's tightest bend is wider.
  const sweeper = racingLineFor(seaside).curvature.filter((_, index) => seaside.stations[index].s > 440 && seaside.stations[index].s < 560);
  assert.ok(Math.max(...sweeper) < 1 / 37, `sweeper's tightest radius ${(1 / Math.max(...sweeper)).toFixed(1)}`);
});

test('the line is built once per track object, quickly', () => {
  const track = buildTrack(SEASIDE_SKYWAY);
  const started = performance.now();
  const line = racingLineFor(track);
  const took = performance.now() - started;
  // Measured about 60 ms in Node on the dev box; loose, so a busy machine does not fail it.
  assert.ok(took < 400, `built in ${took.toFixed(0)} ms`);
  assert.equal(racingLineFor(track), line);
  assert.notEqual(racingLineFor(buildTrack(SEASIDE_SKYWAY)), line);
});
