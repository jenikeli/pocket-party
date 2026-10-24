// Unit tests for host/games/kart-2d/race.js: whole races driven by scripted drivers (test/helpers/kart-drivers.js),
// from the grid and countdown to the results.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRace,
  stepRace,
  removeKart,
  kartsInPlaceOrder,
  currentLap,
  countdownNumber,
  RACE_PHASES,
  COUNTDOWN_SECONDS,
  FINISH_TIME_LIMIT_SECONDS,
} from '../../host/games/kart-2d/race.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { LAP_LENGTH, isOnRoad } from '../../host/games/kart-2d/track.js';
import { KART_RADIUS } from '../../host/games/kart-2d/kart-physics.js';
import { STEADY_LEFT, followTrack } from '../helpers/kart-drivers.js';

const DT = 1 / 60;
const PLAYER_IDS = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];

// Steps until the race shows its results or `maxSeconds` of race time pass. `driverFor(playerId)` gives controls.
function runRace(race, driverFor, maxSeconds = 120) {
  while (race.phase !== RACE_PHASES.RESULTS && race.time < maxSeconds) {
    stepRace(race, driverFor, DT);
  }
}

function runSeconds(race, driverFor, seconds) {
  for (let step = 0; step < Math.round(seconds * 60); step += 1) {
    stepRace(race, driverFor, DT);
  }
}

test('nine karts line up on the road behind the start line, facing forward, not touching', () => {
  const race = createRace(PLAYER_IDS, 3);
  for (const kart of race.karts) {
    assert.equal(isOnRoad(kart.x, kart.y), true);
    assert.ok(kart.distance < 0, 'behind the line');
    assert.equal(kart.heading, 0);
    assert.equal(currentLap(race, kart), 1);
  }
  for (const first of race.karts) {
    for (const second of race.karts) {
      if (first !== second) {
        assert.ok(Math.hypot(first.x - second.x, first.y - second.y) > 2 * KART_RADIUS);
      }
    }
  }
});

test('the countdown runs 3, 2, 1 with the karts held still, then GO for the first second of the race', () => {
  const race = createRace(['p1'], 3);
  const start = { x: race.karts[0].x, y: race.karts[0].y };
  const shown = new Set();
  while (race.phase === RACE_PHASES.COUNTDOWN) {
    shown.add(countdownNumber(race));
    stepRace(race, () => STEADY_LEFT, DT);
  }
  assert.deepEqual([...shown], [3, 2, 1]);
  assert.deepEqual({ x: race.karts[0].x, y: race.karts[0].y }, start);
  assert.equal(countdownNumber(race), 0);
  runSeconds(race, () => STEADY_LEFT, 1);
  assert.equal(countdownNumber(race), null);
  assert.ok(race.karts[0].x > start.x, 'drives once the race is on');
  assert.ok(Math.abs(COUNTDOWN_SECONDS - 3) < 1e-9);
});

test('a good driver beats the steady-left driver, and places follow the finish order', () => {
  const race = createRace(['steady', 'good'], 3);
  runRace(race, (playerId) => (playerId === 'good' ? followTrack(race, playerId) : STEADY_LEFT));
  assert.equal(race.phase, RACE_PHASES.RESULTS);
  const [winner, second] = kartsInPlaceOrder(race);
  assert.equal(winner.playerId, 'good');
  assert.ok(winner.finishTime < second.finishTime);
  assert.ok(winner.distance >= 3 * LAP_LENGTH);
  assert.equal(currentLap(race, winner), 3);
});

test('nine karts all holding steady left finish, and never leave the road', () => {
  const race = createRace(PLAYER_IDS, 3);
  while (race.phase !== RACE_PHASES.RESULTS && race.time < 120) {
    stepRace(race, () => STEADY_LEFT, DT);
    for (const kart of race.karts) {
      assert.equal(isOnRoad(kart.x, kart.y), true, `${kart.playerId} left the road at ${race.time}`);
    }
  }
  assert.equal(race.karts.every((kart) => kart.finishTime !== null), true);
});

test('driving backwards over the line and forwards again does not count a lap', () => {
  const race = createRace(['p1'], 3);
  runSeconds(race, () => NEUTRAL_CONTROLS, COUNTDOWN_SECONDS);
  // Drive a little past the line, then reverse back behind it and forwards over it again.
  runSeconds(race, () => ({ steer: 0, accelerate: true, brake: false }), 1);
  runSeconds(race, () => ({ steer: 0, accelerate: false, brake: true }), 4);
  const kart = race.karts[0];
  assert.ok(kart.distance < 0, `back behind the line: ${kart.distance}`);
  runSeconds(race, () => ({ steer: 0, accelerate: true, brake: false }), 2.5);
  assert.ok(kart.distance > 0 && kart.distance < LAP_LENGTH);
  assert.equal(currentLap(race, kart), 1);
});

test('once the first kart finishes, the rest have the time limit, then rank by how far they got', () => {
  const race = createRace(['fast', 'slow', 'parked'], 1);
  runRace(race, (playerId) => {
    if (playerId === 'fast') {
      return followTrack(race, playerId);
    }
    // 'slow' only rolls forward a little; 'parked' never moves.
    return playerId === 'slow' && race.time < 0.5 ? { steer: 0, accelerate: true, brake: false } : NEUTRAL_CONTROLS;
  });
  assert.equal(race.phase, RACE_PHASES.RESULTS);
  assert.ok(Math.abs(race.time - race.firstFinishTime - FINISH_TIME_LIMIT_SECONDS) < 2 * DT);
  assert.deepEqual(kartsInPlaceOrder(race).map((kart) => kart.playerId), ['fast', 'slow', 'parked']);
  assert.equal(kartsInPlaceOrder(race)[1].finishTime, null);
});

test('a kart with neutral controls (its player dropped) stays where it is', () => {
  const race = createRace(['p1', 'p2'], 3);
  const parked = race.karts[1];
  const start = { x: parked.x, y: parked.y };
  runSeconds(race, (playerId) => (playerId === 'p1' ? STEADY_LEFT : NEUTRAL_CONTROLS), 6);
  assert.deepEqual({ x: parked.x, y: parked.y }, start);
});

test('removing the last kart that had not finished ends the race', () => {
  const race = createRace(['fast', 'parked'], 1);
  runRace(race, (playerId) => (playerId === 'fast' ? followTrack(race, playerId) : NEUTRAL_CONTROLS), 20);
  assert.equal(race.phase, RACE_PHASES.RACING, 'still waiting for the parked kart');
  removeKart(race, 'parked');
  assert.equal(race.phase, RACE_PHASES.RESULTS);
  assert.deepEqual(race.karts.map((kart) => kart.playerId), ['fast']);
});

test('the race is plain data: it survives a JSON round trip unchanged', () => {
  const race = createRace(['p1', 'p2'], 3);
  runSeconds(race, () => STEADY_LEFT, 5);
  assert.deepEqual(JSON.parse(JSON.stringify(race)), race);
});
