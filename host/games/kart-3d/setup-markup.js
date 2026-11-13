// The markup of the 3D race's setup screen, built once: the picture and its scrim, then in the screen's
// .pp-stage Back to lobby, "Display and tools" and its drawer, the chosen course's name and the course pictures,
// and the card with the race's settings and the players; a player's row; and the buttons wired to the game's
// handlers. Styled by setup.css. Used by setup-panel.js, which fills it.

import { ENGINE_CLASSES } from './race.js';
import { COURSES } from './courses.js';
import { COURSE_PREVIEWS } from './course-previews.js';
import { CPU_LEVELS } from './cpu-levels.js';
import { QUALITY_LEVELS } from './quality.js';
import { MAX_STAND_INS } from './stand-ins.js';

// Returns the screen's <section>, hidden. Every text in it is our own (course names, labels), never from a
// phone, so it can go into the markup; the players' names are added as text by setup-panel.js.
export function createSetupMarkup() {
  const screen = document.createElement('section');
  screen.id = 'kart-3d-setup';
  screen.className = 'k3d-setup';
  screen.hidden = true;
  screen.innerHTML = `
    <img class="k3d-setup-picture" alt="" hidden>
    <div class="k3d-setup-scrim"></div>
    <div class="pp-stage k3d-setup-stage">
      <button type="button" id="kart-3d-setup-lobby-button" class="pp-button pp-small k3d-lobby-button">Back to lobby</button>
      <button type="button" id="kart-3d-tools-button" class="pp-button pp-small k3d-tools-button" aria-pressed="false">Display and tools</button>
      ${toolsDrawer()}
      <div class="k3d-course on-picture">
        <p class="k3d-kicker">Kart race 3D</p>
        <h1 id="kart-3d-course-name" class="pp-title k3d-course-name"></h1>
        <p id="kart-3d-course-blurb"></p>
        <div class="k3d-courses">${COURSES.map(courseTile).join('')}</div>
      </div>
      ${card()}
    </div>`;
  return screen;
}

// Connects the screen's buttons to the game: `onCourse(courseId)` gets an id from COURSES, `onLapsStep(step)` -1
// or 1, `onEngineClass(engineClass)` a key of ENGINE_CLASSES, `onCpuLevel(level)` a key of CPU_LEVELS,
// `onQuality(level)` a key of QUALITY_LEVELS, `onWatch(viewCount)` 1 to MAX_STAND_INS; `onMeasure()`,
// `onStartRace()` and `onBackToLobby()` take no arguments.
export function wireHandlers(screen, handlers) {
  const onClick = (selector, handler) =>
    screen.querySelectorAll(selector).forEach((button) => button.addEventListener('click', () => handler(button.dataset)));
  onClick('#kart-3d-laps-minus', () => handlers.onLapsStep(-1));
  onClick('#kart-3d-laps-plus', () => handlers.onLapsStep(1));
  onClick('[data-course-id]', (data) => handlers.onCourse(data.courseId));
  onClick('[data-engine-class]', (data) => handlers.onEngineClass(Number(data.engineClass)));
  onClick('[data-cpu-level]', (data) => handlers.onCpuLevel(data.cpuLevel));
  onClick('[data-quality]', (data) => handlers.onQuality(data.quality));
  onClick('[data-watch-views]', (data) => handlers.onWatch(Number(data.watchViews)));
  onClick('#kart-3d-measure-button', () => handlers.onMeasure());
  onClick('#kart-3d-start-button', () => handlers.onStartRace());
  onClick('#kart-3d-setup-lobby-button', () => handlers.onBackToLobby());
}

// One player's row, empty: the dot, name, control style and state, filled by setup-panel.js.
export function createPlayerRow() {
  const row = document.createElement('li');
  row.className = 'k3d-player';
  const dot = document.createElement('span');
  dot.className = 'pp-dot';
  const name = document.createElement('span');
  name.className = 'k3d-player-name';
  const controls = document.createElement('span');
  controls.className = 'pp-muted k3d-player-style';
  const state = document.createElement('span');
  row.append(dot, name, controls, state);
  return { row, dot, name, state, controls };
}

// The course's picture is the small one in the strip; its name, the button's only text, says which it is.
function courseTile(course) {
  return `<button type="button" class="k3d-course-tile" data-course-id="${course.id}" aria-pressed="false">` +
    `<img src="${COURSE_PREVIEWS[course.id].picture}" alt=""><span>${course.name}</span></button>`;
}

function toolsDrawer() {
  const qualityButtons = Object.entries(QUALITY_LEVELS)
    .map(([level, { label }]) => `<button type="button" class="pp-button" data-quality="${level}" aria-pressed="false">${label}</button>`)
    .join('');
  const watchButtons = Array.from({ length: MAX_STAND_INS }, (unused, index) => index + 1)
    .map((count) => `<button type="button" class="pp-button" data-watch-views="${count}">${count}</button>`)
    .join('');
  return `
    <div id="kart-3d-tools" class="pp-panel k3d-tools" hidden>
      <div class="k3d-tools-row"><span class="pp-muted">Look</span><div class="pp-segment">${qualityButtons}</div></div>
      <div class="k3d-tools-row">
        <button type="button" id="kart-3d-measure-button" class="pp-button">Measure</button>
        <span class="pp-muted">times each look on this course</span>
      </div>
      <div class="k3d-tools-row">
        <span class="pp-muted">Watch</span>
        <div class="pp-segment">${watchButtons}</div>
        <span class="pp-muted">views, no phones</span>
      </div>
    </div>`;
}

function card() {
  const engineButtons = Object.keys(ENGINE_CLASSES)
    .map((engineClass) => `<button type="button" class="pp-button" data-engine-class="${engineClass}" aria-pressed="false">${engineClass}cc</button>`)
    .join('');
  const cpuButtons = Object.entries(CPU_LEVELS)
    .map(([level, { label }]) => `<button type="button" class="pp-button" data-cpu-level="${level}" aria-pressed="false">${label}</button>`)
    .join('');
  return `
    <div class="pp-panel k3d-card">
      <h2 class="k3d-heading">Race</h2>
      <div class="k3d-rules">
        <span class="pp-muted">Laps</span>
        <div class="k3d-laps">
          <button type="button" id="kart-3d-laps-minus" class="pp-button">-</button>
          <span id="kart-3d-laps" class="k3d-laps-value"></span>
          <button type="button" id="kart-3d-laps-plus" class="pp-button">+</button>
        </div>
        <span class="pp-muted">Class</span><div class="pp-segment">${engineButtons}</div>
        <span class="pp-muted">CPU</span><div class="pp-segment">${cpuButtons}</div>
        <span class="pp-muted">Items</span><div id="kart-3d-item-row-slot"></div>
      </div>
      <hr>
      <h2 class="k3d-heading">Players</h2>
      <ul id="kart-3d-rows" class="k3d-players"></ul>
      <p id="kart-3d-status" class="pp-muted k3d-status"></p>
      <button type="button" id="kart-3d-start-button" class="pp-button pp-primary pp-big" disabled>Start race</button>
    </div>`;
}
