// Runs one game for the shell, from loading it to handing back to the lobby: closes the room to newcomers, shows
// the loading screen while the game's code loads, gives the game an empty full-screen container, passes it the
// messages that belong to it, and drives it with the game runner. Used by host/lobby.js.

import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { loadGame } from '/host/games/index.js';
import { startGameRunner } from '/host/game-runner.js';
import { showGameBar, hideGameBar, showAddPlayersButton } from '/host/game-bar.js';
import { openJoinWindow, closeJoinWindow } from '/host/join-window.js';
import { showLoading } from '/host/loading-screen.js';

// Messages from a player's controller that belong to the running game. The shell keeps the rest (names,
// phones, joins and drops) in the roster, which the game reads.
const GAME_MESSAGE_TYPES = new Set([MESSAGE_TYPES.INPUT, MESSAGE_TYPES.INPUT_MODE, MESSAGE_TYPES.PONG]);

// `gameInfo` is the game's registry entry. `lobby` is the lobby (host/lobby.js): the game hands back to it with
// lobby.returnFromGame(problem), where problem is null or a sentence to show, or lobby.handleConnectionLost()
// if the socket closed. Resolves once the game runs; rejects, with the lobby still showing, if it could not be
// loaded (the lobby then opens the room again).
export async function playGame({ room, lobby, gameInfo }) {
  // Closed from Play: someone joining now would have no place in a race. The limit is the game's own, so a game
  // that opens the room later (its setup screen) never gets more players than it takes.
  room.setRoomOpen(false);
  room.setPlayerLimit(gameInfo.maxPlayers);
  const loading = showLoading({ title: gameInfo.title, picture: gameInfo.background });
  let game;
  try {
    game = await loadGame(gameInfo.id, (fraction) => loading.setProgress(fraction));
  } finally {
    // Hidden before start(), which runs without yielding, so the page is not drawn in between and the screen
    // stays up until the game has started. A game may show it again later for its own slow part (the 3D race
    // builds its course after Start race).
    loading.hide();
  }

  const container = document.createElement('div');
  container.id = 'game-container';
  let runner = null;
  let isOver = false;

  // While the game runs it is the room's listener, in the lobby's place.
  const session = {
    handleMessage(message, player) {
      if (message.type === MESSAGE_TYPES.PLAYER_LEFT) {
        game.onPlayerLeft(message.playerId);
      } else if (player && GAME_MESSAGE_TYPES.has(message.type)) {
        game.onMessage(message.playerId, message);
      }
    },
    handleConnectionLost(closedByHost) {
      tearDown();
      lobby.handleConnectionLost(closedByHost);
    },
  };

  // What the game calls to let new players in (its setup and results screens) or keep them out (a race). The
  // join window goes with a closed room, so it never covers a race.
  function setRoomOpen(open) {
    room.setRoomOpen(open);
    showAddPlayersButton(open);
    if (!open) {
      closeJoinWindow();
    }
  }

  // Frees everything the game holds. Safe to call twice (End game while the runner is also finishing).
  function tearDown() {
    if (isOver) {
      return false;
    }
    isOver = true;
    runner?.stop();
    hideGameBar();
    closeJoinWindow();
    try {
      game.stop();
    } catch (error) {
      console.error(`${gameInfo.title}: stop() failed`, error);
    }
    container.remove();
    room.setListener(lobby);
    return true;
  }

  // `error` is null when the game ended normally (isDone, End game).
  function endGame(error) {
    if (!tearDown()) {
      return;
    }
    if (error) {
      console.error(`${gameInfo.title} stopped with an error`, error);
    }
    const problem = error ? `${gameInfo.title} stopped with an error (details in the browser console).` : null;
    lobby.returnFromGame(problem);
  }

  // Hidden, so only the game draws: an iPad struggles with more than one busy page at a time.
  lobby.hide();
  document.body.append(container);
  // Before start(), because a new screen clears every controller view and start() may already set some.
  room.setScreen(CONTROLLER_SCREENS.GAME, gameInfo.id);
  room.setListener(session);
  showGameBar({
    onAddPlayers: () => openJoinWindow(room),
    onEndGame: () => endGame(null),
    onCloseRoom: () => room.close(),
  });
  try {
    game.start({
      container,
      players: room.players,
      setControllerView: room.setControllerView,
      removePlayer: room.kickPlayer,
      // The PONG comes back to the game's onMessage with the same sentAt.
      pingPlayer: (playerId, sentAt) => room.send({ type: MESSAGE_TYPES.PING, playerId, sentAt }),
      setRoomOpen,
    });
  } catch (error) {
    endGame(error);
    return;
  }
  runner = startGameRunner(game, endGame);
}
