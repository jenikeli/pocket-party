// WebSocket relay: lets a host create a room, lets controllers join or rejoin it, and passes messages
// between them. Used by server/index.js. It never looks inside an input; game logic lives on the host.

import { WebSocketServer } from 'ws';
import { SOCKET_PATH, MESSAGE_TYPES } from '../shared/protocol.js';
import { createRoom, findRoom, deleteRoom, listRooms, setPlayerLimit } from './rooms.js';
import { joinRoom, rejoinRoom } from './joining.js';
import { removeDisconnectedPlayer, kickPlayer, leaveRoom, leaveWithToken } from './leaving.js';
import { parseMessage, send } from './messages.js';
import { startHeartbeat } from './heartbeat.js';

// Inputs are tiny. A low cap stops one misbehaving client from making the server buffer megabytes.
const MAX_MESSAGE_BYTES = 16 * 1024;

// Controller messages the server passes on to the host unchanged, apart from adding the sender's playerId.
const FORWARDED_TO_HOST = new Set([
  MESSAGE_TYPES.INPUT,
  MESSAGE_TYPES.INPUT_MODE,
  MESSAGE_TYPES.DEVICE_INFO,
  MESSAGE_TYPES.PLAYER_NAME,
  MESSAGE_TYPES.SET_READY,
  MESSAGE_TYPES.PONG,
]);

// Host messages the server passes on to the one player named by their playerId (removed on the way).
const FORWARDED_TO_PLAYER = new Set([MESSAGE_TYPES.PING, MESSAGE_TYPES.CONTROLLER_STATE]);

// Shares the HTTP(S) server's port: the browser asks to "upgrade" a normal request on /ws into a WebSocket.
// With HTTPS that upgrade happens inside TLS, which is what makes the connection wss://.
export function attachRelay(httpServer) {
  const socketServer = new WebSocketServer({
    server: httpServer,
    path: SOCKET_PATH,
    maxPayload: MAX_MESSAGE_BYTES,
  });
  socketServer.on('connection', handleConnection);
  startHeartbeat(socketServer);
}

export function sendToAllHosts(message) {
  for (const room of listRooms()) {
    send(room.hostSocket, message);
  }
}

function handleConnection(socket) {
  // What this socket is, decided by its first message:
  // { role: 'host', room } or { role: 'controller', room, slot }. null until then.
  let session = null;

  socket.on('message', (data) => {
    const message = parseMessage(data);
    if (!message) {
      return;
    }
    if (session === null) {
      session = startSession(socket, message);
    } else if (session.role === 'controller') {
      handleControllerMessage(socket, session, message);
    } else {
      handleHostMessage(session, message);
    }
  });

  socket.on('close', () => {
    if (session !== null) {
      endSession(socket, session);
    }
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
}

function startSession(socket, message) {
  switch (message.type) {
    case MESSAGE_TYPES.CREATE_ROOM:
      return startHostSession(socket);
    case MESSAGE_TYPES.JOIN:
      return joinRoom(socket, message);
    case MESSAGE_TYPES.REJOIN:
      return rejoinRoom(socket, message);
    case MESSAGE_TYPES.LEAVE:
      // This socket exists only to deliver the LEAVE, so it never gets a session.
      leaveWithToken(socket, message);
      return null;
    default:
      console.warn(`Ignoring "${message.type}" from a socket that has not created or joined a room`);
      return null;
  }
}

function startHostSession(socket) {
  const room = createRoom(socket);
  console.log(`Room ${room.roomCode} created`);
  send(socket, { type: MESSAGE_TYPES.ROOM_CREATED, roomCode: room.roomCode });
  return { role: 'host', room };
}

function handleControllerMessage(socket, session, message) {
  if (message.type === MESSAGE_TYPES.PING) {
    // The controller's own check that its socket still works, so the server answers it directly.
    send(socket, { type: MESSAGE_TYPES.PONG, sentAt: message.sentAt });
    return;
  }
  if (message.type === MESSAGE_TYPES.LEAVE) {
    leaveRoom(session.room, session.slot, socket);
    return;
  }
  if (!FORWARDED_TO_HOST.has(message.type)) {
    console.warn(`Ignoring "${message.type}" from player ${session.slot.playerId}`);
    return;
  }
  // playerId comes from the socket's session and is written last, so it replaces any playerId the
  // controller put in the message: a controller cannot send inputs as someone else.
  send(session.room.hostSocket, { ...message, playerId: session.slot.playerId });
}

function handleHostMessage(session, message) {
  const { room } = session;
  if (FORWARDED_TO_PLAYER.has(message.type)) {
    forwardToPlayer(room, message);
  } else if (message.type === MESSAGE_TYPES.SET_PLAYER_LIMIT) {
    if (setPlayerLimit(room, message.maxPlayers)) {
      console.log(`Room ${room.roomCode} now takes up to ${room.playerLimit} players`);
    } else {
      console.warn(`Ignoring player limit "${message.maxPlayers}" for room ${room.roomCode}: not a whole number`);
    }
  } else if (message.type === MESSAGE_TYPES.SET_ROOM_OPEN) {
    room.isOpen = message.open === true;
    console.log(`Room ${room.roomCode} is now ${room.isOpen ? 'open' : 'closed'} to new players`);
  } else if (message.type === MESSAGE_TYPES.REMOVE_PLAYER) {
    removeDisconnectedPlayer(room, message.playerId);
  } else if (message.type === MESSAGE_TYPES.KICK_PLAYER) {
    kickPlayer(room, message.playerId);
  } else {
    console.warn(`Ignoring "${message.type}" from the host of room ${room.roomCode}`);
  }
}

// The host may only reach players in its own room, because it looks them up in its own room's table.
function forwardToPlayer(room, message) {
  const slot = room.players.get(message.playerId);
  if (!slot) {
    // Normal when a player was removed just as the host sent this.
    return;
  }
  const { playerId, ...rest } = message;
  send(slot.socket, rest);
}

function endSession(socket, session) {
  const { room } = session;
  if (session.role === 'host') {
    console.log(`Host left, closing room ${room.roomCode}`);
    deleteRoom(room);
    for (const slot of room.players.values()) {
      send(slot.socket, { type: MESSAGE_TYPES.ROOM_CLOSED });
      slot.socket?.close();
    }
    return;
  }
  // A rejoin already moved the slot to a newer socket, the slot was freed, or the room closed: nothing to report.
  if (session.slot.socket !== socket || findRoom(room.roomCode) !== room) {
    return;
  }
  // Keep the slot: a locked phone or a Wi-Fi blip is normal, and the player can rejoin with their token.
  session.slot.socket = null;
  console.log(`Player ${session.slot.playerId} disconnected from room ${room.roomCode}`);
  send(room.hostSocket, { type: MESSAGE_TYPES.PLAYER_DISCONNECTED, playerId: session.slot.playerId });
}
