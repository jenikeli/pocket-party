// The 3D race's HTML panels over the canvas: the setup screen (course, laps and engine class for everyone, the
// host's drawing quality with the Measure tool's button (M7d4b), each player's control style and ready, and Start
// race), and during the race a small bar at the top (Back to setup, Restart
// and Tuning, which opens tuning-panel.js and the readout), the race clock top right, and the countdown in big
// letters in the middle. The results are results-panel.js's. Used by host/games/kart-3d/index.js, which owns
// the state; the panels only show it and report clicks. The bottom right stays clear for the shell's game bar.

import { displayName, colorText, playersInSlotOrder } from '/host/roster.js';
import { KART_STEERING } from '/shared/protocol.js';
import { playerSetup, playersHoldingUpStart, canStartRace } from '/host/kart/setup.js';
import { ENGINE_CLASSES } from './race.js';
import { COURSES } from './courses.js';
import { QUALITY_LEVELS } from './quality.js';

const STYLE = `
  #kart-3d-setup { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(720px, 90vw);
    max-height: 96dvh; overflow-y: auto; box-sizing: border-box; padding: 20px 32px; border-radius: 16px;
    background: rgba(28, 33, 48, 0.92); color: #ffffff; font: 24px sans-serif; text-align: center; }
  #kart-3d-setup h1 { margin: 0; font-size: 44px; }
  #kart-3d-setup p { margin: 8px 0; color: #9aa4bf; }
  #kart-3d-setup .settings { display: flex; justify-content: center; align-items: center; gap: 10px; margin: 10px 0; }
  #kart-3d-setup .settings span { min-width: 2.5em; }
  #kart-3d-setup .settings.quality { font-size: 18px; color: #9aa4bf; }
  #kart-3d-setup .settings.quality button { font-size: 16px; padding: 6px 12px; }
  #kart-3d-setup ul { margin: 12px 0; padding: 0; list-style: none; text-align: left; }
  #kart-3d-setup li { display: flex; justify-content: space-between; gap: 16px; padding: 4px 0; }
  #kart-3d-setup li .name { font-weight: bold; flex: 1; }
  #kart-3d-setup li .style { color: #9aa4bf; }
  #kart-3d-setup li .ready { color: #2ecc71; }
  #kart-3d-race-bar { position: fixed; left: 50%; top: 8px; transform: translateX(-50%); display: flex; gap: 12px;
    align-items: flex-start; padding: 8px 12px; border-radius: 10px; background: rgba(16, 19, 28, 0.75);
    color: #ffffff; font: 14px sans-serif; }
  #kart-3d-race-bar p { margin: 0; white-space: pre-line; }
  #kart-3d-clock { position: fixed; right: 12px; top: 8px; margin: 0; color: #ffffff; text-align: right;
    font: bold 28px sans-serif; text-shadow: 0 2px 0 #000000; pointer-events: none; white-space: pre-line; }
  #kart-3d-countdown { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); margin: 0;
    color: #ffd84a; font: bold 160px sans-serif; text-shadow: 0 6px 0 #a3471b, 0 0 24px rgba(0, 0, 0, 0.6);
    pointer-events: none; }
  #kart-3d-setup button, #kart-3d-race-bar button { font: 22px sans-serif; padding: 10px 22px; border: none;
    border-radius: 8px; background: #2a3145; color: #ffffff; cursor: pointer; }
  #kart-3d-setup .settings button { padding: 8px 14px; }
  #kart-3d-setup button[aria-pressed="true"] { background: #f39c12; color: #1c2130; }
  #kart-3d-race-bar button { font-size: 16px; padding: 8px 12px; }
  #kart-3d-setup button:disabled { opacity: 0.4; cursor: default; }
`;

// `onCourse(courseId)` gets an id from COURSES, `onLapsStep(step)` -1 or 1, `onEngineClass(engineClass)` a key of
// ENGINE_CLASSES, `onQuality(level)` a key of QUALITY_LEVELS; `onMeasure()`, `onStartRace()`, `onBackToSetup()`,
// `onRestart()` and `onTuning()` run on a click of those buttons (`handlers` holds them). Returns
// { showSetup(setup, choices, players), showRace(...), hideAll() }: one of the first two shows at a time, or none
// (hideAll, while the Measure tool runs).
export function createPanels(container, handlers) {
  const { onCourse, onLapsStep, onEngineClass, onQuality, onMeasure, onStartRace, onBackToSetup, onRestart, onTuning } = handlers;
  const style = document.createElement('style');
  style.textContent = STYLE;
  const setupPanel = createSetupPanel();
  const raceBar = document.createElement('div');
  raceBar.id = 'kart-3d-race-bar';
  raceBar.hidden = true;
  raceBar.innerHTML = `
    <button type="button" id="kart-3d-setup-button">Back to setup</button>
    <button type="button" id="kart-3d-restart-button">Restart</button>
    <button type="button" id="kart-3d-tuning-button">Tuning</button>
    <p id="kart-3d-readout" hidden></p>`;
  const clock = createLine('kart-3d-clock');
  const countdown = createLine('kart-3d-countdown');
  container.append(style, setupPanel, raceBar, clock, countdown);
  const byId = (id) => container.querySelector(`#${id}`);
  const rows = byId('kart-3d-rows');
  const status = byId('kart-3d-status');
  const startButton = byId('kart-3d-start-button');
  const lapsValue = byId('kart-3d-laps');
  const courseButtons = [...setupPanel.querySelectorAll('[data-course-id]')];
  const engineButtons = [...setupPanel.querySelectorAll('[data-engine-class]')];
  const qualityButtons = [...setupPanel.querySelectorAll('[data-quality]')];
  const readout = byId('kart-3d-readout');
  byId('kart-3d-laps-minus').addEventListener('click', () => onLapsStep(-1));
  byId('kart-3d-laps-plus').addEventListener('click', () => onLapsStep(1));
  courseButtons.forEach((button) => button.addEventListener('click', () => onCourse(button.dataset.courseId)));
  engineButtons.forEach((button) => button.addEventListener('click', () => onEngineClass(Number(button.dataset.engineClass))));
  qualityButtons.forEach((button) => button.addEventListener('click', () => onQuality(button.dataset.quality)));
  byId('kart-3d-measure-button').addEventListener('click', onMeasure);
  startButton.addEventListener('click', onStartRace);
  byId('kart-3d-setup-button').addEventListener('click', onBackToSetup);
  byId('kart-3d-restart-button').addEventListener('click', onRestart);
  byId('kart-3d-tuning-button').addEventListener('click', onTuning);
  // What the rows show, as text, so they are only rebuilt when something changed (this runs every frame).
  let shownRows = null;

  // `choices` is { courseId, engineClass, quality }: the host's choices that are not in the shared kart setup.
  function showSetup(setup, { courseId, engineClass, quality }, players) {
    setupPanel.hidden = false;
    raceBar.hidden = true;
    clock.hidden = true;
    countdown.hidden = true;
    setText(lapsValue, String(setup.laps));
    courseButtons.forEach((button) => setPressed(button, button.dataset.courseId === courseId));
    engineButtons.forEach((button) => setPressed(button, Number(button.dataset.engineClass) === engineClass));
    qualityButtons.forEach((button) => setPressed(button, button.dataset.quality === quality));
    const inOrder = playersInSlotOrder(players);
    const entries = inOrder.map((player) => describeRow(player, playerSetup(setup, player.playerId)));
    const rowsText = JSON.stringify(entries);
    if (rowsText !== shownRows) {
      shownRows = rowsText;
      rows.replaceChildren(...entries.map(createRow));
    }
    const waitingFor = playersHoldingUpStart(setup, inOrder).map(displayName);
    setText(status, waitingFor.length > 0 ? `Waiting for ${waitingFor.join(', ')}` : 'Everyone is ready');
    startButton.disabled = !canStartRace(setup, inOrder);
  }

  // Passed every frame: `clockText` is the clock's lines ('' before GO and at the results), `countdownText` '3',
  // '2', '1', 'GO!' or '' once the karts are off, `readoutText` the readout's text (null leaves it as it is,
  // since it is rebuilt only a few times a second), `readoutShown` whether it shows (with the tuning panel),
  // and `barShown` whether the bar shows (not over the results, which have their own buttons).
  function showRace({ clockText, countdownText, readoutText, readoutShown, barShown }) {
    setupPanel.hidden = true;
    raceBar.hidden = !barShown;
    clock.hidden = clockText === '';
    setText(clock, clockText);
    countdown.hidden = countdownText === '';
    setText(countdown, countdownText);
    readout.hidden = !readoutShown;
    if (readoutText !== null) {
      setText(readout, readoutText);
    }
  }

  function hideAll() {
    for (const element of [setupPanel, raceBar, clock, countdown]) {
      element.hidden = true;
    }
  }

  return { showSetup, showRace, hideAll };
}

// Course names and quality labels are our own text, never from a phone, so they can go into the markup.
function createSetupPanel() {
  const panel = document.createElement('div');
  panel.id = 'kart-3d-setup';
  const courseButtons = COURSES
    .map((course) => `<button type="button" data-course-id="${course.id}" aria-pressed="false">${course.name}</button>`)
    .join('');
  const engineButtons = Object.keys(ENGINE_CLASSES)
    .map((engineClass) => `<button type="button" data-engine-class="${engineClass}" aria-pressed="false">${engineClass}cc</button>`)
    .join('');
  const qualityButtons = Object.entries(QUALITY_LEVELS)
    .map(([level, { label }]) => `<button type="button" data-quality="${level}" aria-pressed="false">${label}</button>`)
    .join('');
  panel.innerHTML = `
    <h1>Kart race 3D</h1>
    <div class="settings">${courseButtons}</div>
    <div class="settings">
      Laps
      <button type="button" id="kart-3d-laps-minus">-</button>
      <span id="kart-3d-laps"></span>
      <button type="button" id="kart-3d-laps-plus">+</button>
    </div>
    <div class="settings">${engineButtons}</div>
    <div class="settings quality">Look ${qualityButtons}
      <button type="button" id="kart-3d-measure-button">Measure</button></div>
    <p>Pick your steering and accelerate on your phone, then tap Ready.</p>
    <ul id="kart-3d-rows"></ul>
    <p id="kart-3d-status"></p>
    <button type="button" id="kart-3d-start-button" disabled>Start race</button>`;
  return panel;
}

function createLine(id) {
  const line = document.createElement('p');
  line.id = id;
  line.hidden = true;
  return line;
}

// Writes to the page only on change: the panels are updated every frame.
function setPressed(button, pressed) {
  if (button.getAttribute('aria-pressed') !== String(pressed)) {
    button.setAttribute('aria-pressed', String(pressed));
  }
}

function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function describeRow(player, { steering, autoAccelerate, ready }) {
  return {
    name: displayName(player),
    color: colorText(player),
    style: `${steering === KART_STEERING.TILT ? 'Tilt' : 'Stick'}, ${autoAccelerate ? 'auto-accelerate' : 'Go button'}`,
    state: !player.connected ? '(away)' : ready ? 'Ready' : 'Choosing...',
  };
}

// Built from text nodes, never innerHTML: names come from the players' phones.
function createRow(entry) {
  const row = document.createElement('li');
  const name = document.createElement('span');
  name.className = 'name';
  name.style.color = entry.color;
  name.textContent = entry.name;
  const styleText = document.createElement('span');
  styleText.className = 'style';
  styleText.textContent = entry.style;
  const state = document.createElement('span');
  state.className = entry.state === 'Ready' ? 'ready' : 'style';
  state.textContent = entry.state;
  row.append(name, styleText, state);
  return row;
}
