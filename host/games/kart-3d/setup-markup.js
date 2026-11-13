// The markup of the 3D race's setup screen, built once: the picture and its scrim, then in the screen's
// .pp-stage the tools icon and its drawer, the chosen course's name and the course pictures, and the card with
// the race's settings and the players; and the buttons wired to the game's handlers. Styled by setup.css. Used by
// setup-panel.js, which fills it.

import { ENGINE_CLASSES } from './race.js';
import { COURSES } from './courses.js';
import { COURSE_PREVIEWS } from './course-previews.js';
import { CPU_LEVELS } from './cpu-levels.js';
import { QUALITY_LEVELS } from './quality.js';
import { MAX_STAND_INS } from './stand-ins.js';
import { icon } from '/shared/icons.js';
import { lapsStepperMarkup } from '/host/kart/panel-parts.js';

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
      <button type="button" id="kart-3d-tools-button" class="pp-icon-button k3d-tools-button" aria-pressed="false"
        aria-label="Display and tools" title="Display and tools">${icon('tools')}</button>
      ${toolsDrawer()}
      <div class="k3d-course on-picture">
        <h1 id="kart-3d-course-name" class="pp-title k3d-course-name"></h1>
        <div class="k3d-courses">${COURSES.map(courseTile).join('')}</div>
      </div>
      ${card()}
    </div>`;
  return screen;
}

// Connects the screen's buttons to the game: `onCourse(courseId)` gets an id from COURSES, `onLapsStep(step)` -1
// or 1, `onEngineClass(engineClass)` a key of ENGINE_CLASSES, `onCpuLevel(level)` a key of CPU_LEVELS,
// `onQuality(level)` a key of QUALITY_LEVELS, `onWatch(viewCount)` 1 to MAX_STAND_INS; `onMeasure()` and
// `onStartRace()` take no arguments. (The players' crosses are wired by host/kart/player-rows.js.)
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
}

// A course is its picture alone; the chosen one's name is the big title, and every picture's name is its tooltip
// and its accessible name.
function courseTile(course) {
  return `<button type="button" class="k3d-course-tile" data-course-id="${course.id}" aria-pressed="false" ` +
    `aria-label="${course.name}" title="${course.name}"><img src="${COURSE_PREVIEWS[course.id].picture}" alt=""></button>`;
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
      <div class="k3d-rule">
        ${lapsStepperMarkup({ minusId: 'kart-3d-laps-minus', valueId: 'kart-3d-laps', plusId: 'kart-3d-laps-plus' })}
        <div class="pp-segment">${engineButtons}</div>
      </div>
      <div class="k3d-rule"><span class="pp-muted">CPU</span><div class="pp-segment">${cpuButtons}</div></div>
      <div class="k3d-rule"><span class="pp-muted">Items</span><div id="kart-3d-item-row-slot"></div></div>
      <ul id="kart-3d-rows" class="kart-player-rows"></ul>
      <p id="kart-3d-status" class="pp-muted k3d-status"></p>
      <button type="button" id="kart-3d-start-button" class="pp-button pp-primary pp-big" disabled>Start race</button>
    </div>`;
}
