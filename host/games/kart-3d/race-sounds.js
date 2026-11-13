// Plays the 3D race's sounds: the cues of each step (sound-cues.js, what they sound like in cue-sounds.js) and
// one engine voice per player kart (at most 4). CPU karts make no engine sound. Created by
// host/games/kart-3d/index.js, which calls update() every step and stop() when the game ends.

import { voice } from '../../audio/synth.js';
import { RACE_PHASES } from './race-phases.js';
import { soundSnapshot } from './sound-snapshot.js';
import { raceCues, engineLevels, playerShare } from './sound-cues.js';
import { playCue } from './cue-sounds.js';

// A kart grinding along a wall or a kart is loosened again every few steps; one hit sound per this long per
// kart is enough.
const HIT_GAP_SECONDS = 0.15;

// Returns { update(race, track, { engines }), stop() }. update takes the race after a step (null on the setup
// screen) and the course raced; `engines` is false for a watched race, whose stand-ins are heard by their cues
// only (nobody is driving them, and four engines would drown the cues being judged).
export function createRaceSounds() {
  // The snapshot of the step before, null outside a race.
  let previous = null;
  // playerId -> that kart's engine voice.
  const engines = new Map();
  // playerId -> the race time of that kart's last hit sound.
  const lastHitAt = new Map();

  function stopEngines() {
    for (const engine of engines.values()) {
      engine.stop();
    }
    engines.clear();
  }

  // A kart that left has its voice stopped. A new voice starts silent and is then set to its levels, so it
  // fades in instead of clicking.
  function updateEngines(playerKarts) {
    const present = new Set(playerKarts.map((kart) => kart.playerId));
    for (const [playerId, engine] of engines) {
      if (!present.has(playerId)) {
        engine.stop();
        engines.delete(playerId);
      }
    }
    playerKarts.forEach((kart, index) => {
      const levels = engineLevels(kart, index, playerKarts.length);
      if (!engines.has(kart.playerId)) {
        engines.set(kart.playerId, voice({ ...levels, volume: 0 }));
      }
      engines.get(kart.playerId).update(levels);
    });
  }

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
    update(race, track, { engines: withEngines }) {
      if (!race) {
        stopEngines();
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
      if (race.phase === RACE_PHASES.RESULTS || !withEngines) {
        stopEngines();
      } else {
        updateEngines(playerKarts);
      }
    },
    stop: stopEngines,
  };
}
