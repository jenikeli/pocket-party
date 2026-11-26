// How each of Saltline's cues sounds (host/games/fps/sound-cues.js decides which play), built from the synth's tones
// and noise (host/audio/synth.js), plus the two beds that run for a while: the rain and the flash-bang ringing.
// Every voice is (cue, at, out): `out` is the node it plays into, a distance bus for positional cues.
// Levels and timbres are by design, not tuned by ear.

import { tone, noise } from '../../audio/synth.js';

// A cue's own little mix path: volume by distance, a lowpass for the air, then the stereo pan, into `master`.
export function distanceBus(context, cue, master) {
  const gain = context.createGain();
  gain.gain.value = cue.gain;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = cue.cutoff;
  gain.connect(lowpass);
  if (!context.createStereoPanner) {
    lowpass.connect(master);
    return gain;
  }
  const panner = context.createStereoPanner();
  panner.pan.value = cue.pan;
  lowpass.connect(panner);
  panner.connect(master);
  return gain;
}

// Each gunshot is a thump (a low sine), a body (noise through a lowpass) and a crack (noise through a highpass).
const SHOTS = {
  rifle: { thump: [140, 50, 0.12, 0.5], body: [3500, 600, 0.12, 0.45], crack: [2500, 0.03, 0.3] },
  carbine: { thump: [190, 80, 0.09, 0.35], body: [5000, 900, 0.08, 0.4], crack: [3500, 0.025, 0.3] },
  shotgun: { thump: [90, 35, 0.35, 0.7], body: [2500, 200, 0.35, 0.6], crack: [1800, 0.05, 0.3] },
  sniper: { thump: [110, 40, 0.3, 0.5], body: [6000, 300, 0.5, 0.4], crack: [1800, 0.12, 0.5] },
  pistol: { thump: [260, 120, 0.06, 0.25], body: [4000, 800, 0.05, 0.3], crack: [2800, 0.04, 0.4] },
};

function fire({ weapon }, at, out) {
  if (weapon === 'knife') {
    noise({ filter: 'bandpass', frequency: 1500, endFrequency: 4000, q: 1.2, length: 0.18, attack: 0.06, volume: 0.15, start: at, output: out });
    return;
  }
  const { thump, body, crack } = SHOTS[weapon] ?? SHOTS.rifle;
  tone({ type: 'sine', frequency: thump[0], endFrequency: thump[1], length: thump[2], volume: thump[3], start: at, output: out });
  noise({ filter: 'lowpass', frequency: body[0], endFrequency: body[1], length: body[2], volume: body[3], start: at, output: out });
  noise({ filter: 'highpass', frequency: crack[0], length: crack[1], volume: crack[2], start: at, output: out });
  if (weapon === 'sniper') {
    noise({ filter: 'bandpass', frequency: 800, endFrequency: 300, length: 1.2, attack: 0.05, volume: 0.12, start: at + 0.1, output: out });
  }
}

function click(at, out, frequency, volume = 0.2) {
  tone({ type: 'square', frequency, length: 0.015, volume, start: at, output: out });
  noise({ filter: 'highpass', frequency: 3000, length: 0.02, volume: volume * 0.6, start: at, output: out });
}

// Magazine out, magazine in, bolt; a shotgun reload is one shell's tick.
function reload({ weapon }, at, out) {
  click(at, out, 900);
  if (weapon !== 'shotgun') {
    click(at + 0.45, out, 1300);
    noise({ filter: 'bandpass', frequency: 2000, length: 0.06, volume: 0.1, start: at + 0.8, output: out });
  }
}

function dryfire(_cue, at, out) {
  click(at, out, 1200, 0.15);
}

const IMPACTS = {
  metal: (at, out) => tone({ type: 'sine', frequency: 2400, endFrequency: 2200, length: 0.25, volume: 0.1, start: at, output: out }),
  steel: (at, out) => tone({ type: 'sine', frequency: 1800, endFrequency: 1700, length: 0.3, volume: 0.1, start: at, output: out }),
  concrete: (at, out) => {
    noise({ filter: 'highpass', frequency: 2500, length: 0.03, volume: 0.2, start: at, output: out });
    noise({ filter: 'bandpass', frequency: 1200, length: 0.15, volume: 0.1, start: at + 0.03, output: out });
  },
  wood: (at, out) => tone({ type: 'triangle', frequency: 260, endFrequency: 140, length: 0.07, volume: 0.25, start: at, output: out }),
  container: (at, out) => {
    tone({ type: 'square', frequency: 420, endFrequency: 380, length: 0.3, volume: 0.07, filterFrequency: 1500, start: at, output: out });
    tone({ type: 'sine', frequency: 640, length: 0.25, volume: 0.1, start: at, output: out });
  },
  flesh: (at, out) => noise({ filter: 'lowpass', frequency: 700, endFrequency: 200, length: 0.08, volume: 0.25, start: at, output: out }),
};

function impact({ mat }, at, out) {
  (IMPACTS[mat] ?? IMPACTS.concrete)(at, out);
}

// A soft wet-concrete step: a dull thud, a damp slap above it; louder when sprinting.
function step({ sprint }, at, out) {
  const level = sprint ? 1 : 0.55;
  noise({ filter: 'lowpass', frequency: 500, endFrequency: 200, length: 0.07, volume: 0.2 * level, start: at, output: out });
  noise({ filter: 'bandpass', frequency: 3500, q: 1.5, length: 0.025, volume: 0.06 * level, start: at, output: out });
}

function jump(_cue, at, out) {
  noise({ filter: 'lowpass', frequency: 900, length: 0.08, volume: 0.12, start: at, output: out });
}

function land(_cue, at, out) {
  tone({ type: 'sine', frequency: 100, endFrequency: 50, length: 0.1, volume: 0.25, start: at, output: out });
  noise({ filter: 'lowpass', frequency: 600, length: 0.06, volume: 0.15, start: at, output: out });
}

function grenadeThrow(_cue, at, out) {
  noise({ filter: 'bandpass', frequency: 400, endFrequency: 1500, q: 1, length: 0.3, attack: 0.12, volume: 0.2, start: at, output: out });
}

// A big low boom, a roar of noise, then debris pattering down.
function explode(_cue, at, out) {
  tone({ type: 'sine', frequency: 70, endFrequency: 25, length: 1.2, volume: 0.8, start: at, output: out });
  noise({ filter: 'lowpass', frequency: 900, endFrequency: 80, length: 1.4, volume: 0.7, start: at, output: out });
  for (let piece = 0; piece < 5; piece++) {
    noise({ filter: 'highpass', frequency: 1500 + piece * 400, length: 0.06, volume: 0.08, start: at + 0.25 + piece * 0.13, output: out });
  }
}

// The bang and a thin high whine; the long ringing is the player's own (the beds below).
function flash(_cue, at, out) {
  noise({ filter: 'highpass', frequency: 3000, length: 0.08, volume: 0.5, start: at, output: out });
  tone({ type: 'sine', frequency: 6000, length: 0.6, volume: 0.06, start: at, output: out });
}

function smoke(_cue, at, out) {
  noise({ filter: 'highpass', frequency: 3000, endFrequency: 1500, length: 0.7, attack: 0.1, volume: 0.12, start: at, output: out });
}

function respawn(_cue, at, out) {
  tone({ type: 'sine', frequency: 600, endFrequency: 900, length: 0.12, volume: 0.15, start: at, output: out });
  tone({ type: 'sine', frequency: 900, endFrequency: 1200, length: 0.15, volume: 0.15, start: at + 0.12, output: out });
}

function matchEnd(_cue, at, out) {
  [392, 523, 659].forEach((frequency, index) => {
    tone({ type: 'triangle', frequency, length: index === 2 ? 0.7 : 0.15, volume: 0.22, start: at + index * 0.15, output: out });
  });
}

// The shooter's own tick: a crisp 'dink', higher and brighter for a headshot.
function hitMarker({ head }, at, out) {
  tone({ type: 'sine', frequency: head ? 2600 : 1800, length: 0.05, volume: 0.18, start: at, output: out });
  tone({ type: 'sine', frequency: head ? 3900 : 2700, length: 0.04, volume: 0.1, start: at, output: out });
}

function killConfirm({ head }, at, out) {
  tone({ type: 'sine', frequency: 220, endFrequency: 110, length: 0.18, volume: 0.3, start: at, output: out });
  tone({ type: 'triangle', frequency: head ? 1100 : 880, length: 0.1, volume: 0.15, start: at + 0.05, output: out });
}

function thud(_cue, at, out) {
  tone({ type: 'sine', frequency: 80, endFrequency: 45, length: 0.12, volume: 0.3, start: at, output: out });
  noise({ filter: 'lowpass', frequency: 300, length: 0.08, volume: 0.2, start: at, output: out });
}

export const VOICES = {
  fire, reload, dryfire, impact, step, jump, land, throw: grenadeThrow, explode, flash, smoke, respawn, matchEnd, hitMarker, killConfirm, thud,
};

const FADE = 0.4; // seconds constant for a bed fading out
const RAIN_VOLUME = 0.05;

// Rain: a looping noise buffer between a highpass and a lowpass. Returns { stop(at) }.
export function startRain(context, master) {
  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const samples = buffer.getChannelData(0);
  for (let index = 0; index < samples.length; index++) {
    samples[index] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 600;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 6000;
  const gain = context.createGain();
  gain.gain.value = 0;
  gain.gain.setTargetAtTime(RAIN_VOLUME, context.currentTime, 1);
  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(master);
  source.start();
  return {
    stop(at) {
      gain.gain.setTargetAtTime(0, at, FADE);
      source.stop(at + FADE * 6);
    },
  };
}

// The ringing in a blinded player's ears: one high sine, its volume following the blind level. Returns
// { setLevel(level, at), stop(at) }. It plays straight into `output`, so the ducked mix does not muffle it.
export function startRinging(context, output) {
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.value = 5200;
  const gain = context.createGain();
  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(output);
  oscillator.start();
  return {
    setLevel(level, at) {
      gain.gain.setTargetAtTime(level * 0.1, at, 0.05);
    },
    stop(at) {
      gain.gain.setTargetAtTime(0, at, 0.1);
      oscillator.stop(at + 0.6);
    },
  };
}
