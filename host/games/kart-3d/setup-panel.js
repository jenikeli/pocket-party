// The 3D race's setup screen (M10, see setup.css): the chosen course's saved picture fills the screen
// (course-previews.js; nothing is built until a race needs it), with its name, blurb and the course pictures on
// the left; one card on the right with laps, engine class, CPU level and items for everyone, each player's control
// style and ready, and Start race; Back to lobby top left, and top right "Display and tools", a drawer with the
// host's drawing quality, the Measure tool (M7d4b) and Watch (a race of 1 to 4 self-driving karts with a view
// each, M7d4c1). Used by host/games/kart-3d/index.js, which owns the state; the panel only shows it and reports
// clicks.

import { displayName, colorText, playersInSlotOrder } from '/host/roster.js';
import { showPicture } from '/host/pictures.js';
import { playersHoldingUpStart, canStartRace } from '/host/kart/setup.js';
import { setupRows } from '/host/kart/setup-rows.js';
import { setText, setPressed } from '/host/kart/panel-parts.js';
import { COURSES } from './courses.js';
import { COURSE_PREVIEWS } from './course-previews.js';
import { createSetupMarkup, createPlayerRow, wireHandlers } from './setup-markup.js';
import { createItemSettingsRow } from './items/item-settings-panel.js';

// `handlers` holds what runs on a click (setup-markup.js's wireHandlers lists them; `onToggleItems()` and
// `onToggleItem(id)` go to the Items row). `itemSettings` (items/item-settings.js) is read once, for which items
// get a button. Returns { show(setup, choices, players), hide() }.
export function createSetupPanel(container, itemSettings, handlers) {
  const screen = createSetupMarkup();
  const byId = (id) => screen.querySelector(`#${id}`);
  const itemRow = createItemSettingsRow(itemSettings, handlers);
  byId('kart-3d-item-row-slot').replaceWith(itemRow.element);
  container.append(screen);
  const picture = screen.querySelector('.k3d-setup-picture');
  const courseName = byId('kart-3d-course-name');
  const courseBlurb = byId('kart-3d-course-blurb');
  const lapsValue = byId('kart-3d-laps');
  const rows = byId('kart-3d-rows');
  const status = byId('kart-3d-status');
  const startButton = byId('kart-3d-start-button');
  const toolsButton = byId('kart-3d-tools-button');
  const tools = byId('kart-3d-tools');
  const buttons = (attribute) => [...screen.querySelectorAll(`[${attribute}]`)];
  const courseButtons = buttons('data-course-id');
  const engineButtons = buttons('data-engine-class');
  const cpuButtons = buttons('data-cpu-level');
  const qualityButtons = buttons('data-quality');
  wireHandlers(screen, handlers);
  // The drawer is the panel's own business: opening it changes nothing in the game.
  toolsButton.addEventListener('click', () => setToolsOpen(tools.hidden));
  // playerId -> { row, dot, name, state, controls }. Rows are kept and updated in place, so the page is not
  // rebuilt every frame.
  const playerRows = new Map();
  let shownCourseId = null;

  function setToolsOpen(open) {
    tools.hidden = !open;
    setPressed(toolsButton, open);
  }

  // `choices` is { courseId, engineClass, cpuLevel, quality, items }: the host's choices that are not in the
  // shared kart setup. Called every frame while the setup screen shows; writes to the page only on change.
  function show(setup, { courseId, engineClass, cpuLevel, quality, items }, players) {
    screen.hidden = false;
    if (courseId !== shownCourseId) {
      shownCourseId = courseId;
      showCourse(courseId);
    }
    setText(lapsValue, String(setup.laps));
    courseButtons.forEach((button) => setPressed(button, button.dataset.courseId === courseId));
    engineButtons.forEach((button) => setPressed(button, Number(button.dataset.engineClass) === engineClass));
    cpuButtons.forEach((button) => setPressed(button, button.dataset.cpuLevel === cpuLevel));
    qualityButtons.forEach((button) => setPressed(button, button.dataset.quality === quality));
    itemRow.show(items);
    showRows(rows, playerRows, setup, players);
    const inOrder = playersInSlotOrder(players);
    setText(status, describeStatus(inOrder, playersHoldingUpStart(setup, inOrder).map(displayName)));
    startButton.disabled = !canStartRace(setup, inOrder);
  }

  function showCourse(courseId) {
    const preview = COURSE_PREVIEWS[courseId];
    showPicture(picture, preview.picture);
    courseName.textContent = COURSES.find((course) => course.id === courseId).name;
    courseBlurb.textContent = preview.blurb;
  }

  // The drawer is closed again, so a race never comes back to it open.
  function hide() {
    screen.hidden = true;
    setToolsOpen(false);
  }

  return { show, hide };
}

// Fills `list` with one row per player, keeping each player's row (`playerRows`: playerId -> createPlayerRow's
// parts) and updating it in place. A player who joins while the screen is up is in `players`, so they get a row
// here (and a kart in the race).
function showRows(list, playerRows, setup, players) {
  for (const [playerId, entry] of playerRows) {
    if (!players.has(playerId)) {
      entry.row.remove();
      playerRows.delete(playerId);
    }
  }
  setupRows(setup, players).forEach((rowInfo, index) => {
    const { playerId } = rowInfo.player;
    if (!playerRows.has(playerId)) {
      playerRows.set(playerId, createPlayerRow());
    }
    const entry = playerRows.get(playerId);
    fillRow(entry, rowInfo);
    if (list.children[index] !== entry.row) {
      list.insertBefore(entry.row, list.children[index] ?? null);
    }
  });
}

// The line above Start race: who the race waits for. With nobody in the room only Watch can run.
function describeStatus(players, waitingFor) {
  if (players.length === 0) {
    return 'No players yet: Watch, under Display and tools, races without phones';
  }
  return waitingFor.length > 0 ? `Waiting for ${waitingFor.join(', ')}` : 'Everyone is ready';
}

// Names come from phones, so they only ever go in as text.
function fillRow(entry, { player, controlsText, stateText, ready }) {
  const color = colorText(player);
  if (entry.dot.style.getPropertyValue('--pp-dot-color') !== color) {
    entry.dot.style.setProperty('--pp-dot-color', color);
  }
  setText(entry.name, displayName(player));
  setText(entry.controls, controlsText);
  setText(entry.state, stateText);
  entry.state.className = `k3d-player-state ${ready ? 'k3d-ready' : 'pp-muted'}`;
}
