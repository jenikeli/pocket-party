// Unit tests for the CPU drivers (host/games/kart-3d/cpu-driver.js and the cpu-*.js files it uses), driving karts
// with their own small loop (kart physics, bumps and slipstream, as race.js steps them): a field of 12 lapping both
// courses at every engine class with nobody falling, lap times by level, drifts, mini-turbos and tricks, getting
// going again after being turned round, nosed into a wall or put back after a fall, its plain-data state, the
// live tuning, and its cost per step.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { createKart, stepKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { bumpKarts } from '../../host/games/kart-3d/kart-bumps.js';
import { updateSlipstreams } from '../../host/games/kart-3d/slipstream.js';
import { sparkLevel } from '../../host/games/kart-3d/kart-techniques.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { progressBetween, pointAt } from '../../host/games/kart-3d/track.js';
import { gridSpot, ENGINE_CLASSES, FIELD_SIZE } from '../../host/games/kart-3d/race.js';
import { createCpu, cpuControls } from '../../host/games/kart-3d/cpu-driver.js';
import { CPU_LEVELS } from '../../host/games/kart-3d/cpu-levels.js';
import { headingToRoad } from '../../host/games/kart-3d/cpu-road.js';
import { tuning, setTuning, resetTuning } from '../../host/games/kart-3d/tuning.js';
import { scale, rotate } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const DEGREES = Math.PI / 180;
const LEVELS = Object.keys(CPU_LEVELS);
const seaside = buildTrack(SEASIDE_SKYWAY);
const testTrack = buildTrack(TEST_TRACK);
// The M6b dummy driver's lap of Seaside Skyway at 150cc, which the CPU drivers replace.
const DUMMY_LAP_SECONDS = 39;

// A CPU kart of `level` standing at `s`, `lateral` on `track`, with what the loop below records about it.
function cpuKart(track, s, lateral, level, seed, engineClass = 150, weight = 1) {
  const kart = createKart(track, s, lateral, weight, ENGINE_CLASSES[engineClass]);
  kart.cpu = createCpu(level, seed);
  kart.distance = 0;
  kart.log = { lapTimes: [], falls: 0, miniTurbos: [], boosts: {}, tricks: 0, reversed: false };
  return kart;
}

// The field of 12 on the grid, levels taken in turn.
function cpuField(track, engineClass) {
  return Array.from({ length: FIELD_SIZE }, (_, gridIndex) => {
    const { s, lateral } = gridSpot(track, gridIndex);
    return cpuKart(track, s, lateral, LEVELS[gridIndex % LEVELS.length], gridIndex, engineClass, [0.8, 1, 1.25][gridIndex % 3]);
  });
}

// Steps every kart as race.js does, until `done(time)` or `seconds` pass; returns the time taken and the time
// spent in cpuControls.
function drive(track, karts, seconds, done = () => false) {
  let time = 0;
  let driverMs = 0;
  for (let step = 0; step < seconds * 60 && !done(time); step += 1) {
    const started = performance.now();
    const controls = karts.map((kart) => cpuControls(track, kart, karts, STEP));
    driverMs += performance.now() - started;
    karts.forEach((kart, index) => stepAndLog(track, kart, controls[index], time));
    bumpKarts(karts);
    updateSlipstreams(karts, STEP);
    time += STEP;
  }
  return { time, driverMs, steps: Math.round(time * 60) };
}

function stepAndLog(track, kart, controls, time) {
  const { log } = kart;
  const before = { s: kart.s, spark: sparkLevel(kart), boost: kart.boost, falling: kart.respawnIn !== null, tricking: kart.tricking };
  stepKart(track, kart, controls, STEP);
  kart.distance += progressBetween(track, before.s, kart.s);
  log.falls += !before.falling && kart.respawnIn !== null ? 1 : 0;
  log.tricks += !before.tricking && kart.tricking ? 1 : 0;
  log.reversed ||= forwardSpeed(kart) < -1;
  if (kart.boost && kart.boost.kind !== before.boost?.kind) {
    log.boosts[kart.boost.kind] = (log.boosts[kart.boost.kind] ?? 0) + 1;
  }
  if (before.spark > 0 && kart.driftDirection === 0 && kart.boost?.kind === BOOST_KINDS.MINI_TURBO) {
    log.miniTurbos.push({ level: before.spark, s: kart.s });
  }
  if (kart.distance >= (log.lapTimes.length + 1) * track.length) {
    log.lapTimes.push(time);
  }
}

const lapsDone = (karts, laps) => () => karts.every((kart) => kart.log.lapTimes.length >= laps);

for (const engineClass of Object.keys(ENGINE_CLASSES)) {
  test(`a field of 12 CPU karts laps Seaside Skyway three times at ${engineClass}cc with nobody falling`, () => {
    const karts = cpuField(seaside, engineClass);
    // The grid starts behind the line, so a lap is counted from there.
    karts.forEach((kart) => (kart.distance = kart.s - seaside.startLine));
    drive(seaside, karts, 400, lapsDone(karts, 3));
    for (const kart of karts) {
      assert.equal(kart.log.lapTimes.length, 3, `${kart.cpu.level} kart ${kart.cpu.seed} finished`);
      assert.equal(kart.log.falls, 0, `${kart.cpu.level} kart ${kart.cpu.seed} fell`);
    }
  });
}

test('a field of 12 CPU karts laps the Test track three times at 150cc with nobody falling', () => {
  const karts = cpuField(testTrack, 150);
  karts.forEach((kart) => (kart.distance = kart.s - testTrack.startLine));
  drive(testTrack, karts, 200, lapsDone(karts, 3));
  for (const kart of karts) {
    assert.equal(kart.log.lapTimes.length, 3, `${kart.cpu.level} kart ${kart.cpu.seed} finished`);
    assert.equal(kart.log.falls, 0, `${kart.cpu.level} kart ${kart.cpu.seed} fell`);
  }
});

// A lone kart of each level, three laps of Seaside Skyway at 150cc from a standing start on the line.
const loneLaps = new Map(
  LEVELS.map((level) => {
    const kart = cpuKart(seaside, seaside.startLine, 0, level, 3);
    drive(seaside, [kart], 200, lapsDone([kart], 3));
    const { lapTimes } = kart.log;
    return [level, { kart, flyingLap: lapTimes[2] - lapTimes[1] }];
  }),
);

test('alone on Seaside Skyway, Hard laps clearly faster than the dummy driver, Normal slower, Easy slower still', () => {
  const lap = (level) => loneLaps.get(level).flyingLap;
  // Measured: Hard 35.9 s, Normal 36.6 s, Easy 37.3 s (the dummy driver 39 s).
  assert.ok(lap('hard') < DUMMY_LAP_SECONDS - 2, `hard ${lap('hard').toFixed(2)} s`);
  assert.ok(lap('easy') > lap('normal') && lap('normal') > lap('hard'), LEVELS.map((level) => `${level} ${lap(level).toFixed(2)}`).join(', '));
});

test('CPUs drift and fire mini-turbos every lap, and Hard reaches purple in the big sweeper', () => {
  for (const level of LEVELS) {
    const { log } = loneLaps.get(level).kart;
    assert.ok(log.miniTurbos.length >= 3, `${level}: ${log.miniTurbos.length} mini-turbos in three laps`);
    assert.equal(log.boosts[BOOST_KINDS.MINI_TURBO], log.miniTurbos.length, `${level}: each mini-turbo boosted`);
  }
  const hardPurples = loneLaps.get('hard').kart.log.miniTurbos.filter(({ level, s }) => level === 3 && s > 430 && s < 620);
  assert.equal(hardPurples.length, 3, 'one purple mini-turbo out of the sweeper each lap');
  assert.ok(loneLaps.get('normal').kart.log.miniTurbos.some(({ level }) => level === 2), 'Normal reaches orange');
});

test('Hard tricks off the jump every lap, and every trick boosts on landing', () => {
  const { log } = loneLaps.get('hard').kart;
  assert.equal(log.tricks, 3);
  assert.equal(log.boosts[BOOST_KINDS.JUMP], 3);
  assert.ok(loneLaps.get('easy').kart.log.tricks < 3, 'Easy tricks off fewer jumps');
});

test('a CPU kart put down facing back along the road turns round and gets going the right way', () => {
  const kart = cpuKart(seaside, 60, 0, 'normal', 1);
  kart.forward = scale(kart.forward, -1);
  kart.previousForward = kart.forward;
  drive(seaside, [kart], 4);
  assert.ok(Math.abs(headingToRoad(seaside, kart)) < 30 * DEGREES, `heading ${(headingToRoad(seaside, kart) / DEGREES).toFixed(0)} deg`);
  assert.ok(forwardSpeed(kart) > 15, `speed ${forwardSpeed(kart).toFixed(1)}`);
  assert.ok(kart.distance > 10, `drove ${kart.distance.toFixed(1)} on`);
});

test('a CPU kart nosed into a wall backs off and drives on', () => {
  const kart = cpuKart(seaside, 60, 7.8, 'hard', 2);
  kart.forward = rotate(kart.forward, kart.up, -80 * DEGREES);
  kart.previousForward = kart.forward;
  drive(seaside, [kart], 5);
  assert.ok(kart.log.reversed, 'it backed off');
  assert.ok(Math.abs(headingToRoad(seaside, kart)) < 30 * DEGREES, `heading ${(headingToRoad(seaside, kart) / DEGREES).toFixed(0)} deg`);
  assert.ok(forwardSpeed(kart) > 15, `speed ${forwardSpeed(kart).toFixed(1)}`);
  assert.ok(kart.distance > 20, `drove ${kart.distance.toFixed(1)} on`);
});

test('a CPU kart that falls off is put back and drives on', () => {
  // The Test track's hill has no walls: shoved off its right edge, the kart falls.
  const kart = cpuKart(testTrack, 75, 7.5, 'easy', 4);
  kart.velocity = scale(pointAt(testTrack, 75).right, 15);
  drive(testTrack, [kart], 3, () => kart.log.falls > 0 && kart.respawnIn === null);
  assert.equal(kart.log.falls, 1);
  const putBack = kart.distance;
  drive(testTrack, [kart], 4);
  assert.equal(kart.log.falls, 1, 'it did not fall again');
  assert.ok(kart.distance - putBack > 60, `drove ${(kart.distance - putBack).toFixed(1)} after being put back`);
});

test('a driver is plain data, the same from the same seed, and differs from kart to kart', () => {
  const cpu = createCpu('hard', 5);
  assert.deepEqual(structuredClone(cpu), cpu);
  assert.deepEqual(createCpu('hard', 5), cpu);
  const offsets = new Set(Array.from({ length: 11 }, (_, seed) => createCpu('normal', seed).offset.toFixed(2)));
  assert.equal(offsets.size, 11);
  for (const level of LEVELS) {
    assert.ok(Math.abs(createCpu(level, 9).offset) <= CPU_LEVELS[level].offsetRange);
  }
});

test('the drivers follow the live tuning: a lower top speed slider caps their speed', (t) => {
  t.after(resetTuning);
  setTuning('topSpeed', 20);
  const kart = cpuKart(seaside, 60, 0, 'hard', 6);
  let fastest = 0;
  drive(seaside, [kart], 6, () => {
    fastest = Math.max(fastest, forwardSpeed(kart));
    return false;
  });
  assert.ok(fastest <= tuning.topSpeed + 0.5 && fastest > tuning.topSpeed - 1, `fastest ${fastest.toFixed(1)}`);
});

test('the drivers cost little: 12 karts take well under a millisecond a step', () => {
  const karts = cpuField(seaside, 150);
  const { driverMs, steps } = drive(seaside, karts, 40);
  const perStep = driverMs / steps;
  // Measured about 0.09 ms in Node on the dev box; loose, so a busy machine does not fail it.
  assert.ok(perStep < 0.5, `${perStep.toFixed(3)} ms a step for 12 karts`);
});
