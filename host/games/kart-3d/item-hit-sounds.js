// The 3D race's item and hit sounds (using an item, hitting a kart, a wall, a blocker or being pushed), and the
// small builders every cue shares (play, thud, squelch). All from tones and noise (host/audio/synth.js). Used by
// host/games/kart-3d/cue-sounds.js.

import { tone, noise } from '../../audio/synth.js';
import { audioContext } from '../../audio/audio.js';
import { KART_ITEMS } from '../../../shared/protocol.js';

// Plays sounds one after another: each is { after (seconds from now), sound: tone or noise, ...its options },
// every volume times `share`.
export function play(share, sounds) {
  const now = audioContext()?.currentTime ?? 0;
  for (const { after = 0, sound = tone, volume, ...options } of sounds) {
    sound({ ...options, volume: volume * share, start: now + after });
  }
}

export function thud(share, volume) {
  play(share, [
    { type: 'sine', frequency: 120, endFrequency: 50, length: 0.18, volume },
    { sound: noise, filter: 'lowpass', frequency: 400, length: 0.12, volume: volume * 0.6 },
  ]);
}

export function squelch(share) {
  play(share, [
    { type: 'triangle', frequency: 300, endFrequency: 120, length: 0.2, filterFrequency: 800, volume: 0.25 },
    { sound: noise, filter: 'bandpass', frequency: 900, q: 4, length: 0.15, volume: 0.2 },
  ]);
}

// Teleport and sticky walls are heard by everyone (teleportWarning, stickyWalls); using one is only a pop.
function itemPop(share) {
  play(share, [{ type: 'sine', frequency: 500, endFrequency: 900, length: 0.08, volume: 0.15 }]);
}

// Plays the sound of the kart using `item`.
export function playItemUsed(share, item) {
  (ITEM_RECIPES[item] ?? itemPop)(share);
}

// Plays the sound of hitting `by` ('kart', 'wall', 'blocker' or 'push'), `share` including the hit's strength.
export function playHit(share, by) {
  (HIT_RECIPES[by] ?? HIT_RECIPES.wall)(share);
}

const ITEM_RECIPES = {
  [KART_ITEMS.BLOCKER]: (share) => thud(share, 0.3),
  [KART_ITEMS.JUMP]: (share) => play(share, [{ type: 'sine', frequency: 200, endFrequency: 900, length: 0.3, volume: 0.25 }]),
  [KART_ITEMS.MAGNET]: (share) =>
    play(share, [{ type: 'square', frequency: 200, endFrequency: 400, length: 0.4, sustain: 0.6, release: 0.1, filterFrequency: 900, volume: 0.12 }]),
  [KART_ITEMS.PUSH]: (share) =>
    play(share, [
      { sound: noise, filter: 'bandpass', frequency: 1500, endFrequency: 300, length: 0.35, volume: 0.3 },
      { type: 'sine', frequency: 400, endFrequency: 150, length: 0.3, volume: 0.15 },
    ]),
};

// What the kart hit, louder for a harder hit (the caller folds the hit's strength into `share`).
const HIT_RECIPES = {
  kart: (share) =>
    play(share, [
      { sound: noise, filter: 'lowpass', frequency: 900, length: 0.1, volume: 0.3 },
      { type: 'square', frequency: 110, length: 0.08, filterFrequency: 600, volume: 0.2 },
    ]),
  wall: (share) =>
    play(share, [
      { sound: noise, filter: 'lowpass', frequency: 1500, length: 0.15, volume: 0.3 },
      { type: 'sine', frequency: 90, endFrequency: 60, length: 0.12, volume: 0.3 },
    ]),
  blocker: (share) => play(share, [{ sound: noise, filter: 'lowpass', frequency: 600, length: 0.2, volume: 0.6 }]),
  push: (share) => play(share, [{ sound: noise, filter: 'bandpass', frequency: 1200, endFrequency: 400, length: 0.25, volume: 0.35 }]),
};
