// The game picker (#game-picker), the host page's home after Tap to start: the chosen game's picture filling the
// screen, its title, how many play it, Play, and the games as thumbnails. No room exists here, so nobody can
// join: Play loads the game and opens its room (host/game-session.js), and the picker comes back when the game
// ends, with the reason when it stopped on a problem. Created by host/main.js.

import { GAMES, findGame } from '/host/games/index.js';
import { playerRangeText } from '/host/shell-rules.js';
import { showPicture } from '/host/pictures.js';
import { playGame } from '/host/game-session.js';
import { playShellSound } from '/host/shell-sounds.js';
import { playTune } from '/host/audio/music.js';

const screen = document.getElementById('game-picker');
const playButton = document.getElementById('play-button');

// Returns { show(problem) }; problem is null, or the sentence that says why the last game stopped.
export function createGamePicker() {
  let chosenGameId = GAMES[0].id;
  // True from Play until the game is running, or back here after failing to.
  let isStarting = false;
  const gameTiles = drawGameTiles(chooseByClick);

  playButton.addEventListener('click', play);

  // A click on a thumbnail clicks, unless it is the game already chosen.
  function chooseByClick(gameId) {
    if (isStarting || gameId === chosenGameId) {
      return;
    }
    playShellSound('click');
    chosenGameId = gameId;
    showChosenGame();
  }

  function showChosenGame() {
    const game = findGame(chosenGameId);
    for (const tile of gameTiles) {
      tile.setAttribute('aria-pressed', String(tile.dataset.gameId === game.id));
    }
    showPicture(document.getElementById('picker-background'), game.background);
    document.getElementById('picker-game-title').textContent = game.title;
    document.getElementById('picker-player-range').textContent = playerRangeText(game);
  }

  function show(problem) {
    isStarting = false;
    playButton.disabled = false;
    document.getElementById('picker-problem').textContent = problem ?? '';
    showChosenGame();
    playTune('lobby');
    screen.hidden = false;
  }

  // The picker's tune plays on through the loading screen and stops once the game runs (a race plays its own
  // from GO, the input lab none).
  function play() {
    if (isStarting) {
      return;
    }
    isStarting = true;
    playButton.disabled = true;
    playShellSound('play');
    document.getElementById('picker-problem').textContent = '';
    playGame({
      gameInfo: findGame(chosenGameId),
      onStart: () => {
        // Hidden, so only the game draws: an iPad struggles with more than one busy page at a time.
        screen.hidden = true;
        playTune(null);
      },
      onEnd: show,
    });
  }

  return { show };
}

// One thumbnail per game, in the registry's order: its cover and title. A click chooses it.
function drawGameTiles(onChoose) {
  const list = document.getElementById('picker-games');
  return GAMES.map((game) => {
    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'game-tile';
    tile.dataset.gameId = game.id;
    const cover = document.createElement('img');
    cover.src = game.cover;
    // The title is written beside it, so the picture needs no words of its own.
    cover.alt = '';
    const title = document.createElement('span');
    title.textContent = game.title;
    tile.append(cover, title);
    tile.addEventListener('click', () => onChoose(game.id));
    list.append(tile);
    return tile;
  });
}
