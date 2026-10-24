// Unit tests for host/games/kart-2d/kart-controls.js (INPUT messages to kart controls), race-views.js (what
// phones and the screen show) and shared/ordinal.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createControlsTable } from '../../host/games/kart-2d/kart-controls.js';
import { controllerView, standingRows, formatRaceTime } from '../../host/games/kart-2d/race-views.js';
import { createRace, stepRace, NEUTRAL_CONTROLS } from '../../host/games/kart-2d/race.js';
import { ordinal } from '../../shared/ordinal.js';

const connected = { playerId: 'p1', connected: true };
const dropped = { playerId: 'p1', connected: false };

test('the stick steers, the pedals are held between press and release', () => {
  const table = createControlsTable();
  assert.deepEqual(table.controlsFor(connected), NEUTRAL_CONTROLS);
  table.handleInput('p1', { kind: 'drag', x: -0.4, y: 0.9 });
  table.handleInput('p1', { kind: 'button', button: 'accelerate', pressed: true });
  table.handleInput('p1', { kind: 'button', button: 'brake', pressed: true });
  assert.deepEqual(table.controlsFor(connected), { steer: -0.4, accelerate: true, brake: true });
  table.handleInput('p1', { kind: 'button', button: 'brake', pressed: false });
  assert.deepEqual(table.controlsFor(connected), { steer: -0.4, accelerate: true, brake: false });
});

test('odd input from a phone is clamped or ignored', () => {
  const table = createControlsTable();
  table.handleInput('p1', { kind: 'drag', x: 7 });
  table.handleInput('p1', { kind: 'drag', x: 'left' });
  table.handleInput('p1', { kind: 'button', button: 'horn', pressed: true });
  table.handleInput('p1', { kind: 'tap' });
  table.handleInput('p1', undefined);
  assert.deepEqual(table.controlsFor(connected), { steer: 1, accelerate: false, brake: false });
});

test('a dropped player gets neutral controls, and after a rejoin waits for fresh input', () => {
  const table = createControlsTable();
  table.handleInput('p1', { kind: 'button', button: 'accelerate', pressed: true });
  assert.deepEqual(table.controlsFor(dropped), NEUTRAL_CONTROLS);
  assert.deepEqual(table.controlsFor(connected), NEUTRAL_CONTROLS, 'accelerate is not still held after the rejoin');
  table.handleInput('p1', { kind: 'button', button: 'accelerate', pressed: true });
  assert.equal(table.controlsFor(connected).accelerate, true);
});

test('each phone sees its countdown, lap and place, and null if it has no kart', () => {
  const race = createRace(['p1', 'p2'], 3);
  assert.deepEqual(controllerView(race, 'p2'), {
    phase: 'countdown',
    countdown: 3,
    lap: 1,
    laps: 3,
    place: 2,
    finished: false,
  });
  assert.equal(controllerView(race, 'late-joiner'), null);

  // p2 drives off while p1 waits, so p2 takes the lead.
  for (let step = 0; step < 60 * 5; step += 1) {
    stepRace(race, (playerId) => (playerId === 'p2' ? { steer: 0, accelerate: true, brake: false } : NEUTRAL_CONTROLS), 1 / 60);
  }
  assert.equal(controllerView(race, 'p2').place, 1);
  assert.equal(controllerView(race, 'p2').countdown, null);
  assert.deepEqual(standingRows(race).map((row) => row.playerId), ['p2', 'p1']);
});

test('race times show minutes, seconds and hundredths', () => {
  assert.equal(formatRaceTime(0), '0:00.00');
  assert.equal(formatRaceTime(0.29), '0:00.29');
  assert.equal(formatRaceTime(83.456), '1:23.45');
  assert.equal(formatRaceTime(601.5), '10:01.50');
});

test('places read 1st, 2nd, 3rd, then th', () => {
  assert.deepEqual([1, 2, 3, 4, 9].map(ordinal), ['1st', '2nd', '3rd', '4th', '9th']);
});
