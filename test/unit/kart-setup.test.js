// Unit tests for host/kart/setup.js: the laps, each player's control style and ready, and when the
// host may start the race.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSetup,
  stepLaps,
  playerSetup,
  applyChoice,
  clearReady,
  forgetPlayer,
  playersHoldingUpStart,
  canStartRace,
} from '../../host/kart/setup.js';

const ana = { playerId: 'ana', connected: true };
const bo = { playerId: 'bo', connected: true };

test('laps start at 3 and stay between 1 and 9', () => {
  const setup = createSetup();
  assert.equal(setup.laps, 3);
  for (let press = 0; press < 5; press += 1) {
    stepLaps(setup, -1);
  }
  assert.equal(setup.laps, 1);
  for (let press = 0; press < 12; press += 1) {
    stepLaps(setup, 1);
  }
  assert.equal(setup.laps, 9);
});

test('a player starts on the stick with the Go button, not ready, and keeps what they choose', () => {
  const setup = createSetup();
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'stick', autoAccelerate: false, ready: false });
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, true);
  applyChoice(setup, 'ana', { choice: 'autoAccelerate', value: true }, true);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'tilt', autoAccelerate: true, ready: true });
  assert.deepEqual(playerSetup(setup, 'bo'), { steering: 'stick', autoAccelerate: false, ready: false }, 'others are not affected');
});

test('odd choices from a phone are ignored', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'wheel' }, true);
  applyChoice(setup, 'ana', { choice: 'autoAccelerate', value: 'yes' }, true);
  applyChoice(setup, 'ana', { choice: 'ready', value: 1 }, true);
  applyChoice(setup, 'ana', { choice: 'laps', value: 20 }, true);
  applyChoice(setup, 'ana', {}, true);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'stick', autoAccelerate: false, ready: false });
  assert.equal(setup.laps, 3, 'phones cannot set the laps');
});

test('steering can change during a race (tilt failing after a reload), ready cannot', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, false);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, false);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'tilt', autoAccelerate: false, ready: false });
});

test('the race can start once everyone is connected and ready', () => {
  const setup = createSetup();
  assert.equal(canStartRace(setup, []), false, 'not with nobody');
  assert.equal(canStartRace(setup, [ana, bo]), false);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  assert.deepEqual(playersHoldingUpStart(setup, [ana, bo]), [bo]);
  applyChoice(setup, 'bo', { choice: 'ready', value: true }, true);
  assert.equal(canStartRace(setup, [ana, bo]), true);
  const boAway = { ...bo, connected: false };
  assert.deepEqual(playersHoldingUpStart(setup, [ana, boAway]), [boAway], 'a dropped player holds the start up');
  assert.equal(canStartRace(setup, [ana, boAway]), false);
});

test('before the next race everyone is not ready again, with their control style kept', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, true);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  stepLaps(setup, 1);
  clearReady(setup);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'tilt', autoAccelerate: false, ready: false });
  assert.equal(setup.laps, 4);
});

test('a player who left is forgotten', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, true);
  forgetPlayer(setup, 'ana');
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'stick', autoAccelerate: false, ready: false });
});
