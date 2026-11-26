// Message types sent over WebSockets between controller, server and host. Single source of truth.
// Imported by the server (Node) and by the host and controller pages (browser) as an ES module.
//
// Every message is JSON shaped like { type: MESSAGE_TYPES.X, ...payload }.
// Add a type here first, with a comment saying who sends it and what the payload is.

// URL path the WebSocket server listens on. Pages connect to ws(s)://<same host>/ws.
export const SOCKET_PATH = '/ws';

// Most controllers one room accepts; a game's own maximum (SET_PLAYER_LIMIT) is never above it.
// The Android hotspot accepts 10 clients and the host display is one of them, which leaves 9 phones.
export const MAX_PLAYERS = 9;

export const MESSAGE_TYPES = Object.freeze({
  // host -> server: {}. Sent when a game the host picked has loaded: each game runs in a room of its own. The
  // server answers with ROOM_CREATED.
  CREATE_ROOM: 'create_room',

  // server -> host: { roomCode }. The code players type (or scan) to join.
  ROOM_CREATED: 'room_created',

  // host -> server: { maxPlayers }. The room's player limit, the game's own maximum, sent as soon as the room
  // exists. The server clamps it to 1..MAX_PLAYERS and refuses joins beyond it (rejoins
  // always get in: their slot is still held). Until the host sends this, a room takes MAX_PLAYERS.
  SET_PLAYER_LIMIT: 'set_player_limit',

  // host -> server: { open } (true or false). A game closes its room for a race, so new players are refused
  // with GAME_IN_PROGRESS (rejoins still get in), and opens it on screens where a new player can come in (its
  // setup and results). Rooms start open.
  SET_ROOM_OPEN: 'set_room_open',

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

  // host -> server: { playerId }. The host removes this player, connected or not. The server sends them
  // KICKED, closes their socket, frees the slot and answers with PLAYER_LEFT.
  KICK_PLAYER: 'kick_player',

  // server -> controller: {}. The host removed this player. The server then closes the socket.
  KICKED: 'kicked',

  // controller -> server: { roomCode, playerId, token }. The player tapped "Leave game". The server frees the
  // slot at once, answers the host with PLAYER_LEFT and closes the socket. Sent on the controller's socket, or,
  // when that socket is down, as the first message of a new socket: then the server checks the token as for
  // REJOIN and answers the controller with LEFT before closing.
  LEAVE: 'leave',

  // server -> controller: {}. The answer to a LEAVE sent on a new socket: the slot is free (or was already gone),
  // so the controller can stop retrying.
  LEFT: 'left',

  // server -> host: { playerId }. The slot is freed (grace period over, kicked, or left); its token no longer works.
  PLAYER_LEFT: 'player_left',

  // server -> controller: {}. The host left (its game ended and it went back to its game picker, or the page
  // closed), so the room is gone. The server then closes the socket.
  ROOM_CLOSED: 'room_closed',

  // controller -> server: { name }, sent after every JOINED. What the player typed; the host cleans it up.
  // server -> host: the same plus { playerId }, added by the server as for INPUT.
  PLAYER_NAME: 'player_name',

  // host -> server: { playerId, screen, name, color, gameId, view }. Everything that player's controller
  // shows: screen is one of CONTROLLER_SCREENS, name the name the host uses, color a CSS color like '#e74c3c'.
  // gameId names the room's game (the controller loads controller/games/<gameId>/index.js) and view is
  // whatever small object that game set for this player (null until it sets one). The host sends it on join,
  // rejoin and whenever any of it changes.
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
  // JOIN only: the host has closed the room because a game is running (SET_ROOM_OPEN).
  GAME_IN_PROGRESS: 'game_in_progress',
  // REJOIN only: the room has no slot with that playerId and token (the slot was freed, or the token is wrong).
  REJOIN_REFUSED: 'rejoin_refused',
});

// What the host tells a controller to show (CONTROLLER_STATE screen). A room is one game, so a phone in a room
// is always on that game's screen.
export const CONTROLLER_SCREENS = Object.freeze({
  // CONTROLLER_STATE's gameId says which game.
  GAME: 'game',
});

// What an INPUT carries in input.kind, and what INPUT_MODE carries in mode.
export const INPUT_KINDS = Object.freeze({
  DRAG: 'drag',
  TAP: 'tap',
  SWIPE: 'swipe',
  TILT: 'tilt',
  // A held button: { kind: 'button', button, pressed }, sent once on press (pressed true) and once on release
  // (false). button names which one (KART_BUTTONS for the kart races).
  BUTTON: 'button',
  // A menu choice on a game's setup screen: { kind: 'choice', choice, value }. choice names the setting
  // (KART_CHOICES for the kart races), value is what the player picked. The game decides what is allowed.
  CHOICE: 'choice',
  // A card being played in Spirefall: { kind: 'place', phase: 'pick' | 'aim' | 'drop' | 'cancel', slot: 0..3, x, y }.
  // x and y are fractions (0..1) of the phone's pad from its top-left. The pad shows the whole arena turned so the
  // player's own base is at the bottom; the host turns the fractions into arena coordinates (placement.js).
  PLACE: 'place',
  // Breakwater's stick: { kind: 'move', x, y }, both -1..1 in the player's directions (x right, y up the screen = forward).
  // Sent on change, at most about 30 times a second. The size of the push sets walk, run or sprint.
  MOVE: 'move',
  // Breakwater's aim: { kind: 'look', dx, dy }, the finger movement since the last send as a fraction of the look pad
  // (dx right, dy down), already scaled by the player's sensitivity. Summed on the phone, never dropped.
  LOOK: 'look',
});

// The kart races' held buttons (INPUT kind button). The phone's controls name them in data-button attributes.
export const KART_BUTTONS = Object.freeze({
  ACCELERATE: 'accelerate',
  BRAKE: 'brake',
  // The 3D race only: hop, drift and trick, one button as in console kart games. Held, it also accelerates (see
  // host/kart/kart-controls.js).
  DRIFT: 'drift',
  // The 3D race only (M8): uses the held item. Sent on press and release like Drift; one press uses one item.
  ITEM: 'item',
});

// The 3D race's items (M8), the ids the phone and the host share. Their rules live in host/games/kart-3d/items/,
// their icons in shared/item-icons.js.
export const KART_ITEMS = Object.freeze({
  BLOCKER: 'blocker',
  JUMP: 'jump',
  TELEPORT: 'teleport',
  MAGNET: 'magnet',
  PUSH: 'push',
  STICKY: 'sticky',
});

// The kart races' per-player choices (INPUT kind choice) and the values each takes.
export const KART_CHOICES = Object.freeze({
  // value: one of KART_STEERING.
  STEERING: 'steering',
  // value: true (the kart drives unless braking; the phone hides Go) or false.
  AUTO_ACCELERATE: 'autoAccelerate',
  // value: true or false. Only counts on the setup screen.
  READY: 'ready',
  // value: an integer colour slot, 0-11 (the host's PLAYER_COLORS). Only counts on the setup screen, and only for a
  // colour no other player holds; the kart design follows the colour.
  COLOR: 'color',
  // value: true (the driving layout is mirrored: steering on the right, Go on the left) or false. Counts at any
  // time, like steering.
  LEFT_HANDED: 'leftHanded',
});

// The temple run's choices (INPUT kind choice). Its moves are INPUT kind swipe: up jumps, down slides, left and
// right change lane.
export const TEMPLE_CHOICES = Object.freeze({
  // value: true or false. Counts in the lobby; a round starts when every connected player is ready.
  READY: 'ready',
  // value: the playerId of a downed runner. Counts for a living runner during a run.
  REVIVE: 'revive',
});

// Spirefall's teams (ARENA_CHOICES.TEAM values). Dawn holds the bottom of the host's arena, Dusk the top.
export const ARENA_TEAMS = Object.freeze({
  DAWN: 0,
  DUSK: 1,
});

// Spirefall's choices (INPUT kind choice).
// The six emotes a player can send during a match (ARENA_CHOICES.EMOTE is an index into this list).
export const ARENA_EMOTES = Object.freeze(['Nice', 'Haha', 'Wow', 'Oops', 'Thanks', 'Good game']);

export const ARENA_CHOICES = Object.freeze({
  // value: true or false. Counts on the setup screen.
  READY: 'ready',
  // value: an ARENA_TEAMS value. Counts on the setup screen; the host seats the player in that team if it has room.
  TEAM: 'team',
  // value: an array of 8 distinct card ids (shared/arena-cards.js). Counts on the setup screen; the host checks it.
  DECK: 'deck',
  // value: an index into the six emotes, 0..5. Counts during a match; the host limits it to one every 2 seconds.
  EMOTE: 'emote',
  // value: true. Counts during a match: the player's seat goes to a CPU.
  FORFEIT: 'forfeit',
});

// Breakwater's held buttons (INPUT kind button, { button, pressed }); GRENADE may carry lob: true (a short underhand throw).
export const FPS_BUTTONS = Object.freeze({
  FIRE: 'fire', ADS: 'ads', JUMP: 'jump', CROUCH: 'crouch', RELOAD: 'reload', GRENADE: 'grenade', SCORES: 'scores', CYCLE_GRENADE: 'cycleGrenade', USE: 'use',
});

// Breakwater's teams (FPS_CHOICES.TEAM values): 0 Vanguard, 1 Syndicate.
export const FPS_TEAMS = Object.freeze({ VANGUARD: 0, SYNDICATE: 1 });

// Breakwater's choices (INPUT kind choice).
export const FPS_CHOICES = Object.freeze({
  // value: true or false. Counts on the setup screen.
  READY: 'ready',
  // value: an FPS_TEAMS value. Counts on the setup screen.
  TEAM: 'team',
});

export const KART_STEERING = Object.freeze({
  // The on-screen stick (INPUT kind drag).
  STICK: 'stick',
  // The phone turned like a wheel (INPUT kind tilt).
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
