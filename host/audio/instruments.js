// How each of the music's voices sounds: the lead, the bass, the chords (held, arpeggio or offbeat stabs) and
// three drums, all built from the synth's tones and noise (host/audio/synth.js). Used by the sequencer
// (host/audio/music.js), which passes each event's exact start on the audio clock.
// The volumes sit a little under the effects' (0.2 to 0.3 for a beep), so the
// race's cues stay on top; the music's own slider scales them all.

import { tone, noise } from './synth.js';
import { noteFrequency } from './notation.js';

// Notes are cut a little short of their length so repeated notes are heard as separate notes.
const NOTE_GAP = 0.9;

// Builds the sound of one event. `sounds.lead` is the lead's wave ('triangle' soft, 'square' bright,
// 'sawtooth' buzzy); a square or sawtooth is put through a lowpass so it is not harsh.
export function playEvent(event, start, sounds, output) {
  const { voice, notes, seconds } = event;
  if (voice === 'lead') {
    const wave = sounds.lead;
    tone({
      type: wave,
      frequency: noteFrequency(notes[0]),
      length: seconds * NOTE_GAP,
      attack: 0.01,
      sustain: 0.6,
      release: 0.08,
      volume: wave === 'triangle' ? 0.08 : 0.05,
      filterFrequency: wave === 'triangle' ? undefined : 2600,
      start,
      output,
    });
  } else if (voice === 'bass') {
    // A lowpassed square: a triangle this low is nearly lost on a tablet's small speakers.
    tone({ type: 'square', frequency: noteFrequency(notes[0]), length: seconds * 0.85, attack: 0.005, sustain: 0.7, release: 0.06, volume: 0.07, filterFrequency: 500, start, output });
  } else if (voice === 'pad') {
    for (const note of notes) {
      tone({ type: 'triangle', frequency: noteFrequency(note), length: seconds * 0.95, attack: 0.08, sustain: 0.8, release: 0.2, volume: 0.025, start, output });
    }
  } else if (voice === 'arp') {
    tone({ type: 'square', frequency: noteFrequency(notes[0]), length: seconds, attack: 0.003, volume: 0.03, filterFrequency: 1800, start, output });
  } else if (voice === 'stab') {
    for (const note of notes) {
      tone({ type: 'square', frequency: noteFrequency(note), length: seconds, attack: 0.003, volume: 0.02, filterFrequency: 1600, start, output });
    }
  } else {
    playDrum(voice, start, output);
  }
}

// The kick is a sine falling fast (a thump), the snare a burst of mid noise over a short low tone, the hat a
// tick of high noise.
function playDrum(drum, start, output) {
  if (drum === 'kick') {
    tone({ type: 'sine', frequency: 140, endFrequency: 45, length: 0.16, attack: 0.002, volume: 0.15, start, output });
  } else if (drum === 'snare') {
    noise({ filter: 'bandpass', frequency: 1800, q: 0.7, length: 0.13, volume: 0.07, start, output });
    tone({ type: 'triangle', frequency: 190, length: 0.06, volume: 0.03, start, output });
  } else {
    noise({ filter: 'highpass', frequency: 7000, length: 0.035, volume: 0.03, start, output });
  }
}
