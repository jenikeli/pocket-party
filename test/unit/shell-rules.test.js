// Unit tests for the host's player roster (host/roster.js) and the shell's rules (host/shell-rules.js): the
// hold time setting and the game picker's player range. Both are plain modules, so they run in Node.

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
  DEFAULT_GRACE_SECONDS,
  stepGraceSeconds,
  readGraceSeconds,
  storeGraceSeconds,
  playerRangeText,
} from '../../host/shell-rules.js';
import { MAX_PLAYERS } from '../../shared/protocol.js';

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
test('a dropped player is held for 30 seconds unless the host changed it', () => {
  assert.equal(DEFAULT_GRACE_SECONDS, 30);
  assert.equal(readGraceSeconds(fakeStorage()), 30);
});

test('the grace period steps by 30 seconds between 30 seconds and 10 minutes', () => {
  assert.equal(stepGraceSeconds(120, 1), 150);
  assert.equal(stepGraceSeconds(120, -1), 90);
  assert.equal(stepGraceSeconds(30, -1), 30);
  assert.equal(stepGraceSeconds(600, 1), 600);
});

// A localStorage stand-in: a Map behind getItem and setItem, which return null and store strings as the real one.
function fakeStorage() {
  const items = new Map();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, String(value)),
  };
}

// M10b: no room outlives its game, so the hold time is kept in the host's own storage.
test('the hold time is stored, and read back on the next visit', () => {
  const storage = fakeStorage();
  storeGraceSeconds(storage, 90);
  assert.equal(readGraceSeconds(storage), 90);
});

test('a stored hold time that is not one of the steps, or storage that fails, gives the default', (t) => {
  t.mock.method(console, 'warn', () => {});
  const storage = fakeStorage();
  for (const stored of ['45', '0', '900', 'abc', '']) {
    storage.setItem('pocket-party-grace-seconds', stored);
    assert.equal(readGraceSeconds(storage), 30, `"${stored}" reads as the default`);
  }
  const broken = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  assert.equal(readGraceSeconds(broken), 30);
  storeGraceSeconds(broken, 60);
  assert.equal(readGraceSeconds(null), 30, 'no storage at all');
  storeGraceSeconds(null, 60);
});

// Registry entries like those in host/games/index.js, which the unit tests cannot import (it uses browser paths).
test('the picker shows how many play a game, and a game that starts with nobody reads from 1', () => {
  assert.equal(playerRangeText({ minPlayers: 0, maxPlayers: 4 }), '1 to 4');
  assert.equal(playerRangeText({ minPlayers: 2, maxPlayers: MAX_PLAYERS }), `2 to ${MAX_PLAYERS}`);
  assert.equal(playerRangeText({ minPlayers: 1, maxPlayers: MAX_PLAYERS }), `1 to ${MAX_PLAYERS}`);
});
