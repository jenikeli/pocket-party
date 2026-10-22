// Drag input: turns a finger dragging on a surface into a virtual-stick value { kind: 'drag', x, y }.
// Used by controller/main.js. Same shape as every input module: start(surface), stop(), onInput(callback).
//
// x and y run from -1 to 1: how far the finger is from where it first touched, divided by DRAG_RADIUS_PX.
// Right and down are positive, matching screen and Phaser coordinates. Lifting the finger sends 0, 0.

// How far (in CSS px) the finger must move from its start point to count as a full push.
const DRAG_RADIUS_PX = 80;
// At most about 30 messages per second. Pointer events can fire at 120 Hz on some phones,
// which would flood the hotspot for no visible gain.
const SEND_INTERVAL_MS = 33;

let surface = null;
let inputCallback = null;
let activePointerId = null; // only the first finger steers; extra fingers are ignored
let originX = 0;
let originY = 0;

let pendingValue = null;
let flushTimer = null;
let lastSentAt = 0;

export function onInput(callback) {
  inputCallback = callback;
}

export function start(element) {
  surface = element;
  surface.addEventListener('pointerdown', handlePointerDown);
  surface.addEventListener('pointermove', handlePointerMove);
  surface.addEventListener('pointerup', handlePointerEnd);
  surface.addEventListener('pointercancel', handlePointerEnd);
}

export function stop() {
  if (!surface) {
    return;
  }
  surface.removeEventListener('pointerdown', handlePointerDown);
  surface.removeEventListener('pointermove', handlePointerMove);
  surface.removeEventListener('pointerup', handlePointerEnd);
  surface.removeEventListener('pointercancel', handlePointerEnd);
  surface = null;
  activePointerId = null;
  clearTimeout(flushTimer);
  flushTimer = null;
}

function handlePointerDown(event) {
  if (activePointerId !== null) {
    return;
  }
  activePointerId = event.pointerId;
  originX = event.clientX;
  originY = event.clientY;
  // Capture keeps move and up events coming to us even if the finger slides off the surface.
  surface.setPointerCapture(event.pointerId);
}

function handlePointerMove(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }
  let x = (event.clientX - originX) / DRAG_RADIUS_PX;
  let y = (event.clientY - originY) / DRAG_RADIUS_PX;
  // Clamp to a circle, not a square, so diagonals are not faster than straight lines.
  const length = Math.hypot(x, y);
  if (length > 1) {
    x /= length;
    y /= length;
  }
  queueSend({ kind: 'drag', x: roundTo2(x), y: roundTo2(y) });
}

// pointercancel fires when the browser takes over the touch (for example a system gesture).
// Treat it like lifting the finger, or the square would keep moving forever.
function handlePointerEnd(event) {
  if (event.pointerId !== activePointerId) {
    return;
  }
  activePointerId = null;
  queueSend({ kind: 'drag', x: 0, y: 0 });
}

// Sends at most once per SEND_INTERVAL_MS. Only the newest value matters, so in-between values are
// overwritten. The timer always fires, so the final value (usually the release) is never lost.
function queueSend(value) {
  pendingValue = value;
  if (flushTimer !== null) {
    return;
  }
  const wait = Math.max(0, lastSentAt + SEND_INTERVAL_MS - performance.now());
  flushTimer = setTimeout(flushPending, wait);
}

function flushPending() {
  flushTimer = null;
  lastSentAt = performance.now();
  inputCallback(pendingValue);
}

function roundTo2(value) {
  return Math.round(value * 100) / 100;
}
