// The phone's steering for both kart races: the on-screen stick or the phone turned like a wheel (tilt),
// whichever the host's view says this player chose. Owns the tilt flow (permission, first reading, falling back
// to the stick) and the tilt panel (Enable tilt, Recenter), and turns both inputs to match the controls'
// turned layout (controller/kart/turned-layout.js). The stick is drawn by controller/kart/floating-stick.js.
// Used by controller/kart/controls.js.

import { KART_CHOICES, KART_STEERING, INPUT_FALLBACK_REASONS } from '/shared/protocol.js';
import * as dragInput from '/controller/inputs/drag.js';
import * as tiltInput from '/controller/inputs/tilt.js';
import { stickFromDrag, TURNED_HELD_ANGLE } from '/controller/kart/turned-layout.js';
import { createFloatingStick } from '/controller/kart/floating-stick.js';

const TILT_PROBLEM_TEXT = {
  [INPUT_FALLBACK_REASONS.UNSUPPORTED]: 'not supported (is the page on https?)',
  [INPUT_FALLBACK_REASONS.DENIED]: 'permission denied',
  [INPUT_FALLBACK_REASONS.NO_SENSOR]: 'no readings (no sensor?)',
};

// How far the wheel picture turns when the phone is turned all the way.
const WHEEL_TURN_DEGREES = 60;

// { stickZone, stickRing, stickKnob, steerAmount, tiltZone, wheel, enableTiltButton, recenterButton, note }
let elements = null;
let floatingStick = null; // set by start
let sendChoice = null; // (choice, value), set by start
let sendInput = null; // (input), set by start
let steering = KART_STEERING.STICK; // what this phone steers with now
let tiltRunning = false;
let tiltStarting = false;
let turned = false; // whether the controls are drawn turned round now (setTurned)
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
  floatingStick = createFloatingStick(
    { zone: elements.stickZone, ring: elements.stickRing, knob: elements.stickKnob, amount: elements.steerAmount },
    () => turned,
  );
  steering = KART_STEERING.STICK;
  requestedSteering = null;
  startStick();
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
    startStick();
  } else {
    stopStick();
    startTiltWithoutTap();
  }
  showSteering();
}

// The host says tilt (a new player's default, or this page was reloaded) but this page has no sensor running.
// Where the browser has no motion permission to ask for (no motion sensor at all, on plain HTTP or a laptop) it
// tries now, so the phone falls back to the stick with a note at once; otherwise it waits for the player's next
// tap (startTiltOnTap), since iOS asks for the permission only inside a tap.
function startTiltWithoutTap() {
  if (tiltRunning || tiltStarting || tiltInput.needsPermissionTap()) {
    return;
  }
  enableTilt();
}

// Called from any tap on the setup screen: the motion permission can only be asked inside a tap, so whichever
// tap comes first (Ready, an option) asks for it while the host says tilt and tilt is not on yet.
export function startTiltOnTap() {
  if (steering === KART_STEERING.TILT && !tiltRunning && !tiltStarting) {
    enableTilt();
  }
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

// Whether the controls are drawn turned round (a portrait page). The stick then maps the thumb's movement to
// the player's directions, and tilt is told the phone is held sideways, top end left: under rotation lock the
// screen's own angle stays at portrait, so tilt could not tell otherwise.
export function setTurned(isTurned) {
  turned = isTurned;
  tiltInput.setHeldAngle(turned ? TURNED_HELD_ANGLE : null);
}

// Makes the phone's pose now the tilt's centre, as Recenter does. controls.js calls it at GO: the setup screen
// is held upright, so the player turns the phone during the countdown, and the pose they settle in is the one
// they mean as straight ahead.
export function recenterTilt() {
  if (tiltRunning) {
    tiltInput.calibrate();
  }
}

export function stop() {
  stopStick();
  stopTilt();
  setTurned(false);
  elements = null;
}

function request(value) {
  requestedSteering = value;
  sendChoice(KART_CHOICES.STEERING, value);
}

function startStick() {
  dragInput.start(elements.stickZone);
  floatingStick.start();
}

function stopStick() {
  dragInput.stop();
  floatingStick.stop();
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
    showNote('Your next tap asks for the motion sensor, to steer by tilting.');
  } else if (tilt) {
    showNote('');
  }
}

function showNote(text) {
  elements.note.textContent = text;
  elements.note.hidden = text === '';
}

function onStickInput(input) {
  const stick = stickFromDrag(input, turned);
  sendInput(stick);
  // In the player's directions: the knob is inside the turned controls, so its own x is theirs.
  floatingStick.show(stick);
}

function onTiltInput(input) {
  sendInput(input);
  elements.wheel.style.transform = `rotate(${input.x * WHEEL_TURN_DEGREES}deg)`;
}
