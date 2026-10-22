// Host entry point: starts Phaser at a logical 1920x1080 and scales it to fit any screen.
// Loaded by host/index.html. For M0 it only shows a title, proving Phaser loads from the vendored copy.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;

function createTitle() {
  this.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, 'Pocket Party', {
      fontFamily: 'sans-serif',
      fontSize: '120px',
      color: '#ffffff',
    })
    .setOrigin(0.5);

  this.add
    .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80, `Host ready (Phaser ${Phaser.VERSION})`, {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      color: '#9aa4bf',
    })
    .setOrigin(0.5);
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10131c',
  scale: {
    // FIT keeps the 16:9 design intact on any screen (letterboxing if needed); we design once at 1920x1080.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: { create: createTitle },
});
