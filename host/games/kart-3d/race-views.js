// What the 3D race shows, worked out from the setup and race state: each phone's view (sent with
// setControllerView), what each split-screen view shows (which kart it follows, and its lap, place and banner),
// the standings for the results, each kart's pose for drawing between two steps, and the host's readout lines.
// Plain functions, unit tested in Node. Used by host/games/kart-3d/index.js, the panels and the renderer.

import { lerp, normalize, length, rotate } from './vector.js';
import { forwardSpeed } from './kart-physics.js';
import { SURFACES } from './track.js';
import { sparkLevel, SPARK_COLORS } from './kart-techniques.js';
import { countdownNumber, GO_AT } from './rocket-start.js';
import { playerSetup } from '../../kart/setup.js';
import { SETUP_PHASE } from '../../kart/setup-rows.js';
import { playersInSlotOrder } from '../../roster.js';
import { playerKart, kartsInPlaceOrder, raceClock, RACE_PHASES, FINISH_TIME_LIMIT_SECONDS } from './race.js';
import { formatRaceTime } from '../../kart/race-time.js';
import { itemHud, itemPhoneView } from './items/item-views.js';

// How long after GO the phone says how the start went, and after the last lap starts that it is the last.
const START_SHOWN_FOR = 2;
const FINAL_LAP_SHOWN_FOR = 3;
// A kart is 2 units long; the readout gives speeds in kart lengths too, to compare with MK8DX footage.
const KART_LENGTH = 2;
export const BANNERS = Object.freeze({ FINAL_LAP: 'Final lap!', FINISH: 'Finish!', TELEPORT: 'Teleport!' });

// The setup view for one player's phone: { phase: 'setup', laps, engineClass, courseName, steering,
// autoAccelerate, ready }; the phone shows the course's name as the race's title.
export function setupView(setup, engineClass, courseName, playerId) {
  const { steering, autoAccelerate, ready } = playerSetup(setup, playerId);
  return { phase: SETUP_PHASE, laps: setup.laps, engineClass, courseName, steering, autoAccelerate, ready };
}

// Whether new players may join: on the setup screen and the results, not while a course is built for a race
// (the loading screen) or karts race. A watched race counts as a race: the phones wait through it.
export function roomIsOpen(race, buildingCourse) {
  return !buildingCourse && (race === null || race.phase === RACE_PHASES.RESULTS);
}

// The view during the race, or null if the player has no kart (they joined after the race started):
// { phase, steering, autoAccelerate, countdown, spark, start, lap, laps, place, finalLap, finished, item }. It
// carries the control style so a phone that reloads shows the right controls again. countdown is
// countdownNumber's (3, 2, 1, 0 for GO, or null); spark the drift's spark colour (SPARK_COLORS) or null, shown
// on the Drift button; start the start's outcome (START_OUTCOMES) for a moment after GO, null otherwise;
// finalLap true for a moment after the last lap starts; item the kart's items for the phone (item-views.js's
// itemPhoneView, null with items off). It only changes when something on the phone should,
// so the host sends it rarely.
export function raceView(race, setup, playerId) {
  const kart = playerKart(race, playerId);
  if (!kart) {
    return null;
  }
  const { steering, autoAccelerate } = playerSetup(setup, playerId);
  const showStart = race.phase !== RACE_PHASES.COUNTDOWN && race.time < GO_AT + START_SHOWN_FOR;
  return {
    phase: race.phase,
    steering,
    autoAccelerate,
    countdown: countdownNumber(race.time),
    spark: SPARK_COLORS[sparkLevel(kart)],
    start: showStart ? kart.startResult.outcome : null,
    lap: kart.lap,
    laps: race.laps,
    place: kart.place,
    finalLap: isFinalLapShowing(race, kart),
    finished: kart.finishTime !== null,
    item: itemPhoneView(race, kart),
  };
}

function isFinalLapShowing(race, kart) {
  const onLastLap = race.laps > 1 && kart.lap === race.laps && kart.finishTime === null;
  return onLastLap && raceClock(race) - kart.lapStartedAt < FINAL_LAP_SHOWN_FOR;
}

// What one split-screen view shows over the picture for `kart`: { lap, laps, place, banner, item }, where banner
// is one of BANNERS or null, and item the kart's items (item-views.js's itemHud, null with items off). A view
// that follows a CPU kart shows its place and a teleport's banner only (lap and item null). The teleport's
// banner (M8c) shows from its warning to the end of its sparkles, over every view of a kart still racing (nobody
// hops at the results).
export function viewHud(race, kart) {
  const teleporting = race.items.teleport !== null && race.phase === RACE_PHASES.RACING && kart.finishTime === null;
  if (kart.playerId === null) {
    return { lap: null, laps: race.laps, place: kart.place, banner: teleporting ? BANNERS.TELEPORT : null, item: null };
  }
  return { lap: kart.lap, laps: race.laps, place: kart.place, banner: playerBanner(race, kart, teleporting), item: itemHud(race, kart) };
}

function playerBanner(race, kart, teleporting) {
  if (kart.finishTime !== null) {
    return BANNERS.FINISH;
  }
  if (teleporting) {
    return BANNERS.TELEPORT;
  }
  return isFinalLapShowing(race, kart) ? BANNERS.FINAL_LAP : null;
}

// The host's big countdown in the middle of the screen: '3', '2', '1', 'GO!', or '' once the karts are off.
export function describeCountdown(race) {
  const number = countdownNumber(race.time);
  if (number === null) {
    return '';
  }
  return number === 0 ? 'GO!' : String(number);
}

// The host's race clock from GO ('' before GO and at the results), and once the first player has finished, the
// time the others have left, on a second line.
export function describeClock(race) {
  if (race.phase !== RACE_PHASES.RACING) {
    return '';
  }
  const clock = formatRaceTime(raceClock(race));
  if (race.firstPlayerFinishTime === null) {
    return clock;
  }
  const left = FINISH_TIME_LIMIT_SECONDS - (raceClock(race) - race.firstPlayerFinishTime);
  return `${clock}\nRace ends in ${Math.ceil(Math.max(left, 0))} s`;
}

// One row per kart in place order, for the results: { place, playerId, finishTime } (playerId null for a CPU
// kart, finishTime null if it had not finished).
export function standingRows(race) {
  return kartsInPlaceOrder(race).map((kart) => ({ place: kart.place, playerId: kart.playerId, finishTime: kart.finishTime }));
}

// The split-screen views during the race, in order (top left first): [{ kart, player }]. One per player with a
// kart, in slot order. 3 players get quarters with a CPU kart in the fourth, as MK8DX fills its empty quarter;
// with no player kart left, the view follows a CPU kart. player is null for a CPU kart's view.
export function viewTargets(race, players) {
  const targets = playersInSlotOrder(players)
    .map((player) => ({ kart: playerKart(race, player.playerId), player }))
    .filter((target) => target.kart !== null);
  if (targets.length === 0 || targets.length === 3) {
    targets.push({ kart: race.karts.find((kart) => kart.playerId === null), player: null });
  }
  return targets;
}

// Where to draw `kart` a share `alpha` (0..1) of the way from its last step to its current one:
// { position, forward, up, bodyForward, bodyUp }. forward and up are the kart's travel, which the chase camera
// follows; the body ones add its lean into a drift, its spin and its trick roll, for the model.
export function kartPose(kart, alpha) {
  const forward = normalize(lerp(kart.previousForward, kart.forward, alpha));
  const up = normalize(lerp(kart.previousUp, kart.up, alpha));
  // A right lean turns the nose clockwise seen from above: a negative angle about up (as in kart-physics.js).
  const bodyForward = rotate(forward, up, -lerpAngle(kart.previousBodyYaw, kart.bodyYaw, alpha));
  const bodyUp = rotate(up, bodyForward, lerpAngle(kart.previousBodyRoll, kart.bodyRoll, alpha));
  return { position: lerp(kart.previousPosition, kart.position, alpha), forward, up, bodyForward, bodyUp };
}

// Part of the way between two angles, the short way round, so a spin ending at a full turn (drawn as 0 the
// next step) does not swing back.
function lerpAngle(from, to, alpha) {
  const difference = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + difference * alpha;
}

// One line about a kart for the host's readout: its speed, what it is on, and how far round the lap it is.
export function describeKart(kart, track) {
  const speed = kart.grounded ? forwardSpeed(kart) : length(kart.velocity);
  const lengths = (speed / KART_LENGTH).toFixed(1);
  const round = Math.round((kart.s / track.length) * 100);
  const parts = [`${speed.toFixed(1)} units/s (${lengths} kart lengths/s)`, describeSurface(kart), `${round}% round`];
  if (kart.driftDirection !== 0) {
    parts.push(`drifting ${kart.driftDirection > 0 ? 'right' : 'left'} (${SPARK_COLORS[sparkLevel(kart)] ?? 'no'} sparks)`);
  }
  if (kart.boost) {
    parts.push(`${kart.boost.kind} boost`);
  }
  return parts.join(', ');
}

function describeSurface(kart) {
  if (kart.respawnIn !== null) {
    return 'fell off';
  }
  if (!kart.grounded) {
    return kart.gliding ? 'gliding' : 'in the air';
  }
  const ground = kart.surface === SURFACES.OFF_ROAD ? 'off-road' : 'road';
  return kart.antiGravity ? `${ground}, anti-gravity` : ground;
}
