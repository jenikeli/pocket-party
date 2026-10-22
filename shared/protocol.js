// Message types sent over WebSockets between controller, server and host. Single source of truth.
// Imported by the server (Node) and by the host and controller pages (browser) as an ES module.
//
// Every message is JSON shaped like { type: MESSAGE_TYPES.X, ...payload }.
// Add a type here first, with a comment saying who sends it and what the payload is.

// URL path the WebSocket server listens on. Pages connect to ws(s)://<same host>/ws.
export const SOCKET_PATH = '/ws';

// Most controllers one room accepts. The server refuses joins beyond this.
// The Android hotspot accepts 10 clients and the host display is one of them, which leaves 9 phones.
export const MAX_PLAYERS = 9;

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
  // input is { kind, ...values } where kind is one of INPUT_KINDS (shapes in controller/inputs/*.js).
  INPUT: 'input',

  // controller -> server: { mode, fallbackFrom?, reason? }. Which input the controller is using now.
  // mode is one of INPUT_KINDS. When the chosen input could not start (tilt denied or no sensor), the
  // controller uses a touch input instead and says so: fallbackFrom is the kind it wanted, reason one of
  // INPUT_FALLBACK_REASONS.
  // server -> host: the same plus { playerId }, added by the server as for INPUT.
  INPUT_MODE: 'input_mode',

  // controller -> server: { platform, browser }, sent once after JOINED, e.g. 'iPhone' and 'Safari'.
  // server -> host: the same plus { playerId }, so the host can label which phone is which.
  DEVICE_INFO: 'device_info',

  // host -> server: { playerId, sentAt }. The server passes it to that player's controller as { sentAt }.
  // sentAt is whatever clock the sender likes; only the sender reads it again. Used to measure round-trip time.
  PING: 'ping',

  // controller -> server: { sentAt } copied unchanged from the PING it answers.
  // server -> host: { playerId, sentAt }. The host computes the round trip as now - sentAt on its own clock.
  PONG: 'pong',

  // server -> host, dev only: {}. Files changed on disk, so the host page reloads itself.
  RELOAD: 'reload',
});

export const JOIN_FAILURE_REASONS = Object.freeze({
  NO_SUCH_ROOM: 'no_such_room',
  ROOM_FULL: 'room_full',
});

// What an INPUT carries in input.kind, and what INPUT_MODE carries in mode.
export const INPUT_KINDS = Object.freeze({
  DRAG: 'drag',
  TAP: 'tap',
  SWIPE: 'swipe',
  TILT: 'tilt',
});

// Why a controller could not use the input it wanted (INPUT_MODE reason).
export const INPUT_FALLBACK_REASONS = Object.freeze({
  // The browser has no DeviceOrientationEvent at all (for example plain HTTP).
  UNSUPPORTED: 'unsupported',
  // The player (or the browser, on iOS without a tap) refused the motion permission.
  DENIED: 'denied',
  // Listening worked but no real reading arrived, as on a device without a gyroscope.
  NO_SENSOR: 'no_sensor',
});
