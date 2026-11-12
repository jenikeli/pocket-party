// The 2D race's live readout, HTML in the race's stage and placed in the track's infield: the race clock, the
// standings with each player's lap, the time left once someone has finished, and the big countdown.
// Used by host/games/kart-2d/renderer.js.

import { RACE_PHASES, FINISH_TIME_LIMIT_SECONDS, countdownNumber } from './race.js';
import { standingRows } from './race-views.js';
import { formatRaceTime } from '/host/kart/race-time.js';
import { ordinal } from '/shared/ordinal.js';
import { MAX_PLAYERS } from '/shared/protocol.js';
import { setText, createPlayerChip, fillPlayerChip } from './panel-parts.js';

// Adds the readout to `stage` (a .pp-stage). Returns { show(race, players) }; `players` is the shell's live
// roster, and `race` null on the setup screen, which leaves the readout empty.
export function createRaceHud(stage) {
  const hud = document.createElement('div');
  hud.id = 'kart-2d-hud';
  hud.className = 'k2d-hud';
  hud.innerHTML = `
    <div class="k2d-hud-top">
      <span id="kart-2d-clock" class="k2d-clock"></span>
      <span id="kart-2d-time-left" class="k2d-time-left"></span>
    </div>
    <ol id="kart-2d-standings" class="k2d-list"></ol>`;
  const countdown = document.createElement('div');
  countdown.id = 'kart-2d-countdown';
  countdown.className = 'k2d-countdown';
  stage.append(hud, countdown);
  const clock = hud.querySelector('#kart-2d-clock');
  const timeLeft = hud.querySelector('#kart-2d-time-left');
  // One row per possible kart, filled in place order; unused rows are hidden.
  const rows = [];
  for (let index = 0; index < MAX_PLAYERS; index += 1) {
    const row = makeRow();
    hud.querySelector('#kart-2d-standings').append(row.element);
    rows.push(row);
  }

  function show(race, players) {
    if (!race) {
      hud.hidden = true;
      setText(countdown, '');
      return;
    }
    hud.hidden = false;
    setText(clock, formatRaceTime(race.time));
    const left = race.firstFinishTime === null ? null : FINISH_TIME_LIMIT_SECONDS - (race.time - race.firstFinishTime);
    setText(timeLeft, left === null ? '' : `Race ends in ${Math.ceil(Math.max(left, 0))} s`);
    const standings = standingRows(race);
    rows.forEach((row, index) => showRow(row, standings[index], race, players));
    const number = countdownNumber(race);
    setText(countdown, number === null ? '' : number === 0 ? 'GO!' : String(number));
  }

  return { show };
}

function makeRow() {
  const element = document.createElement('li');
  element.className = 'k2d-standing';
  const place = document.createElement('span');
  place.className = 'pp-muted';
  const chip = createPlayerChip();
  const lap = document.createElement('span');
  lap.className = 'pp-muted';
  element.append(place, chip, lap);
  return { element, place, chip, lap };
}

// `standing` is undefined for the rows below the last kart.
function showRow(row, standing, race, players) {
  const player = standing && players.get(standing.playerId);
  row.element.hidden = !player;
  if (!player) {
    return;
  }
  setText(row.place, ordinal(standing.place));
  fillPlayerChip(row.chip, player);
  if (standing.finishTime !== null) {
    setText(row.lap, formatRaceTime(standing.finishTime));
  } else {
    setText(row.lap, race.phase === RACE_PHASES.COUNTDOWN ? '' : `Lap ${standing.lap}/${race.laps}`);
  }
}
