// Confirming by colour (CLAUDE.md, "UI design"): a control that cannot be undone takes two clicks. The first
// only arms it (class "armed", drawn red), the second does it. A press anywhere else, or 3 seconds, disarms
// it. No label changes and no dialog. Used by the host's HTML screens and the phone's Leave; the canvas games
// have their own version of the rule in host/buttons.js.

const CONFIRM_WINDOW_MS = 3000;

// `onConfirm()` runs on the second click. Returns { disarm() }.
export function confirmOnSecondClick(button, onConfirm) {
  let disarmTimer = null;
  const page = button.ownerDocument;

  // pointerdown, not click: it fires for every press, also on a canvas or a control that handles its own
  // clicks, and in the capture phase, so no handler further in can stop it from reaching us.
  function disarmOnPressElsewhere(event) {
    if (!button.contains(event.target)) {
      disarm();
    }
  }

  function arm() {
    disarmTimer = setTimeout(disarm, CONFIRM_WINDOW_MS);
    button.classList.add('armed');
    page.addEventListener('pointerdown', disarmOnPressElsewhere, true);
  }

  function disarm() {
    if (disarmTimer === null) {
      return;
    }
    clearTimeout(disarmTimer);
    disarmTimer = null;
    button.classList.remove('armed');
    page.removeEventListener('pointerdown', disarmOnPressElsewhere, true);
  }

  button.addEventListener('click', () => {
    if (disarmTimer === null) {
      arm();
      return;
    }
    disarm();
    onConfirm();
  });

  return { disarm };
}
