// Frees player slots: when the host's grace period runs out, when the host kicks a player, and when a player
// taps "Leave game". Used by server/relay.js. Every path that frees a slot ends with PLAYER_LEFT to the host.

import { MESSAGE_TYPES } from '../shared/protocol.js';
import { findRoom, findPlayerWithToken, removePlayer } from './rooms.js';
import { send } from './messages.js';

// The host's grace period ran out (REMOVE_PLAYER).
export function removeDisconnectedPlayer(room, playerId) {
  const slot = room.players.get(playerId);
  if (!slot) {
    return;
  }
  if (slot.socket !== null) {
    // The player rejoined just before the host's timer ran out; the host gets PLAYER_RECONNECTED instead.
    console.log(`Not removing player ${playerId} from room ${room.roomCode}: they are connected again`);
    return;
  }
  freeSlot(room, slot, 'grace period over');
}

// The host removed the player (KICK_PLAYER), whether they are connected or not.
export function kickPlayer(room, playerId) {
  const slot = room.players.get(playerId);
  if (!slot) {
    return;
  }
  const socket = slot.socket;
  freeSlot(room, slot, 'removed by the host');
  // Sent before the close frame, so the phone learns why it was dropped and does not try to rejoin.
  send(socket, { type: MESSAGE_TYPES.KICKED });
  socket?.close();
}

// The player left on purpose (LEAVE), from `socket`.
export function leaveRoom(room, slot, socket) {
  // Only the slot's current socket may give the slot up, and only once.
  if (slot.socket !== socket || room.players.get(slot.playerId) !== slot) {
    return;
  }
  freeSlot(room, slot, 'left');
  socket.close();
}

// A LEAVE as the first message of a new socket: the phone's own socket was down when the player tapped Leave.
// The token proves the slot is theirs, exactly as for a rejoin. The phone always gets LEFT, even when there was
// nothing to free (slot already gone, or a wrong token), because all it needs to know is to stop retrying.
export function leaveWithToken(socket, message) {
  const room = findRoom(String(message.roomCode).toUpperCase());
  const slot = room ? findPlayerWithToken(room, message.playerId, message.token) : null;
  if (slot) {
    // The old socket may still look open to us (the heartbeat has not caught it yet), so cut it.
    const oldSocket = slot.socket;
    freeSlot(room, slot, 'left while their socket was down');
    oldSocket?.terminate();
  }
  send(socket, { type: MESSAGE_TYPES.LEFT });
  socket.close();
}

// Setting the socket to null first means the close event that follows is not reported as a disconnect.
function freeSlot(room, slot, reason) {
  slot.socket = null;
  removePlayer(room, slot.playerId);
  console.log(`Player ${slot.playerId} removed from room ${room.roomCode} (${reason})`);
  send(room.hostSocket, { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: slot.playerId });
}
