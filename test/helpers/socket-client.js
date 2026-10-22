// A scripted WebSocket client that plays the host or a controller against the real server.
// Used by the integration tests in test/server/.

import { WebSocket } from 'ws';
import { SOCKET_PATH, MESSAGE_TYPES } from '../../shared/protocol.js';
import { createMessageQueue } from './message-queue.js';

// Opens a socket and resolves once it is connected. Returns { send, sendRaw, next, nextOfType,
// collectFor, closed, close }. `closed` is a promise that resolves when the server closes the socket.
export function connectClient(port) {
  const socket = new WebSocket(`ws://127.0.0.1:${port}${SOCKET_PATH}`);
  const queue = createMessageQueue();
  socket.on('message', (data) => queue.push(JSON.parse(data.toString())));
  const closed = new Promise((resolve) => socket.on('close', resolve));

  return new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.once('open', () => {
      resolve({
        ...queue,
        send: (message) => socket.send(JSON.stringify(message)),
        sendRaw: (text) => socket.send(text),
        closed,
        close: () => socket.close(),
      });
    });
  });
}

// Connects as a host and creates a room. Returns { host, roomCode }.
export async function createHost(port) {
  const host = await connectClient(port);
  host.send({ type: MESSAGE_TYPES.CREATE_ROOM });
  const reply = await host.next();
  if (reply.type !== MESSAGE_TYPES.ROOM_CREATED) {
    throw new Error(`Expected room_created, got ${JSON.stringify(reply)}`);
  }
  return { host, roomCode: reply.roomCode };
}

// Connects as a controller and sends JOIN. Returns { controller, reply } with the server's first answer.
export async function joinRoom(port, roomCode) {
  const controller = await connectClient(port);
  controller.send({ type: MESSAGE_TYPES.JOIN, roomCode });
  const reply = await controller.next();
  return { controller, reply };
}
