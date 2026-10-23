// Tap input: every finger touching the surface sends { kind: 'tap' } right away.
// Used by controller/games/input-lab/index.js. Same shape as every input module: start(surface), stop(), onInput(callback).
//
// Sent on pointerdown, not on release, because the touch landing is the moment the player means, and it
// saves the 50-150 ms a finger rests on the glass. Each finger counts, so two thumbs can mash.
// Not throttled: a fast human manages about 10-15 taps a second, far below what the hotspot handles.

import { INPUT_KINDS } from '../../shared/protocol.js';

let surface = null;
let inputCallback = null;

export function onInput(callback) {
  inputCallback = callback;
}

export function start(element) {
  surface = element;
  surface.addEventListener('pointerdown', handlePointerDown);
}

export function stop() {
  if (!surface) {
    return;
  }
  surface.removeEventListener('pointerdown', handlePointerDown);
  surface = null;
}

function handlePointerDown() {
  inputCallback({ kind: INPUT_KINDS.TAP });
}
