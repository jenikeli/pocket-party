// Tilt input: turns how the phone is tilted into a stick value { kind: 'tilt', x, y }, each from -1 to 1.
// Used by controller/games/input-lab/index.js (portrait) and controller/kart/steering.js (sideways, as a wheel).
// Same shape as every input module (start, stop, onInput), plus requestAccess(), calibrate() and
// setHeldAngle(), which only tilt needs.
//
// Think of a ball on the screen as the player sees it: tilt the right edge down and x goes positive; tip the
// top edge away from you and y goes negative (up the screen). Angles come from deviceorientation and are always
// measured on the phone's own body, whichever way the screen is turned: beta is how far the phone's top end is
// raised (-180..180), gamma how far its right side is lowered (-90..90). So:
// - Portrait: x comes from gamma, y from beta.
// - Landscape: the screen's left and right ends are the phone's top and bottom, so x comes from beta, and its
//   sign depends on which way the phone was turned. That is turning the phone like a steering wheel. y is
//   always 0: nothing uses it, and gamma sits at the end of its range when a landscape phone is held upright,
//   where browsers make it jump.
// Which of these applies comes from the screen's angle, how far the page is turned round from portrait. Under
// rotation lock the page never turns, so the angle stays 0 even with the phone held sideways. The kart races
// then draw their controls turned round on the portrait page and say how the phone is held (setHeldAngle(90):
// its top end on the left), which this file then uses in place of the screen's angle.

import { INPUT_KINDS, INPUT_FALLBACK_REASONS } from '../../shared/protocol.js';
import { createThrottle } from './throttle.js';

// Tilting this far from the calibrated pose counts as a full push.
const FULL_TILT_DEGREES = 25;
// Each reading moves the smoothed value this fraction of the way to the new reading. At ~60 readings a second
// this settles in under 100 ms: enough to hide sensor noise without making the controls feel late.
const SMOOTHING = 0.35;
// About 30 messages a second, the same as drag. The sensor fires at about 60 Hz on the spike's devices.
const SEND_INTERVAL_MS = 33;
// How long start() waits for a real reading before deciding there is no sensor. Browsers without a
// gyroscope (desktops, some cheap tablets) fire one event with null angles, or none at all.
const FIRST_READING_TIMEOUT_MS = 2000;

let inputCallback = null;
// How the phone is held, as a screen angle, when the page says so (setHeldAngle); null follows the screen.
let heldAngle = null;
// The calibrated pose: the angles that count as "stick centered", and the hold angle they were taken at.
let zero = { beta: 0, gamma: 0, angle: 0 };
let lastRaw = null; // { beta, gamma } of the newest real reading
let smoothed = { x: 0, y: 0 }; // in degrees away from the zero pose
let firstReading = null; // { resolve, timer } while start() is waiting

const throttle = createThrottle(SEND_INTERVAL_MS, (value) => inputCallback(value));

export function onInput(callback) {
  inputCallback = callback;
}

// Whether requestAccess() must be called from a tap: where the browser has a motion permission to ask for (iOS,
// and Android Chrome too, which grants it without asking). Without one it answers at once.
export function needsPermissionTap() {
  return 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission === 'function';
}

// Asks for the motion permission where the browser has one (iOS always; the spike found it on Android Chrome
// too). Resolves with 'granted' or one of INPUT_FALLBACK_REASONS.
// Must be called straight from a tap handler: iOS only shows the prompt during a user gesture, and refuses
// otherwise. An async function runs synchronously up to its first await, so requestPermission() still runs
// inside the tap even though the caller awaits us.
export async function requestAccess() {
  if (!('DeviceOrientationEvent' in window)) {
    return INPUT_FALLBACK_REASONS.UNSUPPORTED;
  }
  if (typeof DeviceOrientationEvent.requestPermission !== 'function') {
    return 'granted';
  }
  try {
    const answer = await DeviceOrientationEvent.requestPermission();
    return answer === 'granted' ? 'granted' : INPUT_FALLBACK_REASONS.DENIED;
  } catch (error) {
    // iOS rejects (rather than answering 'denied') when the call did not come from a user gesture.
    console.error('Tilt permission request failed:', error);
    return INPUT_FALLBACK_REASONS.DENIED;
  }
}

// Starts listening. Resolves true once the first real reading arrives (that pose becomes zero), or false if
// none arrives in time or stop() is called first. Call requestAccess() first.
export function start() {
  lastRaw = null;
  window.addEventListener('deviceorientation', handleOrientation);
  return new Promise((resolve) => {
    const timer = setTimeout(() => finishWaiting(false), FIRST_READING_TIMEOUT_MS);
    firstReading = { resolve, timer };
  });
}

export function stop() {
  window.removeEventListener('deviceorientation', handleOrientation);
  throttle.cancel();
  finishWaiting(false);
}

// Makes the phone's current pose the new "stick centered", for however the player likes to hold it.
export function calibrate() {
  if (!lastRaw) {
    return;
  }
  zero = { ...lastRaw, angle: holdAngle() };
  smoothed = { x: 0, y: 0 };
  throttle.queue({ kind: INPUT_KINDS.TILT, x: 0, y: 0 });
}

// Tells tilt how the phone is held when the page draws its content turned round from the screen: 90 for its top
// end on the left (and 270 for the right), or null to follow the screen's own angle again. A page that sets it
// must set null when it stops, since the input lab shares this module and expects the screen's angle.
export function setHeldAngle(angle) {
  heldAngle = angle;
}

function handleOrientation(event) {
  if (typeof event.beta !== 'number' || typeof event.gamma !== 'number') {
    return; // null angles: the browser has the API but no sensor behind it
  }
  lastRaw = { beta: event.beta, gamma: event.gamma };
  if (firstReading) {
    calibrate();
    finishWaiting(true);
    return;
  }
  // The phone was turned (portrait to landscape, or round to the other landscape), or the page now says it is
  // held another way: the old zero meant a different axis or the opposite sign, so the pose now becomes zero, as
  // if the player had recalibrated.
  if (holdAngle() !== zero.angle) {
    calibrate();
    return;
  }
  // Smooth the offset from zero, not the raw angle: beta jumps from 180 to -180 when the phone tips past
  // upside down, and averaging across that jump would swing the value through zero.
  const offset = offsetFromZero(lastRaw);
  smoothed.x += SMOOTHING * (offset.x - smoothed.x);
  smoothed.y += SMOOTHING * (offset.y - smoothed.y);
  throttle.queue({
    kind: INPUT_KINDS.TILT,
    x: toStickValue(smoothed.x),
    y: toStickValue(smoothed.y),
  });
}

function finishWaiting(gotReading) {
  if (!firstReading) {
    return;
  }
  clearTimeout(firstReading.timer);
  firstReading.resolve(gotReading);
  firstReading = null;
}

// How far `raw` is from the zero pose in degrees, along the screen's x and y (see the top of this file).
function offsetFromZero(raw) {
  if (zero.angle === 90 || zero.angle === 270) {
    // At 90 the phone's top is on the left, so raising it tips the screen's right edge down: x goes positive.
    // At 270 the top is on the right and the sign flips.
    const sign = zero.angle === 90 ? 1 : -1;
    return { x: sign * (foldBeta(raw.beta) - foldBeta(zero.beta)), y: 0 };
  }
  return { x: wrapDegrees(raw.gamma - zero.gamma), y: wrapDegrees(raw.beta - zero.beta) };
}

// How the phone is held, in screen-angle terms: what the page said (setHeldAngle), else the screen's angle.
function holdAngle() {
  return heldAngle ?? screenAngle();
}

// Which way the screen is turned: 0 portrait, 90 landscape with the phone's top on the left, 270 with it on the
// right (180, upside-down portrait, is treated like portrait). window.orientation first: iOS Safari and Android
// Chrome both have it, and Playwright's emulated iPhone keeps screen.orientation.angle at 0 in landscape.
function screenAngle() {
  const angle = typeof window.orientation === 'number' ? window.orientation : window.screen?.orientation?.angle ?? 0;
  return ((angle % 360) + 360) % 360;
}

// A landscape phone held upright has gamma at the end of its -90..90 range. Leaned past upright (screen facing a
// little down), gamma cannot go further, so the spec's angles describe the same pose as beta = 180 - beta (or
// -180 - beta) with gamma coming back from 90. Folding beta into -90..90 makes both read the same, so the
// wheel does not jump when the player leans the phone forward.
function foldBeta(beta) {
  if (beta > 90) {
    return 180 - beta;
  }
  return beta < -90 ? -180 - beta : beta;
}

// Brings an angle difference into -180..180, so 170 - (-170) counts as -20 degrees, not 340.
function wrapDegrees(degrees) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

function toStickValue(degrees) {
  const value = Math.min(1, Math.max(-1, degrees / FULL_TILT_DEGREES));
  return Math.round(value * 100) / 100;
}
