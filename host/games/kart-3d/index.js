// The 3D kart race (M6 to M10), a game module: a setup screen (setup-panel.js: the course from saved pictures,
// laps, engine class, CPU level and the items on the host, the drawing quality, the Measure tool and Watch behind
// "Display and tools", and control style and ready on each phone), then the chosen course is built behind the
// loading screen (M10: nothing is built before), a countdown with MK8DX's rocket start, and 1-4 players race
// their laps in split screen, drifting and boosting, with CPU karts filling the field to 12; then the results,
// and Race again or Back to lobby. Watch races 1-4 stand-ins (stand-ins.js) instead of the players, with no phones
// needed. The room is open to new players on the setup and results screens. Loaded through host/games/index.js
// and run by the shell (host/game-session.js).
// The rules live in DOM-free modules next to this file; this file connects them to the shell, the setup screen's
// choices, the renderer and the panels. The current race is race-session.js's, the frames frame-drawer.js's and
// what the phones are sent phone-link.js's.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { preloadPictures } from '/host/pictures.js';
import { showLoading } from '/host/loading-screen.js';
import { loadStylesheet } from '/host/kart/panel-parts.js';
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
import { toggleItems, toggleItem } from './items/item-settings.js';

// The game's stylesheets: the setup screen's and the race panels'.
const STYLESHEETS = ['/host/games/kart-3d/setup.css', '/host/games/kart-3d/race-panels.css'];

// Returns a fresh 3D race game that follows the game module interface in plan.md.
export function createGame() {
  let rendererModule = null;
  // The photo-scanned asphalt's textures (photo-asphalt.js), the road's asphalt; the renderer frees them.
  let photoAsphalt = null;
  // The stylesheets' <link>s, loaded with the game and removed when it stops.
  let stylesheets = [];
  let renderer = null;
  let setupPanel = null;
  let measurePanel = null;
  let shell = null;
  let stopPinging = null;
  let phoneViews = null;
  let frameDrawer = null;
  // Every course's track, built once (a few thousand stations each, in milliseconds), by course id.
  const tracks = new Map(COURSES.map((course) => [course.id, buildTrack(course)]));
  // Laps and control styles, kept from race to race until the game goes back to the lobby, and the host's own
  // choices with them (host-choices.js). The drawing quality is the host device's, remembered between games.
  const setup = createSetup();
  const choices = createHostChoices(loadQuality());
  // Whether the course is drawn plain, for the rules' browser tests (plain-course.js); nothing in the UI sets it.
  const plainCourse = loadPlainCourse();
  // Builds the chosen course when a race, Watch or Measure needs it (course-loader.js).
  let courseLoader = null;
  const session = createRaceSession({ getPlayers: () => shell.players, setup, choices, chosenTrack });
  // Whether the shell has been told the room is open; null until the first time.
  let roomOpen = null;
  let wantsLobby = false;
  // The race's cues and the players' engines; a watched race's stand-ins are heard by their cues only.
  const raceSounds = createRaceSounds();
  const readout = createReadout();

  // Three.js is fetched here, when the game is chosen, not when the lobby loads, and so are the photo-scanned
  // asphalt's maps (about 5 MB), the stylesheets and the setup screen's course pictures, so it shows complete.
  async function load() {
    rendererModule = await import('./renderer.js');
    const { loadPhotoAsphalt } = await import('./photo-asphalt.js');
    photoAsphalt = await loadPhotoAsphalt();
    // stop() is not called for a game that failed to load, so what is already on the page is taken off here.
    try {
      for (const href of STYLESHEETS) {
        stylesheets.push(await loadStylesheet(href));
      }
      await preloadPictures(Object.values(COURSE_PREVIEWS).map((preview) => preview.picture));
    } catch (error) {
      removeStylesheets();
      throw error;
    }
  }

  function removeStylesheets() {
    stylesheets.forEach((link) => link.remove());
    stylesheets = [];
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
      onToggleItems: () => !session.race && toggleItems(choices.items),
      onToggleItem: (id) => !session.race && toggleItem(choices.items, id),
      onStartRace: startRace,
      onBackToLobby: () => (wantsLobby = true),
    });
    const tuningPanel = createTuningPanel(shell.container);
    // After the setup panel, so its report shows over the setup screen once a run ends.
    measurePanel = createMeasurePanel(shell.container, renderer, () => renderer.setQuality(choices.quality));
    const raceBar = createRaceBar(shell.container, { onBackToSetup: session.showSetup, onRestart: session.restart, onTuning: () => tuningPanel.toggle() });
    const resultsPanel = createResultsPanel(shell.container, { onRaceAgain: session.showSetup, onBackToLobby: () => (wantsLobby = true) });
    const panels = { setupPanel, raceBar, resultsPanel, tuningPanel, measurePanel };
    frameDrawer = createFrameDrawer({ renderer, readout, session, setup, choices, chosenTrack, players: () => shell.players, panels });
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
    raceSounds.update(session.race, chosenTrack(), { engines: !session.standIns });
    // Each course has its own tune, by its id (host/audio/tunes/), from GO; the results' after.
    playTune(tuneForRace(session.race, choices.courseId));
    syncRoomOpen();
    phoneViews.sendChanged();
  }

  function render(alpha) {
    courseLoader.throwIfFailed();
    frameDrawer.draw(alpha);
  }

  function onPlayerLeft(playerId) {
    session.removePlayer(playerId);
    phoneViews.forget(playerId);
  }

  function isDone() {
    return wantsLobby;
  }

  function stop() {
    stopPinging();
    raceSounds.stop();
    playTune(null);
    courseLoader.stop();
    removeStylesheets();
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
