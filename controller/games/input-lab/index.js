// The controller side of the input lab (M3), a game module: mode tabs, the input pad, the tilt permission flow,
// and a live readout of what is being sent. Loaded and started by controller/game-screen.js.

import { MESSAGE_TYPES, INPUT_KINDS, INPUT_FALLBACK_REASONS } from '/shared/protocol.js';
import { createRateMeter } from '/shared/rate-meter.js';
import * as dragInput from '/controller/inputs/drag.js';
import * as tapInput from '/controller/inputs/tap.js';
import * as swipeInput from '/controller/inputs/swipe.js';
import * as tiltInput from '/controller/inputs/tilt.js';
import { MARKUP } from '/controller/games/input-lab/markup.js';

const INPUT_MODULES = {
  [INPUT_KINDS.DRAG]: dragInput,
  [INPUT_KINDS.TAP]: tapInput,
  [INPUT_KINDS.SWIPE]: swipeInput,
  [INPUT_KINDS.TILT]: tiltInput,
};

const PAD_HINTS = {
  [INPUT_KINDS.DRAG]: 'Drag anywhere to move',
  [INPUT_KINDS.TAP]: 'Tap as fast as you can',
  [INPUT_KINDS.SWIPE]: 'Flick in any direction',
  [INPUT_KINDS.TILT]: 'Hold the phone upright, then tilt it',
};

const TILT_PROBLEM_TEXT = {
  [INPUT_FALLBACK_REASONS.UNSUPPORTED]: 'not supported (is the page on https?)',
  [INPUT_FALLBACK_REASONS.DENIED]: 'permission denied',
  [INPUT_FALLBACK_REASONS.NO_SENSOR]: 'no readings (no sensor?)',
};

const SWIPE_ARROWS = { up: '↑', down: '↓', left: '←', right: '→' };

// How far (CSS px) the on-screen knob moves when the stick or tilt is all the way over.
const KNOB_TRAVEL_PX = 60;
const RATE_REFRESH_MS = 250;

// The page elements, looked up by start() once MARKUP is in place.
let modeTabs, labNotice, inputPad, stickRing, stickKnob, bigReadout;
let enableTiltButton, calibrateButton, padHint, readoutValue, readoutRate, readoutTilt;

let sendMessage = null; // set by start
let currentMode = null;
let tapCount = 0;
let rateMeter = createRateMeter();
let rateTimer = null;

// Starts on drag, the input M1 already had. `send` sends one message to the server.
export function start(container, send) {
  container.innerHTML = MARKUP;
  findElements();
  modeTabs.addEventListener('click', onModeTabClick);
  enableTiltButton.addEventListener('click', enableTilt);
  calibrateButton.addEventListener('click', () => tiltInput.calibrate());
  sendMessage = send;
  rateMeter = createRateMeter();
  rateTimer = setInterval(showRate, RATE_REFRESH_MS);
  switchMode(INPUT_KINDS.DRAG);
}

// The host sends no view for the lab: everything the phone shows is its own.
export function showView() {}

// The shell empties the container afterwards, which takes the elements and their listeners with it.
export function stop() {
  INPUT_MODULES[currentMode]?.stop();
  currentMode = null;
  clearInterval(rateTimer);
}

function findElements() {
  const byId = (id) => document.getElementById(id);
  modeTabs = byId('mode-tabs');
  labNotice = byId('lab-notice');
  inputPad = byId('input-pad');
  stickRing = byId('stick-ring');
  stickKnob = byId('stick-knob');
  bigReadout = byId('big-readout');
  enableTiltButton = byId('enable-tilt-button');
  calibrateButton = byId('calibrate-button');
  padHint = byId('pad-hint');
  readoutValue = byId('readout-value');
  readoutRate = byId('readout-rate');
  readoutTilt = byId('readout-tilt');
}

// `fallback` is { fallbackFrom, reason } when we land here because another input could not start.
function switchMode(mode, fallback = {}) {
  INPUT_MODULES[currentMode]?.stop();
  currentMode = mode;
  tapCount = 0;
  for (const tab of modeTabs.querySelectorAll('button')) {
    tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode));
  }
  const usesStick = mode === INPUT_KINDS.DRAG || mode === INPUT_KINDS.TILT;
  stickRing.hidden = !usesStick;
  bigReadout.hidden = usesStick;
  bigReadout.textContent = mode === INPUT_KINDS.TAP ? '0' : '';
  enableTiltButton.hidden = mode !== INPUT_KINDS.TILT;
  calibrateButton.hidden = true;
  if (mode === INPUT_KINDS.TILT) {
    readoutTilt.textContent = 'not enabled';
  }
  padHint.textContent = PAD_HINTS[mode];
  readoutValue.textContent = '-';
  moveKnob(0, 0);

  sendMessage({ type: MESSAGE_TYPES.INPUT_MODE, mode, ...fallback });
  // Tilt waits for the "Enable tilt" tap, because iOS only grants the permission inside a user gesture.
  if (mode !== INPUT_KINDS.TILT) {
    INPUT_MODULES[mode].start(inputPad);
  }
}

async function enableTilt() {
  // requestAccess() must be the first thing this tap handler does; see the comment on it in tilt.js.
  const access = await tiltInput.requestAccess();
  // The player may have switched tabs while the permission prompt was open.
  if (currentMode !== INPUT_KINDS.TILT) {
    return;
  }
  if (access !== 'granted') {
    fallBackFromTilt(access);
    return;
  }
  enableTiltButton.hidden = true;
  readoutTilt.textContent = 'waiting for a reading...';
  const gotReading = await tiltInput.start();
  if (currentMode !== INPUT_KINDS.TILT) {
    return;
  }
  if (!gotReading) {
    tiltInput.stop();
    fallBackFromTilt(INPUT_FALLBACK_REASONS.NO_SENSOR);
    return;
  }
  readoutTilt.textContent = 'working';
  calibrateButton.hidden = false;
}

// Drag is the touch stand-in for tilt: both give a stick value, so a tilt game can still be played.
function fallBackFromTilt(reason) {
  readoutTilt.textContent = TILT_PROBLEM_TEXT[reason];
  switchMode(INPUT_KINDS.DRAG, { fallbackFrom: INPUT_KINDS.TILT, reason });
  showNotice(`Tilt is not available: ${TILT_PROBLEM_TEXT[reason]}. Using drag instead.`);
}

function sendInput(input) {
  sendMessage({ type: MESSAGE_TYPES.INPUT, input, sentAt: Date.now() });
  rateMeter.record(performance.now());
  readoutValue.textContent = describeInput(input);
  showInputOnPad(input);
}

function showInputOnPad(input) {
  if (input.kind === INPUT_KINDS.DRAG || input.kind === INPUT_KINDS.TILT) {
    moveKnob(input.x, input.y);
  } else if (input.kind === INPUT_KINDS.TAP) {
    tapCount += 1;
    bigReadout.textContent = String(tapCount);
    flashPad();
  } else if (input.kind === INPUT_KINDS.SWIPE) {
    bigReadout.textContent = SWIPE_ARROWS[input.direction];
    flashPad();
  }
}

// "x 0.5  y -0.2": every field except kind, which the tabs already show.
function describeInput(input) {
  return Object.entries(input)
    .filter(([key]) => key !== 'kind')
    .map(([key, value]) => `${key} ${value}`)
    .join('  ') || input.kind;
}

function showRate() {
  readoutRate.textContent = `${rateMeter.perSecond(performance.now())} Hz`;
}

function moveKnob(x, y) {
  stickKnob.style.transform = `translate(${x * KNOB_TRAVEL_PX}px, ${y * KNOB_TRAVEL_PX}px)`;
}

// Restarting a CSS animation needs the class removed, a layout read, then the class added again.
function flashPad() {
  inputPad.classList.remove('flash');
  void inputPad.offsetWidth;
  inputPad.classList.add('flash');
}

function showNotice(text) {
  labNotice.textContent = text;
  labNotice.hidden = false;
}

function onModeTabClick(event) {
  const mode = event.target.closest('button')?.dataset.mode;
  if (mode && mode !== currentMode) {
    labNotice.hidden = true;
    if (currentMode === INPUT_KINDS.TILT) {
      readoutTilt.textContent = 'off';
    }
    switchMode(mode);
  }
}

for (const module of Object.values(INPUT_MODULES)) {
  module.onInput(sendInput);
}
