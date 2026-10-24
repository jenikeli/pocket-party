// A Phaser game that a game module draws by hand from its render(), instead of Phaser running its own frame
// loop, so the shell's game runner (host/game-runner.js) is the only clock. Used by the games in host/games/
// that draw with Phaser (the input lab and the 2D kart race).

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';

// Starts a 1920x1080 Phaser game with FIT scaling inside `parent` (the game's container). `create(scene)` runs
// once Phaser has booted and made its one scene, a frame or two later. Returns { drawFrame(), destroy() }.
export function startHandDrivenPhaser({ parent, backgroundColor, create }) {
  const phaserGame = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1920, height: 1080 },
    scene: {
      create() {
        create(this);
      },
    },
  });
  let lastFrameTime = null;

  // Call once per render(). Draws one frame (and runs Phaser's input and scene updates).
  function drawFrame() {
    // Phaser boots asynchronously (it decodes its default textures first).
    if (!phaserGame.isRunning) {
      return;
    }
    // Once booted, Phaser starts its own requestAnimationFrame loop. Putting that to sleep leaves the shell's
    // runner as the only clock, so each frame is drawn exactly once, from here.
    if (phaserGame.loop.running) {
      phaserGame.loop.sleep();
    }
    const now = performance.now();
    phaserGame.step(now, lastFrameTime === null ? 0 : now - lastFrameTime);
    lastFrameTime = now;
  }

  // Phaser only marks the game for destruction and tears it down at the start of its next step. Its own loop
  // is asleep, so step it once here; that also frees its WebGL context and removes the canvas.
  function destroy() {
    phaserGame.destroy(true);
    phaserGame.step(performance.now(), 0);
  }

  return { drawFrame, destroy };
}
