// Message types sent over WebSockets between controller, server and host. Single source of truth.
// Imported by the server (Node) and by the host and controller pages (browser) as an ES module.
//
// Every message is JSON shaped like { type: MESSAGE_TYPES.X, ...payload }.
// Add a type here first, with a comment saying who sends it and what the payload is.

// URL path the WebSocket server listens on. Pages connect to ws(s)://<same host>/ws.
export const SOCKET_PATH = '/ws';

// Most controllers one room accepts, whatever the host's lobby setting says (see SET_PLAYER_LIMIT).
// The Android hotspot accepts 10 clients and the host display is one of them, which leaves 9 phones.
export const MAX_PLAYERS = 9;

export const MESSAGE_TYPES = Object.freeze({
  // host -> server: {}. Sent once the host has loaded; the server answers with ROOM_CREATED.
  CREATE_ROOM: 'create_room',

  // server -> host: { roomCode }. The code players type (or scan) to join.
  ROOM_CREATED: 'room_created',

  // host -> server: { maxPlayers }. The lobby's player limit. The server clamps it to 1..MAX_PLAYERS and
  // refuses joins beyond it (rejoins always get in: their slot is still held). Until the host sends this,
  // a room takes MAX_PLAYERS.
  SET_PLAYER_LIMIT: 'set_player_limit',

  // controller -> server: { roomCode }. First join; the server answers with JOINED or JOIN_FAILED.
  JOIN: 'join',

  // controller -> server: { roomCode, playerId, token }. Take back a slot after the socket dropped (locked
  // screen, Wi-Fi blip, reload). The server checks the token; a playerId alone is never enough. The answer
  // is JOINED (same playerId and token) or JOIN_FAILED.
  REJOIN: 'rejoin',

  // server -> controller: { roomCode, playerId, token }, the answer to JOIN or REJOIN.
  // The token is secret proof of owning the slot; the controller keeps it in localStorage.
  JOINED: 'joined',

  // server -> controller: { reason } where reason is one of JOIN_FAILURE_REASONS. The server then closes the socket.
  JOIN_FAILED: 'join_failed',

  // server -> host: { playerId }. A controller took a new slot in the room.
  PLAYER_JOINED: 'player_joined',

  // server -> host: { playerId }. That player's socket closed, but the server keeps the slot. The host
  // starts the grace period and sends REMOVE_PLAYER if the player has not rejoined by the end of it.
  PLAYER_DISCONNECTED: 'player_disconnected',

  // server -> host: { playerId }. A disconnected player rejoined with their token (also sent when a rejoin
  // replaced a socket the server still thought was open).
  PLAYER_RECONNECTED: 'player_reconnected',

  // host -> server: { playerId }. The grace period ran out: free this slot. The server only frees slots
  // that are still disconnected (a rejoin may have just beaten the timer) and answers with PLAYER_LEFT.
  REMOVE_PLAYER: 'remove_player',

  // server -> host: { playerId }. The slot is freed; its token no longer works.
  PLAYER_LEFT: 'player_left',

  // server -> controller: {}. The host left, so the room is gone. The server then closes the socket.
  ROOM_CLOSED: 'room_closed',

  // controller -> server: { name }, sent after every JOINED. What the player typed; the host cleans it up.
  // server -> host: the same plus { playerId }, added by the server as for INPUT.
  PLAYER_NAME: 'player_name',

  // controller -> server: { ready } (true or false), when the player taps the ready button in the lobby.
  // server -> host: the same plus { playerId }. The host decides, and answers with CONTROLLER_STATE.
  SET_READY: 'set_ready',

  // host -> server: { playerId, screen, name, color, ready }. Everything that player's controller shows:
  // screen is one of CONTROLLER_SCREENS, name the name the host uses, color a CSS color like '#e74c3c'.
  // The host sends it on join, rejoin and whenever any of it changes.
  // server -> controller: the same without playerId.
  CONTROLLER_STATE: 'controller_state',

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

  // controller -> server: { platform, browser }, sent after every JOINED, e.g. 'iPhone' and 'Safari'.
  // server -> host: the same plus { playerId }, so the host can label which phone is which.
  DEVICE_INFO: 'device_info',

  // host -> server: { playerId, sentAt }. The server passes it to that player's controller as { sentAt }.
  // controller -> server: { sentAt }. The server answers that controller itself with PONG { sentAt }. This is
  // the controller's "is my socket still alive?" check after the tab comes back, so it only needs the server.
  // sentAt is whatever clock the sender likes; only the sender reads it again. Used to measure round-trip time.
  PING: 'ping',

  // controller -> server: { sentAt } copied unchanged from a host PING.
  // server -> host: { playerId, sentAt }. The host computes the round trip as now - sentAt on its own clock.
  // server -> controller: { sentAt }, the server's answer to the controller's own PING.
  PONG: 'pong',

  // server -> host, dev only: {}. Files changed on disk, so the host page reloads itself.
  RELOAD: 'reload',
});

export const JOIN_FAILURE_REASONS = Object.freeze({
  NO_SUCH_ROOM: 'no_such_room',
  ROOM_FULL: 'room_full',
  // REJOIN only: the room has no slot with that playerId and token (the slot was freed, or the token is wrong).
  REJOIN_REFUSED: 'rejoin_refused',
});

// What the host tells a controller to show (CONTROLLER_STATE screen).
export const CONTROLLER_SCREENS = Object.freeze({
  LOBBY: 'lobby',
  // Stand-in for the game until M5: the M3 input lab.
  INPUT_LAB: 'input_lab',
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
