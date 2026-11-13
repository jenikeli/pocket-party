// The 3D kart race (M6 to M10), a game module: a setup screen (setup-panel.js: the course from saved pictures,
// laps, engine class, CPU level and the items on the host, the drawing quality, the Measure tool and Watch behind
// "Display and tools", and control style and ready on each phone), then the chosen course is built behind the
// loading screen (M10: nothing is built before), a countdown with MK8DX's rocket start, and 1-4 players race
// their laps in split screen, drifting and boosting, with CPU karts filling the field to 12; then the results,
// and Race again or Back to lobby. Watch races 1-4 stand-ins (stand-ins.js) instead of the players, with no phones
// needed. The room is open to new players on the setup and results screens. Loaded through host/games/index.js
// and run by the shell (host/game-session.js).
// The rules live in DOM-free modules next to this file; this file connects them to the shell, the phones, the
// renderer, the panels and the tuning sliders.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { preloadPictures } from '/host/pictures.js';
import { showLoading } from '/host/loading-screen.js';
import { loadStylesheet } from '/host/kart/panel-parts.js';
import { createSetup, stepLaps, playerSetup, applyChoice, clearReady, forgetPlayer, canStartRace } from '/host/kart/setup.js';
import { createControlsTable } from '/host/kart/kart-controls.js';
import { buildTrack } from './track-builder.js';
import { COURSES } from './courses.js';
import { COURSE_PREVIEWS } from './course-previews.js';
import { createRace, stepRace, removeKart, RACE_PHASES } from './race.js';
import { setupView, raceView, roomIsOpen, standingRows, describeClock, describeCountdown } from './race-views.js';
import { createStepTimer } from './step-timer.js';
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
import { createStandInRace } from './stand-ins.js';
import { freshItemSeed } from './items/item-rules.js';
import { toggleItems, toggleItem, allowedItems } from './items/item-settings.js';

// Each phone's round-trip time is measured this often while the game runs, for the readout.
const PING_INTERVAL_MS = 2000;
// A long pause (a hidden tab) must not swing the cameras a long way at once: the runner's own cap
// (host/fixed-step.js).
const MAX_FRAME_SECONDS = 0.25;

// Returns a fresh 3D race game that follows the game module interface in plan.md.
export function createGame() {
  let rendererModule = null;
  // The photo-scanned asphalt's textures (photo-asphalt.js), the road's asphalt; the renderer frees them.
  let photoAsphalt = null;
  // The setup screen's stylesheet, loaded with the game and removed when it stops.
  let stylesheet = null;
  let renderer = null;
  let setupPanel = null;
  let raceBar = null;
  let resultsPanel = null;
  let tuningPanel = null;
  let measurePanel = null;
  let shell = null;
  let pingTimer = null;
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
  // Whether the canvas shows a drawn frame, which the setup screen clears once (its HUDs too).
  let canvasDrawn = false;
  // null while the setup screen shows.
  let race = null;
  // While a watched race runs (the setup screen's Watch), its stand-ins by playerId, who race in the players'
  // place; null otherwise. The room's players then sit it out, their phones showing the waiting view.
  let standIns = null;
  let controls = createControlsTable();
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();
  // Whether the shell has been told the room is open; null until the first time.
  let roomOpen = null;
  let wantsLobby = false;
  const stepTimer = createStepTimer();
  // The race's cues and the players' engines; a watched race's stand-ins are heard by their cues only.
  const raceSounds = createRaceSounds();
  const readout = createReadout();
  // When the last frame was drawn, for the cameras' time step.
  let lastDrawAt = null;

  // Three.js is fetched here, when the game is chosen, not when the lobby loads, and so are the photo-scanned
  // asphalt's maps (about 5 MB), the setup screen's stylesheet and its course pictures, so it shows complete.
  async function load() {
    rendererModule = await import('./renderer.js');
    const { loadPhotoAsphalt } = await import('./photo-asphalt.js');
    photoAsphalt = await loadPhotoAsphalt();
    stylesheet = await loadStylesheet('/host/games/kart-3d/setup.css');
    await preloadPictures(Object.values(COURSE_PREVIEWS).map((preview) => preview.picture));
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
      onToggleItems: () => !race && toggleItems(choices.items),
      onToggleItem: (id) => !race && toggleItem(choices.items, id),
      onStartRace: startRace,
      onBackToLobby: () => (wantsLobby = true),
    });
    tuningPanel = createTuningPanel(shell.container);
    // After the setup panel, so its report shows over the setup screen once a run ends.
    measurePanel = createMeasurePanel(shell.container, renderer, () => renderer.setQuality(choices.quality));
    raceBar = createRaceBar(shell.container, { onBackToSetup: showSetup, onRestart: restart, onTuning: () => tuningPanel.toggle() });
    resultsPanel = createResultsPanel(shell.container, { onRaceAgain: showSetup, onBackToLobby: () => (wantsLobby = true) });
    // The PING travels host -> server -> phone and back, the path an input takes, there and back. A timer,
    // not the game's steps, which run slow when the frame rate drops. Disconnected phones are skipped.
    pingTimer = setInterval(() => {
      for (const player of shell.players.values()) {
        if (player.connected) {
          shell.pingPlayer(player.playerId, performance.now());
        }
      }
    }, PING_INTERVAL_MS);
    showSetup();
    syncRoomOpen();
  }

  // Back to the setup screen, at the start, after the results, and whenever the host asks. Everyone confirms
  // again.
  function showSetup() {
    race = null;
    standIns = null;
    clearReady(setup);
  }

  // The room is open to new players on the setup and results screens and closed while a course is built for a
  // race and while karts race. A player who comes in is in `players` at once, so the setup shows them and the
  // next race gives them a kart. The shell is told only when this changes.
  function syncRoomOpen() {
    const open = roomIsOpen(race, courseLoader.isBuilding());
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
    if (!race && !courseLoader.isBuilding() && setChoice(choices, kind, value) && kind === 'quality') {
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
      withCourseBuilt(() => canStartRace(setup, playersInSlotOrder(shell.players)) && putKartsOnGrid());
    }
  }

  // A race of `viewCount` stand-ins with a view each, from the setup screen, for watching the host draw that many
  // views (the frame rate in the Tuning readout) without phones. Nobody needs to be ready.
  function watchRace(viewCount) {
    if (canLeaveSetup()) {
      withCourseBuilt(() => putStandInsOnGrid(viewCount));
    }
  }

  function canLeaveSetup() {
    return !race && !courseLoader.isBuilding() && !measurePanel.isRunning();
  }

  function putStandInsOnGrid(viewCount) {
    const items = allowedItems(choices.items);
    ({ race, players: standIns } = createStandInRace(chosenTrack(), viewCount, setup.laps, choices.engineClass, choices.cpuLevel, items));
    controls = createControlsTable();
  }

  // Back to the grid for another countdown, with everyone who is in the room now (ready was given already), or
  // the same stand-ins. The course is the one raced, so nothing is built.
  function restart() {
    if (race && standIns) {
      putStandInsOnGrid(standIns.size);
    } else if (race) {
      putKartsOnGrid();
    }
  }

  // Whoever races: the stand-ins in a watched race, otherwise the room's players.
  function racers() {
    return standIns ?? shell.players;
  }

  // Everyone in the roster gets a kart, at the back of the grid in slot order, a player who joined on the setup
  // screen included. Inputs held from the last race are dropped.
  function putKartsOnGrid() {
    const playerIds = playersInSlotOrder(shell.players).map((player) => player.playerId);
    const track = chosenTrack();
    race = createRace(track, playerIds, setup.laps, choices.engineClass, choices.cpuLevel, allowedItems(choices.items), freshItemSeed());
    controls = createControlsTable();
  }

  function onMessage(playerId, message) {
    if (message.type === MESSAGE_TYPES.PONG) {
      // sentAt is the performance.now() this game put in the PING, so the round trip needs no clock sync.
      readout.recordRoundTrip(playerId, performance.now() - Number(message.sentAt));
      return;
    }
    if (message.type !== MESSAGE_TYPES.INPUT) {
      return;
    }
    if (message.input?.kind === INPUT_KINDS.CHOICE) {
      applyChoice(setup, playerId, message.input, race === null);
    } else {
      controls.handleInput(playerId, message.input);
    }
  }

  // Views are sent from here only, so every change reaches the phones within one step.
  function step(dt) {
    if (race) {
      const startedAt = performance.now();
      stepRace(race, chosenTrack(), controlsFor, dt);
      stepTimer.record(performance.now() - startedAt);
    }
    raceSounds.update(race, chosenTrack(), { engines: !standIns });
    // Each course has its own tune, by its id (host/audio/tunes/), from GO; the results' after.
    playTune(tuneForRace(race, choices.courseId));
    syncRoomOpen();
    sendChangedViews();
  }

  // During the countdown auto-accelerate does not count as holding Go, or every auto-accelerate kart would
  // stall; Go (or Drift, which accelerates too) pressed by hand still makes a rocket start.
  function controlsFor(playerId) {
    const autoAccelerate = race.phase !== RACE_PHASES.COUNTDOWN && playerSetup(setup, playerId).autoAccelerate;
    return controls.controlsFor(shell.players.get(playerId), autoAccelerate);
  }

  // Every player in the room gets a view. On the setup screen it is the setup view; during a race a player with
  // no kart (they joined on the results screen) gets null ("waiting for the next race") until the next setup
  // screen, and so does every phone in a watched race.
  function sendChangedViews() {
    for (const playerId of shell.players.keys()) {
      const view = !race ? setupView(setup, choices.engineClass, chosenCourse().name, playerId) : standIns ? null : raceView(race, setup, playerId);
      const viewText = JSON.stringify(view);
      if (sentViews.get(playerId) !== viewText) {
        sentViews.set(playerId, viewText);
        shell.setControllerView(playerId, view);
      }
    }
  }

  // Nothing is drawn in 3D on the setup screen (its picture covers the canvas) or while a course is built (the
  // loading screen covers everything).
  function render(alpha) {
    courseLoader.throwIfFailed();
    const now = performance.now();
    const dt = lastDrawAt === null ? 0 : Math.min((now - lastDrawAt) / 1000, MAX_FRAME_SECONDS);
    lastDrawAt = now;
    // The Measure tool draws its own frames (from the setup screen; a race cannot start meanwhile).
    if (measurePanel.isRunning()) {
      setupPanel.hide();
      raceBar.hide();
      measurePanel.frame();
      canvasDrawn = true;
      return;
    }
    if (!race) {
      if (canvasDrawn) {
        renderer.clear();
        canvasDrawn = false;
      }
      readout.frameDrawn(now, 0, null, null, racers(), stepTimer.summary());
      tuningPanel.setVisible(false);
      raceBar.hide();
      resultsPanel.hide();
      setupPanel.show(setup, choices, shell.players);
      return;
    }
    setupPanel.hide();
    renderer.draw(race, racers(), alpha, dt);
    canvasDrawn = true;
    const track = chosenTrack();
    const readoutText = readout.frameDrawn(now, performance.now() - now, race, track, racers(), stepTimer.summary());
    const racing = race.phase !== RACE_PHASES.RESULTS;
    tuningPanel.setVisible(racing);
    raceBar.show({
      clockText: describeClock(race),
      countdownText: describeCountdown(race),
      readoutText,
      readoutShown: tuningPanel.isOpen(),
      barShown: racing,
    });
    if (racing) {
      resultsPanel.hide();
    } else {
      resultsPanel.show(standingRows(race), racers());
    }
  }

  function onPlayerLeft(playerId) {
    if (race) {
      removeKart(race, playerId);
    }
    forgetPlayer(setup, playerId);
    sentViews.delete(playerId);
  }

  function isDone() {
    return wantsLobby;
  }

  function stop() {
    clearInterval(pingTimer);
    raceSounds.stop();
    playTune(null);
    courseLoader.stop();
    stylesheet?.remove();
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
