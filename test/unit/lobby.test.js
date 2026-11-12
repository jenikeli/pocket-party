// Unit tests for the host's lobby logic: the roster (host/roster.js) and the lobby rules (host/lobby-rules.js).
// Both are plain modules, so they run in Node without a browser.

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
import { DEFAULT_SETTINGS, stepGraceSeconds, canPickGame } from '../../host/lobby-rules.js';
import { MAX_PLAYERS } from '../../shared/protocol.js';

// A roster of `count` connected players.
function rosterOf(count) {
  const players = new Map();
  for (let index = 0; index < count; index += 1) {
    addPlayer(players, `p${index}`);
  }
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

// Changed on purpose after the M4 device run: the grace period default went from 2 minutes to 30 seconds. The max
// players setting went in M10: each game's own limit applies.
test('the only room setting is a 30 second grace period', () => {
  assert.deepEqual(DEFAULT_SETTINGS, { graceSeconds: 30 });
});

test('the grace period steps by 30 seconds between 30 seconds and 10 minutes', () => {
  assert.equal(stepGraceSeconds(120, 1), 150);
  assert.equal(stepGraceSeconds(120, -1), 90);
  assert.equal(stepGraceSeconds(30, -1), 30);
  assert.equal(stepGraceSeconds(600, 1), 600);
});

// Registry entries like those in host/games/index.js, which the unit tests cannot import (it uses browser paths).
const TWO_TO_THREE = { id: 'test-game', title: 'Test game', minPlayers: 2, maxPlayers: 3 };
const NONE_TO_FOUR = { id: 'test-race', title: 'Test race', minPlayers: 0, maxPlayers: 4 };
const ONE_TO_NINE = { id: 'test-solo', title: 'Test solo', minPlayers: 1, maxPlayers: MAX_PLAYERS };

test('a game can be picked with a player count in its range, edges included', () => {
  assert.deepEqual(canPickGame(rosterOf(1), TWO_TO_THREE), {
    ok: false,
    reason: 'Test game needs at least 2 players',
  });
  assert.deepEqual(canPickGame(rosterOf(2), TWO_TO_THREE), { ok: true, reason: '' });
  assert.deepEqual(canPickGame(rosterOf(3), TWO_TO_THREE), { ok: true, reason: '' });
  assert.deepEqual(canPickGame(rosterOf(4), TWO_TO_THREE), {
    ok: false,
    reason: 'Test game takes at most 3 players',
  });
});

test('a game that takes no players (the 3D race, for Watch) can be picked in an empty room', () => {
  assert.equal(canPickGame(rosterOf(0), NONE_TO_FOUR).ok, true);
  assert.equal(canPickGame(rosterOf(4), NONE_TO_FOUR).ok, true);
  assert.equal(canPickGame(rosterOf(5), NONE_TO_FOUR).reason, 'Test race takes at most 4 players');
});

test('a game for one player or more says "player", not "players"', () => {
  assert.equal(canPickGame(rosterOf(0), ONE_TO_NINE).reason, 'Test solo needs at least 1 player');
  assert.equal(canPickGame(rosterOf(MAX_PLAYERS), ONE_TO_NINE).ok, true);
});

test('there is no ready step: unready and dropped players count and do not block', () => {
  const players = rosterOf(2);
  const dropped = players.get('p1');
  dropped.connected = false;
  dropped.graceEndsAt = Date.now() + 30000;
  assert.equal(canPickGame(players, TWO_TO_THREE).ok, true);
  assert.equal('ready' in players.get('p0'), false, 'a roster player has no ready flag');
});
