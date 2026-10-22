// Unit tests for server/rooms.js: room codes and the player-slot table.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRoom,
  findRoom,
  deleteRoom,
  listRooms,
  setPlayerLimit,
  addPlayer,
  findPlayerWithToken,
  removePlayer,
} from '../../server/rooms.js';
import { MAX_PLAYERS } from '../../shared/protocol.js';

// rooms.js keeps one table for the whole process, so empty it between tests.
afterEach(() => {
  for (const room of listRooms()) {
    deleteRoom(room);
  }
});

// The table only stores sockets, never calls them, so any object will do.
const fakeSocket = () => ({});

test('room codes are 4 letters with no I or O', () => {
  for (let i = 0; i < 200; i += 1) {
    assert.match(createRoom(fakeSocket()).roomCode, /^[A-HJ-NP-Z]{4}$/);
  }
});

test('every room gets a different code', () => {
  const codes = new Set();
  for (let i = 0; i < 200; i += 1) {
    codes.add(createRoom(fakeSocket()).roomCode);
  }
  assert.equal(codes.size, 200);
});

test('findRoom returns the room for its code, and null once deleted', () => {
  const hostSocket = fakeSocket();
  const room = createRoom(hostSocket);
  assert.equal(findRoom(room.roomCode), room);
  assert.equal(room.hostSocket, hostSocket);

  deleteRoom(room);
  assert.equal(findRoom(room.roomCode), null);
  assert.deepEqual(listRooms(), []);
});

test('findRoom returns null for an unknown code', () => {
  assert.equal(findRoom('ZZZZ'), null);
});

test('listRooms returns every open room', () => {
  const first = createRoom(fakeSocket());
  const second = createRoom(fakeSocket());
  assert.deepEqual(listRooms(), [first, second]);
});

test('addPlayer gives each player a random id and a 128-bit token', () => {
  const room = createRoom(fakeSocket());
  const socket = fakeSocket();
  const slot = addPlayer(room, socket);

  assert.match(slot.playerId, /^[0-9a-f]{8}$/);
  assert.match(slot.token, /^[0-9a-f]{32}$/);
  assert.equal(slot.socket, socket);
  assert.equal(room.players.get(slot.playerId), slot);

  const other = addPlayer(room, fakeSocket());
  assert.notEqual(other.playerId, slot.playerId);
  assert.notEqual(other.token, slot.token);
});

test(`addPlayer accepts ${MAX_PLAYERS} players, then returns null`, () => {
  const room = createRoom(fakeSocket());
  for (let i = 0; i < MAX_PLAYERS; i += 1) {
    assert.ok(addPlayer(room, fakeSocket()), `player ${i + 1} should fit`);
  }
  assert.equal(addPlayer(room, fakeSocket()), null);
  assert.equal(room.players.size, MAX_PLAYERS);
});

test('removePlayer frees the slot for someone else', () => {
  const room = createRoom(fakeSocket());
  const slots = [];
  for (let i = 0; i < MAX_PLAYERS; i += 1) {
    slots.push(addPlayer(room, fakeSocket()));
  }
  removePlayer(room, slots[0].playerId);
  assert.equal(room.players.has(slots[0].playerId), false);
  assert.ok(addPlayer(room, fakeSocket()));
});

test('rooms do not share players', () => {
  const first = createRoom(fakeSocket());
  const second = createRoom(fakeSocket());
  addPlayer(first, fakeSocket());
  assert.equal(first.players.size, 1);
  assert.equal(second.players.size, 0);
});

test('setPlayerLimit caps new joins, clamps to 1..MAX_PLAYERS, and ignores non-whole numbers', () => {
  const room = createRoom(fakeSocket());
  assert.equal(room.playerLimit, MAX_PLAYERS);

  assert.equal(setPlayerLimit(room, 2), true);
  assert.ok(addPlayer(room, fakeSocket()));
  assert.ok(addPlayer(room, fakeSocket()));
  assert.equal(addPlayer(room, fakeSocket()), null);

  setPlayerLimit(room, 99);
  assert.equal(room.playerLimit, MAX_PLAYERS);
  setPlayerLimit(room, 0);
  assert.equal(room.playerLimit, 1);
  for (const bad of [2.5, '3', null, undefined, NaN]) {
    assert.equal(setPlayerLimit(room, bad), false);
    assert.equal(room.playerLimit, 1);
  }
});

test('lowering the limit keeps the players already in', () => {
  const room = createRoom(fakeSocket());
  addPlayer(room, fakeSocket());
  addPlayer(room, fakeSocket());
  setPlayerLimit(room, 1);
  assert.equal(room.players.size, 2);
  assert.equal(addPlayer(room, fakeSocket()), null);
});

test('findPlayerWithToken needs both the playerId and its exact token', () => {
  const room = createRoom(fakeSocket());
  const slot = addPlayer(room, fakeSocket());
  const other = addPlayer(room, fakeSocket());

  assert.equal(findPlayerWithToken(room, slot.playerId, slot.token), slot);
  assert.equal(findPlayerWithToken(room, slot.playerId, other.token), null);
  assert.equal(findPlayerWithToken(room, slot.playerId, slot.token.toUpperCase()), null);
  assert.equal(findPlayerWithToken(room, slot.playerId, slot.token.slice(1)), null);
  assert.equal(findPlayerWithToken(room, slot.playerId, undefined), null);
  assert.equal(findPlayerWithToken(room, slot.playerId, { length: 32 }), null);
  assert.equal(findPlayerWithToken(room, 'deadbeef', slot.token), null);
  removePlayer(room, slot.playerId);
  assert.equal(findPlayerWithToken(room, slot.playerId, slot.token), null);
});
