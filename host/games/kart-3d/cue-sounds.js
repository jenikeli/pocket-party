// What each of the 3D race's cues (host/games/kart-3d/sound-cues.js) sounds like, all made in code from tones
// and noise (host/audio/synth.js), with the reference game's sounds as the model. The countdown, GO and finish are the 2D
// race's (host/games/kart-2d/race-sounds.js), so both races sound like one family. Used by race-sounds.js; the items' and the hits' sounds are in
// item-hit-sounds.js.

import { noise } from '../../audio/synth.js';
import { BOOST_KINDS } from './kart-boosts.js';
import { play, thud, squelch, playItemUsed, playHit } from './item-hit-sounds.js';

// Notes in Hz.
const G4 = 392;
const C5 = 523;
const E5 = 659;
const G5 = 784;
const C6 = 1047;
const E6 = 1319;
const G6 = 1568;
const A6 = 1760;
// The mini-turbo's three charge levels (blue, orange, purple): a rising chime each, A5, D6 and G6.
const SPARK_NOTES = [880, 1175, 1568];
// How long each mini-turbo level's whoosh lasts (blue, orange, purple), longer as the boost is.
const MINI_TURBO_WHOOSH = [0.3, 0.45, 0.6];

// A rush of air rising in pitch, the heart of every boost: band-passed noise sweeping up, under a sliding tone.
function whoosh(share, seconds, loudness) {
  play(share, [
    { sound: noise, filter: 'bandpass', frequency: 400, endFrequency: 2500, q: 0.8, length: seconds, attack: 0.03, volume: 0.35 * loudness },
    { type: 'triangle', frequency: 150, endFrequency: 420, length: seconds * 0.8, attack: 0.02, filterFrequency: 1200, volume: 0.18 * loudness },
  ]);
}

const RECIPES = {
  countdown: (share) => play(share, [{ type: 'square', frequency: 440, length: 0.18, volume: 0.22 }]),
  go: (share) => play(share, [{ type: 'square', frequency: 880, length: 0.5, sustain: 0.6, release: 0.15, volume: 0.25 }]),
  rocketStart: (share) => {
    whoosh(share, 0.7, 1.2);
    play(share, [{ type: 'square', frequency: 120, endFrequency: 480, length: 0.5, filterFrequency: 900, volume: 0.15 }]);
  },
  // The engine coughing: three low puffs, then a hiss.
  stall: (share) =>
    play(share, [
      { type: 'square', frequency: 70, length: 0.08, filterFrequency: 300, volume: 0.3 },
      { after: 0.14, type: 'square', frequency: 62, length: 0.08, filterFrequency: 300, volume: 0.25 },
      { after: 0.3, type: 'square', frequency: 55, length: 0.1, filterFrequency: 300, volume: 0.2 },
      { after: 0.4, sound: noise, filter: 'highpass', frequency: 2000, length: 0.35, volume: 0.08 },
    ]),
  hop: (share) => play(share, [{ type: 'sine', frequency: 300, endFrequency: 600, length: 0.1, volume: 0.15 }]),
  // The tyres squealing into the drift.
  driftStart: (share) => play(share, [{ sound: noise, filter: 'bandpass', frequency: 2600, endFrequency: 2200, q: 6, length: 0.3, attack: 0.02, volume: 0.4 }]),
  miniTurboLevel: (share, cue) =>
    play(share, [
      { type: 'triangle', frequency: SPARK_NOTES[cue.level - 1], length: 0.15, volume: 0.22 },
      { type: 'square', frequency: SPARK_NOTES[cue.level - 1] * 2, length: 0.06, filterFrequency: 4000, volume: 0.05 },
      { sound: noise, filter: 'highpass', frequency: 6000, length: 0.08, volume: 0.1 },
    ]),
  boost: (share, cue) => playBoost(share, cue),
  // A swish up and two sparkling notes.
  trick: (share) =>
    play(share, [
      { sound: noise, filter: 'highpass', frequency: 1000, endFrequency: 5000, length: 0.25, attack: 0.03, volume: 0.15 },
      { type: 'triangle', frequency: E6, length: 0.08, volume: 0.15 },
      { after: 0.08, type: 'triangle', frequency: A6, length: 0.15, volume: 0.15 },
    ]),
  // The glider opening: a soft cloth "fwump" and a slow rise.
  glideStart: (share) =>
    play(share, [
      { sound: noise, filter: 'lowpass', frequency: 600, endFrequency: 200, length: 0.3, attack: 0.02, volume: 0.3 },
      { type: 'triangle', frequency: 220, endFrequency: 330, length: 0.35, attack: 0.04, volume: 0.15 },
    ]),
  glideLand: (share) => thud(share, 0.35),
  // A whistle falling away.
  fall: (share) => play(share, [{ type: 'sine', frequency: 900, endFrequency: 200, length: 0.7, attack: 0.02, volume: 0.15 }]),
  // The box breaking: a bright crack and a glassy note.
  itemPickup: (share) =>
    play(share, [
      { sound: noise, filter: 'highpass', frequency: 3000, length: 0.12, volume: 0.2 },
      { type: 'triangle', frequency: G6, length: 0.1, volume: 0.15 },
    ]),
  rouletteTick: (share) => play(share, [{ type: 'square', frequency: 1500, length: 0.025, filterFrequency: 4000, volume: 0.06 }]),
  itemLanded: (share) =>
    play(share, [
      { type: 'triangle', frequency: C6, length: 0.08, volume: 0.2 },
      { after: 0.08, type: 'triangle', frequency: G6, length: 0.18, volume: 0.2 },
    ]),
  itemUsed: (share, cue) => playItemUsed(share, cue.item),
  hit: (share, cue) => playHit(share * cue.strength, cue.by),
  stuck: (share) => squelch(share),
  spin: (share, cue) => {
    if (cue.post) {
      clang(share);
    }
    play(share, [
      { type: 'triangle', frequency: 500, endFrequency: 1000, length: 0.18, volume: 0.15 },
      { after: 0.18, type: 'triangle', frequency: 1000, endFrequency: 500, length: 0.18, volume: 0.15 },
    ]);
  },
  lap: (share) =>
    play(share, [
      { type: 'triangle', frequency: G5, length: 0.1, volume: 0.22 },
      { after: 0.1, type: 'triangle', frequency: C6, length: 0.25, volume: 0.22 },
    ]),
  // Ta-ta-ta-taa, the final lap's call.
  finalLap: (share) =>
    play(share, [
      { type: 'square', frequency: G4, length: 0.1, filterFrequency: 2500, volume: 0.15 },
      { after: 0.12, type: 'square', frequency: G4, length: 0.1, filterFrequency: 2500, volume: 0.15 },
      { after: 0.24, type: 'square', frequency: G4, length: 0.1, filterFrequency: 2500, volume: 0.15 },
      { after: 0.36, type: 'square', frequency: C5, length: 0.45, sustain: 0.7, release: 0.2, filterFrequency: 2500, volume: 0.17 },
    ]),
  finish: (share, cue) => playFinish(share, cue.first),
  // A warble before everyone hops, then a zap as they do.
  teleportWarning: (share) =>
    play(share, [0, 0.12, 0.24, 0.36, 0.48, 0.6].map((after, index) => ({ after, type: 'square', frequency: index % 2 ? 880 : 660, length: 0.1, filterFrequency: 2000, volume: 0.1 }))),
  teleportHop: (share) =>
    play(share, [
      { sound: noise, filter: 'bandpass', frequency: 3000, endFrequency: 500, q: 2, length: 0.3, volume: 0.25 },
      { type: 'sine', frequency: 1500, endFrequency: 300, length: 0.3, volume: 0.15 },
    ]),
  stickyWalls: (share) => play(share, [{ type: 'square', frequency: 400, endFrequency: 150, length: 0.45, filterFrequency: 700, volume: 0.2 }]),
};

// Each boost kind's whoosh: the mini-turbo's grows with its level, the dash panel adds a chirp, the trick's is
// short and the slipstream's a soft wind.
function playBoost(share, cue) {
  if (cue.kind === BOOST_KINDS.MINI_TURBO) {
    whoosh(share, MINI_TURBO_WHOOSH[Math.max(cue.level, 1) - 1], 0.8 + 0.1 * cue.level);
  } else if (cue.kind === BOOST_KINDS.DASH_PANEL) {
    whoosh(share, 0.5, 1);
    play(share, [{ type: 'square', frequency: 600, endFrequency: 1200, length: 0.15, filterFrequency: 3000, volume: 0.1 }]);
  } else if (cue.kind === BOOST_KINDS.SLIPSTREAM) {
    play(share, [{ sound: noise, filter: 'lowpass', frequency: 800, endFrequency: 2000, length: 0.6, attack: 0.1, volume: 0.2 }]);
  } else {
    whoosh(share, 0.35, 0.9);
  }
}

// The 2D race's finish: a rising jingle ending on a held high C for first place, a short two notes otherwise.
function playFinish(share, first) {
  if (first) {
    play(share, [
      { type: 'triangle', frequency: C5, length: 0.12, volume: 0.28 },
      { after: 0.12, type: 'triangle', frequency: E5, length: 0.12, volume: 0.28 },
      { after: 0.24, type: 'triangle', frequency: G5, length: 0.12, volume: 0.28 },
      { after: 0.36, type: 'triangle', frequency: C6, length: 0.5, sustain: 0.7, release: 0.3, volume: 0.3 },
    ]);
  } else {
    play(share, [
      { type: 'triangle', frequency: C5, length: 0.1, volume: 0.2 },
      { after: 0.1, type: 'triangle', frequency: E5, length: 0.25, volume: 0.2 },
    ]);
  }
}

function clang(share) {
  play(share, [
    { type: 'square', frequency: 1800, length: 0.15, filterFrequency: 5000, volume: 0.08 },
    { type: 'square', frequency: 2700, length: 0.12, filterFrequency: 5000, volume: 0.06 },
  ]);
}

// Plays `cue`, its volume times `share` (playerShare for a kart's cue, 1 for the race-wide ones).
export function playCue(cue, share) {
  RECIPES[cue.type](share, cue);
}
