// Unit tests for the 3D race's rules (host/games/kart-3d/race.js) on its courses (courses.js): every course
// racing, the grid of 12, Seaside Skyway's shape and features, CPU karts lapping it at every engine class, laps, finishing, places, the
// finished player's kart driving itself, the time limit, players leaving, and the engine classes' top speeds.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { COURSES } from '../../host/games/kart-3d/courses.js';
import { locate, surfaceAt, outerEdge, SURFACES } from '../../host/games/kart-3d/track.js';
import {
  createRace,
  stepRace,
  removeKart,
  playerKart,
  kartsInPlaceOrder,
  raceClock,
  FIELD_SIZE,
  RACE_PHASES,
  ENGINE_CLASSES,
  FINISH_TIME_LIMIT_SECONDS,
} from '../../host/games/kart-3d/race.js';
import { forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { laneControls } from '../helpers/lane-driver.js';
import { steeringRate, kartTopSpeed } from '../../host/games/kart-3d/kart-driving.js';
import { KART_RADIUS } from '../../host/games/kart-3d/kart-walls.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { subtract, length } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);

// A player who drives like the CPU karts, in the middle of the road, and holds Go through the countdown too
// late for a rocket start (a normal start).
function steadyDriver(race) {
  return (playerId) => {
    if (race.phase === RACE_PHASES.COUNTDOWN) {
      return NEUTRAL_CONTROLS;
    }
    return { ...laneControls(track, playerKart(race, playerId), 0), drift: false };
  };
}

// The hairpin is the only piece with grass on its left side only.
const HAIRPIN_RADIUS = 26;
function isInHairpin(kart) {
  const station = track.stations[kart.trackIndex];
  return station.shoulderLeft > 0 && station.shoulderRight === 0;
}

// Steps the race until `done()` or `seconds` of race time have passed.
function runRace(race, controlsFor, seconds, done = () => false) {
  for (let step = 0; step < seconds * 60 && !done(); step += 1) {
    stepRace(race, track, controlsFor, STEP);
  }
}

test('every course has its own id and a name, and a 1-lap race on it ends with no CPU kart having fallen off', () => {
  assert.deepEqual(COURSES.map((course) => course.id), ['seaside-skyway', 'test-track']);
  assert.deepEqual(COURSES.map((course) => course.name), ['Seaside Skyway', 'Test track']);
  for (const course of COURSES) {
    const courseTrack = buildTrack(course);
    const race = createRace(courseTrack, ['p1'], 1, 150);
    for (const kart of race.karts) {
      assert.ok(kart.s > 0 && kart.s < courseTrack.startLine, `${course.name}: on the grid behind the line: ${kart.s}`);
    }
    const player = playerKart(race, 'p1');
    let falls = 0;
    for (let step = 0; step < 120 * 60 && race.phase !== RACE_PHASES.RESULTS; step += 1) {
      const controls = race.phase === RACE_PHASES.COUNTDOWN ? NEUTRAL_CONTROLS : { ...laneControls(courseTrack, player, 0), drift: false };
      stepRace(race, courseTrack, () => controls, STEP);
      falls += race.karts.filter((kart) => kart.respawnIn !== null).length;
    }
    assert.equal(race.phase, RACE_PHASES.RESULTS, `${course.name}: the player finished`);
    assert.equal(falls, 0, `${course.name}: karts fell off`);
  }
});

test('Seaside Skyway is a closed loop of about 1210 units with every feature M6 proved', () => {
  assert.ok(Math.abs(track.length - 1213.4) < 0.5, `lap length ${track.length}`);
  const stations = track.stations;
  const heights = stations.map((station) => station.point.y);
  assert.ok(Math.max(...heights) > 9.9, 'a climb to height 10');
  assert.ok(stations.some((station) => station.gap), 'a jump over a gap');
  assert.ok(stations.some((station) => station.antiGravity && Math.abs(station.normal.y) < 0.01), 'an anti-gravity wall');
  assert.ok(stations.some((station) => !station.antiGravity && Math.acos(station.normal.y) > (11 * Math.PI) / 180), 'a banked curve');
  assert.ok(stations.every((station) => station.gap || (station.wallLeft && station.wallRight)), 'walls everywhere but over the jump\'s gap');
  assert.ok(stations.some((station) => station.shoulderLeft > 0 && station.shoulderRight === 0), 'grass on one side only');
  const widths = stations.map((station) => station.halfWidth);
  assert.deepEqual([Math.min(...widths), Math.max(...widths)], [6.5, 10], 'the road narrows and widens');
  assert.equal(track.dashPanels.length, 2);
  for (const panel of track.dashPanels) {
    const index = stations.findIndex((station) => station.s >= panel.s);
    assert.equal(surfaceAt(locate(track, stations[index].point, index)), SURFACES.ROAD, `the dash panel at ${panel.s} is on the road`);
  }
});

test('no two parts of Seaside Skyway overlap, unless one passes high over the other', () => {
  const stations = track.stations.filter((station, index) => index % 2 === 0);
  const reach = (station) => station.halfWidth + Math.max(station.shoulderLeft, station.shoulderRight);
  for (let i = 0; i < stations.length; i += 1) {
    for (let j = i + 1; j < stations.length; j += 1) {
      const along = Math.abs(stations[i].s - stations[j].s);
      if (Math.min(along, track.length - along) < 50) {
        continue;
      }
      const apart = Math.hypot(stations[i].point.x - stations[j].point.x, stations[i].point.z - stations[j].point.z);
      const above = Math.abs(stations[i].point.y - stations[j].point.y);
      assert.ok(apart > reach(stations[i]) + reach(stations[j]) || above > 6, `s ${stations[i].s} and ${stations[j].s} overlap`);
    }
  }
});

test('the grid: CPU karts fill the field to 12, players at the back, all behind the line, apart, placed in grid order', () => {
  const race = createRace(track, ['p1', 'p2'], 3, 150);
  assert.equal(race.karts.length, FIELD_SIZE);
  assert.deepEqual(race.karts.slice(-3).map((kart) => kart.playerId), [null, 'p1', 'p2']);
  assert.deepEqual(race.karts.map((kart) => kart.place), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  for (const kart of race.karts) {
    assert.ok(kart.s > 0 && kart.s < track.startLine, `on the start straight behind the line: ${kart.s}`);
    assert.ok(kart.distance < 0 && kart.lap === 1);
    assert.equal(kart.engineClassShare, 1);
  }
  for (let i = 0; i < race.karts.length; i += 1) {
    for (let j = i + 1; j < race.karts.length; j += 1) {
      assert.ok(length(subtract(race.karts[i].position, race.karts[j].position)) > 2 * KART_RADIUS);
    }
  }
});

test('CPU karts lap the course at every engine class: over the jump, up the wall, braking for the hairpin, none falling off', () => {
  const lapTimes = {};
  for (const engineClass of Object.keys(ENGINE_CLASSES)) {
    const race = createRace(track, ['p1'], 3, Number(engineClass));
    let falls = 0;
    const seen = race.karts.map(() => ({ airSteps: 0, wallSteps: 0, slowestInHairpin: Infinity }));
    runRace(race, steadyDriver(race), 200, () => {
      race.karts.forEach((kart, index) => {
        falls += kart.respawnIn !== null ? 1 : 0;
        seen[index].airSteps += kart.grounded ? 0 : 1;
        seen[index].wallSteps += kart.antiGravity && Math.abs(kart.up.y) < 0.1 ? 1 : 0;
        if (isInHairpin(kart)) {
          seen[index].slowestInHairpin = Math.min(seen[index].slowestInHairpin, forwardSpeed(kart));
        }
      });
      return race.phase === RACE_PHASES.RESULTS;
    });
    assert.equal(race.phase, RACE_PHASES.RESULTS);
    assert.equal(falls, 0, `${engineClass}cc: karts fell off`);
    race.karts.forEach((kart, index) => {
      // The player finishing ends the race, so the CPU karts are on their last lap.
      assert.ok(kart.distance > 2.8 * track.length, `${engineClass}cc kart ${index} drove ${kart.distance}`);
      assert.ok(seen[index].airSteps > 2 * 30, `${engineClass}cc kart ${index} jumped`);
      assert.ok(seen[index].wallSteps > 2 * 30, `${engineClass}cc kart ${index} drove on the vertical wall`);
      // The hairpin turns left with radius 26, so a lane `lane` right of the middle has radius 26 + lane, and a
      // full steer gets round it at steeringRate(1) x radius at most (the CPU driver brakes 5% above that).
      // The outer lanes can be taken flat out.
      const lane = kart.lane ?? 0;
      const laneLimit = steeringRate(1) * (HAIRPIN_RADIUS + lane);
      if (laneLimit < kartTopSpeed(kart)) {
        assert.ok(seen[index].slowestInHairpin <= laneLimit * 1.05, `${engineClass}cc kart ${index} slowed for the hairpin`);
      }
    });
    lapTimes[engineClass] = playerKart(race, 'p1').finishTime / 3;
  }
  // The middle lane, braking for every corner and never drifting: MK8DX's staff ghosts lap its courses in 38-44 s
  // at 150cc, with drifts and three mushrooms.
  assert.ok(lapTimes[150] > 34 && lapTimes[150] < 44, `150cc lap ${lapTimes[150]} s`);
  assert.ok(lapTimes[50] > lapTimes[100] && lapTimes[100] > lapTimes[150] && lapTimes[150] > lapTimes[200], JSON.stringify(lapTimes));
});

test('laps, finishing and places: the player finishes, drives on by itself, and the race is over', () => {
  const race = createRace(track, ['p1'], 2, 150);
  const lapsSeen = new Set();
  runRace(race, steadyDriver(race), 200, () => {
    lapsSeen.add(playerKart(race, 'p1').lap);
    return race.phase === RACE_PHASES.RESULTS;
  });
  const kart = playerKart(race, 'p1');
  assert.deepEqual([...lapsSeen], [1, 2]);
  assert.ok(kart.finishTime > 50 && kart.finishTime < 90, `finished in ${kart.finishTime} s`);
  assert.ok(Math.abs(kart.lapStartedAt - kart.finishTime / 2) < 5, 'the second lap started about halfway');
  assert.ok(kart.lane !== null, 'the CPU driver drives the kart now');
  assert.deepEqual(kartsInPlaceOrder(race).map((each) => each.place), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const places = race.karts.map((each) => each.place);
  runRace(race, steadyDriver(race), 5);
  assert.deepEqual(race.karts.map((each) => each.place), places, 'places stay as they were at the results');
  assert.ok(forwardSpeed(kart) > 10, 'the karts drive on behind the results');
});

test('reversing over the start line takes distance away; the lap only counts once it is driven again', () => {
  const race = createRace(track, ['p1'], 3, 150);
  runRace(race, () => NEUTRAL_CONTROLS, GO_AT + 0.1);
  const kart = playerKart(race, 'p1');
  const startDistance = kart.distance;
  runRace(race, () => ({ ...NEUTRAL_CONTROLS, brake: true }), 4);
  assert.ok(kart.distance < startDistance - 10, `reversed to ${kart.distance}`);
  assert.equal(kart.lap, 1);
});

test('the time limit: 30 s after the first player finishes, the race ends without the other', () => {
  const race = createRace(track, ['fast', 'still'], 1, 200);
  const driver = steadyDriver(race);
  runRace(race, (playerId) => (playerId === 'fast' ? driver(playerId) : NEUTRAL_CONTROLS), 120, () => race.firstPlayerFinishTime !== null);
  assert.equal(race.phase, RACE_PHASES.RACING);
  runRace(race, (playerId) => (playerId === 'fast' ? driver(playerId) : NEUTRAL_CONTROLS), 60, () => race.phase === RACE_PHASES.RESULTS);
  assert.ok(Math.abs(raceClock(race) - race.firstPlayerFinishTime - FINISH_TIME_LIMIT_SECONDS) < 0.05);
  const still = playerKart(race, 'still');
  assert.equal(still.finishTime, null);
  assert.equal(still.place, FIELD_SIZE, 'the kart that never left the grid is last');
  assert.ok(still.lane !== null, 'at the results it drives on by itself too');
});

test('a player leaving: their kart goes; if everyone left has finished, the race is over', () => {
  const race = createRace(track, ['fast', 'gone'], 1, 200);
  const driver = steadyDriver(race);
  runRace(race, (playerId) => (playerId === 'fast' ? driver(playerId) : NEUTRAL_CONTROLS), 120, () => race.firstPlayerFinishTime !== null);
  removeKart(race, 'gone');
  assert.equal(playerKart(race, 'gone'), null);
  assert.equal(race.karts.length, FIELD_SIZE - 1);
  assert.equal(race.phase, RACE_PHASES.RESULTS);
  assert.deepEqual(race.karts.map((kart) => kart.place).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
});

test('engine classes: speeds are 150cc\'s times 0.8, 0.9, 1 and 1.5, as in MK8DX, acceleration included', () => {
  // The kart on pole (a CPU kart, with open road ahead) accelerating for 3 s down the start straight: the same
  // curve, scaled by the class.
  const fastest = {};
  for (const engineClass of Object.keys(ENGINE_CLASSES)) {
    const race = createRace(track, ['p1'], 3, Number(engineClass));
    assert.ok(race.karts.every((kart) => kart.engineClassShare === ENGINE_CLASSES[engineClass]));
    runRace(race, () => NEUTRAL_CONTROLS, GO_AT + 3);
    fastest[engineClass] = forwardSpeed(race.karts[0]);
  }
  assert.ok(fastest[150] > 0.7 * tuning.topSpeed && fastest[150] < tuning.topSpeed, `150cc reached ${fastest[150]}`);
  for (const [engineClass, share] of Object.entries(ENGINE_CLASSES)) {
    assert.ok(Math.abs(fastest[engineClass] / fastest[150] - share) < 0.01, `${engineClass}cc reached ${fastest[engineClass]}`);
  }
});

test('the outer edge is the road plus that side\'s shoulder', () => {
  // In the middle of the last corner (s 1150-1213), whose inside (right) has grass 10 wide, past where it eases in.
  const index = track.stations.findIndex((station) => station.s > 1185);
  assert.equal(track.stations[index].shoulderRight, 10);
  const station = track.stations[index];
  const contactAt = (lateral) => locate(track, { x: station.point.x + station.right.x * lateral, y: station.point.y, z: station.point.z + station.right.z * lateral }, index);
  assert.ok(Math.abs(outerEdge(contactAt(1)) - (contactAt(1).halfWidth + 10)) < 1e-9);
  assert.ok(Math.abs(outerEdge(contactAt(-1)) - contactAt(-1).halfWidth) < 1e-9);
  assert.equal(surfaceAt(contactAt(contactAt(1).halfWidth + 5)), SURFACES.OFF_ROAD);
  assert.equal(surfaceAt(contactAt(-contactAt(1).halfWidth - 1)), null);
});
