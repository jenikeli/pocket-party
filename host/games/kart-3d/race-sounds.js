// Plays the 3D race's sounds: the cues of each step (sound-cues.js, what they sound like in cue-sounds.js).
// Created by host/games/kart-3d/index.js, which calls update() every step.

import { soundSnapshot } from './sound-snapshot.js';
import { raceCues, playerShare } from './sound-cues.js';
import { playCue } from './cue-sounds.js';

// A kart grinding along a wall or a kart is loosened again every few steps; one hit sound per this long per
// kart is enough.
const HIT_GAP_SECONDS = 0.15;

// Returns { update(race, track) }. update takes the race after a step (null on the setup screen) and the
// course raced.
export function createRaceSounds() {
  // The snapshot of the step before, null outside a race.
  let previous = null;
  // playerId -> the race time of that kart's last hit sound.
  const lastHitAt = new Map();

  function playCues(race, cues, share) {
    for (const cue of cues) {
      if (cue.type === 'hit') {
        if (race.time - (lastHitAt.get(cue.playerId) ?? -Infinity) < HIT_GAP_SECONDS) {
          continue;
        }
        lastHitAt.set(cue.playerId, race.time);
      }
      playCue(cue, cue.playerId === undefined ? 1 : share);
    }
  }

  return {
    update(race, track) {
      if (!race) {
        previous = null;
        return;
      }
      if (previous?.race !== race) {
        lastHitAt.clear();
      }
      const playerKarts = race.karts.filter((kart) => kart.playerId !== null);
      const snapshot = soundSnapshot(race, track, playerKarts, previous);
      playCues(race, raceCues(previous, snapshot), playerShare(playerKarts.length));
      previous = snapshot;
    },
  };
}
