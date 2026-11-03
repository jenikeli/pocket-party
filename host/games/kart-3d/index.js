// The 3D kart race (M6 to M7e), a game module: a setup screen (course, laps, engine class, CPU level and drawing
// quality on the host, with the Measure tool and Watch, and control style and ready on each phone), then a countdown
// with MK8DX's rocket start, and 1-4 players race their laps in split screen, drifting and boosting, with CPU
// karts filling the field to 12; then the results, and Race again or Back to lobby. Watch races 1-4 stand-ins
// (stand-ins.js) instead of the players, with no phones needed. Loaded through host/games/index.js and run by
// the shell (host/game-session.js).
// The rules live in DOM-free modules next to this file; this file connects them to the shell, the phones, the
// renderer, the panels and the tuning sliders.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { createSetup, stepLaps, playerSetup, applyChoice, clearReady, forgetPlayer, canStartRace } from '/host/kart/setup.js';
import { createControlsTable } from '/host/kart/kart-controls.js';
import { buildTrack } from './track-builder.js';
import { COURSES } from './courses.js';
import { createRace, stepRace, removeKart, ENGINE_CLASSES, DEFAULT_ENGINE_CLASS, RACE_PHASES } from './race.js';
import { setupView, raceView, standingRows, describeClock, describeCountdown } from './race-views.js';
import { createStepTimer } from './step-timer.js';
import { createReadout } from './readout.js';
import { DEFAULT_CPU_LEVEL, CPU_LEVELS } from './cpu-levels.js';
import { createPanels } from './panels.js';
import { createResultsPanel } from './results-panel.js';
import { createTuningPanel } from './tuning-panel.js';
import { createMeasurePanel } from './measure-panel.js';
import { QUALITY_LEVELS, loadQuality, saveQuality } from './quality.js';
import { loadPlainCourse } from './plain-course.js';
import { createStandInRace } from './stand-ins.js';

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
  let renderer = null;
  let panels = null;
  let resultsPanel = null;
  let tuningPanel = null;
  let measurePanel = null;
  let players = null;
  let setControllerView = null;
  let pingTimer = null;
  // Every course's track, built once (a few thousand stations each, in milliseconds), by course id.
  const tracks = new Map(COURSES.map((course) => [course.id, buildTrack(course)]));
  // Laps and control styles, kept from race to race until the game goes back to the lobby, and the course and
  // engine class with them.
  const setup = createSetup();
  let courseId = COURSES[0].id;
  let track = tracks.get(courseId);
  let engineClass = DEFAULT_ENGINE_CLASS;
  let cpuLevel = DEFAULT_CPU_LEVEL;
  // The host device's drawing quality, remembered between games (quality.js).
  let quality = loadQuality();
  // Whether the course is drawn plain, for the rules' browser tests (plain-course.js); nothing in the UI sets it.
  const plainCourse = loadPlainCourse();
  // null while the setup screen shows.
  let race = null;
  // While a watched race runs (the setup screen's Watch), its stand-ins by playerId, who race in the players'
  // place; null otherwise. The room's players then sit it out, their phones showing the waiting view.
  let standIns = null;
  let controls = createControlsTable();
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();
  let wantsLobby = false;
  const stepTimer = createStepTimer();
  const readout = createReadout();
  // When the last frame was drawn, for the cameras' time step.
  let lastDrawAt = null;

  // Three.js is fetched here, when the game is chosen, not when the lobby loads, and so are the photo-scanned
  // asphalt's maps (about 5 MB).
  async function load() {
    rendererModule = await import('./renderer.js');
    const { loadPhotoAsphalt } = await import('./photo-asphalt.js');
    photoAsphalt = await loadPhotoAsphalt();
  }

  function start(shell) {
    players = shell.players;
    setControllerView = shell.setControllerView;
    renderer = rendererModule.createRenderer(shell.container, track, quality, photoAsphalt, plainCourse);
    tuningPanel = createTuningPanel(shell.container);
    measurePanel = createMeasurePanel(shell.container, renderer, () => renderer.setQuality(quality));
    panels = createPanels(shell.container, {
      onCourse: chooseCourse,
      onLapsStep: (lapsStep) => stepLaps(setup, lapsStep),
      onEngineClass: chooseEngineClass,
      onCpuLevel: chooseCpuLevel,
      onQuality: chooseQuality,
      onMeasure: startMeasuring,
      onWatch: watchRace,
      onStartRace: startRace,
      onBackToSetup: showSetup,
      onRestart: restart,
      onTuning: () => tuningPanel.toggle(),
    });
    resultsPanel = createResultsPanel(shell.container, { onRaceAgain: showSetup, onBackToLobby: () => (wantsLobby = true) });
    // The PING travels host -> server -> phone and back, the path an input takes, there and back. A timer,
    // not the game's steps, which run slow when the frame rate drops. Disconnected phones are skipped.
    pingTimer = setInterval(() => {
      for (const player of players.values()) {
        if (player.connected) {
          shell.pingPlayer(player.playerId, performance.now());
        }
      }
    }, PING_INTERVAL_MS);
    showSetup();
  }

  // Back to the setup screen, at the start, after the results, and whenever the host asks. Everyone confirms
  // again.
  function showSetup() {
    race = null;
    standIns = null;
    clearReady(setup);
  }

  // Clicks on the setup screen only; the values come from the panel's own buttons. The overview behind the
  // setup screen flies round the chosen course.
  function chooseCourse(chosen) {
    if (!race && tracks.has(chosen) && chosen !== courseId) {
      courseId = chosen;
      track = tracks.get(courseId);
      renderer.showTrack(track);
    }
  }

  function chooseEngineClass(chosen) {
    if (!race && chosen in ENGINE_CLASSES) {
      engineClass = chosen;
    }
  }

  function chooseCpuLevel(chosen) {
    if (!race && Object.hasOwn(CPU_LEVELS, chosen)) {
      cpuLevel = chosen;
    }
  }

  function chooseQuality(chosen) {
    if (!race && Object.hasOwn(QUALITY_LEVELS, chosen) && chosen !== quality) {
      quality = chosen;
      saveQuality(quality);
      renderer.setQuality(quality);
    }
  }

  // The Measure tool runs from the setup screen only, on the course chosen there.
  function startMeasuring() {
    if (!race && !measurePanel.isRunning()) {
      measurePanel.start(track, COURSES.find((course) => course.id === courseId).name);
    }
  }

  // Checked again here because the click can arrive in the same frame as a player dropping.
  function startRace() {
    if (!race && !measurePanel.isRunning() && canStartRace(setup, playersInSlotOrder(players))) {
      putKartsOnGrid();
    }
  }

  // A race of `viewCount` stand-ins with a view each, from the setup screen, for watching the host draw that many
  // views (the frame rate in the Tuning readout) without phones. Nobody needs to be ready.
  function watchRace(viewCount) {
    if (!race && !measurePanel.isRunning()) {
      putStandInsOnGrid(viewCount);
    }
  }

  function putStandInsOnGrid(viewCount) {
    ({ race, players: standIns } = createStandInRace(track, viewCount, setup.laps, engineClass, cpuLevel));
    controls = createControlsTable();
  }

  // Back to the grid for another countdown, with everyone who is in the room now (ready was given already), or
  // the same stand-ins.
  function restart() {
    if (race && standIns) {
      putStandInsOnGrid(standIns.size);
    } else if (race) {
      putKartsOnGrid();
    }
  }

  // Whoever races: the stand-ins in a watched race, otherwise the room's players.
  function racers() {
    return standIns ?? players;
  }

  // Everyone in the roster gets a kart, at the back of the grid in slot order. Inputs held from the last race are
  // dropped.
  function putKartsOnGrid() {
    race = createRace(track, playersInSlotOrder(players).map((player) => player.playerId), setup.laps, engineClass, cpuLevel);
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
      stepRace(race, track, controlsFor, dt);
      stepTimer.record(performance.now() - startedAt);
    }
    sendChangedViews();
  }

  // During the countdown auto-accelerate does not count as holding Go, or every auto-accelerate kart would
  // stall; Go (or Drift, which accelerates too) pressed by hand still makes a rocket start.
  function controlsFor(playerId) {
    const autoAccelerate = race.phase !== RACE_PHASES.COUNTDOWN && playerSetup(setup, playerId).autoAccelerate;
    return controls.controlsFor(players.get(playerId), autoAccelerate);
  }

  // On the setup screen every player in the roster gets a view. During a race only karts do: a player who joined
  // just before the room closed has no kart, so their view stays null ("waiting for the next race") until the
  // next setup screen. In a watched race every phone is sent null, so it waits as one without a kart does.
  function sendChangedViews() {
    const racing = race !== null && standIns === null;
    const playerIds = racing ? race.karts.filter((kart) => kart.playerId !== null).map((kart) => kart.playerId) : [...players.keys()];
    for (const playerId of playerIds) {
      const view = racing ? raceView(race, setup, playerId) : race ? null : setupView(setup, engineClass, playerId);
      const viewText = JSON.stringify(view);
      if (sentViews.get(playerId) !== viewText) {
        sentViews.set(playerId, viewText);
        setControllerView(playerId, view);
      }
    }
  }

  function render(alpha) {
    const now = performance.now();
    const dt = lastDrawAt === null ? 0 : Math.min((now - lastDrawAt) / 1000, MAX_FRAME_SECONDS);
    lastDrawAt = now;
    // The Measure tool draws its own frames (from the setup screen; a race cannot start meanwhile).
    if (measurePanel.isRunning()) {
      panels.hideAll();
      measurePanel.frame();
      return;
    }
    renderer.draw(race, racers(), alpha, dt);
    const readoutText = readout.frameDrawn(now, performance.now() - now, race, track, racers(), stepTimer.summary());
    const racing = race !== null && race.phase !== RACE_PHASES.RESULTS;
    tuningPanel.setVisible(racing);
    if (!race) {
      panels.showSetup(setup, { courseId, engineClass, cpuLevel, quality }, players);
      resultsPanel.hide();
      return;
    }
    panels.showRace({
      clockText: describeClock(race),
      countdownText: describeCountdown(race),
      readoutText,
      readoutShown: tuningPanel.isOpen(),
      barShown: racing,
    });
    if (race.phase === RACE_PHASES.RESULTS) {
      resultsPanel.show(standingRows(race), racers());
    } else {
      resultsPanel.hide();
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
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
