// Runs one game for the shell, from loading it to handing back to the lobby: puts the shell's Phaser to sleep,
// gives the game an empty full-screen container, passes it the messages that belong to it, and drives it with
// the game runner. Used by host/scenes/lobby-scene.js.

import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { loadGame } from '/host/games/index.js';
import { startGameRunner } from '/host/game-runner.js';
import { showGameBar, hideGameBar } from '/host/game-bar.js';

// Messages from a player's controller that belong to the running game. The shell keeps the rest (names,
// phones, joins and drops) in the roster, which the game reads.
const GAME_MESSAGE_TYPES = new Set([MESSAGE_TYPES.INPUT, MESSAGE_TYPES.INPUT_MODE, MESSAGE_TYPES.PONG]);

// `gameInfo` is the game's registry entry. `lobby` is the lobby scene: the game hands back to it with
// lobby.returnFromGame(problem), where problem is null or a sentence to show, or lobby.handleConnectionLost()
// if the socket closed. Rejects, with the lobby still showing, if the game could not be loaded.
export async function playGame({ room, lobby, gameInfo }) {
  const game = await loadGame(gameInfo.id);
  const shellGame = lobby.game;
  const shellElement = document.getElementById('shell');
  const container = document.createElement('div');
  container.id = 'game-container';
  let runner = null;
  let isOver = false;

  // While the game runs it is the room's listener, in the lobby scene's place.
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

  // Frees everything the game holds and shows the shell again. Safe to call twice (End game while the
  // runner is also finishing).
  function tearDown() {
    if (isOver) {
      return false;
    }
    isOver = true;
    runner?.stop();
    hideGameBar();
    try {
      game.stop();
    } catch (error) {
      console.error(`${gameInfo.title}: stop() failed`, error);
    }
    container.remove();
    shellElement.hidden = false;
    shellGame.loop.wake();
    // The shell's canvas was hidden, so let Phaser measure the screen again in case it changed meanwhile.
    shellGame.scale.refresh();
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

  // Only one render loop and one busy WebGL context at a time: an iPad struggles with two.
  shellGame.loop.sleep();
  shellElement.hidden = true;
  document.body.append(container);
  // Before start(), because a new screen clears every controller view and start() may already set some.
  room.setScreen(CONTROLLER_SCREENS.GAME, gameInfo.id);
  room.setListener(session);
  showGameBar({ onEndGame: () => endGame(null), onCloseRoom: () => room.close() });
  try {
    game.start({
      container,
      players: room.players,
      setControllerView: room.setControllerView,
      removePlayer: room.kickPlayer,
      // The PONG comes back to the game's onMessage with the same sentAt.
      pingPlayer: (playerId, sentAt) => room.send({ type: MESSAGE_TYPES.PING, playerId, sentAt }),
    });
  } catch (error) {
    endGame(error);
    return;
  }
  runner = startGameRunner(game, endGame);
}
