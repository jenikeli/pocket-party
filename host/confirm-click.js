// A button that asks before doing something that cannot be undone: the first click only arms it (class
// "armed", drawn in --pp-danger), and a second click within 3 s does it. Used by the lobby (Close room, removing
// a player) and the game bar (End game, Close room); the canvas games have their own in host/buttons.js.

const CONFIRM_WINDOW_MS = 3000;

// `onArmedChange(armed)` relabels the button ("Close it?" and back); `onConfirm()` runs on the second click.
// Returns { disarm(), isArmed() }.
export function confirmOnSecondClick(button, { onArmedChange, onConfirm }) {
  let disarmTimer = null;

  function disarm() {
    if (disarmTimer === null) {
      return;
    }
    clearTimeout(disarmTimer);
    disarmTimer = null;
    button.classList.remove('armed');
    onArmedChange(false);
  }

  button.addEventListener('click', () => {
    if (disarmTimer === null) {
      disarmTimer = setTimeout(disarm, CONFIRM_WINDOW_MS);
      button.classList.add('armed');
      onArmedChange(true);
      return;
    }
    disarm();
    onConfirm();
  });

  return { disarm, isArmed: () => disarmTimer !== null };
}

// The common case: a button whose whole text swaps to `confirmLabel` while armed.
export function confirmButton(button, confirmLabel, onConfirm) {
  const label = button.textContent;
  return confirmOnSecondClick(button, {
    onArmedChange: (armed) => (button.textContent = armed ? confirmLabel : label),
    onConfirm,
  });
}
