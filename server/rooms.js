// The room table: which host socket owns each room code, and the player slots in it.
// Used by server/relay.js. Holds no game rules, only who has a slot where and whether they are connected.

import crypto from 'node:crypto';
import { MAX_PLAYERS } from '../shared/protocol.js';

// No I or O, so codes cannot be confused with 1 and 0 when read off a TV.
const ROOM_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_LENGTH = 4;

// roomCode -> { roomCode, hostSocket, isOpen, playerLimit, players: Map(playerId -> slot) }
// isOpen is false while the host runs a game, so new players are refused (rejoins still work).
// A slot is { playerId, token, socket }. Its socket is null while the player is disconnected: the slot is
// kept for them until the host says to free it (the host runs the grace period).
const rooms = new Map();

export function createRoom(hostSocket) {
  const roomCode = generateUnusedRoomCode();
  const room = { roomCode, hostSocket, isOpen: true, playerLimit: MAX_PLAYERS, players: new Map() };
  rooms.set(roomCode, room);
  return room;
}

export function findRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

export function deleteRoom(room) {
  rooms.delete(room.roomCode);
}

export function listRooms() {
  return [...rooms.values()];
}

// Sets how many slots the room hands out, clamped to 1..MAX_PLAYERS. Returns false (and changes nothing)
// if `limit` is not a whole number. Slots already taken are kept even if the new limit is lower.
export function setPlayerLimit(room, limit) {
  if (!Number.isInteger(limit)) {
    return false;
  }
  room.playerLimit = Math.min(Math.max(limit, 1), MAX_PLAYERS);
  return true;
}

// Returns the new slot, or null if the room is full. Disconnected slots count: they are still someone's.
export function addPlayer(room, socket) {
  if (room.players.size >= room.playerLimit) {
    return null;
  }
  const slot = {
    playerId: crypto.randomBytes(4).toString('hex'),
    // 128 random bits: the only thing that proves a later rejoin comes from the same phone.
    token: crypto.randomBytes(16).toString('hex'),
    socket,
  };
  room.players.set(slot.playerId, slot);
  return slot;
}

// Returns the slot only if both the playerId and its token match, else null.
export function findPlayerWithToken(room, playerId, token) {
  const slot = room.players.get(playerId);
  if (!slot || typeof token !== 'string') {
    return null;
  }
  const expected = Buffer.from(slot.token);
  const given = Buffer.from(token);
  // timingSafeEqual takes as long whichever character differs, so timing cannot reveal a partly right guess.
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    return null;
  }
  return slot;
}

export function removePlayer(room, playerId) {
  room.players.delete(playerId);
}

function generateUnusedRoomCode() {
  // About 330,000 possible codes and only a handful of rooms, so this loop almost never repeats.
  while (true) {
    let roomCode = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i += 1) {
      roomCode += ROOM_CODE_LETTERS[crypto.randomInt(ROOM_CODE_LETTERS.length)];
    }
    if (!rooms.has(roomCode)) {
      return roomCode;
    }
  }
}
