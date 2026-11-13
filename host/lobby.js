// The lobby (#lobby in host/index.html): the chosen game's picture filling the screen, the players as chips, the
// games as thumbnails, Play, and the buttons for joining, room settings and closing the room. There is no ready
// step: a game can be picked whenever the player count fits it, and its own setup screen is where players get
// ready. The room's listener between games; created by host/main.js, handed back to by host/game-session.js.

import { MESSAGE_TYPES, CONTROLLER_SCREENS, MAX_PLAYERS } from '/shared/protocol.js';
import { GAMES, findGame } from '/host/games/index.js';
import { canPickGame } from '/host/lobby-rules.js';
import { createPlayerChips } from '/host/lobby-players.js';
import { setRoomCode, openJoinWindow, closeJoinWindow } from '/host/join-window.js';
import { setUpRoomSettings } from '/host/room-settings.js';
import { showConnectionLost } from '/host/connection-lost.js';
import { hideTapToStart } from '/host/tap-to-start.js';
import { confirmOnSecondClick } from '/shared/confirm-click.js';
import { showPicture } from '/host/pictures.js';
import { playGame } from '/host/game-session.js';
import { playRosterSounds, forgetRoster, playShellSound } from '/host/shell-sounds.js';
import { playTune } from '/host/audio/music.js';

// Often enough for the "back in 0:24" countdowns to tick smoothly.
const REFRESH_MS = 250;

const screen = document.getElementById('lobby');
const playButton = document.getElementById('play-button');

// Returns the lobby: the room's listener (handleMessage, handleConnectionLost), plus hide() and
// returnFromGame(problem) for the game session.
export function createLobby(room) {
  const playerChips = createPlayerChips(document.getElementById('lobby-players'), {
    onRemove: (playerId) => room.kickPlayer(playerId),
  });
  const gameTiles = drawGameTiles(chooseByClick);
  // True from Play until the game is loaded and running (or failed to load).
  let isStarting = false;
  // Why the last game did not load or stopped; cleared by the next Play.
  let problem = '';

  document.getElementById('add-players-button').addEventListener('click', () => openJoinWindow(room));
  confirmOnSecondClick(document.getElementById('lobby-close-room-button'), () => room.close());
  playButton.addEventListener('click', play);
  setUpRoomSettings(room);
  // For the life of the page; refresh() does nothing while a game hides the lobby. A plain timer, not the
  // game's frame loop, so the countdowns keep real time.
  setInterval(refresh, REFRESH_MS);

  const lobby = {
    // Joins, drops and names are already in the roster (host/room.js); refresh() shows them.
    handleMessage(message) {
      if (message.type === MESSAGE_TYPES.ROOM_CREATED) {
        showFirstTime(message.roomCode);
      }
      refresh();
    },
    handleConnectionLost(closedByHost) {
      closeJoinWindow();
      playTune(null);
      showConnectionLost(closedByHost);
    },
    hide() {
      screen.hidden = true;
    },
    // Called by host/game-session.js once the game has stopped. The room takes anyone again, up to MAX_PLAYERS.
    returnFromGame(problemText) {
      room.setScreen(CONTROLLER_SCREENS.LOBBY);
      openRoomToEveryone();
      // Joins and leaves during the game were not watched here; they should not all blip at once now.
      forgetRoster();
      problem = problemText ?? '';
      playTune('lobby');
      screen.hidden = false;
      refresh();
    },
  };

  // The room code exists only now, so the lobby replaces Tap to start here. Nobody can be in yet, so the join
  // window opens by itself.
  function showFirstTime(roomCode) {
    setRoomCode(roomCode);
    hideTapToStart();
    chooseGame(room.settings.gameId);
    playTune('lobby');
    screen.hidden = false;
    openJoinWindow(room);
  }

  function openRoomToEveryone() {
    room.setPlayerLimit(MAX_PLAYERS);
    room.setRoomOpen(true);
  }

  // A click on a thumbnail clicks, unless it is the game already chosen. Choosing by code (the first showing)
  // is silent.
  function chooseByClick(gameId) {
    if (!isStarting && gameId !== room.settings.gameId) {
      playShellSound('click');
    }
    chooseGame(gameId);
  }

  function chooseGame(gameId) {
    if (isStarting) {
      return;
    }
    room.settings.gameId = gameId;
    showPicture(document.getElementById('lobby-background'), findGame(gameId).background);
    refresh();
  }

  function refresh() {
    if (screen.hidden) {
      return;
    }
    const game = findGame(room.settings.gameId);
    playerChips.show(room.players, Date.now());
    playRosterSounds(room.players);
    for (const tile of gameTiles) {
      tile.setAttribute('aria-pressed', String(tile.dataset.gameId === game.id));
    }
    document.getElementById('lobby-game-title').textContent = game.title;
    document.getElementById('lobby-game-blurb').textContent = game.blurb;
    const { ok, reason } = canPickGame(room.players, game);
    playButton.disabled = isStarting || !ok;
    document.getElementById('lobby-status').textContent = reason;
    document.getElementById('lobby-problem').textContent = problem;
  }

  // Checked again here, because a player may have joined or left since the button was last drawn as enabled.
  // A game that fails to load leaves everyone in the lobby, with the room open again.
  async function play() {
    const game = findGame(room.settings.gameId);
    if (isStarting || !canPickGame(room.players, game).ok) {
      return;
    }
    isStarting = true;
    playShellSound('play');
    problem = '';
    closeJoinWindow();
    refresh();
    try {
      await playGame({ room, lobby, gameInfo: game });
      // The lobby's tune plays on through the loading screen and stops once the game runs (a race plays its
      // own from GO, the input lab none). A game that failed in start() is already back in the lobby.
      if (screen.hidden) {
        playTune(null);
      }
    } catch (error) {
      console.error(`Could not load ${game.title}`, error);
      problem = `Could not load ${game.title} (details in the browser console).`;
      openRoomToEveryone();
    }
    isStarting = false;
    refresh();
  }

  return lobby;
}

// One thumbnail per game, in the registry's order: its cover and title. A click chooses it.
function drawGameTiles(onChoose) {
  const list = document.getElementById('lobby-games');
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
