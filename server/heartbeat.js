// Finds dead sockets. A phone that loses Wi-Fi or is suspended by its OS never sends a close frame, so
// without this the server would think it is connected for minutes. Used by server/relay.js.

// Every interval the server sends each socket a WebSocket ping frame. Browsers answer those by themselves
// (no page code runs), so a socket that has not answered by the next round is dead and gets cut. A dead
// socket is noticed 10-20 s after it dies, which is when the host's grace period starts.
const HEARTBEAT_INTERVAL_MS = 10000;

export function startHeartbeat(socketServer) {
  const answeredLastPing = new WeakMap();

  socketServer.on('connection', (socket) => {
    answeredLastPing.set(socket, true);
    socket.on('pong', () => answeredLastPing.set(socket, true));
  });

  const timer = setInterval(() => {
    for (const socket of socketServer.clients) {
      if (!answeredLastPing.get(socket)) {
        // terminate() drops the connection without a closing handshake, which a dead peer could never finish.
        // The socket's 'close' event still fires, so the relay handles it like any other disconnect.
        socket.terminate();
        continue;
      }
      answeredLastPing.set(socket, false);
      socket.ping();
    }
  }, HEARTBEAT_INTERVAL_MS);

  socketServer.on('close', () => clearInterval(timer));
}
