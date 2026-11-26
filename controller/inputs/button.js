// Held-button input: every element with a data-button attribute inside the surface is a button that sends
// { kind: 'button', button, pressed: true } when a finger lands on it and { ..., pressed: false } when the last
// finger on it lifts. Used by controller/kart/controls.js (both kart races). Same shape as every input module:
// start(surface), stop(), onInput(callback).
//
// Press and release are separate messages, sent at once and not throttled: a player presses a button a few
// times a second at most, and the host keeps "held" until the release arrives. Several fingers can hold
// different buttons at once (accelerate and brake), and a finger keeps its button until it lifts, even if it
// slides off it, as a thumb on a real controller does.

import { INPUT_KINDS } from '../../shared/protocol.js';

let surface = null;
let inputCallback = null;
// pointerId -> the button name that finger is holding.
const heldBy = new Map();

export function onInput(callback) {
  inputCallback = callback;
}

export function start(element) {
  surface = element;
  surface.addEventListener('pointerdown', handlePointerDown);
  surface.addEventListener('pointerup', handlePointerEnd);
  surface.addEventListener('pointercancel', handlePointerEnd);
}

// Releases whatever is still held, so the host never keeps a button down for a phone that stopped listening.
export function stop() {
  if (!surface) {
    return;
  }
  surface.removeEventListener('pointerdown', handlePointerDown);
  surface.removeEventListener('pointerup', handlePointerEnd);
  surface.removeEventListener('pointercancel', handlePointerEnd);
  surface = null;
  const names = new Set(heldBy.values());
  heldBy.clear();
  for (const name of names) {
    inputCallback({ kind: INPUT_KINDS.BUTTON, button: name, pressed: false });
  }
}

function handlePointerDown(event) {
  const name = event.target.closest?.('[data-button]')?.dataset.button;
  if (!name) {
    return;
  }
  const alreadyHeld = isHeld(name);
  heldBy.set(event.pointerId, name);
  // Capture keeps the finger's up event coming to the surface even if it slides off.
  if (surface.setPointerCapture) {
    surface.setPointerCapture(event.pointerId);
  }
  if (!alreadyHeld) {
    inputCallback({ kind: INPUT_KINDS.BUTTON, button: name, pressed: true });
  }
}

// pointercancel fires when the browser takes the touch over (a system gesture, the phone turning). Treat it
// like lifting the finger, or the button would stay held forever.
function handlePointerEnd(event) {
  const name = heldBy.get(event.pointerId);
  if (!name) {
    return;
  }
  heldBy.delete(event.pointerId);
  if (!isHeld(name)) {
    inputCallback({ kind: INPUT_KINDS.BUTTON, button: name, pressed: false });
  }
}

function isHeld(name) {
  return [...heldBy.values()].includes(name);
}
