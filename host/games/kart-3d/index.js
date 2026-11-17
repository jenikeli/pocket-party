// The 3D kart race (M6 to M10), a game module: a setup screen (setup-panel.js: the course from saved pictures,
// laps, engine class, CPU level and the items on the host, the drawing quality, the Measure tool and Watch behind
// the Display button, and control style and ready on each phone), then the chosen course is built behind the
// loading screen (M10: nothing is built before), a countdown with a rocket start, and 1-4 players race their laps
// in split screen, drifting and boosting, with CPU karts filling the field to 12; then the results, and Race
// again. While karts race the shell's bar docks as a strip along the bottom (bar.setDocked), with the race's own
// buttons and clock in it (race-bar.js). Watch races 1-4 stand-ins (stand-ins.js) instead of the players, with no
// phones needed. The room is open to new players on the setup and results screens. Loaded through
// host/games/index.js and run by the shell (host/game-session.js). The rules live in DOM-free modules next to this
// file; this file connects them to the shell, the setup screen's choices, the renderer and the panels. The current
// race is race-session.js's, the frames frame-drawer.js's and what the phones are sent phone-link.js's.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { preloadPictures } from '/host/pictures.js';
import { showLoading } from '/host/loading-screen.js';
import { loadStylesheets } from '/host/kart/panel-parts.js';
import { createSetup, stepLaps, canStartRace } from '/host/kart/setup.js';
import { buildTrack } from './track-builder.js';
import { COURSES } from './courses.js';
import { COURSE_PREVIEWS } from './course-previews.js';
import { roomIsOpen } from './race-views.js';
import { createRaceSession } from './race-session.js';
import { createFrameDrawer } from './frame-drawer.js';
import { createPhoneViews, startPinging } from './phone-link.js';
import { createReadout } from './readout.js';
import { createHostChoices, setChoice } from './host-choices.js';
import { createSetupPanel } from './setup-panel.js';
import { createRaceBar } from './race-bar.js';
import { createRaceSounds } from './race-sounds.js';
import { playTune, tuneForRace } from '/host/audio/music.js';
import { createResultsPanel } from './results-panel.js';
import { createTuningPanel } from './tuning-panel.js';
import { createCourseLoader } from './course-loader.js';
import { createMeasurePanel } from './measure-panel.js';
import { loadQuality, saveQuality } from './quality.js';
import { loadPlainCourse } from './plain-course.js';
import { toggleItem } from './items/item-settings.js';

// The game's stylesheets: the player rows' and laps control's, shared with the 2D race, then the setup screen's,
// the race bar's, the results' and the developer panels'.
const STYLESHEETS = [
  '/host/kart/panels.css',
  '/host/games/kart-3d/setup.css',
  '/host/games/kart-3d/race-panels.css',
  '/host/games/kart-3d/results-panel.css',
  '/host/games/kart-3d/dev-panels.css',
];

// Returns a fresh 3D race game that follows the game module interface in plan.md.
export function createGame() {
  let rendererModule = null;
  // The photo-scanned asphalt's textures (photo-asphalt.js), the road's asphalt; the renderer frees them.
  let photoAsphalt = null;
  // The stylesheets' <link>s, loaded with the game and removed when it stops.
  let stylesheets = [];
  let renderer = null;
  let setupPanel = null;
  let raceBar = null;
  let measurePanel = null;
  let shell = null;
  let stopPinging = null;
  let phoneViews = null;
  let frameDrawer = null;
  // Every course's track, built once (a few thousand stations each, in milliseconds), by course id.
  const tracks = new Map(COURSES.map((course) => [course.id, buildTrack(course)]));
  // Laps and control styles, kept from race to race until the game ends, and the host's own
  // choices with them (host-choices.js). The drawing quality is the host device's, remembered between games.
  const setup = createSetup();
  const choices = createHostChoices(loadQuality());
  // Whether the course is drawn plain, for the rules' browser tests (plain-course.js); nothing in the UI sets it.
  const plainCourse = loadPlainCourse();
  // Builds the chosen course when a race, Watch or Measure needs it (course-loader.js).
  let courseLoader = null;
  const session = createRaceSession({
    getPlayers: () => shell.players,
    setup,
    choices,
    pickColor: (playerId, colorIndex) => shell.pickColor(playerId, colorIndex),
    chosenTrack,
  });
  // Whether the shell has been told the room is open; null until the first time.
  let roomOpen = null;
  // Whether the shell's bar is docked as the strip (the bar starts at the top).
  let barDocked = false;
  // The race's cues (countdown, drifts, boosts, items, hits, laps).
  const raceSounds = createRaceSounds();
  const readout = createReadout();

  // Three.js is fetched here, when the game is chosen, not when the host page loads, and so are the photo-scanned
  // asphalt's maps (about 5 MB), the stylesheets and the setup screen's course pictures, so it shows complete.
  async function load() {
    rendererModule = await import('./renderer.js');
    const { loadPhotoAsphalt } = await import('./photo-asphalt.js');
    photoAsphalt = await loadPhotoAsphalt();
    await preloadPictures(Object.values(COURSE_PREVIEWS).map((preview) => preview.picture));
    // Last, since stop() is never called for a game that failed to load: nothing after this can fail and leave
    // the stylesheets on the page.
    stylesheets = await loadStylesheets(STYLESHEETS);
  }

  function start(gameShell) {
    shell = gameShell;
    renderer = rendererModule.createRenderer(shell.container, choices.quality, photoAsphalt, plainCourse);
    courseLoader = createCourseLoader(renderer, showLoading);
    setupPanel = createSetupPanel(shell.container, choices.items, {
      onCourse: (value) => choose('courseId', value),
      onLapsStep: (lapsStep) => stepLaps(setup, lapsStep),
      onEngineClass: (value) => choose('engineClass', value),
      onCpuLevel: (value) => choose('cpuLevel', value),
      onQuality: (value) => choose('quality', value),
      onMeasure: startMeasuring,
      onWatch: watchRace,
      onToggleItem: (id) => !session.race && toggleItem(choices.items, id),
      onStartRace: startRace,
      onRemovePlayer: gameShell.removePlayer,
    });
    const tuningPanel = createTuningPanel(shell.container);
    // After the setup panel, so its report shows over the setup screen once a run ends.
    measurePanel = createMeasurePanel(shell.container, renderer, () => renderer.setQuality(choices.quality));
    raceBar = createRaceBar(shell.container, shell.bar.slot, {
      onBackToSetup: session.showSetup,
      onRestart: session.restart,
      onTuning: () => tuningPanel.toggle(),
    });
    const resultsPanel = createResultsPanel(shell.container, { onRaceAgain: session.showSetup });
    const panels = { setupPanel, raceBar, resultsPanel, tuningPanel, measurePanel };
    const players = () => shell.players;
    frameDrawer = createFrameDrawer({ renderer, readout, session, setup, choices, chosenTrack, players, panels });
    phoneViews = createPhoneViews({ shell, session, setup, choices, courseName: () => chosenCourse().name });
    stopPinging = startPinging(shell);
    session.showSetup();
    syncRoomOpen();
  }

  // The room is open to new players on the setup and results screens and closed while a course is built for a
  // race and while karts race. A player who comes in is in `players` at once, so the setup shows them and the
  // next race gives them a kart. The shell is told only when this changes.
  function syncRoomOpen() {
    const open = roomIsOpen(session.race, courseLoader.isBuilding());
    if (open !== roomOpen) {
      roomOpen = open;
      shell.setRoomOpen(open);
    }
  }

  // The shell's bar is the strip along the bottom while karts are on the grid or racing (a Watch race too) and at
  // the results, and the bar at the top on the setup screen and while Measure runs (no race then). The shell is
  // told only when this changes, and resizes the canvas to end above the strip.
  function syncBarDocked() {
    const docked = session.race !== null;
    if (docked !== barDocked) {
      barDocked = docked;
      shell.bar.setDocked(docked);
    }
  }

  function chosenCourse() {
    return COURSES.find((course) => course.id === choices.courseId);
  }

  function chosenTrack() {
    return tracks.get(choices.courseId);
  }

  // Clicks on the setup screen only, never while a course is built (the course raced must stay the chosen one).
  function choose(kind, value) {
    if (!session.race && !courseLoader.isBuilding() && setChoice(choices, kind, value) && kind === 'quality') {
      saveQuality(value);
      renderer.setQuality(value);
    }
  }

  // Runs `then()` once the chosen course is built, at once if it was built last.
  function withCourseBuilt(then) {
    courseLoader.withCourseBuilt(chosenCourse(), chosenTrack(), then);
  }

  // The Measure tool runs from the setup screen only, on the course chosen there.
  function startMeasuring() {
    if (canLeaveSetup()) {
      withCourseBuilt(() => measurePanel.start(chosenTrack(), chosenCourse().name));
    }
  }

  // Checked again once the course is built: a player may have dropped or changed their mind meanwhile, and then
  // the setup screen stays, with the course ready for the next Start race.
  function startRace() {
    if (canLeaveSetup() && canStartRace(setup, playersInSlotOrder(shell.players))) {
      withCourseBuilt(() => canStartRace(setup, playersInSlotOrder(shell.players)) && session.putKartsOnGrid());
    }
  }

  // A race of `viewCount` stand-ins with a view each, from the setup screen, for watching the host draw that many
  // views (the frame rate in the Tuning readout) without phones. Nobody needs to be ready.
  function watchRace(viewCount) {
    if (canLeaveSetup()) {
      withCourseBuilt(() => session.putStandInsOnGrid(viewCount));
    }
  }

  function canLeaveSetup() {
    return !session.race && !courseLoader.isBuilding() && !measurePanel.isRunning();
  }

  function onMessage(playerId, message) {
    if (message.type === MESSAGE_TYPES.PONG) {
      // sentAt is the performance.now() this game put in the PING, so the round trip needs no clock sync.
      readout.recordRoundTrip(playerId, performance.now() - Number(message.sentAt));
      return;
    }
    if (message.type === MESSAGE_TYPES.INPUT) {
      session.handleInput(playerId, message.input);
    }
  }

  // Views are sent from here only, so every change reaches the phones within one step.
  function step(dt) {
    session.step(dt);
    raceSounds.update(session.race, chosenTrack());
    // Each course has its own tune, by its id (host/audio/tunes/), from GO; the results' after.
    playTune(tuneForRace(session.race, choices.courseId));
    syncRoomOpen();
    syncBarDocked();
    phoneViews.sendChanged();
  }

  function render(alpha) {
    courseLoader.throwIfFailed();
    // Here too: karts go on the grid from the course loader, between steps, and the first frame of a race should
    // already be drawn above the strip.
    syncBarDocked();
    frameDrawer.draw(alpha);
  }

  function onPlayerLeft(playerId) {
    session.removePlayer(playerId);
    phoneViews.forget(playerId);
  }

  // A race is left through the shell's back arrow, which closes the room, so the game never ends itself.
  function isDone() {
    return false;
  }

  function stop() {
    stopPinging();
    playTune(null);
    courseLoader.stop();
    raceBar.remove();
    stylesheets.forEach((link) => link.remove());
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
