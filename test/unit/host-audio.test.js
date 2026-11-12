// Unit tests for the host's audio core: the volume clamping and storage (host/audio/audio.js) and the synth
// helpers (host/audio/synth.js), the latter against a fake Web Audio context that records what is built.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampVolume,
  readStoredVolume,
  storeVolume,
  getVolume,
  setVolume,
  unlockAudio,
  audioContext,
  effectsOutput,
} from '../../host/audio/audio.js';
import { tone, noise, voice } from '../../host/audio/synth.js';

function fakeStorage(initial = {}) {
  const values = { ...initial };
  return {
    getItem: (key) => values[key] ?? null,
    setItem: (key, value) => (values[key] = String(value)),
  };
}

test('a volume is kept between 0 and 1, and a stored value that is not a number is ignored', () => {
  assert.equal(clampVolume(0.4), 0.4);
  assert.equal(clampVolume('0.25'), 0.25);
  assert.equal(clampVolume(-3), 0);
  assert.equal(clampVolume(7), 1);
  assert.equal(clampVolume('loud'), null);
  assert.equal(clampVolume(null), null);
  assert.equal(clampVolume(NaN), null);
});

test('volumes are stored per kind and read back, with defaults when nothing valid is stored', () => {
  const storage = fakeStorage();
  assert.equal(readStoredVolume(storage, 'music'), 0.7);
  assert.equal(readStoredVolume(storage, 'effects'), 0.8);
  storeVolume(storage, 'music', 0.3);
  assert.equal(readStoredVolume(storage, 'music'), 0.3);
  assert.equal(readStoredVolume(storage, 'effects'), 0.8);
  assert.equal(readStoredVolume(fakeStorage({ 'pocket-party-volume-music': 'junk' }), 'music'), 0.7);
});

test('a storage that throws gives the default and does not stop saving', () => {
  const blocked = () => {
    throw new Error('blocked');
  };
  const broken = { getItem: blocked, setItem: blocked };
  assert.equal(readStoredVolume(broken, 'music'), 0.7);
  const warn = console.warn;
  console.warn = () => {};
  try {
    storeVolume(broken, 'music', 0.5);
  } finally {
    console.warn = warn;
  }
});

// A stand-in for Web Audio: every node it makes is recorded with the calls made on it.
function fakeAudioContext() {
  const made = [];
  const param = () => {
    const calls = [];
    const record = (name) => (...args) => calls.push([name, ...args]);
    return {
      calls,
      value: 0,
      setValueAtTime: record('set'),
      linearRampToValueAtTime: record('linear'),
      exponentialRampToValueAtTime: record('exponential'),
      setTargetAtTime: record('target'),
    };
  };
  const node = (kind, extra) => {
    const created = {
      kind,
      started: null,
      stopped: null,
      connect(target) {
        this.target = target;
        return target;
      },
      start(when) {
        this.started = when ?? 0;
      },
      stop(when) {
        this.stopped = when;
      },
      ...extra,
    };
    made.push(created);
    return created;
  };
  return {
    made,
    currentTime: 10,
    sampleRate: 100,
    state: 'running',
    resumes: 0,
    destination: { kind: 'destination' },
    resume() {
      this.resumes++;
      return Promise.resolve();
    },
    createBuffer: (channels, length) => ({ length, getChannelData: () => new Float32Array(length) }),
    createBufferSource: () => node('source', { loop: false }),
    createOscillator: () => node('oscillator', { frequency: param() }),
    createGain: () => node('gain', { gain: param() }),
    createBiquadFilter: () => node('filter', { frequency: param(), Q: { value: 0 } }),
    createDynamicsCompressor: () =>
      node('compressor', {
        threshold: { value: 0 },
        knee: { value: 0 },
        ratio: { value: 0 },
        attack: { value: 0 },
        release: { value: 0 },
      }),
  };
}

const fake = fakeAudioContext();
let savedGlobals;
const fakeDocument = {
  visibilityState: 'visible',
  listeners: [],
  addEventListener(name, listener) {
    this.listeners.push([name, listener]);
  },
};

beforeEach(() => {
  savedGlobals = {
    AudioContext: globalThis.AudioContext,
    localStorage: globalThis.localStorage,
    document: globalThis.document,
  };
  globalThis.document = fakeDocument;
  globalThis.AudioContext = function AudioContext() {
    return fake;
  };
  globalThis.localStorage = fakeStorage();
});

afterEach(() => {
  globalThis.AudioContext = savedGlobals.AudioContext;
  globalThis.localStorage = savedGlobals.localStorage;
  globalThis.document = savedGlobals.document;
});

// The module keeps its one context for the page's life, so the tests below run in order on the context the
// first unlock made.
test('without an unlock the helpers make no sound and do not fail', () => {
  assert.equal(audioContext(), null);
  assert.equal(effectsOutput(), null);
  tone({ frequency: 440, length: 0.1 });
  noise({ frequency: 1000, length: 0.1 });
  const quiet = voice({ frequency: 80, filterFrequency: 400 });
  quiet.update({ volume: 1 });
  quiet.stop();
  assert.equal(fake.made.length, 0);
});

test('unlocking makes the context once and the volumes apply to its gains', () => {
  unlockAudio();
  assert.equal(audioContext(), fake);
  const effects = effectsOutput();
  assert.equal(effects.gain.value, 0.8 ** 2);
  setVolume('effects', 0.5);
  assert.equal(getVolume('effects'), 0.5);
  assert.deepEqual(effects.gain.calls.at(-1), ['target', 0.25, 10, 0.02]);
  setVolume('effects', 5);
  assert.equal(getVolume('effects'), 1);
  unlockAudio();
  assert.equal(audioContext(), fake);
});

test('the limiter is set as a peak limiter, not left at the browser defaults', () => {
  const limiter = fake.made.find((created) => created.kind === 'compressor');
  assert.equal(limiter.threshold.value, -6);
  assert.equal(limiter.knee.value, 0);
  assert.equal(limiter.ratio.value, 20);
  assert.equal(limiter.attack.value, 0.003);
  assert.equal(limiter.release.value, 0.1);
});

test('the context is resumed when the page becomes visible while it is not running', () => {
  assert.equal(fakeDocument.listeners.length, 1, 'one listener, however often unlockAudio runs');
  const [name, listener] = fakeDocument.listeners[0];
  assert.equal(name, 'visibilitychange');
  const resumesBefore = fake.resumes;
  listener();
  assert.equal(fake.resumes, resumesBefore, 'running: nothing to do');
  fake.state = 'interrupted';
  fakeDocument.visibilityState = 'hidden';
  listener();
  assert.equal(fake.resumes, resumesBefore, 'hidden: wait');
  fakeDocument.visibilityState = 'visible';
  listener();
  assert.equal(fake.resumes, resumesBefore + 1);
  fake.state = 'running';
});

test('the volumes stay right when storage throws', () => {
  const blocked = () => {
    throw new Error('blocked');
  };
  globalThis.localStorage = { getItem: blocked, setItem: blocked };
  const warn = console.warn;
  console.warn = () => {};
  try {
    setVolume('music', 0.2);
  } finally {
    console.warn = warn;
  }
  assert.equal(getVolume('music'), 0.2);
});

test('a tone starts and stops on the audio clock, slides when asked, and goes to the effects output', () => {
  const before = fake.made.length;
  tone({ type: 'sine', frequency: 440, endFrequency: 880, length: 0.5, start: 12 });
  const [oscillator, gain] = fake.made.slice(before);
  assert.equal(oscillator.type, 'sine');
  assert.equal(oscillator.started, 12);
  assert.equal(oscillator.stopped, 12.5);
  assert.deepEqual(oscillator.frequency.calls, [
    ['set', 440, 12],
    ['exponential', 880, 12.5],
  ]);
  assert.equal(gain.target, effectsOutput());
});

test('a held note settles to its sustain level, holds it to the length, then fades over its release', () => {
  const before = fake.made.length;
  tone({ frequency: 220, length: 1, sustain: 0.5, release: 0.2, volume: 0.4, filterFrequency: 600, start: 20 });
  const made = fake.made.slice(before);
  const oscillator = made.find((created) => created.kind === 'oscillator');
  const gain = made.find((created) => created.kind === 'gain');
  const filter = made.find((created) => created.kind === 'filter');
  assert.equal(oscillator.stopped, 21.2);
  assert.equal(filter.type, 'lowpass');
  assert.equal(filter.frequency.value, 600);
  assert.equal(oscillator.target, filter);
  assert.equal(filter.target, gain);
  const [, peak, settle, hold, fade] = gain.gain.calls;
  assert.deepEqual(peak, ['linear', 0.4, 20.005]);
  assert.equal(settle[0], 'linear');
  assert.equal(settle[1], 0.2);
  assert.deepEqual(hold, ['set', 0.2, 21]);
  assert.deepEqual(fade, ['exponential', 0.0001, 21.2]);
});

test('a note without sustain keeps the decay shape and no filter', () => {
  const before = fake.made.length;
  tone({ frequency: 220, length: 0.4, start: 30 });
  const made = fake.made.slice(before);
  assert.equal(made.some((created) => created.kind === 'filter'), false);
  const oscillator = made.find((created) => created.kind === 'oscillator');
  assert.equal(oscillator.stopped, 30.4);
  assert.equal(made.find((created) => created.kind === 'gain').gain.calls.at(-1)[0], 'exponential');
});

test('a noise burst filters white noise and slides its cutoff', () => {
  const before = fake.made.length;
  noise({ filter: 'bandpass', frequency: 2000, endFrequency: 500, length: 0.2 });
  const made = fake.made.slice(before);
  const filter = made.find((created) => created.kind === 'filter');
  assert.equal(filter.type, 'bandpass');
  assert.deepEqual(filter.frequency.calls, [
    ['set', 2000, 10],
    ['exponential', 500, 10.2],
  ]);
  assert.equal(made.find((created) => created.kind === 'source').loop, true);
});

test('a voice is steered by update and fades out on stop', () => {
  const before = fake.made.length;
  const engine = voice({ frequency: 80, filterFrequency: 400, volume: 0.1 });
  const [oscillator, filter, gain] = fake.made.slice(before);
  engine.update({ frequency: 120, volume: 0.2 });
  assert.equal(oscillator.frequency.calls.length, 1);
  assert.equal(filter.frequency.calls.length, 0);
  assert.equal(gain.gain.calls.length, 1);
  engine.stop();
  assert.equal(oscillator.stopped, 10.3);
});
