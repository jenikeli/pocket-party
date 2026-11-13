// What the 2D race sounds like, decided without any audio: which cues happened between two steps of the race
// (countdown beeps, GO, a kart finishing). Plain functions, unit tested in Node; host/games/kart-2d/race-sounds.js turns the results into Web Audio.

import { countdownNumber } from './race.js';

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
