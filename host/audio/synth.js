// Small sound builders on Web Audio for the games' effects and the music: a one-shot tone and a one-shot burst
// of noise. Used by the race sounds and the music. All do nothing before the unlock or without Web Audio.

import { audioContext, effectsOutput } from './audio.js';

const SILENT = 0.0001; // exponential ramps cannot reach exactly 0
const NOISE_SECONDS = 1;

const noiseBuffers = new WeakMap(); // one white-noise buffer per context, made on first use

function whiteNoiseBuffer(context) {
  if (!noiseBuffers.has(context)) {
    const buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.random() * 2 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  return noiseBuffers.get(context);
}

const SETTLE_SECONDS = 0.05; // from the peak down to the held level

// Rises to `volume` over `attack`. Without `sustain` it then dies away exponentially until `length`: a plucked
// or struck sound. With `sustain` (0 to 1, a share of the volume) it settles to that level, holds it until
// `length`, then fades over `release`: a held note. Returns when the sound is silent. `start` is on the audio
// clock (context.currentTime is "now"); the music passes exact beats, so notes keep time however slow the
// frames are.
function shapeEnvelope(gain, { start, length, attack, volume, sustain, release }) {
  // A new gain node starts at 1, and the scheduled value below does not cover the very first sample, which
  // would play at full volume: a click on every note (seen in an offline render of the music, M10 task L).
  gain.gain.value = SILENT;
  gain.gain.setValueAtTime(SILENT, start);
  gain.gain.linearRampToValueAtTime(volume, start + attack);
  if (sustain === undefined) {
    gain.gain.exponentialRampToValueAtTime(SILENT, start + length);
    return start + length;
  }
  const held = Math.max(volume * sustain, SILENT);
  gain.gain.linearRampToValueAtTime(held, Math.min(start + attack + SETTLE_SECONDS, start + length));
  gain.gain.setValueAtTime(held, start + length);
  gain.gain.exponentialRampToValueAtTime(SILENT, start + length + release);
  return start + length + release;
}

// A pitched beep or note: options { type = 'square', frequency, endFrequency (slides there over the length,
// default none), length (seconds), attack = 0.005, volume = 0.3, sustain (0 to 1: hold that share of the volume
// for the whole length, then fade over release = 0.05; default none, the note just decays), filterFrequency (a
// lowpass for a duller sound, default none), start = now, output = effectsOutput() }.
export function tone(options) {
  const context = audioContext();
  if (!context) {
    return;
  }
  const { type = 'square', frequency, endFrequency, length, attack = 0.005, volume = 0.3 } = options;
  const { sustain, release = 0.05, filterFrequency } = options;
  const start = options.start ?? context.currentTime;
  const output = options.output ?? effectsOutput();

  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (endFrequency) {
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + length);
  }
  const gain = context.createGain();
  const end = shapeEnvelope(gain, { start, length, attack, volume, sustain, release });
  let last = oscillator;
  if (filterFrequency) {
    const filterNode = context.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.value = filterFrequency;
    last = last.connect(filterNode);
  }
  last.connect(gain).connect(output);
  oscillator.start(start);
  oscillator.stop(end);
}

// A burst of filtered noise (a hit, a whoosh, a hi-hat): options { filter = 'lowpass' | 'highpass' |
// 'bandpass', frequency (the filter's cutoff or centre), endFrequency (the cutoff slides there, default none),
// q = 1, length, attack = 0.002, volume = 0.3, start = now, output = effectsOutput() }.
export function noise(options) {
  const context = audioContext();
  if (!context) {
    return;
  }
  const { filter = 'lowpass', frequency, endFrequency, q = 1, length, attack = 0.002, volume = 0.3 } = options;
  const start = options.start ?? context.currentTime;
  const output = options.output ?? effectsOutput();

  const source = context.createBufferSource();
  source.buffer = whiteNoiseBuffer(context);
  source.loop = true;
  const filterNode = context.createBiquadFilter();
  filterNode.type = filter;
  filterNode.Q.value = q;
  filterNode.frequency.setValueAtTime(frequency, start);
  if (endFrequency) {
    filterNode.frequency.exponentialRampToValueAtTime(endFrequency, start + length);
  }
  const gain = context.createGain();
  shapeEnvelope(gain, { start, length, attack, volume });
  source.connect(filterNode).connect(gain).connect(output);
  source.start(start);
  source.stop(start + length);
}
