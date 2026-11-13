// The shell's small sounds, played through host/audio/synth.js: a blip when a player joins a game's room and
// another when one leaves it (host/game-session.js, while the room is open), a click when a game is chosen and a
// rise on Play (host/game-picker.js).

import { tone } from './audio/synth.js';

// A join is a short sine blip sliding up, a leave the same blip sliding down. The click is a very short square
// tick; Play is a triangle sweep that climbs about two octaves in 0.3 s.
const SHELL_SOUNDS = {
  join: () => {
    tone({ type: 'sine', frequency: 600, endFrequency: 950, length: 0.14, attack: 0.01, volume: 0.22 });
  },
  leave: () => {
    tone({ type: 'sine', frequency: 700, endFrequency: 430, length: 0.18, attack: 0.01, volume: 0.2 });
  },
  click: () => {
    tone({ type: 'square', frequency: 1200, length: 0.035, volume: 0.1 });
  },
  play: () => {
    tone({ type: 'triangle', frequency: 260, endFrequency: 1100, length: 0.3, attack: 0.02, volume: 0.25 });
  },
};

export function playShellSound(name) {
  SHELL_SOUNDS[name]();
}
