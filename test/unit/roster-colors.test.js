// Unit tests for the colour picking in host/roster.js: changeColor, colorChoices and the colour names.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addPlayer, changeColor, colorChoices, displayName, PLAYER_COLORS, PLAYER_COLOR_NAMES } from '../../host/roster.js';

function roomOf(...playerIds) {
  const players = new Map();
  playerIds.forEach((playerId) => addPlayer(players, playerId));
  return players;
}

test('every colour has a name', () => {
  assert.equal(PLAYER_COLOR_NAMES.length, PLAYER_COLORS.length);
  assert.deepEqual(PLAYER_COLOR_NAMES.slice(0, 3), ['Red', 'Blue', 'Green']);
});

test('a player takes a free colour, and their old one is free for the next', () => {
  const players = roomOf('a', 'b');
  assert.equal(changeColor(players, 'a', 5), true);
  assert.equal(players.get('a').colorIndex, 5);
  assert.equal(changeColor(players, 'b', 0), true, 'the colour a left is free now');
});

test('a colour another player holds cannot be taken, a dropped player included', () => {
  const players = roomOf('a', 'b');
  assert.equal(changeColor(players, 'b', 0), false);
  assert.equal(players.get('b').colorIndex, 1, 'b keeps their colour');
  players.get('a').connected = false;
  assert.equal(changeColor(players, 'b', 0), false, 'a is only in their grace time and may come back');
});

test('your own colour is yours: picking it again succeeds', () => {
  const players = roomOf('a');
  assert.equal(changeColor(players, 'a', 0), true);
});

test('an unknown player, or a colour that is not a slot, changes nothing', () => {
  const players = roomOf('a');
  assert.equal(changeColor(players, 'nobody', 3), false);
  for (const colorIndex of [-1, 12, 1.5, '3', null, undefined, NaN]) {
    assert.equal(changeColor(players, 'a', colorIndex), false, `${colorIndex} is not a slot`);
  }
  assert.equal(players.get('a').colorIndex, 0);
});

test('colorChoices lists every slot with who holds it, except the asking player themselves', () => {
  const players = roomOf('a', 'b');
  players.get('b').name = 'Bo';
  const choices = colorChoices(players, 'a');
  assert.equal(choices.length, PLAYER_COLORS.length);
  assert.deepEqual(choices[0], { color: '#e74c3c', name: 'Red', takenBy: null });
  assert.deepEqual(choices[1], { color: '#3498db', name: 'Blue', takenBy: 'Bo' });
  assert.equal(choices[2].takenBy, null);
  assert.equal(colorChoices(players, 'b')[0].takenBy, 'Red', 'a player with no name is called by their colour');
});

test('a player with no name is called by their colour, which follows a colour change', () => {
  const players = roomOf('a');
  assert.equal(displayName(players.get('a')), 'Red');
  changeColor(players, 'a', 6);
  assert.equal(displayName(players.get('a')), 'Teal');
  players.get('a').name = 'Ana';
  assert.equal(displayName(players.get('a')), 'Ana');
});
