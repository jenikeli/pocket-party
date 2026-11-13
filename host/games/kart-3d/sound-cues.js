// What the 3D race sounds like, decided without any audio: which cues happened between two steps of the race
// (the countdown, starts, drifts and their mini-turbo levels, boosts, hops, tricks, glides, items, hits, laps,
// finishing), read from two snapshots (sound-snapshot.js), and how a player's engine should sound. Plain
// functions, unit tested in Node; host/games/kart-3d/race-sounds.js turns the results into Web Audio. Only the
// players' karts (and the stand-ins of a watched race) make cues: twelve karts' worth of hits and boosts would
// be noise.

import { START_OUTCOMES } from './rocket-start.js';
import { BOOST_KINDS } from './kart-boosts.js';
import { kartTopSpeed } from './kart-driving.js';
import { length } from './vector.js';

// The roulette ticks this often while it rolls, as MK8DX's item box roulette does.
export const ROULETTE_TICK_SECONDS = 0.08;
// Spin and rocket start boosts have their own cues (spin, rocketStart), so their boost cue would play twice.
const BOOSTS_WITH_OWN_CUES = [BOOST_KINDS.SPIN, BOOST_KINDS.ROCKET_START];

// The engine's pitch and brightness at standstill and at top speed: a low sawtooth, a little lower than the 2D
// race's (a bigger kart), opening up as it speeds.
const IDLE_FREQUENCY = 70;
const FULL_FREQUENCY = 190;
const IDLE_FILTER = 300;
const FULL_FILTER = 1500;
// A drift revs the engine up but sounds strained (higher, duller); a boost roars (higher, much brighter, louder).
const DRIFT_PITCH = 1.07;
const DRIFT_FILTER = 0.75;
const BOOST_PITCH = 1.18;
const BOOST_FILTER = 1.8;
const BOOST_LOUDNESS = 1.3;
// Each player's engine is a few percent off the one before, so two engines at one speed beat like two engines
// rather than adding up into one loud buzz.
const DETUNE_SHARE = 0.035;
// One engine alone is about this loud (before the volume slider); with several players each gets a share that
// shrinks with the square root of their number, so four are louder than one but nowhere near four times.
const ENGINE_VOLUME = 0.12;
const IDLE_LOUDNESS = 0.4;

// The cues that happened between two snapshots (`before` is null for the first step of a race; a snapshot of
// another race counts as none, so a Restart starts afresh). Once the results show nothing more is heard: the
// karts drive on behind them by themselves, and the last finish was heard on the step the results came.
// Race-wide cues (countdown, GO, teleport, sticky walls) have no playerId; every other cue carries the playerId
// of the kart it happened to.
export function raceCues(before, after) {
  const start = before?.race === after.race ? before : null;
  if (start?.results) {
    return [];
  }
  const cues = [];
  if (after.countdown !== null && after.countdown !== start?.countdown) {
    cues.push(after.countdown === 0 ? { type: 'go' } : { type: 'countdown', number: after.countdown });
  }
  if (start === null) {
    return cues;
  }
  if (after.teleportWarning !== null && (start.teleportWarning === null || after.teleportWarning > start.teleportWarning)) {
    cues.push({ type: 'teleportWarning' });
  }
  if (start.teleportWarning > 0 && after.teleportWarning === 0) {
    cues.push({ type: 'teleportHop' });
  }
  if (after.stickyLeft > start.stickyLeft) {
    cues.push({ type: 'stickyWalls' });
  }
  for (const [playerId, kart] of after.karts) {
    const was = start.karts.get(playerId);
    if (was) {
      cues.push(...kartCues(was, kart).map((cue) => ({ ...cue, playerId })));
    }
  }
  return cues;
}

// One kart's cues, without its playerId.
function kartCues(was, now) {
  return [...drivingCues(was, now), ...itemCues(was, now), ...hitCues(was, now), ...lapCues(was, now)];
}

function drivingCues(was, now) {
  const cues = [];
  if (was.startOutcome === null && now.startOutcome === START_OUTCOMES.ROCKET) {
    cues.push({ type: 'rocketStart' });
  }
  if (was.startOutcome === null && now.startOutcome === START_OUTCOMES.STALL) {
    cues.push({ type: 'stall' });
  }
  if (!was.hopping && now.hopping) {
    cues.push({ type: 'hop' });
  }
  if (!was.drifting && now.drifting) {
    cues.push({ type: 'driftStart' });
  }
  if (now.sparkLevel > was.sparkLevel) {
    cues.push({ type: 'miniTurboLevel', level: now.sparkLevel });
  }
  // A new boost: none before, another kind, or the time topped up (a second dash panel). The mini-turbo's level
  // is the sparks the drift had a step ago, when it was let go.
  const newBoost = now.boostKind !== null && (now.boostKind !== was.boostKind || now.boostLeft > was.boostLeft);
  if (newBoost && !BOOSTS_WITH_OWN_CUES.includes(now.boostKind)) {
    cues.push({ type: 'boost', kind: now.boostKind, level: now.boostKind === BOOST_KINDS.MINI_TURBO ? was.sparkLevel : 0 });
  }
  if (!was.tricking && now.tricking) {
    cues.push({ type: 'trick' });
  }
  if (!was.gliding && now.gliding) {
    cues.push({ type: 'glideStart' });
  }
  if (was.gliding && !now.gliding && now.grounded) {
    cues.push({ type: 'glideLand' });
  }
  if (!was.falling && now.falling) {
    cues.push({ type: 'fall' });
  }
  return cues;
}

function itemCues(was, now) {
  const cues = [];
  if (was.rollLeft === 0 && now.rollLeft > 0) {
    cues.push({ type: 'itemPickup' });
  } else if (now.rollLeft > 0 && Math.ceil(now.rollLeft / ROULETTE_TICK_SECONDS) < Math.ceil(was.rollLeft / ROULETTE_TICK_SECONDS)) {
    cues.push({ type: 'rouletteTick' });
  }
  if (was.held === null && now.held !== null) {
    cues.push({ type: 'itemLanded', item: now.held });
  }
  if (was.held !== null && now.held === null) {
    cues.push({ type: 'itemUsed', item: was.held });
  }
  return cues;
}

// A hit loosens the kart's grip (slideLeft goes up: a wall, a kart, a blocker or a push); what touched it is
// knockedBy's guess. Being let go off a sticky wall loosens it too, but is no hit. `strength` is 0.4 to 1, more
// for more speed lost.
function hitCues(was, now) {
  const cues = [];
  if (!was.stuck && now.stuck) {
    cues.push({ type: 'stuck' });
  } else if (!was.stuck && now.slideLeft > was.slideLeft) {
    const strength = Math.min(Math.max(0.4 + was.speedShare - now.speedShare, 0.4), 1);
    cues.push({ type: 'hit', by: now.knockedBy, strength });
  }
  // A spin starts at 0 and counts up, so a lower time than a step ago is a new one.
  if (now.spinTime !== null && (was.spinTime === null || now.spinTime < was.spinTime)) {
    cues.push({ type: 'spin', post: now.postCooldown > was.postCooldown });
  }
  return cues;
}

function lapCues(was, now) {
  if (!was.finished && now.finished) {
    return [{ type: 'finish', first: now.first }];
  }
  if (now.lap > was.lap) {
    return [{ type: now.onFinalLap ? 'finalLap' : 'lap' }];
  }
  return [];
}

// How loud each player's sounds are with `count` players racing: 1 for one, half for four, so four players'
// engines and cues together stay about as loud as one player's.
export function playerShare(count) {
  return 1 / Math.sqrt(Math.max(count, 1));
}

// How one player's engine should sound now: { frequency, filterFrequency, volume }. `index` is the kart's place
// among the players (for the detune) and `count` how many players there are. Pitch, brightness and loudness
// rise with speed, with a different colour while drifting and while boosting.
export function engineLevels(kart, index, count) {
  const speedShare = Math.min(length(kart.velocity) / kartTopSpeed(kart), 1);
  const boosting = kart.boost !== null;
  const drifting = kart.driftDirection !== 0;
  let pitch = 1 + DETUNE_SHARE * index;
  let brightness = 1;
  if (boosting) {
    pitch *= BOOST_PITCH;
    brightness *= BOOST_FILTER;
  } else if (drifting) {
    pitch *= DRIFT_PITCH;
    brightness *= DRIFT_FILTER;
  }
  const loudness = (IDLE_LOUDNESS + (1 - IDLE_LOUDNESS) * speedShare) * (boosting ? BOOST_LOUDNESS : 1);
  return {
    frequency: pitch * (IDLE_FREQUENCY + (FULL_FREQUENCY - IDLE_FREQUENCY) * speedShare),
    filterFrequency: brightness * (IDLE_FILTER + (FULL_FILTER - IDLE_FILTER) * speedShare),
    volume: ENGINE_VOLUME * playerShare(count) * loudness,
  };
}
