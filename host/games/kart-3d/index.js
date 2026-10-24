// The 3D kart race, for now the M6b test drive, a game module: a setup screen (control style and ready on each
// phone), then 1-4 players drive freely on the test track in split screen, with dummy karts filling the field
// to 12. No countdown, laps or places yet (M7). Loaded through host/games/index.js and run by the shell
// (host/game-session.js). The rules live in DOM-free modules next to this file; this file connects them to the
// shell, the phones, the renderer and the panels. The shell's End game goes back to the lobby.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import { playersInSlotOrder, displayName } from '/host/roster.js';
import { createSetup, playerSetup, applyChoice, clearReady, forgetPlayer, canStartRace } from '/host/kart/setup.js';
import { createControlsTable } from '/host/kart/kart-controls.js';
import { buildTrack } from './track-builder.js';
import { TEST_TRACK } from './test-track.js';
import { createDrive, stepDrive, removeKart, playerKart } from './drive.js';
import { setupView, drivingView, describeKart } from './drive-views.js';
import { createStepTimer } from './step-timer.js';
import { createPanels } from './panels.js';

const READOUT_INTERVAL_MS = 250;
// A long pause (a hidden tab) must not swing the cameras a long way at once: the runner's own cap
// (host/fixed-step.js).
const MAX_FRAME_SECONDS = 0.25;

// Returns a fresh test drive that follows the game module interface in plan.md.
export function createGame() {
  let rendererModule = null;
  let renderer = null;
  let panels = null;
  let players = null;
  let setControllerView = null;
  const track = buildTrack(TEST_TRACK);
  // Control styles, kept from drive to drive until the game goes back to the lobby.
  const setup = createSetup();
  // null while the setup screen shows.
  let drive = null;
  let controls = createControlsTable();
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();
  const stepTimer = createStepTimer();
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
    panels = createPanels(shell.container, { onStartDriving: startDriving, onBackToSetup: showSetup });
    showSetup();
  }

  // Back to the setup screen, at the start and whenever the host asks. Everyone confirms again.
  function showSetup() {
    drive = null;
    clearReady(setup);
  }

  // Everyone in the roster gets a kart, at the front of the grid in slot order. Checked again here because the
  // click can arrive in the same frame as a player dropping.
  function startDriving() {
    const grid = playersInSlotOrder(players);
    if (drive || !canStartRace(setup, grid)) {
      return;
    }
    drive = createDrive(track, grid.map((player) => player.playerId));
    controls = createControlsTable();
  }

  function onMessage(playerId, message) {
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
      const controlsFor = (playerId) => controls.controlsFor(players.get(playerId), playerSetup(setup, playerId).autoAccelerate);
      stepDrive(drive, track, controlsFor, dt);
      stepTimer.record(performance.now() - startedAt);
    }
    sendChangedViews();
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
    if (!drive) {
      panels.showSetup(setup, players);
      startReadoutPeriod(now);
    } else if (now - lastReadoutAt >= READOUT_INTERVAL_MS) {
      panels.showDriving(describeReadout((now - lastReadoutAt) / 1000));
      startReadoutPeriod(now);
    }
  }

  function startReadoutPeriod(now) {
    lastReadoutAt = now;
    framesSinceReadout = 0;
    drawMsSinceReadout = 0;
  }

  function describeReadout(seconds) {
    const steps = stepTimer.summary();
    const lines = [
      steps
        ? `Physics step: ${steps.averageMs.toFixed(3)} ms average, ${steps.worstMs.toFixed(3)} ms worst (${drive.karts.length} karts)`
        : 'Physics step: not measured yet',
      `Drawing: ${(framesSinceReadout / seconds).toFixed(0)} fps, ${(drawMsSinceReadout / framesSinceReadout).toFixed(1)} ms CPU per frame`,
    ];
    for (const player of playersInSlotOrder(players)) {
      const kart = playerKart(drive, player.playerId);
      if (kart) {
        lines.push(`${displayName(player)}: ${describeKart(kart, track)}`);
      }
    }
    return lines.join('\n');
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
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
