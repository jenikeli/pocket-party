// Plays the 2D race's sounds: the countdown beeps, GO, the finish jingles and one engine voice per kart. What
// happens is decided by host/games/kart-2d/sound-cues.js; this file only makes the noises (host/audio/synth.js).
// Created by host/games/kart-2d/index.js, which calls update() every step and stop() when the game ends.

import { tone, voice } from '../../audio/synth.js';
import { audioContext } from '../../audio/audio.js';
import { RACE_PHASES } from './race.js';
import { soundSnapshot, raceCues, engineLevels } from './sound-cues.js';

// Notes in Hz: C5, E5, G5 and C6 for the finish jingles.
const C5 = 523;
const E5 = 659;
const G5 = 784;
const C6 = 1047;

// Plays notes one after another: each is a tone() option object with an `after` in seconds from now.
function playNotes(notes) {
  const now = audioContext()?.currentTime ?? 0;
  for (const { after, ...note } of notes) {
    tone({ ...note, start: now + after });
  }
}

// One short level beep for 3, 2 and 1, one longer, higher one for GO.
function playCountdownBeep() {
  tone({ type: 'square', frequency: 440, length: 0.18, volume: 0.22 });
}

function playGo() {
  tone({ type: 'square', frequency: 880, length: 0.5, sustain: 0.6, release: 0.15, volume: 0.25 });
}

// The first kart home gets a rising three-note jingle ending on a held high C; the rest a short two-note one.
function playFinish(first) {
  if (first) {
    playNotes([
      { after: 0, type: 'triangle', frequency: C5, length: 0.12, volume: 0.28 },
      { after: 0.12, type: 'triangle', frequency: E5, length: 0.12, volume: 0.28 },
      { after: 0.24, type: 'triangle', frequency: G5, length: 0.12, volume: 0.28 },
      { after: 0.36, type: 'triangle', frequency: C6, length: 0.5, sustain: 0.7, release: 0.3, volume: 0.3 },
    ]);
  } else {
    playNotes([
      { after: 0, type: 'triangle', frequency: C5, length: 0.1, volume: 0.2 },
      { after: 0.1, type: 'triangle', frequency: E5, length: 0.25, volume: 0.2 },
    ]);
  }
}

function playCue(cue) {
  if (cue.type === 'countdown') {
    playCountdownBeep();
  } else if (cue.type === 'go') {
    playGo();
  } else {
    playFinish(cue.first);
  }
}

// Returns { update(race), stop() }. update(race) takes the race after a step (null on the setup screen).
export function createRaceSounds() {
  // The snapshot of the step before, null outside a race.
  let previous = null;
  // playerId -> that kart's engine voice.
  const engines = new Map();

  function stopEngines() {
    for (const engine of engines.values()) {
      engine.stop();
    }
    engines.clear();
  }

  // Engines run from the countdown (idling) until the race is over; a kart that left has its voice stopped.
  // A new voice starts silent and is then set to its levels, so it fades in instead of clicking.
  function updateEngines(race) {
    const present = new Set(race.karts.map((kart) => kart.playerId));
    for (const [playerId, engine] of engines) {
      if (!present.has(playerId)) {
        engine.stop();
        engines.delete(playerId);
      }
    }
    race.karts.forEach((kart, index) => {
      const levels = engineLevels(kart, index, race.karts.length);
      if (!engines.has(kart.playerId)) {
        engines.set(kart.playerId, voice({ ...levels, volume: 0 }));
      }
      engines.get(kart.playerId).update(levels);
    });
  }

  return {
    update(race) {
      if (!race) {
        stopEngines();
        previous = null;
        return;
      }
      const snapshot = soundSnapshot(race);
      raceCues(previous, snapshot).forEach(playCue);
      previous = snapshot;
      if (race.phase === RACE_PHASES.RESULTS) {
        stopEngines();
      } else {
        updateEngines(race);
      }
    },
    stop: stopEngines,
  };
}
