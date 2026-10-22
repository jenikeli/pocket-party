// Message types sent over WebSockets between controller, server and host. Single source of truth.
// Imported by the server (Node) and by the host and controller pages (browser) as an ES module.
//
// Every message is JSON shaped like { type: MESSAGE_TYPES.X, ...payload }.
// Add a type here first, with a comment saying who sends it and what the payload is.

export const MESSAGE_TYPES = Object.freeze({
  // controller -> server: { roomCode }. First join; the server answers with a playerId and secret token.
  JOIN: 'join',

  // controller -> server: { playerId, token }. Reclaim a slot after a dropped socket.
  // The server must check the token; a playerId alone is never enough.
  REJOIN: 'rejoin',

  // controller -> host (via server): { input, sentAt }. sentAt is the sender's timestamp, used for latency.
  INPUT: 'input',

  // either side -> other side: { sentAt }. Used to measure round-trip time and to detect a dead socket.
  PING: 'ping',

  // reply to PING: { sentAt } copied from the PING, so the sender can compute the round trip.
  PONG: 'pong',

  // server -> host, dev only: {}. Files changed on disk, so the host page reloads itself.
  RELOAD: 'reload',
});
