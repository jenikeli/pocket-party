// The 3D race's rules: the grid of 12 karts (players at the back, CPU karts filling the field as in MK8DX), the
// countdown with the rocket start, laps, finishing, places, the time limit after the first player finishes, and
// the engine classes. The race is plain data (see createRace). No Three.js, no DOM: unit tested in Node by
// driving whole races. Used by host/games/kart-3d/index.js. The CPU drivers' part (their drivers, rocket starts
// and catch-up) is race-cpus.js's, the items' (M8) items/item-rules.js's.

import { createKart, stepKart } from './kart-physics.js';
import { bumpKarts } from './kart-bumps.js';
import { updateSlipstreams } from './slipstream.js';
import { startBoost, BOOST_KINDS } from './kart-boosts.js';
import { cpuControls } from './cpu-driver.js';
import { racingLineFor } from './racing-line.js';
import { driveByCpu, handOver, startCpuKarts, updateCpuPaces } from './race-cpus.js';
import { progressBetween } from './track.js';
import { GO_AT, STALL_SECONDS, START_OUTCOMES, watchGoButton, judgeStart, rocketBoostSeconds } from './rocket-start.js';
import { createItems, freshItem, stepItems } from './items/item-rules.js';

// MK8DX always races 12 karts.
export const FIELD_SIZE = 12;
export const RACE_PHASES = Object.freeze({ COUNTDOWN: 'countdown', RACING: 'racing', RESULTS: 'results' });
// MK8DX's engine classes: each top speed is 150cc's times this share (docs/mk8dx-reference.md).
export const ENGINE_CLASSES = Object.freeze({ 50: 0.8, 100: 0.9, 150: 1, 200: 1.5 });
export const DEFAULT_ENGINE_CLASS = 150;
// Once the first player finishes, the others have this long before the race ends without them (the 2D race's
// rule; MK8DX waits for every player, but a phone left on a table would then hold the race up for ever).
export const FINISH_TIME_LIMIT_SECONDS = 30;
// The grid: two staggered columns behind the start line, as in MK8DX.
const GRID_LANES = [-3, 3];
const GRID_FIRST_ROW = 3;
const GRID_ROW_SPACING = 5;
const GRID_STAGGER = 2.5;
// The CPU karts' weights, taken in turn, so bumps between light and heavy karts happen. Players drive a middle
// weight.
const CPU_WEIGHTS = [0.8, 1, 1.25];
const PLAYER_WEIGHT = 1;

// `playerIds` in grid order, `laps`, `engineClass` (a key of ENGINE_CLASSES) and `cpuLevel` (a key of
// CPU_LEVELS, cpu-levels.js) from the setup screen, and `allowedItems` the item ids allowed (none: items off).
// As in MK8DX the players start at the back, behind the CPU karts. Returns the race: { phase, time, laps,
// engineClass, cpuLevel, firstPlayerFinishTime, items, karts }; items is item-rules.js's createItems. time
// counts from the start of the countdown (GO is at GO_AT); raceClock() gives the race's own clock from GO.
// Each kart is a kart from kart-physics.js plus { playerId, cpu, goHeld, goPressedAt, startResult, distance,
// lapStartedAt, finishTime, place, item }: playerId is null for a CPU kart; cpu is its CPU driver's state when
// it drives itself (a CPU kart, or a player's once finished; null otherwise; cpu-driver.js); the go
// fields are rocket-start.js's, and startResult what judgeStart gave at GO (null before, and for CPU karts);
// distance is how far it has driven from the start line (negative on the grid, the track's length per lap);
// lap the lap it is on (1 to laps; it stays at laps once finished); lapStartedAt the race clock when that lap
// began; finishTime the race clock when it finished, or null; place 1 for first (on the grid, the grid order);
// item its items (item-rules.js's freshItem).
export function createRace(track, playerIds, laps, engineClass, cpuLevel, allowedItems = []) {
  // The course's racing line takes some tens of milliseconds to work out the first time: here, on the setup
  // screen's click, rather than at GO, when the CPU drivers first look at it.
  racingLineFor(track);
  const cpuCount = Math.max(FIELD_SIZE - playerIds.length, 0);
  const race = {
    phase: RACE_PHASES.COUNTDOWN,
    time: 0,
    laps,
    engineClass,
    cpuLevel,
    firstPlayerFinishTime: null,
    items: createItems(track, allowedItems),
    karts: [],
  };
  for (let gridIndex = 0; gridIndex < cpuCount + playerIds.length; gridIndex += 1) {
    const { s, lateral } = gridSpot(track, gridIndex);
    const isCpu = gridIndex < cpuCount;
    const weight = isCpu ? CPU_WEIGHTS[gridIndex % CPU_WEIGHTS.length] : PLAYER_WEIGHT;
    race.karts.push({
      ...createKart(track, s, lateral, weight, ENGINE_CLASSES[engineClass]),
      playerId: isCpu ? null : playerIds[gridIndex - cpuCount],
      cpu: null,
      goHeld: false,
      goPressedAt: null,
      startResult: null,
      distance: s - track.startLine,
      lap: 1,
      lapStartedAt: 0,
      finishTime: null,
      // Grid index 0 is pole position, the furthest ahead.
      place: gridIndex + 1,
      item: freshItem(),
    });
    if (isCpu) {
      driveByCpu(race, race.karts[gridIndex], gridIndex);
    }
  }
  return race;
}

// Where the kart in grid place `gridIndex` (0 is pole position) starts: { s, lateral }, its middle's distance
// along the road and how far right of the centre line. Also where the road's grid marks are painted (kit/).
export function gridSpot(track, gridIndex) {
  const row = Math.floor(gridIndex / GRID_LANES.length);
  const column = gridIndex % GRID_LANES.length;
  return { s: track.startLine - GRID_FIRST_ROW - row * GRID_ROW_SPACING - column * GRID_STAGGER, lateral: GRID_LANES[column] };
}

// The race's own clock: seconds since GO (0 before it).
export function raceClock(race) {
  return Math.max(race.time - GO_AT, 0);
}

// Advances the race by `dt` seconds. `controlsFor(playerId)` returns that player's controls
// ({ steer, accelerate, brake, drift, item }); the caller hands back neutral controls for a player who is not
// connected. During the countdown nothing moves; only the players' Go buttons are watched. After the results
// every kart drives on by itself behind the results.
export function stepRace(race, track, controlsFor, dt) {
  if (race.phase === RACE_PHASES.COUNTDOWN) {
    for (const kart of race.karts.filter((each) => each.playerId !== null)) {
      watchGoButton(kart, controlsFor(kart.playerId).accelerate, race.time);
    }
    race.time += dt;
    // The small allowance absorbs rounding in adding up 1/60 s steps.
    if (race.time >= GO_AT - 1e-9) {
      judgeStarts(race);
    }
    return;
  }
  if (race.phase === RACE_PHASES.RACING) {
    updateCpuPaces(race);
  }
  for (const kart of race.karts) {
    const before = kart.s;
    const controls = kart.cpu === null ? controlsFor(kart.playerId) : cpuControls(track, kart, race.karts, dt);
    stepKart(track, kart, controls, dt);
    kart.distance += progressBetween(track, before, kart.s);
    kart.item.button = controls.item === true;
  }
  bumpKarts(race.karts);
  stepItems(race, track, dt);
  updateSlipstreams(race.karts, dt);
  race.time += dt;
  if (race.phase === RACE_PHASES.RACING) {
    race.karts.forEach((kart) => countLaps(race, track, kart));
    updatePlaces(race);
    if (isRaceOver(race)) {
      endRace(race);
    }
  }
}

// GO: each player's start, from when their held Go arrived, and the CPU karts' rocket starts.
function judgeStarts(race) {
  race.phase = RACE_PHASES.RACING;
  startCpuKarts(race);
  for (const kart of race.karts.filter((each) => each.playerId !== null)) {
    kart.startResult = judgeStart(kart.goPressedAt);
    if (kart.startResult.outcome === START_OUTCOMES.ROCKET) {
      startBoost(kart, BOOST_KINDS.ROCKET_START, rocketBoostSeconds(kart.startResult.offset));
    } else if (kart.startResult.outcome === START_OUTCOMES.STALL) {
      kart.stallLeft = STALL_SECONDS;
    }
  }
}

// A new lap starts the clock for that lap; past the last lap's line the kart has finished. distance only
// grows by driving forward, so a kart that reverses over the line must drive that bit again. A finished player
// hands their kart to the CPU driver, as in MK8DX, so it does not stand in the road.
function countLaps(race, track, kart) {
  const lap = Math.min(Math.max(Math.floor(kart.distance / track.length) + 1, 1), race.laps);
  if (kart.finishTime === null && lap > kart.lap) {
    kart.lapStartedAt = raceClock(race);
  }
  kart.lap = lap;
  if (kart.finishTime !== null || kart.distance < race.laps * track.length) {
    return;
  }
  kart.finishTime = raceClock(race);
  if (kart.playerId !== null) {
    race.firstPlayerFinishTime ??= kart.finishTime;
    handOver(race, kart);
  }
}

// The results: places are final, and every player still racing hands their kart to the CPU driver too.
function endRace(race) {
  race.phase = RACE_PHASES.RESULTS;
  race.karts.filter((kart) => kart.cpu === null).forEach((kart) => handOver(race, kart));
}

// Finishers by finish time, then everyone else by how far round they got. Places stop changing at the results:
// the karts still driving behind them do not overtake.
function updatePlaces(race) {
  const order = [...race.karts].sort((first, second) => {
    if (first.finishTime !== null || second.finishTime !== null) {
      return (first.finishTime ?? Infinity) - (second.finishTime ?? Infinity);
    }
    return second.distance - first.distance;
  });
  order.forEach((kart, index) => (kart.place = index + 1));
}

// Over when every player has finished, or the time limit after the first player is up. CPU karts never hold the
// race up: those still driving are placed by how far round they got, as in MK8DX.
function isRaceOver(race) {
  const players = race.karts.filter((kart) => kart.playerId !== null);
  if (players.every((kart) => kart.finishTime !== null)) {
    return true;
  }
  return race.firstPlayerFinishTime !== null && raceClock(race) - race.firstPlayerFinishTime >= FINISH_TIME_LIMIT_SECONDS;
}

// A player left mid-race (kicked, left, grace period over): their kart leaves the track. If every player left
// has finished, the race is over.
export function removeKart(race, playerId) {
  race.karts = race.karts.filter((kart) => kart.playerId !== playerId);
  if (race.phase === RACE_PHASES.RACING) {
    updatePlaces(race);
    if (isRaceOver(race)) {
      endRace(race);
    }
  }
}

export function playerKart(race, playerId) {
  return race.karts.find((kart) => kart.playerId === playerId) ?? null;
}

// The karts in place order, first place first.
export function kartsInPlaceOrder(race) {
  return [...race.karts].sort((first, second) => first.place - second.place);
}
