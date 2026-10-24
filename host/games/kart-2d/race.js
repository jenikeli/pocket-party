// The 2D race's rules: the start grid, the countdown, laps, finishing, the time limit after the first finisher,
// and places. The race is plain data (numbers and arrays, see createRace), so it can be copied and compared.
// No Phaser, no DOM: unit tested in Node by driving whole races. Used by host/games/kart-2d/index.js.

import { LAP_LENGTH, lapPosition, pointOnTrack } from './track.js';
import { driveKart, hitWalls, bumpKarts } from './kart-physics.js';

export const COUNTDOWN_SECONDS = 3;
// Once the first kart finishes, the rest have this long before the race ends without them.
export const FINISH_TIME_LIMIT_SECONDS = 30;

export const RACE_PHASES = Object.freeze({
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  RESULTS: 'results',
});

export const NEUTRAL_CONTROLS = Object.freeze({ steer: 0, accelerate: false, brake: false });

// The grid: three karts abreast, rows 70 px apart, the first row just behind the start line.
const GRID_LANES = [-70, 0, 70];
const GRID_FIRST_ROW_DISTANCE = -50;
const GRID_ROW_SPACING = 70;

// `playerIds` in grid order, pole position first. Returns the race:
// { phase, laps, countdownLeft, time, firstFinishTime, karts }, where time counts seconds since the start
// and each kart is { playerId, x, y, heading, velocityX, velocityY, previousX, previousY, previousHeading,
// distance, finishTime }. distance is how far it has driven along the lap in total (negative on the grid,
// LAP_LENGTH per lap), and previous* is where it was one step ago, for smooth drawing between steps.
export function createRace(playerIds, laps) {
  return {
    phase: RACE_PHASES.COUNTDOWN,
    laps,
    countdownLeft: COUNTDOWN_SECONDS,
    time: 0,
    firstFinishTime: null,
    karts: playerIds.map((playerId, index) => createKart(playerId, index)),
  };
}

function createKart(playerId, gridIndex) {
  const distance = GRID_FIRST_ROW_DISTANCE - Math.floor(gridIndex / GRID_LANES.length) * GRID_ROW_SPACING;
  const { x, y, heading } = pointOnTrack(distance, GRID_LANES[gridIndex % GRID_LANES.length]);
  return {
    playerId,
    x,
    y,
    heading,
    velocityX: 0,
    velocityY: 0,
    previousX: x,
    previousY: y,
    previousHeading: heading,
    distance,
    finishTime: null,
  };
}

// Advances the race by `dt` seconds. `controlsFor(playerId)` returns that player's controls
// ({ steer, accelerate, brake }); the caller hands back NEUTRAL_CONTROLS for a player who is not connected.
export function stepRace(race, controlsFor, dt) {
  for (const kart of race.karts) {
    kart.previousX = kart.x;
    kart.previousY = kart.y;
    kart.previousHeading = kart.heading;
  }
  if (race.phase === RACE_PHASES.COUNTDOWN) {
    race.countdownLeft = Math.max(race.countdownLeft - dt, 0);
    if (race.countdownLeft === 0) {
      race.phase = RACE_PHASES.RACING;
    }
    return;
  }
  if (race.phase !== RACE_PHASES.RACING) {
    return;
  }
  race.time += dt;
  for (const kart of race.karts) {
    // A kart that has finished rolls to a stop on its own.
    driveKart(kart, kart.finishTime === null ? controlsFor(kart.playerId) : NEUTRAL_CONTROLS, dt);
  }
  // Finished karts are out of the way: the others drive through them.
  bumpKarts(race.karts.filter((kart) => kart.finishTime === null));
  for (const kart of race.karts) {
    hitWalls(kart, dt);
    updateDistance(race, kart);
  }
  if (isRaceOver(race)) {
    race.phase = RACE_PHASES.RESULTS;
  }
}

// lapPosition jumps from LAP_LENGTH back to 0 at the start line, so the change since the last step is taken
// the short way round: a step forward over the line adds a little, a step backward over it takes a little
// away. A kart that reverses over the line must drive that bit again before its lap counts, so no checkpoint
// is needed. A kart moves at most a few px per step, far less than half a lap, so the short way is the real way.
function updateDistance(race, kart) {
  const before = ((kart.distance % LAP_LENGTH) + LAP_LENGTH) % LAP_LENGTH;
  let change = lapPosition(kart.x, kart.y) - before;
  if (change > LAP_LENGTH / 2) {
    change -= LAP_LENGTH;
  } else if (change < -LAP_LENGTH / 2) {
    change += LAP_LENGTH;
  }
  kart.distance += change;
  if (kart.finishTime === null && kart.distance >= race.laps * LAP_LENGTH) {
    kart.finishTime = race.time;
    race.firstFinishTime ??= race.time;
  }
}

function isRaceOver(race) {
  if (race.karts.every((kart) => kart.finishTime !== null)) {
    return true;
  }
  return race.firstFinishTime !== null && race.time - race.firstFinishTime >= FINISH_TIME_LIMIT_SECONDS;
}

// A player left the game (kicked, left, grace period over): their kart leaves the race. If everyone left
// was already finished, the race is over.
export function removeKart(race, playerId) {
  race.karts = race.karts.filter((kart) => kart.playerId !== playerId);
  if (race.phase === RACE_PHASES.RACING && isRaceOver(race)) {
    race.phase = RACE_PHASES.RESULTS;
  }
}

// The karts in place order: finishers by finish time, then everyone else by how far round they got.
export function kartsInPlaceOrder(race) {
  return [...race.karts].sort((first, second) => {
    if (first.finishTime !== null || second.finishTime !== null) {
      return (first.finishTime ?? Infinity) - (second.finishTime ?? Infinity);
    }
    return second.distance - first.distance;
  });
}

// Which lap the kart is on, 1 to laps (it stays at laps once finished, and is 1 on the grid).
export function currentLap(race, kart) {
  return Math.min(Math.max(Math.floor(kart.distance / LAP_LENGTH) + 1, 1), race.laps);
}

// The big number to show: 3, 2, 1 during the countdown, 0 ("GO!") for the first second of the race, else null.
export function countdownNumber(race) {
  if (race.phase === RACE_PHASES.COUNTDOWN) {
    return Math.ceil(race.countdownLeft);
  }
  return race.phase === RACE_PHASES.RACING && race.time < 1 ? 0 : null;
}
