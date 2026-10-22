// Host entry point: starts Phaser at a logical 1920x1080 and scales it to fit any screen.
// Loaded by host/index.html. Each screen of the game is a scene in host/scenes/.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { InputLabScene } from '/host/scenes/input-lab-scene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#10131c',
  scale: {
    // FIT keeps the 16:9 design intact on any screen (letterboxing if needed); we design once at 1920x1080.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1920,
    height: 1080,
  },
  scene: [InputLabScene],
});
