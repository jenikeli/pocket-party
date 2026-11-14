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
  startBlocker,
} from '../../host/kart/setup.js';

const ana = { playerId: 'ana', colorIndex: 0, name: 'Ana', connected: true };
const bo = { playerId: 'bo', colorIndex: 1, name: 'Bo', connected: true };

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
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'stick', autoAccelerate: false, leftHanded: false, ready: false });
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, true);
  applyChoice(setup, 'ana', { choice: 'autoAccelerate', value: true }, true);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'tilt', autoAccelerate: true, leftHanded: false, ready: true });
  assert.deepEqual(playerSetup(setup, 'bo'), { steering: 'stick', autoAccelerate: false, leftHanded: false, ready: false }, 'others are not affected');
});

test('odd choices from a phone are ignored', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'wheel' }, true);
  applyChoice(setup, 'ana', { choice: 'autoAccelerate', value: 'yes' }, true);
  applyChoice(setup, 'ana', { choice: 'ready', value: 1 }, true);
  applyChoice(setup, 'ana', { choice: 'laps', value: 20 }, true);
  applyChoice(setup, 'ana', {}, true);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'stick', autoAccelerate: false, leftHanded: false, ready: false });
  assert.equal(setup.laps, 3, 'phones cannot set the laps');
});

test('steering can change during a race (tilt failing after a reload), ready cannot', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, false);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, false);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'tilt', autoAccelerate: false, leftHanded: false, ready: false });
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

test('the line above Start race says why the race cannot start, and is empty when it can', () => {
  const setup = createSetup();
  assert.equal(startBlocker(setup, []), 'Needs a player');
  assert.equal(startBlocker(setup, [], 2), 'Needs 2 players');
  assert.equal(startBlocker(setup, [ana], 2), 'Needs 2 players', 'one player is too few for a race of 2');
  assert.equal(startBlocker(setup, [ana, bo], 2), 'Waiting for Ana, Bo');
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  assert.equal(startBlocker(setup, [ana, bo], 2), 'Waiting for Bo');
  applyChoice(setup, 'bo', { choice: 'ready', value: true }, true);
  assert.equal(startBlocker(setup, [ana, bo], 2), '');
  assert.equal(startBlocker(setup, [ana], 1), '', 'the 3D race can start with one player');
});

test('the race needs the players the game asks for, ready, before it can start', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  assert.equal(canStartRace(setup, [ana]), true);
  assert.equal(canStartRace(setup, [ana], 2), false, 'the 2D race needs 2');
});

test('before the next race everyone is not ready again, with their control style kept', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, true);
  applyChoice(setup, 'ana', { choice: 'ready', value: true }, true);
  stepLaps(setup, 1);
  clearReady(setup);
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'tilt', autoAccelerate: false, leftHanded: false, ready: false });
  assert.equal(setup.laps, 4);
});

test('a player who left is forgotten', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'steering', value: 'tilt' }, true);
  forgetPlayer(setup, 'ana');
  assert.deepEqual(playerSetup(setup, 'ana'), { steering: 'stick', autoAccelerate: false, leftHanded: false, ready: false });
});

test('left-handed can change at any time, and only a true or false counts', () => {
  const setup = createSetup();
  applyChoice(setup, 'ana', { choice: 'leftHanded', value: true }, true);
  assert.equal(playerSetup(setup, 'ana').leftHanded, true);
  applyChoice(setup, 'ana', { choice: 'leftHanded', value: 'yes' }, true);
  assert.equal(playerSetup(setup, 'ana').leftHanded, true, 'odd values are ignored');
  applyChoice(setup, 'ana', { choice: 'leftHanded', value: false }, false);
  assert.equal(playerSetup(setup, 'ana').leftHanded, false, 'also during a race');
});

test('a colour is picked through the shell only on the setup screen', () => {
  const setup = createSetup();
  const picks = [];
  const pickColor = (playerId, colorIndex) => picks.push([playerId, colorIndex]);
  applyChoice(setup, 'ana', { choice: 'color', value: 4 }, true, pickColor);
  applyChoice(setup, 'ana', { choice: 'color', value: 5 }, false, pickColor);
  assert.deepEqual(picks, [['ana', 4]]);
});
