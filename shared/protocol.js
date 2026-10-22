// Message types sent over WebSockets between controller, server and host. Single source of truth.
// Imported by the server (Node) and by the host and controller pages (browser) as an ES module.
//
// Every message is JSON shaped like { type: MESSAGE_TYPES.X, ...payload }.
// Add a type here first, with a comment saying who sends it and what the payload is.

// URL path the WebSocket server listens on. Pages connect to ws(s)://<same host>/ws.
export const SOCKET_PATH = '/ws';

// Most controllers one room accepts. The server refuses joins beyond this.
export const MAX_PLAYERS = 6;

export const MESSAGE_TYPES = Object.freeze({
  // host -> server: {}. Sent once the host has loaded; the server answers with ROOM_CREATED.
  CREATE_ROOM: 'create_room',

  // server -> host: { roomCode }. The code players type (or scan) to join.
  ROOM_CREATED: 'room_created',

  // controller -> server: { roomCode }. First join; the server answers with JOINED or JOIN_FAILED.
  JOIN: 'join',

  // server -> controller: { roomCode, playerId, token }. The token is secret proof of owning the slot.
  JOINED: 'joined',

  // server -> controller: { reason } where reason is one of JOIN_FAILURE_REASONS. The server then closes the socket.
  JOIN_FAILED: 'join_failed',

  // server -> host: { playerId }. A controller took a slot in the room.
  PLAYER_JOINED: 'player_joined',

  // server -> host: { playerId }. A controller's socket closed and its slot was freed.
  PLAYER_LEFT: 'player_left',

  // server -> controller: {}. The host left, so the room is gone. The server then closes the socket.
  ROOM_CLOSED: 'room_closed',

  // controller -> server: { playerId, token }. Reclaim a slot after a dropped socket (not handled until M4).
  // The server must check the token; a playerId alone is never enough.
  REJOIN: 'rejoin',

  // controller -> server: { input, sentAt }. sentAt is the sender's Date.now(), used for latency.
  // server -> host: { playerId, input, sentAt }. The server adds playerId from the socket, never from the message.
  INPUT: 'input',

  // either side -> other side: { sentAt }. Used to measure round-trip time and to detect a dead socket.
  PING: 'ping',

  // reply to PING: { sentAt } copied from the PING, so the sender can compute the round trip.
  PONG: 'pong',

  // server -> host, dev only: {}. Files changed on disk, so the host page reloads itself.
  RELOAD: 'reload',
});

export const JOIN_FAILURE_REASONS = Object.freeze({
  NO_SUCH_ROOM: 'no_such_room',
  ROOM_FULL: 'room_full',
});
