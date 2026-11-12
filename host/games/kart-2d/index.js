// The 2D kart race (M5b, M5c), a game module: a setup screen (laps on the host, control style and ready on
// each phone), then up to 9 karts race round a stadium track, steered from the players' phones. Loaded through
// host/games/index.js and run by the shell (host/game-session.js). The rules live in DOM-free modules next to
// this file; this file connects them to the shell, the phones and the renderer.

import { MESSAGE_TYPES, INPUT_KINDS } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { createRace, stepRace, removeKart } from './race.js';
import { createSetup, stepLaps, playerSetup, applyChoice, clearReady, forgetPlayer, canStartRace } from '/host/kart/setup.js';
import { createControlsTable } from '/host/kart/kart-controls.js';
import { controllerView, setupView, roomIsOpen } from './race-views.js';
import { createRenderer } from './renderer.js';
import { loadStylesheet } from './panel-parts.js';

// Returns a fresh race game that follows the game module interface in plan.md.
export function createGame() {
  let players = null;
  let setControllerView = null;
  let setRoomOpen = null;
  let renderer = null;
  // The panels' stylesheet, loaded with the game and removed when it stops.
  let stylesheet = null;
  // Whether the shell has been told the room is open; null until the first time.
  let roomOpen = null;
  // Laps and control styles, kept from race to race until the game goes back to the lobby.
  const setup = createSetup();
  // null while the setup screen shows.
  let race = null;
  let controls = createControlsTable();
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();
  let wantsLobby = false;

  // Everything is drawn from code and the panels are HTML; Phaser loads with the renderer
  // (host/hand-driven-phaser.js). Only the panels' stylesheet is fetched here.
  async function load() {
    stylesheet = await loadStylesheet('/host/games/kart-2d/kart-2d.css');
  }

  function start(shell) {
    players = shell.players;
    setControllerView = shell.setControllerView;
    setRoomOpen = shell.setRoomOpen;
    renderer = createRenderer(shell.container, {
      onLapsStep: (lapsStep) => stepLaps(setup, lapsStep),
      onStartRace: startRace,
      onRaceAgain: showSetup,
      onBackToLobby: () => (wantsLobby = true),
    });
    showSetup();
  }

  // Back to the setup screen, before the first race and after each one. Everyone confirms again.
  function showSetup() {
    race = null;
    clearReady(setup);
    syncRoomOpen();
  }

  // The room is open to new players on the setup and results screens and closed while karts race. A player
  // who comes in is in `players` at once, so the setup shows them and the next race gives them a kart. The
  // shell is told only when this changes.
  function syncRoomOpen() {
    const open = roomIsOpen(race);
    if (open !== roomOpen) {
      roomOpen = open;
      setRoomOpen(open);
    }
  }

  // Everyone in the roster gets a kart, on the grid in slot order. Inputs held from the last race are dropped.
  // The renderer only enables Start race when canStartRace allows it; checked again here because the click
  // can arrive in the same frame as a player dropping.
  function startRace() {
    const grid = playersInSlotOrder(players);
    if (race || !canStartRace(setup, grid)) {
      return;
    }
    race = createRace(grid.map((player) => player.playerId), setup.laps);
    controls = createControlsTable();
    syncRoomOpen();
  }

  function onMessage(playerId, message) {
    if (message.type !== MESSAGE_TYPES.INPUT) {
      return;
    }
    if (message.input?.kind === INPUT_KINDS.CHOICE) {
      applyChoice(setup, playerId, message.input, race === null);
    } else {
      controls.handleInput(playerId, message.input);
    }
  }

  // Views are sent from here only, so every change (a choice, the laps, the race moving on, a new screen)
  // reaches the phones within one step.
  function step(dt) {
    if (race) {
      const controlsFor = (playerId) => controls.controlsFor(players.get(playerId), playerSetup(setup, playerId).autoAccelerate);
      stepRace(race, controlsFor, dt);
      syncRoomOpen();
    }
    sendChangedViews();
  }

  // On the setup screen every player in the roster gets a view. During a race only karts do: a player who joined
  // just before the room closed has no kart, so their view stays null ("waiting for the next race") until the
  // next setup screen.
  function sendChangedViews() {
    const playerIds = race ? race.karts.map((kart) => kart.playerId) : [...players.keys()];
    for (const playerId of playerIds) {
      const view = race ? controllerView(race, setup, playerId) : setupView(setup, playerId);
      const viewText = JSON.stringify(view);
      if (sentViews.get(playerId) !== viewText) {
        sentViews.set(playerId, viewText);
        setControllerView(playerId, view);
      }
    }
  }

  function render(alpha) {
    renderer.draw(setup, race, players, alpha);
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
    // The stylesheet first, so it goes even if tearing down the renderer throws.
    stylesheet?.remove();
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
