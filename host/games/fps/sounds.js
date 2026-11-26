// Plays Saltline's sounds: gunfire, footsteps, explosions, hit markers, the rain. What plays is decided by
// sound-cues.js, how each sounds by sound-voices.js. Created by host/games/fps/index.js, which calls handle() every
// frame with the events the rules emitted and calls setPlayerFlash() with how blinded a person is.

import { audioContext, effectsOutput } from '../../audio/audio.js';
import { frameCues } from './sound-cues.js';
import { VOICES, distanceBus, startRain, startRinging } from './sound-voices.js';

// A kind waits at least this long (audio seconds) before sounding again, so a firefight is a texture and not a buzz.
const MIN_GAP = {
  'fire:rifle': 0.05, 'fire:carbine': 0.04, 'fire:shotgun': 0.15, 'fire:sniper': 0.3, 'fire:pistol': 0.08, 'fire:knife': 0.2,
  impact: 0.06, step: 0.1, jump: 0.1, land: 0.1, reload: 0.15, dryfire: 0.12, throw: 0.15, explode: 0.1, hitMarker: 0.04, thud: 0.08,
};
const DUCK_AT_FULL_BLIND = 0.75; // how much of the mix a fully blinded person loses

const gapKey = (cue) => (cue.type === 'fire' ? `fire:${cue.weapon}` : cue.type);

// Returns { handle(events, listeners, humanIds), setPlayerFlash(level), stop() }.
export function createFpsSounds() {
  let stopped = false;
  let master = null; // every cue plays through this, so a flash can duck the whole mix
  let rain = null;
  let ringing = null;
  let flashLevel = 0;
  const lastPlayed = {};

  // Made on the first frame after the unlock, never before it.
  function ensureGraph(context) {
    if (!master && effectsOutput()) {
      master = context.createGain();
      master.connect(effectsOutput());
      rain = startRain(context, master);
    }
    return master !== null;
  }

  function playCue(context, cue, now) {
    const key = gapKey(cue);
    if (now - (lastPlayed[key] ?? -Infinity) < (MIN_GAP[key] ?? 0)) {
      return;
    }
    lastPlayed[key] = now;
    const out = cue.gain === undefined ? master : distanceBus(context, cue, master);
    VOICES[cue.type](cue, now, out);
  }

  // Ducks the mix and lets the ringing follow the level; the ringing ends once the level has fallen to nothing.
  function applyFlash(context) {
    const now = context.currentTime;
    master.gain.setTargetAtTime(1 - DUCK_AT_FULL_BLIND * flashLevel, now, 0.05);
    if (flashLevel > 0.02 && !ringing) {
      ringing = startRinging(context, effectsOutput());
    }
    if (ringing && flashLevel > 0.02) {
      ringing.setLevel(flashLevel, now);
    } else if (ringing) {
      ringing.stop(now);
      ringing = null;
    }
  }

  return {
    handle(events, listeners, humanIds) {
      const context = audioContext();
      if (stopped || !context || !ensureGraph(context)) {
        return;
      }
      const now = context.currentTime;
      frameCues(events, listeners, humanIds).forEach((cue) => playCue(context, cue, now));
      applyFlash(context);
    },
    // 0..1: how blinded a person is. Takes effect on the next handle() (before the first one there is no mix).
    setPlayerFlash(level) {
      flashLevel = Math.min(1, Math.max(0, level));
    },
    stop() {
      const context = audioContext();
      if (stopped || !context) {
        stopped = true;
        return;
      }
      stopped = true;
      rain?.stop(context.currentTime);
      ringing?.stop(context.currentTime);
      master?.gain.setTargetAtTime(0, context.currentTime, 0.1);
    },
  };
}
