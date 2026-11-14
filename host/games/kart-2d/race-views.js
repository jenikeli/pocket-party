// What the 2D race shows, worked out from the setup and race state: each phone's view (sent with
// setControllerView; the setup screen's rows are host/kart/setup-rows.js's), standings and results (times as text are
// host/kart/race-time.js's), and when the room is open to new players.
// Plain functions, unit tested in Node. Used by index.js and the renderer.

import { kartsInPlaceOrder, currentLap, countdownNumber, RACE_PHASES } from './race.js';
import { playerSetup } from '../../kart/setup.js';
import { colorChoices } from '../../roster.js';
import { SETUP_PHASE } from '../../kart/setup-rows.js';
import { formatGap } from '../../kart/race-time.js';

// Whether new players may join: on the setup screen (no race) and the results, not while karts are racing.
export function roomIsOpen(race) {
  return race === null || race.phase === RACE_PHASES.RESULTS;
}

// The view for one player's phone on the setup screen: { phase: 'setup', laps, steering, autoAccelerate,
// leftHanded, ready, colorIndex, colors }. colors is the roster's colorChoices, to pick a color from; the view
// is sent again whenever anyone's color changes, since that changes who holds what.
export function setupView(setup, players, playerId) {
  const { steering, autoAccelerate, leftHanded, ready } = playerSetup(setup, playerId);
  const colorIndex = players.get(playerId).colorIndex;
  return {
    phase: SETUP_PHASE,
    laps: setup.laps,
    steering,
    autoAccelerate,
    leftHanded,
    ready,
    colorIndex,
    colors: colorChoices(players, playerId),
  };
}

// The view for one player's phone during the race, or null if they have no kart in it (they joined after it
// started). { phase, countdown, lap, laps, place, finished, steering, autoAccelerate, leftHanded }: countdown as
// countdownNumber, place 1 = first. The control style is in every view, so a phone that reloads mid-race shows
// the right controls again. It only changes when something on the phone should change, so the host sends it
// rarely.
export function controllerView(race, setup, playerId) {
  const order = kartsInPlaceOrder(race);
  const index = order.findIndex((kart) => kart.playerId === playerId);
  if (index === -1) {
    return null;
  }
  const kart = order[index];
  const { steering, autoAccelerate, leftHanded } = playerSetup(setup, playerId);
  return {
    phase: race.phase,
    countdown: countdownNumber(race),
    lap: currentLap(race, kart),
    laps: race.laps,
    place: index + 1,
    finished: kart.finishTime !== null,
    steering,
    autoAccelerate,
    leftHanded,
  };
}

// One row per kart in place order: { place, playerId, lap, finishTime } (finishTime null if not finished).
export function standingRows(race) {
  return kartsInPlaceOrder(race).map((kart, index) => ({
    place: index + 1,
    playerId: kart.playerId,
    lap: currentLap(race, kart),
    finishTime: kart.finishTime,
  }));
}

// The results panel's rows: standingRows plus `gap`, the text of how far behind the winner (first place) a kart
// finished ('+2.49'). The winner and a kart that never finished have none ('').
export function resultRows(race) {
  const rows = standingRows(race);
  const winnerTime = rows[0]?.finishTime ?? null;
  return rows.map((row) => {
    const hasGap = row.place > 1 && row.finishTime !== null && winnerTime !== null;
    return { ...row, gap: hasGap ? formatGap(row.finishTime, winnerTime) : '' };
  });
}

// What was raced, for the results heading: '1 lap', '3 laps'.
export function lapsText(laps) {
  return laps === 1 ? '1 lap' : `${laps} laps`;
}
