// How each of Spirefall's cues sounds (host/games/arena/sound-cues.js decides which play), built from the synth's
// tones and noise (host/audio/synth.js). One function per cue type. Team keys: Dawn major, Dusk minor.
// Volumes sit around 0.1 to 0.3 like the race's cues; the music (0.03 to 0.15) stays under them.

import { tone, noise } from '../../audio/synth.js';
import { noteFrequency } from '../../audio/notation.js';

const DAWN = 0;
const MAJOR = [0, 4, 7, 12];
const MINOR = [0, 3, 7, 12];

// A team's rising chord as MIDI notes: Dawn C major from C5, Dusk A minor from A4.
const teamChord = (team) => (team === DAWN ? MAJOR.map((step) => 72 + step) : MINOR.map((step) => 69 + step));
const hz = noteFrequency;

function play({ team }, at) {
  tone({ type: 'sine', frequency: 320, endFrequency: 120, length: 0.08, volume: 0.22, start: at });
  teamChord(team).slice(0, 3).forEach((note, index) => {
    tone({ type: 'triangle', frequency: hz(note), length: 0.25, volume: 0.14, start: at + 0.05 + index * 0.08 });
  });
}

function landed({ mass }, at) {
  const heavy = Math.min(mass, 25);
  tone({ type: 'sine', frequency: Math.max(150 - heavy * 4, 55), endFrequency: 40, length: 0.15 + heavy * 0.006, volume: 0.22, start: at });
  noise({ filter: 'highpass', frequency: 3000, length: 0.02, volume: 0.07, start: at });
}

function hit({ amount }, at) {
  const power = Math.min(amount, 300);
  noise({ filter: 'lowpass', frequency: 1200 + power * 8, endFrequency: 250, length: 0.09, volume: 0.08 + power / 2500, start: at });
}

function shot({ style }, at) {
  if (style === 'whoosh') {
    noise({ filter: 'bandpass', frequency: 900, endFrequency: 2400, q: 1.5, length: 0.3, attack: 0.1, volume: 0.1, start: at });
  } else if (style === 'tick') {
    tone({ type: 'square', frequency: 1800, length: 0.02, volume: 0.07, start: at });
    tone({ type: 'square', frequency: 1100, length: 0.03, volume: 0.07, start: at + 0.05 });
  } else {
    tone({ type: 'triangle', frequency: 660, endFrequency: 330, length: 0.12, volume: 0.12, start: at });
  }
}

function towerHit({ keep }, at) {
  tone({ type: 'triangle', frequency: keep ? 110 : 180, endFrequency: keep ? 60 : 90, length: 0.1, volume: 0.24, start: at });
  noise({ filter: 'lowpass', frequency: keep ? 500 : 900, length: 0.05, volume: 0.12, start: at });
}

function towerDown({ keep }, at) {
  [392, 330, 262, 196].forEach((frequency, index) => {
    const note = keep ? frequency / 2 : frequency;
    tone({ type: 'sawtooth', frequency: note, length: 0.3, sustain: 0.7, release: 0.15, volume: 0.12, filterFrequency: 1200, start: at + index * 0.18 });
  });
  noise({ filter: 'lowpass', frequency: 220, endFrequency: 70, length: 1.2, volume: 0.35, start: at + 0.1 });
  noise({ filter: 'highpass', frequency: 4000, length: 0.9, attack: 0.15, volume: 0.05, start: at + 0.4 });
}

function keepWake({ team }, at) {
  const [low, high] = team === DAWN ? [196, 262] : [185, 247];
  tone({ type: 'sawtooth', frequency: low, length: 0.35, sustain: 0.8, release: 0.1, volume: 0.15, filterFrequency: 900, start: at });
  tone({ type: 'sawtooth', frequency: high, length: 0.6, sustain: 0.8, release: 0.2, volume: 0.15, filterFrequency: 900, start: at + 0.4 });
}

function staticSpell(at) {
  for (let crackle = 0; crackle < 6; crackle++) {
    noise({ filter: 'highpass', frequency: 3000 + crackle * 700, length: 0.03, volume: 0.1, start: at + crackle * 0.06 });
  }
}

function rimeSpell(at) {
  [1568, 2093, 2637, 3136].forEach((frequency, index) => {
    tone({ type: 'sine', frequency, length: 0.5, volume: 0.06, start: at + index * 0.05 });
  });
}

function surgeSpell(at) {
  noise({ filter: 'bandpass', frequency: 300, endFrequency: 3000, q: 1, length: 0.6, attack: 0.4, volume: 0.2, start: at });
  tone({ type: 'sine', frequency: 200, endFrequency: 800, length: 0.6, attack: 0.4, volume: 0.1, start: at });
}

function flareBoom(at) {
  tone({ type: 'sine', frequency: 120, endFrequency: 35, length: 0.6, volume: 0.35, start: at });
  noise({ filter: 'lowpass', frequency: 800, endFrequency: 100, length: 0.6, volume: 0.25, start: at });
}

function mendSpell(at) {
  [72, 76, 79].forEach((note) => {
    tone({ type: 'triangle', frequency: hz(note), length: 0.7, attack: 0.05, sustain: 0.7, release: 0.2, volume: 0.1, start: at });
  });
}

const SPELLS = { static: staticSpell, rime: rimeSpell, surge: surgeSpell, flare: flareBoom, 'verdant-mend': mendSpell };

function spell({ card }, at) {
  SPELLS[card]?.(at);
}

function whistle(_cue, at) {
  tone({ type: 'sine', frequency: 1800, endFrequency: 700, length: 0.4, volume: 0.12, start: at });
}

// The elixir speed going up: a quick rising arpeggio, one note longer for x3, and a tick.
function elixir({ multiplier }, at) {
  const notes = [72, 76, 79, 84, 88].slice(0, multiplier + 1);
  notes.forEach((note, index) => {
    tone({ type: 'triangle', frequency: hz(note), length: 0.12, volume: 0.13, start: at + index * 0.06 });
  });
  noise({ filter: 'highpass', frequency: 6000, length: 0.03, volume: 0.06, start: at + notes.length * 0.06 });
}

// A low drone under four tense pulses.
function overtime(_cue, at) {
  tone({ type: 'sawtooth', frequency: 55, length: 2.5, attack: 0.5, sustain: 0.8, release: 0.5, volume: 0.15, filterFrequency: 200, start: at });
  for (let pulse = 0; pulse < 4; pulse++) {
    tone({ type: 'sine', frequency: 90, endFrequency: 50, length: 0.2, volume: 0.2, start: at + pulse * 0.5 });
  }
}

// The winner's fanfare in its team's key with a soft sigh under it; a draw gets a neutral open chime.
function result({ winner }, at) {
  if (winner === null) {
    [523, 784].forEach((frequency) => tone({ type: 'sine', frequency, length: 1.2, volume: 0.14, start: at }));
    return;
  }
  const notes = teamChord(winner).map((note) => note - 12);
  notes.forEach((note, index) => {
    const last = index === notes.length - 1;
    tone({ type: 'triangle', frequency: hz(note), length: last ? 0.8 : 0.14, sustain: last ? 0.7 : undefined, release: 0.3, volume: 0.22, start: at + index * 0.14 });
  });
  tone({ type: 'sine', frequency: 330, endFrequency: 220, length: 1, attack: 0.2, volume: 0.05, start: at + 0.6 });
}

export const VOICES = { play, landed, hit, shot, towerHit, towerDown, keepWake, spell, whistle, elixir, overtime, result };
