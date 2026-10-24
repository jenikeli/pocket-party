// Unit tests for host/kart/kart-controls.js (INPUT messages to kart controls), host/games/kart-2d/race-views.js
// (what phones and the screen show) and shared/ordinal.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createControlsTable, NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { controllerView, setupView, standingRows, formatRaceTime } from '../../host/games/kart-2d/race-views.js';
import { createRace, stepRace } from '../../host/games/kart-2d/race.js';
import { createSetup, applyChoice } from '../../host/kart/setup.js';
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

test('tilt steers like the stick', () => {
  const table = createControlsTable();
  table.handleInput('p1', { kind: 'tilt', x: 0.6, y: 0 });
  assert.equal(table.controlsFor(connected).steer, 0.6);
  table.handleInput('p1', { kind: 'tilt', x: -3, y: 0 });
  assert.equal(table.controlsFor(connected).steer, -1);
});

test('with auto-accelerate the kart accelerates unless brake is held', () => {
  const table = createControlsTable();
  assert.deepEqual(table.controlsFor(connected, true), { steer: 0, accelerate: true, brake: false });
  table.handleInput('p1', { kind: 'button', button: 'brake', pressed: true });
  assert.deepEqual(table.controlsFor(connected, true), { steer: 0, accelerate: false, brake: true });
  assert.deepEqual(table.controlsFor(dropped, true), NEUTRAL_CONTROLS, 'a dropped player does not drive on by itself');
});

test('a dropped player gets neutral controls, and after a rejoin waits for fresh input', () => {
  const table = createControlsTable();
  table.handleInput('p1', { kind: 'button', button: 'accelerate', pressed: true });
  assert.deepEqual(table.controlsFor(dropped), NEUTRAL_CONTROLS);
  assert.deepEqual(table.controlsFor(connected), NEUTRAL_CONTROLS, 'accelerate is not still held after the rejoin');
  table.handleInput('p1', { kind: 'button', button: 'accelerate', pressed: true });
  assert.equal(table.controlsFor(connected).accelerate, true);
});

test('each phone sees its countdown, lap, place and control style, and null if it has no kart', () => {
  const race = createRace(['p1', 'p2'], 3);
  const setup = createSetup();
  applyChoice(setup, 'p2', { choice: 'steering', value: 'tilt' }, true);
  assert.deepEqual(controllerView(race, setup, 'p2'), {
    phase: 'countdown',
    countdown: 3,
    lap: 1,
    laps: 3,
    place: 2,
    finished: false,
    steering: 'tilt',
    autoAccelerate: false,
  });
  assert.equal(controllerView(race, setup, 'late-joiner'), null);

  // p2 drives off while p1 waits, so p2 takes the lead.
  for (let step = 0; step < 60 * 5; step += 1) {
    stepRace(race, (playerId) => (playerId === 'p2' ? { steer: 0, accelerate: true, brake: false } : NEUTRAL_CONTROLS), 1 / 60);
  }
  assert.equal(controllerView(race, setup, 'p2').place, 1);
  assert.equal(controllerView(race, setup, 'p2').countdown, null);
  assert.deepEqual(standingRows(race).map((row) => row.playerId), ['p2', 'p1']);
});

test('on the setup screen each phone sees the laps, its control style and whether it is ready', () => {
  const setup = createSetup();
  assert.deepEqual(setupView(setup, 'p1'), { phase: 'setup', laps: 3, steering: 'stick', autoAccelerate: false, ready: false });
  applyChoice(setup, 'p1', { choice: 'autoAccelerate', value: true }, true);
  applyChoice(setup, 'p1', { choice: 'ready', value: true }, true);
  assert.deepEqual(setupView(setup, 'p1'), { phase: 'setup', laps: 3, steering: 'stick', autoAccelerate: true, ready: true });
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
