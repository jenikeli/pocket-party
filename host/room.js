// The host's link to the server plus its player roster, shared by every scene for the life of the page.
// It keeps the roster in step with joins, drops and rejoins, runs each dropped player's grace period, and
// tells controllers what to show. Created by host/main.js; the active scene hears every message after it.

import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import { addPlayer, cleanName, displayName, colorText } from '/host/roster.js';
import { DEFAULT_SETTINGS } from '/host/lobby-rules.js';

// Returns the room object. Call connect() once the page has loaded, and setListener(scene) from each scene's
// create(). The listener needs handleMessage(message, player) and handleConnectionLost().
export function createRoom() {
  let socket = null;
  let listener = null;
  // playerId -> setTimeout id, for players in their grace period.
  const graceTimers = new Map();

  const room = {
    roomCode: null,
    // Map(playerId -> player), see host/roster.js.
    players: new Map(),
    settings: { ...DEFAULT_SETTINGS },
    // What every controller is showing; scenes change it with setScreen().
    screen: CONTROLLER_SCREENS.LOBBY,
    connect,
    setListener: (newListener) => (listener = newListener),
    send: (message) => socket.send(message),
    sendControllerState,
    setScreen,
    setMaxPlayers,
  };

  function connect() {
    socket = openSocket({
      onOpen: () => socket.send({ type: MESSAGE_TYPES.CREATE_ROOM }),
      onMessage: handleMessage,
      onClose: () => listener?.handleConnectionLost(),
    });
  }

  // The room updates the roster first, so the scene that hears the message next already sees the change.
  function handleMessage(message) {
    const player = room.players.get(message.playerId);
    switch (message.type) {
      case MESSAGE_TYPES.ROOM_CREATED:
        room.roomCode = message.roomCode;
        socket.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers: room.settings.maxPlayers });
        break;
      case MESSAGE_TYPES.PLAYER_JOINED:
        sendControllerState(addPlayer(room.players, message.playerId));
        break;
      case MESSAGE_TYPES.PLAYER_DISCONNECTED:
        if (player) {
          startGracePeriod(player);
        }
        break;
      case MESSAGE_TYPES.PLAYER_RECONNECTED:
        if (player) {
          endGracePeriod(player);
          // A rejoining phone may have reloaded and know nothing, so tell it everything again.
          sendControllerState(player);
        }
        break;
      case MESSAGE_TYPES.PLAYER_LEFT:
        if (player) {
          endGracePeriod(player);
          room.players.delete(player.playerId);
        }
        break;
      case MESSAGE_TYPES.PLAYER_NAME:
        if (player) {
          player.name = cleanName(message.name);
          sendControllerState(player);
        }
        break;
      case MESSAGE_TYPES.DEVICE_INFO:
        if (player) {
          player.device = `${message.platform} ${message.browser}`;
        }
        break;
      case MESSAGE_TYPES.RELOAD:
        location.reload();
        return;
      default:
        // Everything else is for the scene.
        break;
    }
    // `player` is still passed after PLAYER_LEFT, so the scene can tidy up what it drew for them.
    listener?.handleMessage(message, player);
  }

  // The host, not the server, times the grace period, because its length is a lobby setting. When it runs
  // out the host asks the server to free the slot, and removes the player only when PLAYER_LEFT confirms it.
  // So if a rejoin reaches the server first, the server refuses the removal and both sides still agree.
  function startGracePeriod(player) {
    const graceMs = room.settings.graceSeconds * 1000;
    player.connected = false;
    player.graceEndsAt = Date.now() + graceMs;
    clearTimeout(graceTimers.get(player.playerId));
    const timer = setTimeout(() => {
      socket.send({ type: MESSAGE_TYPES.REMOVE_PLAYER, playerId: player.playerId });
    }, graceMs);
    graceTimers.set(player.playerId, timer);
  }

  function endGracePeriod(player) {
    clearTimeout(graceTimers.get(player.playerId));
    graceTimers.delete(player.playerId);
    player.connected = true;
    player.graceEndsAt = null;
  }

  function sendControllerState(player) {
    socket.send({
      type: MESSAGE_TYPES.CONTROLLER_STATE,
      playerId: player.playerId,
      screen: room.screen,
      name: displayName(player),
      color: colorText(player),
      ready: player.ready,
    });
  }

  // Disconnected players are skipped: they get the current screen when they rejoin.
  function setScreen(screen) {
    room.screen = screen;
    for (const player of room.players.values()) {
      if (player.connected) {
        sendControllerState(player);
      }
    }
  }

  function setMaxPlayers(maxPlayers) {
    room.settings.maxPlayers = maxPlayers;
    socket.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers });
  }

  return room;
}
