// Unit tests for Spirefall's A0 pieces: the protocol constants, the seats (host/games/arena/seats.js) and what
// phones are told (host/games/arena/views.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { INPUT_KINDS, ARENA_CHOICES, ARENA_TEAMS } from '../../shared/protocol.js';
import { buildSeats, takeOverSeat, teamHasHuman, seatOf, everyoneReady } from '../../host/games/arena/seats.js';
import { setupView, fullView } from '../../host/games/arena/views.js';

const { DAWN, DUSK } = ARENA_TEAMS;
const person = (playerId, team = null) => ({ playerId, team });

test('protocol: Spirefall has a place input, two choices and two teams', () => {
  assert.equal(INPUT_KINDS.PLACE, 'place');
  assert.deepEqual({ ...ARENA_CHOICES }, { READY: 'ready', TEAM: 'team', DECK: 'deck', EMOTE: 'emote', FORFEIT: 'forfeit' });
  assert.deepEqual({ ...ARENA_TEAMS }, { DAWN: 0, DUSK: 1 });
});

test('seats: nobody in a 1v1 gives two CPU seats, one per team', () => {
  const { seats, overflow } = buildSeats('1v1', []);
  assert.deepEqual(seats.map((seat) => [seat.team, seat.playerId]), [[DAWN, null], [DUSK, null]]);
  assert.deepEqual(overflow, []);
});

test('seats: alone you are Dawn, a second phone is Dusk, a third has no seat', () => {
  assert.equal(buildSeats('1v1', [person('a')]).seats[0].playerId, 'a');
  const two = buildSeats('1v1', [person('a'), person('b')]);
  assert.deepEqual(two.seats.map((seat) => seat.playerId), ['a', 'b']);
  const three = buildSeats('1v1', [person('a'), person('b'), person('c')]);
  assert.deepEqual(three.overflow, ['c']);
});

test('seats: a team choice is honoured while the team has room, then the other team', () => {
  assert.equal(seatOf(buildSeats('1v1', [person('a', DUSK)]).seats, 'a').team, DUSK);
  const both = buildSeats('1v1', [person('a', DUSK), person('b', DUSK)]);
  assert.equal(seatOf(both.seats, 'a').team, DUSK);
  assert.equal(seatOf(both.seats, 'b').team, DAWN);
});

test('seats: a 2v2 has four seats, two per team, and empty ones are CPUs', () => {
  const { seats } = buildSeats('2v2', [person('a', DAWN), person('b', DAWN), person('c', DAWN)]);
  assert.equal(seats.length, 4);
  assert.deepEqual(seats.filter((seat) => seat.team === DAWN).map((seat) => seat.playerId), ['a', 'b']);
  assert.deepEqual(seats.filter((seat) => seat.team === DUSK).map((seat) => seat.playerId), ['c', null]);
});

test('seats: with no choice a 2v2 spreads people across the teams', () => {
  const { seats } = buildSeats('2v2', [person('a'), person('b'), person('c'), person('d')]);
  assert.deepEqual(seats.map((seat) => seat.playerId), ['a', 'c', 'b', 'd']);
});

test('seats: a CPU takes a dropped seat, and a team forfeits only with no person left', () => {
  const { seats } = buildSeats('2v2', [person('a', DAWN), person('b', DAWN), person('c', DUSK)]);
  takeOverSeat(seats, 'a');
  assert.ok(teamHasHuman(seats, DAWN));
  takeOverSeat(seats, 'b');
  assert.ok(!teamHasHuman(seats, DAWN));
  assert.ok(teamHasHuman(seats, DUSK));
  assert.equal(seats.filter((seat) => seat.team === DAWN).every((seat) => seat.playerId === null), true);
});

test('views: a seated person sees team, seat, mate and the ready count; an unseated one sees "full"', () => {
  const { seats } = buildSeats('2v2', [person('a', DAWN), person('b', DAWN)]);
  const names = new Map([['a', 'Ana'], ['b', 'Bo']]);
  const ready = new Set(['b']);
  assert.deepEqual(setupView({ seats, mode: '2v2', playerId: 'a', ready, names }), {
    phase: 'setup', mode: '2v2', team: DAWN, seat: 0, ready: false, deck: null, mate: 'Bo', readyCount: 1, peopleCount: 2,
  });
  assert.equal(setupView({ seats, mode: '2v2', playerId: 'b', ready, names }).ready, true);
  assert.deepEqual(fullView('1v1'), { phase: 'full', mode: '1v1' });
});

test('views: a view holds nothing about other players beyond the partner name and counts', () => {
  const { seats } = buildSeats('2v2', [person('a', DAWN), person('b', DUSK)]);
  const view = setupView({ seats, mode: '2v2', playerId: 'a', ready: new Set(), names: new Map([['a', 'Ana'], ['b', 'Bo']]) });
  assert.equal(view.mate, null);
  assert.ok(!JSON.stringify(view).includes('Bo'));
});

test('seats: the match can start only when a person is seated and every seated person is ready', () => {
  const { seats } = buildSeats('2v2', [person('a'), person('b')]);
  assert.equal(everyoneReady(buildSeats('1v1', []).seats, new Set()), false);
  assert.equal(everyoneReady(seats, new Set(['a'])), false);
  assert.equal(everyoneReady(seats, new Set(['a', 'b'])), true);
  assert.equal(everyoneReady(seats, new Set(['a', 'b', 'ghost'])), true);
});
