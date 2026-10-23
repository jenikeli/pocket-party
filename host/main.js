// Host entry point: starts the shell's Phaser at a logical 1920x1080 and scales it to fit any screen, and keeps
// the screen awake. Loaded by host/index.html. The shell's only scene is the lobby (host/scenes/); games are
// modules in host/games/ that the lobby starts through host/game-session.js.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { keepScreenAwake } from '/shared/wake-lock.js';
import { createRoom } from '/host/room.js';
import { LobbyScene } from '/host/scenes/lobby-scene.js';

// One room for the whole page: the lobby and every game read the same players and talk through the same socket.
const room = createRoom();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'shell',
  backgroundColor: '#10131c',
  scale: {
    // FIT keeps the 16:9 design intact on any screen (letterboxing if needed); we design once at 1920x1080.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
  },
  scene: [new LobbyScene(room)],
});

// Nobody touches the host during a game, so without this it would dim and lock part way through.
const wakeStatus = document.getElementById('wake-status');
keepScreenAwake((status) => (wakeStatus.textContent = `Screen awake: ${status}`));
