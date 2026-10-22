// Reading and writing the JSON messages on a socket. Used by server/relay.js and server/joining.js.

import { WebSocket } from 'ws';

// Returns the parsed message, or null (logged) if it is not a JSON object with a string type.
export function parseMessage(data) {
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

// Sockets can close at any moment (locked phones), and a disconnected slot has none, so skip those.
export function send(socket, message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}
