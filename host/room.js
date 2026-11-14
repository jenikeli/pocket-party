// One game's room: the host's link to the server plus the game's player roster. Made by host/game-session.js
// when a game has loaded and closed when the game ends, so nothing of one game's players carries into the next.
// It keeps the roster in step with joins, drops and rejoins, runs each dropped player's grace period, and tells
// controllers what to show. The listener (the game session) hears every message after it.

import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import { addPlayer, changeColor, cleanName, displayName, colorText } from '/host/roster.js';
import { browserStorage, readGraceSeconds } from '/host/shell-rules.js';
import { createGracePeriods } from '/host/grace-periods.js';

// Returns the room for the game `gameId` (its registry id). Call connect() once, then setListener(listener):
// the listener needs handleMessage(message, player) and handleConnectionLost().
export function createRoom(gameId) {
  let socket = null;
  let listener = null;
  // True once the host closed the room, so the closing socket is not reported as a lost connection.
  let closedByHost = false;
  // playerId -> the view the game set for that player's controller (see setControllerView).
  const controllerViews = new Map();

  // Each dropped player's grace period (grace-periods.js). The length is read at each drop, so a change in the
  // settings applies to the next player who drops.
  const gracePeriods = createGracePeriods({
    graceSeconds: () => readGraceSeconds(browserStorage()),
    removePlayer: (playerId) => socket.send({ type: MESSAGE_TYPES.REMOVE_PLAYER, playerId }),
  });

  const room = {
    roomCode: null,
    // Map(playerId -> player), see host/roster.js.
    players: new Map(),
    connect,
    setListener: (newListener) => (listener = newListener),
    send: (message) => socket.send(message),
    setControllerView,
    pickColor,
    setRoomOpen,
    setPlayerLimit,
    kickPlayer,
    close,
  };

  // Resolves to the room code once the server has made the room (ROOM_CREATED). Rejects if the socket closes
  // before that: the server cannot be reached, or it refused the connection.
  function connect() {
    return new Promise((resolve, reject) => {
      socket = openSocket({
        onOpen: () => socket.send({ type: MESSAGE_TYPES.CREATE_ROOM }),
        onMessage: (message) => {
          handleMessage(message);
          if (message.type === MESSAGE_TYPES.ROOM_CREATED) {
            resolve(message.roomCode);
          }
        },
        onClose: () => {
          if (room.roomCode === null) {
            reject(new Error('The connection to the server closed before the room was made'));
          } else if (!closedByHost) {
            listener?.handleConnectionLost();
          }
        },
      });
    });
  }

  // The server deletes a room when its host's socket closes and sends ROOM_CLOSED to every phone, so closing the
  // socket is all the server needs. A closing socket can still deliver a few messages, and a dropped player's
  // grace timer may still be running, so both are cut off here: nothing of this room reaches the game that was
  // stopped, the picker, or the next game.
  function close() {
    closedByHost = true;
    listener = null;
    gracePeriods.clear();
    socket.close();
  }

  // The player is removed from the roster when the server confirms with PLAYER_LEFT, as for the grace period.
  function kickPlayer(playerId) {
    socket.send({ type: MESSAGE_TYPES.KICK_PLAYER, playerId });
  }

  // The room updates the roster first, so the listener that hears the message next already sees the change.
  function handleMessage(message) {
    if (closedByHost) {
      return;
    }
    const player = room.players.get(message.playerId);
    switch (message.type) {
      case MESSAGE_TYPES.ROOM_CREATED:
        room.roomCode = message.roomCode;
        break;
      case MESSAGE_TYPES.PLAYER_JOINED:
        sendControllerState(addPlayer(room.players, message.playerId));
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
        // Everything else is for the listener.
        break;
    }
    // `player` is still passed after PLAYER_LEFT, so the listener can tidy up what it drew for them.
    listener?.handleMessage(message, player);
  }

  // A room is one game, so every phone in it is on that game's screen.
  function sendControllerState(player) {
    socket.send({
      type: MESSAGE_TYPES.CONTROLLER_STATE,
      playerId: player.playerId,
      screen: CONTROLLER_SCREENS.GAME,
      name: displayName(player),
      color: colorText(player),
      gameId,
      view: controllerViews.get(player.playerId) ?? null,
    });
  }

  // The game changes what one phone shows. The view is kept, so a phone that rejoins later gets it again with
  // the rest of its CONTROLLER_STATE, without the game doing anything.
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

  // A player's phone asks for another color. When they get it, their phone is told its new color (and its name,
  // if that came from the color). The game decides when picking is allowed; this only keeps the roster right.
  function pickColor(playerId, colorIndex) {
    const changed = changeColor(room.players, playerId, colorIndex);
    if (changed) {
      sendControllerState(room.players.get(playerId));
    }
    return changed;
  }

  // Whether the server lets new players in. Someone joining in the middle of a race would have no kart, so a
  // game closes its room for a race and opens it on its setup and results screens.
  function setRoomOpen(open) {
    socket.send({ type: MESSAGE_TYPES.SET_ROOM_OPEN, open });
  }

  // The server refuses joins beyond this: the game's own maximum.
  function setPlayerLimit(maxPlayers) {
    socket.send({ type: MESSAGE_TYPES.SET_PLAYER_LIMIT, maxPlayers });
  }

  return room;
}
