// The room table: which host socket owns each room code, and the player slots in it.
// Used by server/relay.js. Holds no game rules, only who is connected where.

import crypto from 'node:crypto';
import { MAX_PLAYERS } from '../shared/protocol.js';

// No I or O, so codes cannot be confused with 1 and 0 when read off a TV.
const ROOM_CODE_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const ROOM_CODE_LENGTH = 4;

// roomCode -> { roomCode, hostSocket, players: Map(playerId -> { playerId, token, socket }) }
const rooms = new Map();

export function createRoom(hostSocket) {
  const roomCode = generateUnusedRoomCode();
  const room = { roomCode, hostSocket, players: new Map() };
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

// Returns the new slot, or null if the room is full.
export function addPlayer(room, socket) {
  if (room.players.size >= MAX_PLAYERS) {
    return null;
  }
  const slot = {
    playerId: crypto.randomBytes(4).toString('hex'),
    // 128 random bits: the only thing that proves a later rejoin (M4) comes from the same phone.
    token: crypto.randomBytes(16).toString('hex'),
    socket,
  };
  room.players.set(slot.playerId, slot);
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
