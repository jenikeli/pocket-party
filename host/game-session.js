// Runs one game for the shell, from Play to the picker again: the loading screen while the game loads, then the
// game's own room (host/room.js), the top bar and the join window, the game in a full-screen container driven by
// the game runner, and the room closed when the game ends, however it ends. Used by host/game-picker.js.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { loadGame } from '/host/games/index.js';
import { createRoom } from '/host/room.js';
import { loadThenOpenRoom } from '/host/game-opening.js';
import { startGameRunner } from '/host/game-runner.js';
import { showGameControls, hideGameControls, showRoomOpen, setBarDocked, barSlot } from '/host/game-bar.js';
import { setRoomCode, openJoinWindow, closeJoinWindow } from '/host/join-window.js';
import { showLoading } from '/host/loading-screen.js';
import { playShellSound } from '/host/shell-sounds.js';

// Messages from a player's controller that belong to the running game. The room keeps the rest (names, phones,
// joins and drops) in the roster, which the game reads.
const GAME_MESSAGE_TYPES = new Set([MESSAGE_TYPES.INPUT, MESSAGE_TYPES.INPUT_MODE, MESSAGE_TYPES.PONG]);

// `gameInfo` is the game's registry entry. `onStart()` runs just before the game starts, `onEnd(problem)` once
// it is over and its room closed, or when it could not open: problem is null, or the sentence to show.
export async function playGame({ gameInfo, onStart, onEnd }) {
  const loading = showLoading({ title: gameInfo.title, picture: gameInfo.background });
  const opened = await loadThenOpenRoom({
    gameInfo,
    loadGame,
    createRoom: () => createRoom(gameInfo.id),
    onProgress: (fraction) => loading.setProgress(fraction),
  });
  // Hidden right before start(), which runs without yielding, so the page is not drawn in between and the screen
  // stays up until the game has started. A game may show it again later for its own slow part (the 3D race
  // builds its course after Start race).
  loading.hide();
  if (opened.problem) {
    onEnd(opened.problem);
    return;
  }
  runGame({ ...opened, gameInfo, onStart, onEnd });
}

function runGame({ game, room, roomCode, gameInfo, onStart, onEnd }) {
  const container = document.createElement('div');
  container.id = 'game-container';
  let runner = null;
  let isOver = false;
  let isRoomOpen = false;

  // What the game calls to let new players in (its setup and results screens) or keep them out (a race). The
  // join window goes with a closed room, so it never covers a race.
  function setRoomOpen(open) {
    // A call that arrives late from a stopped game must not bring the room code back over the picker.
    if (isOver) {
      return;
    }
    isRoomOpen = open;
    room.setRoomOpen(open);
    showRoomOpen(open);
    if (!open) {
      closeJoinWindow();
    }
  }

  // What the game calls to dock the shell's bar as a strip along the bottom (true) or put it back at the top
  // (false). The container ends above the strip, so the game's canvas is resized by its own ResizeObserver.
  function setBarDocking(docked) {
    // Late calls from a stopped game must not dock the bar over the picker.
    if (isOver) {
      return;
    }
    setBarDocked(docked);
    container.classList.toggle('above-strip', docked);
  }

  // Frees everything the game holds and closes the room: the host's socket closes, so the server sends every
  // phone ROOM_CLOSED. Runs once, however the game ended (back, isDone, an error, the connection lost).
  function endGame(problem) {
    if (isOver) {
      return;
    }
    isOver = true;
    runner?.stop();
    hideGameControls();
    closeJoinWindow();
    try {
      game.stop();
    } catch (error) {
      console.error(`${gameInfo.title}: stop() failed`, error);
    }
    container.remove();
    room.close();
    onEnd(problem);
  }

  function endWithError(error) {
    console.error(`${gameInfo.title} stopped with an error`, error);
    endGame(`${gameInfo.title} stopped with an error (details in the browser console).`);
  }

  room.setListener({
    handleMessage(message, player) {
      handleRoomMessage({ message, player, game, isRoomOpen });
    },
    handleConnectionLost: () => endGame('Lost connection to the server.'),
  });
  // Everything from here to start() is inside the try: if any of it throws, the room must still be closed and
  // the picker shown again, not left behind a Play button that stays off.
  try {
    onStart();
    document.body.append(container);
    setRoomCode(roomCode);
    showGameControls({ roomCode, onBack: () => endGame(null), onAddPlayers: () => openJoinWindow(room) });
    // Open before start(), as the game module interface promises; the game closes it for a race.
    setRoomOpen(true);
    // game.start() gets, besides the container and the room's players and calls (pickColor(playerId, colorIndex)
    // changes a player's color if it is free, and tells their phone): `bar`, the shell's top bar. Its
    // `slot` is an empty element in the bar, right after Back to games, where the game puts its own controls
    // (the shell empties it when the game ends). `bar.setDocked(true)` makes the bar a strip along the bottom of
    // the window, with the slot, the room code, Add players and the gear in a row, and ends the container above
    // it; `setDocked(false)` puts it back at the top. A game that never calls it keeps the bar at the top.
    game.start({
      container,
      bar: { slot: barSlot, setDocked: setBarDocking },
      players: room.players,
      setControllerView: room.setControllerView,
      setPlayerLimit: room.setPlayerLimit,
      pickColor: room.pickColor,
      removePlayer: room.kickPlayer,
      // The PONG comes back to the game's onMessage with the same sentAt.
      pingPlayer: (playerId, sentAt) => room.send({ type: MESSAGE_TYPES.PING, playerId, sentAt }),
      setRoomOpen,
    });
  } catch (error) {
    endWithError(error);
    return;
  }
  runner = startGameRunner(game, (error) => (error ? endWithError(error) : endGame(null)));
  // The room is new and empty, so the way in comes up by itself.
  if (isRoomOpen) {
    openJoinWindow(room);
  }
}

// A message the room has already put in the roster: the game hears its own, and joins and leaves blip, but only
// while the room is open, so a race never has a blip over it.
function handleRoomMessage({ message, player, game, isRoomOpen }) {
  if (message.type === MESSAGE_TYPES.PLAYER_JOINED && isRoomOpen) {
    playShellSound('join');
  } else if (message.type === MESSAGE_TYPES.PLAYER_LEFT) {
    if (isRoomOpen) {
      playShellSound('leave');
    }
    game.onPlayerLeft(message.playerId);
  } else if (player && GAME_MESSAGE_TYPES.has(message.type)) {
    game.onMessage(message.playerId, message);
  }
}
