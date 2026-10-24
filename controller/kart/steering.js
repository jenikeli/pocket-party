// The phone's steering for both kart races: the on-screen stick or the phone turned like a wheel (tilt),
// whichever the host's view says this player chose. Owns the tilt flow (permission, first reading, falling back
// to the stick) and the tilt panel (Enable tilt, Recenter). Used by controller/kart/controls.js.

import { KART_CHOICES, KART_STEERING, INPUT_FALLBACK_REASONS } from '/shared/protocol.js';
import * as dragInput from '/controller/inputs/drag.js';
import * as tiltInput from '/controller/inputs/tilt.js';

const TILT_PROBLEM_TEXT = {
  [INPUT_FALLBACK_REASONS.UNSUPPORTED]: 'not supported (is the page on https?)',
  [INPUT_FALLBACK_REASONS.DENIED]: 'permission denied',
  [INPUT_FALLBACK_REASONS.NO_SENSOR]: 'no readings (no sensor?)',
};

// How far the wheel picture turns when the phone is turned all the way.
const WHEEL_TURN_DEGREES = 60;
// How far (CSS px) the knob moves when the stick is all the way over.
const KNOB_TRAVEL_PX = 45;

let elements = null; // { stickZone, stickKnob, tiltZone, wheel, enableTiltButton, recenterButton, note }
let sendChoice = null; // (choice, value), set by start
let sendInput = null; // (input), set by start
let steering = KART_STEERING.STICK; // what this phone steers with now
let tiltRunning = false;
let tiltStarting = false;
// The steering this phone just asked the host for, until a view confirms it. Views the host sent before it
// saw the choice can still arrive, and must not switch the steering back.
let requestedSteering = null;

// `send` gives { sendChoice(choice, value), sendInput(input) }.
export function start(pageElements, send) {
  elements = pageElements;
  ({ sendChoice, sendInput } = send);
  dragInput.onInput(onStickInput);
  tiltInput.onInput(onTiltInput);
  elements.enableTiltButton.addEventListener('click', enableTilt);
  elements.recenterButton.addEventListener('click', () => tiltInput.calibrate());
  steering = KART_STEERING.STICK;
  requestedSteering = null;
  dragInput.start(elements.stickZone);
  showSteering();
}

// `viewSteering` is the steering in the host's newest view.
export function show(viewSteering) {
  if (requestedSteering !== null) {
    if (viewSteering !== requestedSteering) {
      return;
    }
    requestedSteering = null;
  }
  if (viewSteering === steering) {
    return;
  }
  steering = viewSteering;
  if (steering === KART_STEERING.STICK) {
    stopTilt();
    dragInput.start(elements.stickZone);
  } else {
    dragInput.stop();
  }
  showSteering();
}

// What this phone steers with now (a KART_STEERING value): the host's view, once it confirms a choice.
export function current() {
  return steering;
}

// Called straight from a tap (the setup screen's Tilt, or Enable tilt), because iOS only asks for the motion
// permission inside a user gesture; requestAccess() is the first thing it does. Once tilt gives a real reading
// the phone asks the host for tilt steering; if it cannot, the player stays on (or goes back to) the stick.
export async function enableTilt() {
  if (tiltStarting || tiltRunning) {
    if (tiltRunning) {
      request(KART_STEERING.TILT);
    }
    return;
  }
  tiltStarting = true;
  let problem = await tiltInput.requestAccess();
  if (problem === 'granted' && elements) {
    showNote('Waiting for the first tilt reading...');
    problem = (await tiltInput.start()) ? null : INPUT_FALLBACK_REASONS.NO_SENSOR;
  }
  tiltStarting = false;
  if (!elements) {
    return; // the game stopped while we waited
  }
  if (problem) {
    tiltInput.stop();
    showNote(`Tilt is not available: ${TILT_PROBLEM_TEXT[problem]}. Using the stick.`);
    request(KART_STEERING.STICK);
    return;
  }
  tiltRunning = true;
  request(KART_STEERING.TILT);
  showSteering();
}

// The setup screen's Stick.
export function chooseStick() {
  request(KART_STEERING.STICK);
}

export function stop() {
  dragInput.stop();
  stopTilt();
  elements = null;
}

function request(value) {
  requestedSteering = value;
  sendChoice(KART_CHOICES.STEERING, value);
}

function stopTilt() {
  if (tiltRunning || tiltStarting) {
    tiltInput.stop();
  }
  tiltRunning = false;
}

// Shows the stick or the tilt panel, and on the setup screen a note when tilt is chosen but not on: after a
// reload the host still says tilt, but the new page has no sensor running until the player taps.
function showSteering() {
  const tilt = steering === KART_STEERING.TILT;
  elements.stickZone.hidden = tilt;
  elements.tiltZone.hidden = !tilt;
  elements.enableTiltButton.hidden = tiltRunning;
  elements.recenterButton.hidden = !tiltRunning;
  if (tilt && !tiltRunning && !tiltStarting) {
    showNote('Tap Tilt to turn tilt on.');
  } else if (tilt) {
    showNote('');
  }
}

function showNote(text) {
  elements.note.textContent = text;
  elements.note.hidden = text === '';
}

function onStickInput(input) {
  sendInput(input);
  // Only left and right steer, so the knob only moves sideways.
  elements.stickKnob.style.transform = `translateX(${input.x * KNOB_TRAVEL_PX}px)`;
}

function onTiltInput(input) {
  sendInput(input);
  elements.wheel.style.transform = `rotate(${input.x * WHEEL_TURN_DEGREES}deg)`;
}
