// The 2D race's live readout, drawn in the infield: the race clock, the standings with each player's lap,
// the time left once someone has finished, and the big countdown. Used by host/games/kart-2d/renderer.js.

import { RACE_PHASES, FINISH_TIME_LIMIT_SECONDS, countdownNumber } from './race.js';
import { standingRows, formatRaceTime } from './race-views.js';
import { ordinal } from '/shared/ordinal.js';
import { displayName, colorText } from '/host/roster.js';
import { MAX_PLAYERS } from '/shared/protocol.js';

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };
const LEFT_X = 660;
const RIGHT_X = 1260;
const CLOCK_Y = 340;
const FIRST_ROW_Y = 410;
const ROW_HEIGHT = 40;

// Returns { show(race, players) }; `players` is the shell's live roster, and `race` null on the setup screen,
// which leaves the readout empty.
export function createRaceHud(scene) {
  const clock = scene.add.text(LEFT_X, CLOCK_Y, '', { ...TEXT_STYLE, fontSize: '40px', fontStyle: 'bold' }).setOrigin(0, 0.5);
  const timeLeft = scene.add.text(RIGHT_X, CLOCK_Y, '', { ...TEXT_STYLE, fontSize: '30px', color: '#f1c40f' }).setOrigin(1, 0.5);
  // One text line per possible kart, filled in place order; unused lines stay empty.
  const rows = [];
  for (let index = 0; index < MAX_PLAYERS; index += 1) {
    const y = FIRST_ROW_Y + index * ROW_HEIGHT;
    rows.push({
      place: scene.add.text(LEFT_X, y, '', { ...TEXT_STYLE, fontSize: '28px', color: '#9aa4bf' }).setOrigin(0, 0.5),
      name: scene.add.text(LEFT_X + 80, y, '', { ...TEXT_STYLE, fontSize: '28px', fontStyle: 'bold' }).setOrigin(0, 0.5),
      lap: scene.add.text(RIGHT_X, y, '', { ...TEXT_STYLE, fontSize: '28px', color: '#9aa4bf' }).setOrigin(1, 0.5),
    });
  }
  const countdown = scene.add
    .text(960, 540, '', { ...TEXT_STYLE, fontSize: '240px', fontStyle: 'bold', stroke: '#000000', strokeThickness: 12 })
    .setOrigin(0.5)
    .setDepth(1);

  function show(race, players) {
    if (!race) {
      clock.setText('');
      timeLeft.setText('');
      rows.forEach((row) => showRow(row, undefined));
      countdown.setText('');
      return;
    }
    clock.setText(formatRaceTime(race.time));
    const left = race.firstFinishTime === null ? null : FINISH_TIME_LIMIT_SECONDS - (race.time - race.firstFinishTime);
    timeLeft.setText(left === null ? '' : `Race ends in ${Math.ceil(Math.max(left, 0))} s`);
    const standings = standingRows(race);
    rows.forEach((row, index) => showRow(row, standings[index], race, players));
    const number = countdownNumber(race);
    countdown.setText(number === null ? '' : number === 0 ? 'GO!' : String(number));
  }

  return { show };
}

// `standing` is undefined for the lines below the last kart.
function showRow(row, standing, race, players) {
  const player = standing && players.get(standing.playerId);
  if (!player) {
    row.place.setText('');
    row.name.setText('');
    row.lap.setText('');
    return;
  }
  row.place.setText(ordinal(standing.place));
  row.name.setText(displayName(player)).setColor(colorText(player));
  if (standing.finishTime !== null) {
    row.lap.setText(formatRaceTime(standing.finishTime));
  } else {
    row.lap.setText(race.phase === RACE_PHASES.COUNTDOWN ? '' : `Lap ${standing.lap}/${race.laps}`);
  }
}
