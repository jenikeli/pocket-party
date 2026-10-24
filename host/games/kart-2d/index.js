// The 2D kart race (M5b), a game module: up to 9 karts race 3 laps round a stadium track, steered from the
// players' phones. Loaded through host/games/index.js and run by the shell (host/game-session.js). The rules
// live in DOM-free modules next to this file; this file connects them to the shell, the phones and the renderer.

import { MESSAGE_TYPES } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { createRace, stepRace, removeKart } from './race.js';
import { createControlsTable } from './kart-controls.js';
import { controllerView } from './race-views.js';
import { createRenderer } from './renderer.js';

// Fixed for now; the setup screen (M5c) will let the host choose.
const LAPS = 3;

// Returns a fresh race game that follows the game module interface in plan.md.
export function createGame() {
  let players = null;
  let setControllerView = null;
  let renderer = null;
  let race = null;
  let controls = createControlsTable();
  // playerId -> the view last sent to that phone as JSON, so a view is only sent when it changes.
  const sentViews = new Map();
  let wantsLobby = false;

  // Everything is drawn from code; Phaser is the module the shell already loaded.
  async function load() {}

  function start(shell) {
    players = shell.players;
    setControllerView = shell.setControllerView;
    renderer = createRenderer(shell.container, { onRaceAgain: startRace, onBackToLobby: () => (wantsLobby = true) });
    startRace();
  }

  // Everyone in the roster gets a kart, on the grid in slot order. Inputs held from the last race are dropped.
  function startRace() {
    race = createRace(playersInSlotOrder(players).map((player) => player.playerId), LAPS);
    controls = createControlsTable();
    sendChangedViews();
  }

  function onMessage(playerId, message) {
    if (message.type === MESSAGE_TYPES.INPUT) {
      controls.handleInput(playerId, message.input);
    }
  }

  function step(dt) {
    stepRace(race, (playerId) => controls.controlsFor(players.get(playerId)), dt);
    sendChangedViews();
  }

  // A player who joined just before the room closed has no kart, so their view stays null ("waiting for the
  // next race") until Race again gives them one.
  function sendChangedViews() {
    for (const kart of race.karts) {
      const view = controllerView(race, kart.playerId);
      const viewText = JSON.stringify(view);
      if (sentViews.get(kart.playerId) !== viewText) {
        sentViews.set(kart.playerId, viewText);
        setControllerView(kart.playerId, view);
      }
    }
  }

  function render(alpha) {
    renderer.draw(race, players, alpha);
  }

  function onPlayerLeft(playerId) {
    removeKart(race, playerId);
    sentViews.delete(playerId);
  }

  function isDone() {
    return wantsLobby;
  }

  function stop() {
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
