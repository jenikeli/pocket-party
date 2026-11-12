// Host entry point: fits the stage to the screen, stops zooming, and shows Tap to start; the tap creates the room
// and the lobby takes over. Loaded by host/index.html. The shell is plain HTML (host/lobby.js and the screens it
// opens); games are modules in host/games/ that the lobby starts through host/game-session.js, and only the
// games that draw with Phaser load it.

import { keepStageFitted } from '/host/stage.js';
import { createRoom } from '/host/room.js';
import { createLobby } from '/host/lobby.js';
import { showTapToStart } from '/host/tap-to-start.js';
import { preloadPictures } from '/host/pictures.js';
import { GAMES } from '/host/games/index.js';

keepStageFitted();
// iPad Safari ignores the viewport's user-scalable=no and pinches anyway; its own gesture event can be stopped.
document.addEventListener('gesturestart', (event) => event.preventDefault());

// One room for the whole page: the lobby and every game read the same players and talk through the same socket.
const room = createRoom();
const lobby = createLobby(room);
room.setListener(lobby);

// The lobby's pictures start loading now, while Tap to start shows. The room is created only once they are in,
// so the room code (and with it a way to join) appears only on a fully loaded lobby.
const lobbyPictures = GAMES.flatMap((game) => [game.cover, game.background]).filter(Boolean);
const picturesLoaded = preloadPictures(lobbyPictures);

showTapToStart(async () => {
  await picturesLoaded;
  room.connect();
});
