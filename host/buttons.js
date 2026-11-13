// A close-mark button drawn on a game's Phaser canvas, confirmed by colour: the first click turns it red, the
// second does it. The canvas version of shared/confirm-click.js, whose DOM version cannot reach a canvas.
// Used by the input lab's player cards.

const NORMAL_COLOR = 0x2a3145;
const HOVER_COLOR = 0x3a4258;
// The same red as --pp-danger in host/ui.css.
const ARMED_COLOR = 0x8e2b22;
const MARK_COLOR = 0xffffff;
// How long an armed button waits for its second click before going back to normal.
const ARM_WINDOW_MS = 3000;

// Draws a square button with a close mark (two crossing lines, as the `close` icon in shared/icons.js) at
// (x, y). `size` is the square's side in pixels; `onConfirm()` runs on the second click. Returns
// { objects }, the background and the mark, for adding to a container.
export function drawCloseButton(scene, x, y, { size, onConfirm }) {
  let armed = false;
  let disarmTimer = null;

  const background = scene.add.rectangle(x, y, size, size, NORMAL_COLOR).setInteractive({ useHandCursor: true });
  const reach = size * 0.22;
  const mark = scene.add.graphics();
  mark.lineStyle(Math.max(3, size / 12), MARK_COLOR, 1);
  mark.lineBetween(x - reach, y - reach, x + reach, y + reach);
  mark.lineBetween(x - reach, y + reach, x + reach, y - reach);

  function disarm() {
    clearTimeout(disarmTimer);
    disarmTimer = null;
    armed = false;
    background.setFillStyle(NORMAL_COLOR);
  }

  // pointerup, not pointerdown, so a touch that slides off the button does not count, as with normal buttons.
  background.on('pointerup', () => {
    if (!armed) {
      armed = true;
      background.setFillStyle(ARMED_COLOR);
      disarmTimer = setTimeout(disarm, ARM_WINDOW_MS);
      return;
    }
    disarm();
    onConfirm();
  });
  background.on('pointerover', () => !armed && background.setFillStyle(HOVER_COLOR));
  background.on('pointerout', () => !armed && background.setFillStyle(NORMAL_COLOR));

  // A press anywhere else disarms, as the shared rule says. `over` lists the objects under the pointer.
  function onPointerDownAnywhere(pointer, over) {
    if (armed && !over.includes(background)) {
      disarm();
    }
  }
  // Kept in a variable: when the whole game is destroyed the scene may have let go of its input by the time
  // the button's destroy event runs.
  const input = scene.input;
  input.on('pointerdown', onPointerDownAnywhere);
  // A destroyed button must not keep its timer or its scene listener.
  background.once('destroy', () => {
    clearTimeout(disarmTimer);
    input.off('pointerdown', onPointerDownAnywhere);
  });

  return { objects: [background, mark] };
}
