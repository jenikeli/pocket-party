// What the 2D race sounds like, decided without any audio: which cues happened between two steps of the race
// (countdown beeps, GO, a kart finishing) and how each kart's engine should sound. Plain functions, unit tested
// in Node; host/games/kart-2d/race-sounds.js turns the results into Web Audio.

import { countdownNumber } from './race.js';
import { MAX_SPEED } from './kart-physics.js';

// The engine's pitch and brightness at standstill and at full speed.
const IDLE_FREQUENCY = 80;
const FULL_FREQUENCY = 200;
const IDLE_FILTER = 250;
const FULL_FILTER = 1300;
// Every engine is the same wave, and several at one pitch would add up into one loud buzz. Each kart is a few
// percent off the one before, so they beat against each other like separate engines.
const DETUNE_STEPS = 4;
const DETUNE_SHARE = 0.035;
// The loudness of all engines together is about this (before the volume slider); each kart gets a share that
// shrinks with the square root of the field, so nine karts are louder than one but nowhere near nine times.
const ENGINE_VOLUME = 0.11;
const IDLE_LOUDNESS = 0.4;

// The parts of the race the cues are read from, taken once per step: { countdown, finishedIds }, where
// `countdown` is the number on screen (3, 2, 1, 0 for GO, null otherwise).
export function soundSnapshot(race) {
  return {
    countdown: countdownNumber(race),
    finishedIds: race.karts.filter((kart) => kart.finishTime !== null).map((kart) => kart.playerId),
  };
}

// The cues that happened between two snapshots (`before` is null for the first step of a race):
// { type: 'countdown', number } for 3, 2 and 1, { type: 'go' }, and { type: 'finish', playerId, first } for
// each kart that crossed the line, `first` for the first of the race.
export function raceCues(before, after) {
  const cues = [];
  const start = before ?? { countdown: null, finishedIds: [] };
  if (after.countdown !== null && after.countdown !== start.countdown) {
    cues.push(after.countdown === 0 ? { type: 'go' } : { type: 'countdown', number: after.countdown });
  }
  const newlyFinished = after.finishedIds.filter((playerId) => !start.finishedIds.includes(playerId));
  newlyFinished.forEach((playerId, index) => {
    cues.push({ type: 'finish', playerId, first: start.finishedIds.length === 0 && index === 0 });
  });
  return cues;
}

// How one kart's engine should sound now: { frequency, filterFrequency, volume }. `index` is the kart's place in
// the field (for the detune) and `count` how many karts there are. Pitch, brightness and loudness all rise with
// speed; a kart that has finished is silent (it just rolls to a stop).
export function engineLevels(kart, index, count) {
  const speedShare = Math.min(Math.hypot(kart.velocityX, kart.velocityY) / MAX_SPEED, 1);
  const detune = 1 + DETUNE_SHARE * (index % DETUNE_STEPS);
  const loudness = IDLE_LOUDNESS + (1 - IDLE_LOUDNESS) * speedShare;
  return {
    frequency: detune * (IDLE_FREQUENCY + (FULL_FREQUENCY - IDLE_FREQUENCY) * speedShare),
    filterFrequency: IDLE_FILTER + (FULL_FILTER - IDLE_FILTER) * speedShare,
    volume: kart.finishTime === null ? (ENGINE_VOLUME / Math.sqrt(count)) * loudness : 0,
  };
}
