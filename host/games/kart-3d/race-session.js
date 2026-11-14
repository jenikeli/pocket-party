// The 3D game's current race: nothing while the setup screen shows, otherwise a race of the room's players or of
// a watched race's stand-ins, with the phones' controls for it. Starts a race, steps it and routes the phones'
// inputs. Used by host/games/kart-3d/index.js, which owns the shell and the panels.

import { INPUT_KINDS } from '/shared/protocol.js';
import { playersInSlotOrder } from '/host/roster.js';
import { playerSetup, applyChoice, clearReady, forgetPlayer } from '/host/kart/setup.js';
import { createControlsTable } from '/host/kart/kart-controls.js';
import { createRace, stepRace, removeKart, RACE_PHASES } from './race.js';
import { createStepTimer } from './step-timer.js';
import { createStandInRace } from './stand-ins.js';
import { freshItemSeed } from './items/item-rules.js';
import { allowedItems } from './items/item-settings.js';

// `getPlayers()` is the shell's roster, `setup` the laps and control styles (host/kart/setup.js), `choices` the
// host's own choices (host-choices.js), `pickColor(playerId, colorIndex)` the shell's and `chosenTrack()` the
// track of the chosen course. Returns the state (`race`, `standIns`, `stepTimer`) and the actions index.js calls.
export function createRaceSession({ getPlayers, setup, choices, pickColor, chosenTrack }) {
  // null while the setup screen shows.
  let race = null;
  // While a watched race runs (the setup screen's Watch), its stand-ins by playerId, who race in the players'
  // place; null otherwise. The room's players then sit it out, their phones showing the waiting view.
  let standIns = null;
  let controls = createControlsTable();
  const stepTimer = createStepTimer();

  // Back to the setup screen, at the start, after the results, and whenever the host asks. Everyone confirms
  // again.
  function showSetup() {
    race = null;
    standIns = null;
    clearReady(setup);
  }

  function putStandInsOnGrid(viewCount) {
    const items = allowedItems(choices.items);
    ({ race, players: standIns } = createStandInRace(chosenTrack(), viewCount, setup.laps, choices.engineClass, choices.cpuLevel, items));
    controls = createControlsTable();
  }

  // Everyone in the roster gets a kart, at the back of the grid in slot order, a player who joined on the setup
  // screen included. Inputs held from the last race are dropped.
  function putKartsOnGrid() {
    const playerIds = playersInSlotOrder(getPlayers()).map((player) => player.playerId);
    const track = chosenTrack();
    race = createRace(track, playerIds, setup.laps, choices.engineClass, choices.cpuLevel, allowedItems(choices.items), freshItemSeed());
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
    return standIns ?? getPlayers();
  }

  function handleInput(playerId, input) {
    if (input?.kind === INPUT_KINDS.CHOICE) {
      applyChoice(setup, playerId, input, race === null, pickColor);
    } else {
      controls.handleInput(playerId, input);
    }
  }

  function step(dt) {
    if (race) {
      const startedAt = performance.now();
      stepRace(race, chosenTrack(), controlsFor, dt);
      stepTimer.record(performance.now() - startedAt);
    }
  }

  // During the countdown auto-accelerate does not count as holding Go, or every auto-accelerate kart would
  // stall; Go (or Drift, which accelerates too) pressed by hand still makes a rocket start.
  function controlsFor(playerId) {
    const autoAccelerate = race.phase !== RACE_PHASES.COUNTDOWN && playerSetup(setup, playerId).autoAccelerate;
    return controls.controlsFor(getPlayers().get(playerId), autoAccelerate);
  }

  function removePlayer(playerId) {
    if (race) {
      removeKart(race, playerId);
    }
    forgetPlayer(setup, playerId);
  }

  return {
    get race() {
      return race;
    },
    get standIns() {
      return standIns;
    },
    stepTimer,
    showSetup,
    putStandInsOnGrid,
    putKartsOnGrid,
    restart,
    racers,
    handleInput,
    step,
    removePlayer,
  };
}
