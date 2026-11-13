// The host's link to the server plus its player roster, shared by the lobby and every game for the life of the
// page. It keeps the roster in step with joins, drops and rejoins, runs each dropped player's grace period, and
// tells controllers what to show. Created by host/main.js; the listener (the lobby, or the game session while a
// game runs) hears every message after it.

import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import { addPlayer, cleanName, displayName, colorText } from '/host/roster.js';
import { DEFAULT_SETTINGS } from '/host/lobby-rules.js';
import { GAMES } from '/host/games/index.js';
import { createGracePeriods } from '/host/grace-periods.js';

// Returns the room object. Call setListener(lobby) and then connect() once, after Tap to start
// (host/game-session.js takes over the listener while a game runs). The listener needs
// handleMessage(message, player) and handleConnectionLost(closedByHost).
export function createRoom() {
  let socket = null;
  let listener = null;
  // True once the host pressed "Close room", so the closing socket is not reported as a lost connection.
  let closedByHost = false;
  // playerId -> the view the running game set for that player's controller (see setControllerView).
  const controllerViews = new Map();

  // Each dropped player's grace period (grace-periods.js).
  const gracePeriods = createGracePeriods({
    graceSeconds: () => room.settings.graceSeconds,
    removePlayer: (playerId) => socket.send({ type: MESSAGE_TYPES.REMOVE_PLAYER, playerId }),
  });

  const room = {
    roomCode: null,
    // Map(playerId -> player), see host/roster.js.
    players: new Map(),
    // gameId is the game the lobby has chosen.
    settings: { ...DEFAULT_SETTINGS, gameId: GAMES[0].id },
    // What every controller is showing, and on the GAME screen which game; changed with setScreen().
    screen: CONTROLLER_SCREENS.LOBBY,
    gameId: null,
    connect,
    setListener: (newListener) => (listener = newListener),
    send: (message) => socket.send(message),
    sendControllerState,
    setScreen,
    setControllerView,
    setRoomOpen,
    setPlayerLimit,
    kickPlayer,
    close,
  };

  function connect() {
    socket = openSocket({
      onOpen: () => socket.send({ type: MESSAGE_TYPES.CREATE_ROOM }),
      onMessage: handleMessage,
      onClose: () => listener?.handleConnectionLost(closedByHost),
    });
  }

  // The server deletes a room when its host's socket closes and sends ROOM_CLOSED to every phone, so
  // closing the socket is all "Close room" needs.
  function close() {
    closedByHost = true;
    socket.close();
  }

  // The player is removed from the roster when the server confirms with PLAYER_LEFT, as for the grace period.
  function kickPlayer(playerId) {
    socket.send({ type: MESSAGE_TYPES.KICK_PLAYER, playerId });
  }

  // The room updates the roster first, so the listener that hears the message next already sees the change.
  function handleMessage(message) {
    const player = room.players.get(message.playerId);
    switch (message.type) {
      case MESSAGE_TYPES.ROOM_CREATED:
        room.roomCode = message.roomCode;
        break;
      case MESSAGE_TYPES.PLAYER_JOINED:
        sendControllerState(addPlayer(room.players, message.playerId));
        tellLobbyWhoIsHere(message.playerId);
        break;
      case MESSAGE_TYPES.PLAYER_DISCONNECTED:
        if (player) {
          gracePeriods.start(player);
        }
        break;
      case MESSAGE_TYPES.PLAYER_RECONNECTED:
        if (player) {
          gracePeriods.end(player);
          // A rejoining phone may have reloaded and know nothing, so tell it everything again.
          sendControllerState(player);
        }
        break;
      case MESSAGE_TYPES.PLAYER_LEFT:
        if (player) {
          gracePeriods.end(player);
          room.players.delete(player.playerId);
          controllerViews.delete(player.playerId);
          tellLobbyWhoIsHere(player.playerId);
        }
        break;
      case MESSAGE_TYPES.PLAYER_NAME:
        if (player) {
          player.name = cleanName(message.name);
          sendControllerState(player);
          tellLobbyWhoIsHere(player.playerId);
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
        // Everything else is for the listener.
        break;
    }
    // `player` is still passed after PLAYER_LEFT, so the listener can tidy up what it drew for them.
    listener?.handleMessage(message, player);
  }

  function sendControllerState(player) {
    socket.send({
      type: MESSAGE_TYPES.CONTROLLER_STATE,
      playerId: player.playerId,
      screen: room.screen,
      name: displayName(player),
      color: colorText(player),
      others: otherNames(player),
      gameId: room.gameId,
      view: controllerViews.get(player.playerId) ?? null,
    });
  }

  function otherNames(player) {
    const others = [...room.players.values()].filter((other) => other !== player);
    return others.map(displayName);
  }

  // The phone lobby lists who else is in the room, so when someone joins, leaves or changes their name, every
  // other phone in the lobby gets its state again. Not during a game: no game screen shows the list.
  function tellLobbyWhoIsHere(changedPlayerId) {
    if (room.screen !== CONTROLLER_SCREENS.LOBBY) {
      return;
    }
    for (const player of room.players.values()) {
      if (player.connected && player.playerId !== changedPlayerId) {
        sendControllerState(player);
      }
    }
  }

  // Disconnected players are skipped: they get the current screen when they rejoin. A player who joins later
  // gets it on PLAYER_JOINED, so a game that opened the room just finds them in `players`. `gameId` is the
  // running game on the GAME screen, null for the lobby. Views belong to one game run, so a new screen starts
  // with none.
  function setScreen(screen, gameId = null) {
    room.screen = screen;
    room.gameId = gameId;
    controllerViews.clear();
    for (const player of room.players.values()) {
      if (player.connected) {
        sendControllerState(player);
      }
    }
  }

  // The running game changes what one phone shows. The view is kept, so a phone that rejoins later gets it
  // again with the rest of its CONTROLLER_STATE, without the game doing anything.
  function setControllerView(playerId, view) {
    const player = room.players.get(playerId);
    if (!player) {
      return;
    }
    controllerViews.set(playerId, view);
    if (player.connected) {
      sendControllerState(player);
    }
  }

  // Whether the server lets new players in. Someone joining in the middle of a race would have no kart, so the
  // shell closes the room when a game starts and the game opens it on its setup and results screens.
  function setRoomOpen(open) {
    socket.send({ type: MESSAGE_TYPES.SET_ROOM_OPEN, open });
  }

  // The server refuses joins beyond this: MAX_PLAYERS in the lobby, the game's own maximum while it runs.
  function setPlayerLimit(maxPlayers) {
    socket.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers });
  }

  return room;
}
