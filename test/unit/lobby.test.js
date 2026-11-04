// Unit tests for the host's lobby logic: the roster (host/roster.js) and the lobby rules (host/lobby-rules.js).
// Both are plain modules, so they run in Node without Phaser or a browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLAYER_COLORS,
  addPlayer,
  cleanName,
  displayName,
  colorText,
  playersInSlotOrder,
  secondsUntilFreed,
  formatMinutes,
} from '../../host/roster.js';
import {
  MIN_PLAYERS,
  DEFAULT_SETTINGS,
  stepMaxPlayers,
  stepGraceSeconds,
  canStartGame,
  describeWaitingFor,
} from '../../host/lobby-rules.js';
import { MAX_PLAYERS } from '../../shared/protocol.js';

// A roster with `count` connected players, each ready or not as given.
function rosterOf(...readyFlags) {
  const players = new Map();
  readyFlags.forEach((ready, index) => {
    addPlayer(players, `p${index}`).ready = ready;
  });
  return players;
}

test('new players get the lowest free color, and a freed color is reused', () => {
  const players = new Map();
  assert.equal(addPlayer(players, 'a').colorIndex, 0);
  assert.equal(addPlayer(players, 'b').colorIndex, 1);
  assert.equal(addPlayer(players, 'c').colorIndex, 2);
  players.delete('b');
  assert.equal(addPlayer(players, 'd').colorIndex, 1);
  assert.deepEqual(playersInSlotOrder(players).map((player) => player.playerId), ['a', 'd', 'c']);
});

test('a disconnected player keeps their color', () => {
  const players = new Map();
  addPlayer(players, 'a').connected = false;
  assert.equal(addPlayer(players, 'b').colorIndex, 1);
});

test(`there is a color for each of the ${MAX_PLAYERS} slots`, () => {
  assert.equal(new Set(PLAYER_COLORS).size, MAX_PLAYERS);
  const players = new Map();
  addPlayer(players, 'a');
  assert.equal(colorText(players.get('a')), '#e74c3c');
});

test('names are trimmed, stripped of control characters and cut to 12 characters', () => {
  assert.equal(cleanName('  Ana  '), 'Ana');
  assert.equal(cleanName('A\nn\u0007a'), 'Ana');
  assert.equal(cleanName('Bartholomew the Great'), 'Bartholomew ');
  assert.equal(cleanName(undefined), '');
  assert.equal(cleanName(42), '42');
});

test('a player without a name is called by their slot number', () => {
  const players = new Map();
  addPlayer(players, 'a');
  const second = addPlayer(players, 'b');
  assert.equal(displayName(second), 'Player 2');
  second.name = 'Ana';
  assert.equal(displayName(second), 'Ana');
});

test('the grace countdown rounds up, stops at 0, and shows as minutes', () => {
  const player = { graceEndsAt: 10000 };
  assert.equal(secondsUntilFreed(player, 0), 10);
  assert.equal(secondsUntilFreed(player, 9001), 1);
  assert.equal(secondsUntilFreed(player, 20000), 0);
  assert.equal(formatMinutes(120), '2:00');
  assert.equal(formatMinutes(65), '1:05');
  assert.equal(formatMinutes(0), '0:00');
});

// Changed on purpose after the M4 device run: the grace period default went from 2 minutes to 30 seconds.
test('the defaults are 6 players and a 30 second grace period', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { maxPlayers: 6, graceSeconds: 30 });
});

test(`max players steps by one between ${MIN_PLAYERS} and ${MAX_PLAYERS}, and not below the players present`, () => {
  assert.equal(stepMaxPlayers(6, 1, 0), 7);
  assert.equal(stepMaxPlayers(6, -1, 0), 5);
  assert.equal(stepMaxPlayers(MAX_PLAYERS, 1, 0), MAX_PLAYERS);
  assert.equal(stepMaxPlayers(MIN_PLAYERS, -1, 0), MIN_PLAYERS);
  assert.equal(stepMaxPlayers(4, -1, 4), 4);
});

test('the grace period steps by 30 seconds between 30 seconds and 10 minutes', () => {
  assert.equal(stepGraceSeconds(120, 1), 150);
  assert.equal(stepGraceSeconds(120, -1), 90);
  assert.equal(stepGraceSeconds(30, -1), 30);
  assert.equal(stepGraceSeconds(600, 1), 600);
});

// A registry entry like those in host/games/index.js, which the unit tests cannot import (it uses browser paths).
const TWO_TO_THREE = { id: 'test-game', title: 'Test game', minPlayers: 2, maxPlayers: 3 };

test('the game starts only with a player count in the game\'s range, all connected and ready', () => {
  assert.equal(canStartGame(rosterOf(), TWO_TO_THREE), false);
  assert.equal(canStartGame(rosterOf(true), TWO_TO_THREE), false);
  assert.equal(canStartGame(rosterOf(true, false), TWO_TO_THREE), false);
  assert.equal(canStartGame(rosterOf(true, true), TWO_TO_THREE), true);
  assert.equal(canStartGame(rosterOf(true, true, true), TWO_TO_THREE), true);
  assert.equal(canStartGame(rosterOf(true, true, true, true), TWO_TO_THREE), false);

  const withDropped = rosterOf(true, true);
  withDropped.get('p1').connected = false;
  assert.equal(canStartGame(withDropped, TWO_TO_THREE), false);
});

test('a game that takes no players (the 3D race, for Watch) starts with an empty room', () => {
  const noneToFour = { id: 'test-game', title: 'Test game', minPlayers: 0, maxPlayers: 4 };
  assert.equal(canStartGame(rosterOf(), noneToFour), true);
  assert.equal(canStartGame(rosterOf(false), noneToFour), false, 'a player in the room must still be ready');
});

test('the lobby says what it is waiting for', () => {
  assert.equal(describeWaitingFor(rosterOf(true), TWO_TO_THREE), 'Waiting for players (at least 2)');
  assert.equal(describeWaitingFor(rosterOf(true, false), TWO_TO_THREE), 'Waiting for 1 player to be ready');
  assert.equal(describeWaitingFor(rosterOf(false, false, true), TWO_TO_THREE), 'Waiting for 2 players to be ready');
  assert.equal(describeWaitingFor(rosterOf(true, true, true, true), TWO_TO_THREE), 'Test game takes at most 3 players');
  const withDropped = rosterOf(true, true);
  withDropped.get('p0').connected = false;
  assert.equal(describeWaitingFor(withDropped, TWO_TO_THREE), 'Waiting for a player to reconnect');
});
