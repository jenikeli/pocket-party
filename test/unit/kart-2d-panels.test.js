// Unit tests for what the 2D race's HTML panels are built from (host/kart/setup-rows.js and
// host/games/kart-2d/race-views.js): the setup screen's rows and the words on them, the results rows, and when the
// room is open to new players.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roomIsOpen, resultRows, lapsText } from '../../host/games/kart-2d/race-views.js';
import { setupRows, styleWords } from '../../host/kart/setup-rows.js';
import { createRace, stepRace, RACE_PHASES } from '../../host/games/kart-2d/race.js';
import { createSetup, applyChoice } from '../../host/kart/setup.js';
import { KART_CHOICES, KART_STEERING } from '../../shared/protocol.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';

function playerAt(colorIndex, extra = {}) {
  return { playerId: `p${colorIndex}`, colorIndex, name: '', connected: true, ...extra };
}

function roster(...players) {
  return new Map(players.map((player) => [player.playerId, player]));
}

test('the setup rows come in slot order with each player\'s control style and state', () => {
  const setup = createSetup();
  applyChoice(setup, 'p0', { choice: KART_CHOICES.STEERING, value: KART_STEERING.TILT }, true);
  applyChoice(setup, 'p0', { choice: KART_CHOICES.AUTO_ACCELERATE, value: true }, true);
  applyChoice(setup, 'p0', { choice: KART_CHOICES.READY, value: true }, true);
  const rows = setupRows(setup, roster(playerAt(2), playerAt(0), playerAt(1, { connected: false })));
  assert.deepEqual(rows.map((row) => row.player.playerId), ['p0', 'p1', 'p2']);
  assert.deepEqual(rows.map((row) => row.steering), ['tilt', 'stick', 'stick']);
  assert.deepEqual(rows.map((row) => row.autoAccelerate), [true, false, false]);
  assert.deepEqual(rows.map((row) => row.ready), [true, false, false]);
  assert.deepEqual(rows.map((row) => row.away), [false, true, false]);
});

test('a player who joins while the setup screen is up gets a row, and is not ready', () => {
  const setup = createSetup();
  const players = roster(playerAt(0));
  assert.equal(setupRows(setup, players).length, 1);
  players.set('late', playerAt(1, { playerId: 'late' }));
  const rows = setupRows(setup, players);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].ready, false);
  assert.equal(rows[1].away, false);
});

test('a dropped player is shown as away even when they were ready', () => {
  const setup = createSetup();
  applyChoice(setup, 'p0', { choice: KART_CHOICES.READY, value: true }, true);
  const [row] = setupRows(setup, roster(playerAt(0, { connected: false })));
  assert.equal(row.away, true);
  assert.equal(row.ready, false);
});

test('a row says in words how the player steers and accelerates', () => {
  assert.equal(styleWords({ steering: 'stick', autoAccelerate: false }), 'Stick · Go button');
  assert.equal(styleWords({ steering: 'tilt', autoAccelerate: true }), 'Tilt · Auto');
});

test('the results rows carry each kart\'s gap to the winner, none for the winner or an unfinished kart', () => {
  const race = createRace(['p0', 'p1', 'p2', 'p3'], 3);
  race.karts[0].finishTime = 62.41;
  race.karts[1].finishTime = 64.9;
  race.karts[2].finishTime = 65.125;
  const rows = resultRows(race);
  assert.deepEqual(rows.map((row) => row.gap), ['', '+2.49', '+2.71', '']);
  assert.equal(rows[3].finishTime, null);
});

test('a race nobody finished has no gaps', () => {
  assert.deepEqual(resultRows(createRace(['p0', 'p1'], 1)).map((row) => row.gap), ['', '']);
});

test('the laps raced are worded for the results heading', () => {
  assert.equal(lapsText(1), '1 lap');
  assert.equal(lapsText(3), '3 laps');
});

test('the room is open on the setup screen and the results, closed while the karts race', () => {
  assert.equal(roomIsOpen(null), true);
  const race = createRace(['p0', 'p1'], 1);
  assert.equal(roomIsOpen(race), false);
  race.phase = RACE_PHASES.RACING;
  stepRace(race, () => NEUTRAL_CONTROLS, 1 / 60);
  assert.equal(roomIsOpen(race), false);
  race.phase = RACE_PHASES.RESULTS;
  assert.equal(roomIsOpen(race), true);
});
