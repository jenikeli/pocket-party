// The 3D kart race, for now the test drive of M6 and M7a, a game module: a setup screen (control style and
// ready on each phone), then a countdown with MK8DX's rocket start, and 1-4 players drive freely on the test
// track in split screen, drifting and boosting, with dummy karts filling the field to 12. No laps or places
// yet (M7b). Loaded through host/games/index.js and run by the shell (host/game-session.js). The rules live in
// DOM-free modules next to this file; this file connects them to the shell, the phones, the renderer, the
// panels and the tuning sliders. The shell's End game goes back to the lobby.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { createSetup, playerSetup, applyChoice, clearReady, forgetPlayer, canStartRace } from '/host/kart/setup.js';
import { createControlsTable } from '/host/kart/kart-controls.js';
import { buildTrack } from './track-builder.js';
import { TEST_TRACK } from './test-track.js';
import { createDrive, stepDrive, removeKart } from './drive.js';
import { setupView, drivingView } from './drive-views.js';
import { countdownNumber } from './rocket-start.js';
import { createStepTimer } from './step-timer.js';
import { createReadout } from './readout.js';
import { createPanels } from './panels.js';
import { createTuningPanel } from './tuning-panel.js';

const READOUT_INTERVAL_MS = 250;
// Each phone's round-trip time is measured this often while the game runs, for the readout.
const PING_INTERVAL_MS = 2000;
// A long pause (a hidden tab) must not swing the cameras a long way at once: the runner's own cap
// (host/fixed-step.js).
const MAX_FRAME_SECONDS = 0.25;

// Returns a fresh test drive that follows the game module interface in plan.md.
export function createGame() {
  let rendererModule = null;
  let renderer = null;
  let panels = null;
  let tuningPanel = null;
  let players = null;
  let setControllerView = null;
  let pingTimer = null;
  const track = buildTrack(TEST_TRACK);
  // Control styles, kept from drive to drive until the game goes back to the lobby.
  const setup = createSetup();
  // null while the setup screen shows.
  let drive = null;
  let controls = createControlsTable();
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();
  const stepTimer = createStepTimer();
  const readout = createReadout();
  // For the readout: frames drawn and CPU time spent drawing since it was last written.
  let lastDrawAt = null;
  let lastReadoutAt = 0;
  let framesSinceReadout = 0;
  let drawMsSinceReadout = 0;

  // Three.js is fetched here, when the game is chosen, not when the lobby loads.
  async function load() {
    rendererModule = await import('./renderer.js');
  }

  function start(shell) {
    players = shell.players;
    setControllerView = shell.setControllerView;
    renderer = rendererModule.createRenderer(shell.container, track);
    tuningPanel = createTuningPanel(shell.container);
    panels = createPanels(shell.container, {
      onStartDriving: startDriving,
      onBackToSetup: showSetup,
      onRestart: restart,
      onTuning: () => tuningPanel.toggle(),
    });
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

  // Back to the setup screen, at the start and whenever the host asks. Everyone confirms again.
  function showSetup() {
    drive = null;
    clearReady(setup);
  }

  // Checked again here because the click can arrive in the same frame as a player dropping.
  function startDriving() {
    if (!drive && canStartRace(setup, playersInSlotOrder(players))) {
      putKartsOnGrid();
    }
  }

  // Back to the grid for another countdown, with everyone who is in the room now (ready was given already).
  function restart() {
    if (drive) {
      putKartsOnGrid();
    }
  }

  // Everyone in the roster gets a kart, at the back of the grid in slot order, and the countdown starts.
  function putKartsOnGrid() {
    drive = createDrive(track, playersInSlotOrder(players).map((player) => player.playerId));
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
      applyChoice(setup, playerId, message.input, drive === null);
    } else {
      controls.handleInput(playerId, message.input);
    }
  }

  // Views are sent from here only, so every change reaches the phones within one step.
  function step(dt) {
    if (drive) {
      const startedAt = performance.now();
      stepDrive(drive, track, controlsFor, dt);
      stepTimer.record(performance.now() - startedAt);
    }
    sendChangedViews();
  }

  // During the countdown auto-accelerate does not count as holding Go, or every auto-accelerate kart would
  // stall; Go (or Drift, which accelerates too) pressed by hand still makes a rocket start.
  function controlsFor(playerId) {
    const autoAccelerate = drive.started && playerSetup(setup, playerId).autoAccelerate;
    return controls.controlsFor(players.get(playerId), autoAccelerate);
  }

  // On the setup screen every player in the roster gets a view; while driving only those with a kart do.
  function sendChangedViews() {
    const playerIds = drive ? drive.karts.filter((kart) => kart.playerId !== null).map((kart) => kart.playerId) : [...players.keys()];
    for (const playerId of playerIds) {
      const view = drive ? drivingView(drive, setup, playerId) : setupView(setup, playerId);
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
    renderer.draw(drive, players, alpha, dt);
    framesSinceReadout += 1;
    drawMsSinceReadout += performance.now() - now;
    tuningPanel.setVisible(drive !== null);
    if (!drive) {
      panels.showSetup(setup, players);
      startReadoutPeriod(now);
      return;
    }
    let readoutText = null;
    if (now - lastReadoutAt >= READOUT_INTERVAL_MS) {
      const seconds = (now - lastReadoutAt) / 1000;
      const drawMs = drawMsSinceReadout / framesSinceReadout;
      readoutText = readout.describe(drive, track, players, stepTimer.summary(), framesSinceReadout / seconds, drawMs);
      startReadoutPeriod(now);
    }
    panels.showDriving(readoutText, describeCountdown(countdownNumber(drive.time)));
  }

  function startReadoutPeriod(now) {
    lastReadoutAt = now;
    framesSinceReadout = 0;
    drawMsSinceReadout = 0;
  }

  function onPlayerLeft(playerId) {
    if (drive) {
      removeKart(drive, playerId);
    }
    forgetPlayer(setup, playerId);
    sentViews.delete(playerId);
  }

  // The test drive never ends by itself; the host ends it with the shell's End game.
  function isDone() {
    return false;
  }

  function stop() {
    clearInterval(pingTimer);
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}

function describeCountdown(number) {
  if (number === null) {
    return '';
  }
  return number === 0 ? 'GO!' : String(number);
}
