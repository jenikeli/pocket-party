// Tilt input: turns how the phone is tilted into a stick value { kind: 'tilt', x, y }, each from -1 to 1.
// Used by controller/input-lab.js. Same shape as every input module (start, stop, onInput), plus
// requestAccess() and calibrate(), which only tilt needs.
//
// Think of a ball on the screen: tilt the right edge down and x goes positive; tip the top edge away from you
// and y goes negative (up the screen). Assumes portrait; in landscape the browser swaps what the axes mean.
// Angles come from deviceorientation: beta is front-back (-180..180), gamma is left-right (-90..90).

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
let zeroBeta = 0;
let zeroGamma = 0;
let lastRaw = null; // { beta, gamma } of the newest real reading
let smoothed = { x: 0, y: 0 }; // in degrees away from the zero pose
let firstReading = null; // { resolve, timer } while start() is waiting

const throttle = createThrottle(SEND_INTERVAL_MS, (value) => inputCallback(value));

export function onInput(callback) {
  inputCallback = callback;
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
  zeroBeta = lastRaw.beta;
  zeroGamma = lastRaw.gamma;
  smoothed = { x: 0, y: 0 };
  throttle.queue({ kind: INPUT_KINDS.TILT, x: 0, y: 0 });
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
  // Smooth the offset from zero, not the raw angle: beta jumps from 180 to -180 when the phone tips past
  // upside down, and averaging across that jump would swing the value through zero.
  smoothed.x += SMOOTHING * (wrapDegrees(event.gamma - zeroGamma) - smoothed.x);
  smoothed.y += SMOOTHING * (wrapDegrees(event.beta - zeroBeta) - smoothed.y);
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

// Brings an angle difference into -180..180, so 170 - (-170) counts as -20 degrees, not 340.
function wrapDegrees(degrees) {
  return ((((degrees + 180) % 360) + 360) % 360) - 180;
}

function toStickValue(degrees) {
  const value = Math.min(1, Math.max(-1, degrees / FULL_TILT_DEGREES));
  return Math.round(value * 100) / 100;
}
