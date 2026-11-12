// Buttons drawn on a game's Phaser canvas: a plain one, and one that asks "Sure?" before doing something that
// cannot be undone. Used by the input lab.

const NORMAL_COLOR = 0x2a3145;
const HOVER_COLOR = 0x3a4258;
const DISABLED_COLOR = 0x1c2130;
const CONFIRM_COLOR = 0x8e2b22;
// How long a confirm button waits for its second click before going back to normal.
const CONFIRM_WINDOW_MS = 3000;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

// Returns { objects, setEnabled(enabled), setLabel(label), setVisible(visible) }. `objects` holds the
// background and label, for adding to a container. A disabled button ignores clicks.
export function drawButton(scene, x, y, { width, height, label, fontSize = 40, onClick }) {
  let enabled = true;
  const background = scene.add.rectangle(x, y, width, height, NORMAL_COLOR).setInteractive({ useHandCursor: true });
  const text = scene.add.text(x, y, label, { ...TEXT_STYLE, fontSize: `${fontSize}px` }).setOrigin(0.5);
  // pointerup, not pointerdown, so a touch that slides off the button does not count, as with normal buttons.
  background.on('pointerup', () => {
    if (enabled) {
      onClick();
    }
  });
  background.on('pointerover', () => enabled && background.setFillStyle(HOVER_COLOR));
  background.on('pointerout', () => background.setFillStyle(enabled ? NORMAL_COLOR : DISABLED_COLOR));

  function setEnabled(value) {
    enabled = value;
    background.setFillStyle(enabled ? NORMAL_COLOR : DISABLED_COLOR);
    text.setAlpha(enabled ? 1 : 0.4);
  }

  return {
    objects: [background, text],
    background,
    setEnabled,
    setLabel: (newLabel) => text.setText(newLabel),
    setVisible: (visible) => {
      background.setVisible(visible);
      text.setVisible(visible);
    },
  };
}

// Like drawButton, but the first click only turns it red and shows `confirmLabel`; a second click within
// 3 s runs onConfirm. Used for removing a player or closing the room, where a stray click would hurt.
export function drawConfirmButton(scene, x, y, { label, confirmLabel = 'Sure?', onConfirm, ...options }) {
  let disarmTimer = null;

  function disarm() {
    clearTimeout(disarmTimer);
    disarmTimer = null;
    button.setLabel(label);
    button.background.setFillStyle(NORMAL_COLOR);
  }

  const button = drawButton(scene, x, y, {
    ...options,
    label,
    onClick: () => {
      if (disarmTimer === null) {
        button.setLabel(confirmLabel);
        button.background.setFillStyle(CONFIRM_COLOR);
        disarmTimer = setTimeout(disarm, CONFIRM_WINDOW_MS);
        return;
      }
      disarm();
      onConfirm();
    },
  });
  // A destroyed button cannot be relabelled, so its timer goes with it.
  button.background.once('destroy', () => clearTimeout(disarmTimer));
  return button;
}
