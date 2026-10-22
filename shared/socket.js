// Browser helper that opens the game WebSocket and exchanges JSON messages with the server.
// Used by the host page and the controller page (not by the Node server).

import { SOCKET_PATH } from '/shared/protocol.js';

// Opens a socket to the server that served this page. Returns { send, close }.
// The handlers are plain callbacks: onOpen(), onMessage(message), onClose(event).
export function openSocket({ onOpen, onMessage, onClose }) {
  // An https page may only open wss:// (browsers block ws:// as mixed content), so follow the page's protocol.
  const socketProtocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${socketProtocol}//${location.host}${SOCKET_PATH}`);

  socket.addEventListener('open', () => onOpen());
  socket.addEventListener('close', (event) => onClose(event));
  socket.addEventListener('message', (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      console.error('Ignoring a message from the server that is not JSON:', event.data, error);
      return;
    }
    onMessage(message);
  });

  function send(message) {
    if (socket.readyState !== WebSocket.OPEN) {
      console.warn(`Not sent (socket not open): ${message.type}`);
      return;
    }
    socket.send(JSON.stringify(message));
  }

  return { send, close: () => socket.close() };
}
