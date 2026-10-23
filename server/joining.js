// Gives controllers their slot: a first JOIN takes a new slot, a REJOIN with the right token takes back a held one.
// Used by server/relay.js. Each function returns the controller's session, or null after refusing the socket.

import { MESSAGE_TYPES, JOIN_FAILURE_REASONS } from '../shared/protocol.js';
import { findRoom, addPlayer, findPlayerWithToken } from './rooms.js';
import { send } from './messages.js';

export function joinRoom(socket, message) {
  const room = findRoom(String(message.roomCode).toUpperCase());
  if (!room) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.NO_SUCH_ROOM);
    return null;
  }
  if (!room.isOpen) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.GAME_IN_PROGRESS);
    return null;
  }
  const slot = addPlayer(room, socket);
  if (!slot) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.ROOM_FULL);
    return null;
  }
  console.log(`Player ${slot.playerId} joined room ${room.roomCode}`);
  sendJoined(room, slot);
  send(room.hostSocket, { type: MESSAGE_TYPES.PLAYER_JOINED, playerId: slot.playerId });
  return { role: 'controller', room, slot };
}

export function rejoinRoom(socket, message) {
  const room = findRoom(String(message.roomCode).toUpperCase());
  if (!room) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.NO_SUCH_ROOM);
    return null;
  }
  const slot = findPlayerWithToken(room, message.playerId, message.token);
  if (!slot) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.REJOIN_REFUSED);
    return null;
  }
  // The old socket can still look open: the phone knows it is dead, but the heartbeat has not caught it yet.
  // Point the slot at the new socket first, so that when the old one's close event fires, endSession sees
  // it is no longer the slot's socket and does not mark the player disconnected.
  const oldSocket = slot.socket;
  slot.socket = socket;
  oldSocket?.terminate();
  console.log(`Player ${slot.playerId} rejoined room ${room.roomCode}`);
  sendJoined(room, slot);
  send(room.hostSocket, { type: MESSAGE_TYPES.PLAYER_RECONNECTED, playerId: slot.playerId });
  return { role: 'controller', room, slot };
}

function sendJoined(room, slot) {
  send(slot.socket, {
    type: MESSAGE_TYPES.JOINED,
    roomCode: room.roomCode,
    playerId: slot.playerId,
    token: slot.token,
  });
}

// ws sends queued messages before the close frame, so the controller always sees the reason.
function refuseJoin(socket, reason) {
  send(socket, { type: MESSAGE_TYPES.JOIN_FAILED, reason });
  socket.close();
}
