// The 3D race's setup screen (M10, see setup.css): the chosen course's saved picture fills the screen
// (course-previews.js; nothing is built until a race needs it), with the course's name large, its description and
// the course pictures bottom left; one card bottom right with laps, speed, CPU level and items for everyone, each
// player's row (host/kart/player-rows.js) or "Scan the code to join" while nobody is in, the line that says why
// Start race is off, and Start race; and the Display button top right, a drawer with the host's drawing quality,
// the Measure tool (M7d4b) and Watch (a race of 1 to 4 self-driving karts with a view each, M7d4c1). Leaving the game is the shell's back arrow. Used by
// host/games/kart-3d/index.js, which owns the state; the panel only shows it and reports clicks.

import { playersInSlotOrder } from '/host/roster.js';
import { showPicture } from '/host/pictures.js';
import { startBlocker } from '/host/kart/setup.js';
import { setupRows } from '/host/kart/setup-rows.js';
import { createPlayerRows } from '/host/kart/player-rows.js';
import { setText, setPressed } from '/host/kart/panel-parts.js';
import { COURSES } from './courses.js';
import { COURSE_PREVIEWS } from './course-previews.js';
import { createSetupMarkup, wireHandlers } from './setup-markup.js';
import { createItemSettingsRow } from './items/item-settings-panel.js';

// `handlers` holds what runs on a click (setup-markup.js's wireHandlers lists them; `onToggleItem(id)` goes to the
// Items row and `onRemovePlayer(playerId)` to the players' crosses). `itemSettings` (items/item-settings.js) is
// read once, for which items get a button. Returns { show(setup, choices, players), hide() }.
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
  const rowsList = byId('kart-3d-rows');
  const playerRows = createPlayerRows(rowsList, { onRemove: handlers.onRemovePlayer });
  const noPlayers = byId('kart-3d-no-players');
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
    const rows = setupRows(setup, players);
    playerRows.show(rows);
    // Nobody in yet: the line that says how to join takes the rows' place.
    rowsList.hidden = rows.length === 0;
    noPlayers.hidden = rows.length > 0;
    // The only sentence on the screen: why Start race is off. The 3D race can start with one player (CPU karts
    // fill the grid); with nobody in the room only Watch, in the tools drawer, can run.
    const blocker = startBlocker(setup, playersInSlotOrder(players));
    setText(status, blocker);
    startButton.disabled = blocker !== '';
  }

  function showCourse(courseId) {
    showPicture(picture, COURSE_PREVIEWS[courseId].picture);
    courseName.textContent = COURSES.find((course) => course.id === courseId).name;
    courseBlurb.textContent = COURSE_PREVIEWS[courseId].blurb;
  }

  // The drawer is closed again, so a race never comes back to it open.
  function hide() {
    screen.hidden = true;
    setToolsOpen(false);
  }

  return { show, hide };
}
