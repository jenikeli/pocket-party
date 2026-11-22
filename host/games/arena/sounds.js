// Plays Spirefall's sounds: a drop's pop and chime, hits, spells, towers, the clock's changes and the result. What
// plays is decided by sound-cues.js, how each sounds by sound-voices.js. Created by host/games/arena/index.js,
// which calls handle() every frame with the events the rules emitted and the match.

import { audioContext } from '../../audio/audio.js';
import { elixirMultiplier } from './tuning.js';
import { matchSnapshot, frameCues } from './sound-cues.js';
import { VOICES } from './sound-voices.js';

// The frequent kinds wait at least this long (audio seconds) before sounding again, so a swarm is a texture and not a buzz.
const MIN_GAP = { hit: 0.08, shot: 0.06, landed: 0.1, towerHit: 0.12 };

// Returns { handle(events, match), stop() }. `match` is null on the setup screen.
export function createArenaSounds() {
  let previous = null;
  let stopped = false;
  const lastPlayed = {};

  function playCue(cue, now) {
    if (now - (lastPlayed[cue.type] ?? -Infinity) < (MIN_GAP[cue.type] ?? 0)) {
      return;
    }
    lastPlayed[cue.type] = now;
    VOICES[cue.type](cue, now);
  }

  return {
    handle(events, match) {
      const context = audioContext();
      if (stopped || !match || !context) {
        previous = null;
        return;
      }
      const snapshot = matchSnapshot(match, elixirMultiplier(match.phase, match.clock));
      const now = context.currentTime;
      frameCues(previous, snapshot, events, match.world).forEach((cue) => playCue(cue, now));
      previous = snapshot;
    },
    // Every sound is a short one-shot that ends by itself, so stopping only stops new ones.
    stop() {
      stopped = true;
    },
  };
}
