// Swipe input: a quick flick on the surface sends { kind: 'swipe', direction, x, y, speed } when the finger lifts.
// Used by controller/games/input-lab/index.js. Same shape as every input module: start(surface), stop(), onInput(callback).
//
// direction is 'up', 'down', 'left' or 'right' (whichever axis moved most). x and y are the flick's direction
// as a unit vector (right and down positive). speed is in surface sizes per second (the surface's shorter
// side), so a flick across the whole pad in half a second is about 2 on any screen size.

import { INPUT_KINDS } from '../../shared/protocol.js';

// Shorter or slower movements are a tap or a drag, not a swipe.
const MIN_DISTANCE_PX = 30;
const MAX_DURATION_MS = 600;

let surface = null;
let inputCallback = null;
let activePointerId = null; // only the first finger can swipe; extra fingers are ignored
let startX = 0;
let startY = 0;
let startTime = 0;

export function onInput(callback) {
  inputCallback = callback;
}

export function start(element) {
  surface = element;
  surface.addEventListener('pointerdown', handlePointerDown);
  surface.addEventListener('pointerup', handlePointerUp);
  surface.addEventListener('pointercancel', handlePointerCancel);
}

export function stop() {
  if (!surface) {
    return;
  }
  surface.removeEventListener('pointerdown', handlePointerDown);
  surface.removeEventListener('pointerup', handlePointerUp);
  surface.removeEventListener('pointercancel', handlePointerCancel);
  surface = null;
  activePointerId = null;
}

function handlePointerDown(event) {
  if (activePointerId !== null) {
    return;
  }
  activePointerId = event.pointerId;
  startX = event.clientX;
  startY = event.clientY;
  startTime = performance.now();
  // Capture keeps the up event coming to us even if the flick ends off the surface.
  surface.setPointerCapture(event.pointerId);
}

function handlePointerUp(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }
  activePointerId = null;
  const dx = event.clientX - startX;
  const dy = event.clientY - startY;
  const distance = Math.hypot(dx, dy);
  const durationMs = Math.max(1, performance.now() - startTime);
  if (distance < MIN_DISTANCE_PX || durationMs > MAX_DURATION_MS) {
    return;
  }
  const { width, height } = surface.getBoundingClientRect();
  const surfaceSize = Math.min(width, height);
  inputCallback({
    kind: INPUT_KINDS.SWIPE,
    direction: directionOf(dx, dy),
    x: roundTo2(dx / distance),
    y: roundTo2(dy / distance),
    speed: roundTo2(distance / surfaceSize / (durationMs / 1000)),
  });
}

// The browser took the touch over (for example an iOS edge-swipe gesture), so the flick never finished.
function handlePointerCancel(event) {
  if (event.pointerId === activePointerId) {
    activePointerId = null;
  }
}

function directionOf(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

function roundTo2(value) {
  return Math.round(value * 100) / 100;
}
