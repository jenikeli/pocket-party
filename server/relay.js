// WebSocket relay: lets a host create a room, lets controllers join it, and forwards controller inputs to the host.
// Used by server/index.js. It never looks inside an input; game logic lives on the host.

import { WebSocketServer, WebSocket } from 'ws';
import { SOCKET_PATH, MESSAGE_TYPES, JOIN_FAILURE_REASONS } from '../shared/protocol.js';
import { createRoom, findRoom, deleteRoom, listRooms, addPlayer, removePlayer } from './rooms.js';

// Inputs are tiny. A low cap stops one misbehaving client from making the server buffer megabytes.
const MAX_MESSAGE_BYTES = 16 * 1024;

// Shares the HTTP(S) server's port: the browser asks to "upgrade" a normal request on /ws into a WebSocket.
// With HTTPS that upgrade happens inside TLS, which is what makes the connection wss://.
export function attachRelay(httpServer) {
  const socketServer = new WebSocketServer({
    server: httpServer,
    path: SOCKET_PATH,
    maxPayload: MAX_MESSAGE_BYTES,
  });
  socketServer.on('connection', handleConnection);
}

export function sendToAllHosts(message) {
  for (const room of listRooms()) {
    send(room.hostSocket, message);
  }
}

function handleConnection(socket) {
  // What this socket is, decided by its first message:
  // { role: 'host', room } or { role: 'controller', room, playerId }. null until then.
  let session = null;

  socket.on('message', (data) => {
    const message = parseMessage(data);
    if (!message) {
      return;
    }
    if (session === null) {
      session = startSession(socket, message);
    } else if (session.role === 'controller') {
      handleControllerMessage(session, message);
    } else {
      console.warn(`Ignoring "${message.type}" from the host of room ${session.room.roomCode}`);
    }
  });

  socket.on('close', () => {
    if (session !== null) {
      endSession(session);
    }
  });

  socket.on('error', (error) => {
    console.error('WebSocket error:', error.message);
  });
}

function startSession(socket, message) {
  if (message.type === MESSAGE_TYPES.CREATE_ROOM) {
    return startHostSession(socket);
  }
  if (message.type === MESSAGE_TYPES.JOIN) {
    return startControllerSession(socket, String(message.roomCode).toUpperCase());
  }
  console.warn(`Ignoring "${message.type}" from a socket that has not created or joined a room`);
  return null;
}

function startHostSession(socket) {
  const room = createRoom(socket);
  console.log(`Room ${room.roomCode} created`);
  send(socket, { type: MESSAGE_TYPES.ROOM_CREATED, roomCode: room.roomCode });
  return { role: 'host', room };
}

function startControllerSession(socket, roomCode) {
  const room = findRoom(roomCode);
  if (!room) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.NO_SUCH_ROOM);
    return null;
  }
  const slot = addPlayer(room, socket);
  if (!slot) {
    refuseJoin(socket, JOIN_FAILURE_REASONS.ROOM_FULL);
    return null;
  }

  console.log(`Player ${slot.playerId} joined room ${room.roomCode}`);
  send(socket, {
    type: MESSAGE_TYPES.JOINED,
    roomCode: room.roomCode,
    playerId: slot.playerId,
    token: slot.token,
  });
  send(room.hostSocket, { type: MESSAGE_TYPES.PLAYER_JOINED, playerId: slot.playerId });
  return { role: 'controller', room, playerId: slot.playerId };
}

// ws sends queued messages before the close frame, so the controller always sees the reason.
function refuseJoin(socket, reason) {
  send(socket, { type: MESSAGE_TYPES.JOIN_FAILED, reason });
  socket.close();
}

function handleControllerMessage(session, message) {
  if (message.type !== MESSAGE_TYPES.INPUT) {
    console.warn(`Ignoring "${message.type}" from player ${session.playerId}`);
    return;
  }
  // playerId comes from the socket's session, so a controller cannot send inputs as someone else.
  send(session.room.hostSocket, {
    type: MESSAGE_TYPES.INPUT,
    playerId: session.playerId,
    input: message.input,
    sentAt: message.sentAt,
  });
}

function endSession(session) {
  const { room } = session;
  if (session.role === 'host') {
    console.log(`Host left, closing room ${room.roomCode}`);
    deleteRoom(room);
    for (const slot of room.players.values()) {
      send(slot.socket, { type: MESSAGE_TYPES.ROOM_CLOSED });
      slot.socket.close();
    }
    return;
  }
  // M1 frees the slot right away. M4 replaces this with a grace period so a locked phone can rejoin.
  console.log(`Player ${session.playerId} left room ${room.roomCode}`);
  removePlayer(room, session.playerId);
  send(room.hostSocket, { type: MESSAGE_TYPES.PLAYER_LEFT, playerId: session.playerId });
}

// Returns the parsed message, or null (logged) if it is not a JSON object with a string type.
function parseMessage(data) {
  let message;
  try {
    message = JSON.parse(data.toString());
  } catch (error) {
    console.warn('Ignoring a message that is not JSON:', error.message);
    return null;
  }
  if (typeof message !== 'object' || message === null || typeof message.type !== 'string') {
    console.warn('Ignoring a message without a string "type"');
    return null;
  }
  return message;
}

// Sockets can close at any moment (locked phones), so skip ones that are no longer open.
function send(socket, message) {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}
