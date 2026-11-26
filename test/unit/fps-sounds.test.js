// Unit tests for Breakwater sounds: cue decisions (host/games/fps/sound-cues.js) as plain functions and
// sounds.js against a fake Web Audio context (no sound is left running, no throw, the rain starts and stops).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nearestListener, distanceGain, panFor, frameCues, MAX_CUES } from '../../host/games/fps/sound-cues.js';
import { createFpsSounds } from '../../host/games/fps/sounds.js';
import { unlockAudio } from '../../host/audio/audio.js';

const origin = { x: 0, y: 0, z: 0, yaw: 0 };
const humans = ['p1'];
const types = (cues) => cues.map((cue) => cue.type);
const fireAt = (x, z, weapon = 'rifle') => ({ type: 'fire', pid: 'bot0', weapon, x, y: 0, z, loud: true });

test('the nearest listener wins', () => {
  const listeners = [{ x: 50, y: 0, z: 0, yaw: 0 }, { x: 4, y: 0, z: 3, yaw: 0 }];
  const near = nearestListener(listeners, { x: 0, y: 0, z: 0 });
  assert.equal(near.listener, listeners[1]);
  assert.equal(near.distance, 5);
  assert.equal(nearestListener([], { x: 0, y: 0, z: 0 }), null);
});

test('distance gain falls off like 1/(1+d/10) and is zero beyond the range', () => {
  assert.equal(distanceGain(0), 1);
  assert.ok(Math.abs(distanceGain(10) - 0.5) < 1e-9);
  assert.ok(distanceGain(60) < distanceGain(30));
  assert.equal(distanceGain(70), 0);
  assert.ok(distanceGain(100, 140) > 0, 'a far range carries further');
});

test('pan: right of the listener is positive, left negative, and a turned listener swaps them', () => {
  assert.ok(panFor(origin, { x: 10, z: 0 }, 10) > 0.8);
  assert.ok(panFor(origin, { x: -10, z: 0 }, 10) < -0.8);
  assert.equal(panFor(origin, { x: 0, z: -10 }, 10), 0, 'straight ahead is centre');
  assert.equal(panFor(origin, { x: 0.5, z: 0 }, 0.5), 0, 'very close is centre');
  const facingPlusX = { ...origin, yaw: -Math.PI / 2 }; // forward (1, 0), so +z is on its right
  assert.ok(panFor(facingPlusX, { x: 0, z: 10 }, 10) > 0.8);
  assert.ok(panFor(facingPlusX, { x: 0, z: -10 }, 10) < -0.8);
});

test('a shot is a cue with distance gain, pan and a duller lowpass when far; out of earshot is silent', () => {
  const [close] = frameCues([fireAt(5, 0)], [origin], humans);
  const [far] = frameCues([fireAt(-40, 0)], [origin], humans);
  assert.equal(close.weapon, 'rifle');
  assert.ok(close.gain > far.gain && close.pan > 0 && far.pan < 0 && close.cutoff > far.cutoff);
  assert.deepEqual(frameCues([fireAt(200, 0)], [origin], humans), []);
  assert.equal(frameCues([fireAt(100, 0, 'sniper')], [origin], humans).length, 1, 'the sniper carries');
  assert.deepEqual(frameCues([fireAt(5, 0)], [], humans), [], 'no listeners, no positional cues');
});

test('the nearest of several listeners sets the pan', () => {
  const listeners = [{ x: 0, y: 0, z: 0, yaw: 0 }, { x: 30, y: 0, z: 0, yaw: 0 }];
  const [cue] = frameCues([fireAt(28, 0)], listeners, humans);
  assert.ok(cue.pan < 0, 'the source is to the left of the listener at x 30');
});

test('which events make which cues; unknown and effects-only events are silent', () => {
  const at = { x: 3, y: 0, z: 0 };
  const events = [
    { type: 'impact', mat: 'wood', ...at }, { type: 'reload', weapon: 'rifle', ...at }, { type: 'dryfire', ...at }, { type: 'jump', ...at },
    { type: 'land', ...at }, { type: 'throw', kind: 'smoke', ...at }, { type: 'explode', radius: 5, ...at }, { type: 'flash', ...at },
    { type: 'smoke', ...at }, { type: 'respawn', pid: 'p1', ...at }, { type: 'shot' }, { type: 'nonsense' },
  ];
  const made = types(frameCues(events, [origin], humans));
  assert.deepEqual([...made].sort(), ['dryfire', 'explode', 'flash', 'impact', 'jump', 'land', 'reload', 'respawn', 'smoke', 'throw']);
  assert.equal(made[0], 'explode', 'big moments come first');
  assert.deepEqual(types(frameCues([{ type: 'matchEnd', winner: 'p1', reason: 'score' }], [origin], humans)), ['matchEnd']);
});

test('hit markers and kill confirms are for the people playing only', () => {
  const hit = (pid, victim, head) => ({ type: 'hit', pid, victim, amount: 20, head, x: 0, y: 0, z: 0 });
  assert.deepEqual(frameCues([hit('p1', 'bot0', true)], [origin], humans), [{ type: 'hitMarker', head: true }]);
  assert.deepEqual(frameCues([hit('p1', 'bot0', false)], [origin], humans), [{ type: 'hitMarker', head: false }]);
  assert.deepEqual(frameCues([hit('bot1', 'bot0', false)], [origin], humans), []);
  assert.deepEqual(frameCues([hit(null, 'p1', false)], [origin], humans), [{ type: 'thud' }]);
  assert.deepEqual(types(frameCues([{ type: 'kill', killer: 'p1', victim: 'bot0', weapon: 'rifle', head: false }], [origin], humans)), ['killConfirm']);
  assert.deepEqual(frameCues([{ type: 'kill', killer: 'bot1', victim: 'p1', weapon: 'rifle', head: false }], [origin], humans), []);
});

test('a firefight is thinned: the loudest few of a kind stay, steps get quieter, and a frame never goes over the cap', () => {
  const shots = Array.from({ length: 30 }, (_, index) => fireAt(index + 1, 0));
  const cues = frameCues(shots, [origin], humans);
  assert.equal(cues.length, 5);
  assert.deepEqual(cues.map((cue) => Math.round(cue.gain * 1000)), [...cues.map((cue) => Math.round(cue.gain * 1000))].sort((a, b) => b - a));
  const steps = (count) => frameCues(Array.from({ length: count }, () => ({ type: 'step', pid: 'bot0', x: 2, y: 0, z: 0, sprint: false })), [origin], humans);
  assert.equal(steps(20).length, 2);
  assert.ok(steps(20)[0].gain < steps(1)[0].gain, 'a crowd of steps is quieter each');
  const mixed = [...shots, ...Array.from({ length: 10 }, (_, index) => ({ type: 'impact', mat: 'steel', x: index, y: 0, z: 0 })),
    ...Array.from({ length: 10 }, () => ({ type: 'explode', x: 1, y: 0, z: 1, radius: 5 })), { type: 'reload', weapon: 'rifle', x: 1, y: 0, z: 1 },
    { type: 'dryfire', x: 1, y: 0, z: 1 }, { type: 'jump', x: 1, y: 0, z: 1 }, { type: 'land', x: 1, y: 0, z: 1 }, { type: 'matchEnd' }];
  const frame = frameCues(mixed, [origin], humans);
  assert.equal(frame.length, MAX_CUES);
  assert.equal(types(frame).filter((type) => type === 'explode').length, 3);
});

function installFakeAudio() {
  const oscillators = [];
  const sources = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = (extra = {}) => ({ connect: (target) => target, start() {}, stop() {}, ...extra });
  const context = {
    currentTime: 1, sampleRate: 100, state: 'running', destination: {}, resume: () => Promise.resolve(),
    createBuffer: () => ({ getChannelData: () => new Float32Array(200) }),
    createBufferSource() {
      const source = node({ stoppedAt: null });
      source.stop = (when) => (source.stoppedAt = when);
      sources.push(source);
      return source;
    },
    createOscillator() {
      const oscillator = node({ type: '', frequency: param(), stoppedAt: null });
      oscillator.stop = (when) => (oscillator.stoppedAt = when);
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => node({ gain: param() }),
    createStereoPanner: () => node({ pan: { value: 0 } }),
    createBiquadFilter: () => node({ frequency: param(), Q: {} }),
    createDynamicsCompressor: () => node({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }),
  };
  globalThis.AudioContext = function AudioContext() { return context; };
  globalThis.document = { visibilityState: 'visible', addEventListener() {} };
  return { oscillators, sources, context };
}

test('sounds play every cue without throwing, end every tone, run the rain, ring when blinded, and stop() fades it all', () => {
  const { oscillators, sources, context } = installFakeAudio();
  const sounds = createFpsSounds();
  const at = { x: 4, y: 0, z: -3 };
  sounds.handle([fireAt(1, 1)], [origin], humans); // before the unlock: nothing
  assert.equal(oscillators.length + sources.length, 0);
  unlockAudio();
  const unlockSources = sources.length;
  sounds.handle([], [origin], humans);
  assert.equal(sources.length, unlockSources + 1, 'the rain bed starts on the first handle()');
  const rain = sources[sources.length - 1];
  const rounds = [
    ['rifle', 'carbine', 'shotgun', 'sniper', 'pistol', 'knife'].map((weapon) => fireAt(2, -2, weapon)),
    ['container', 'concrete', 'steel', 'metal', 'wood', 'flesh', 'unknown'].map((mat) => ({ type: 'impact', mat, ...at })),
    [{ type: 'step', sprint: true, ...at }, { type: 'jump', ...at }, { type: 'land', ...at }, { type: 'dryfire', ...at }],
    [{ type: 'reload', weapon: 'rifle', ...at }, { type: 'reload', weapon: 'shotgun', ...at }, { type: 'throw', kind: 'frag', ...at }],
    [{ type: 'explode', radius: 6, ...at }, { type: 'flash', ...at }, { type: 'smoke', radius: 4, seconds: 8, ...at }],
    [{ type: 'respawn', pid: 'p1', ...at }, { type: 'hit', pid: 'p1', victim: 'p2', head: true, amount: 30, ...at }, { type: 'hit', pid: null, victim: 'p1', amount: 10, head: false, ...at }],
    [{ type: 'kill', killer: 'p1', victim: 'bot0', weapon: 'rifle', head: false, ...at }, { type: 'matchEnd', winner: 'p1', reason: 'score' }],
  ];
  for (const events of rounds) {
    context.currentTime += 1;
    sounds.handle(events, [origin, { x: 20, y: 0, z: 0, yaw: 1 }], ['p1', 'p2']);
  }
  const ringingBefore = oscillators.length;
  sounds.setPlayerFlash(0.9);
  context.currentTime += 1;
  sounds.handle([], [origin], humans);
  assert.equal(oscillators.length, ringingBefore + 1, 'a blinded person gets the ringing');
  sounds.setPlayerFlash(0);
  context.currentTime += 1;
  sounds.handle([], [origin], humans);
  assert.ok(oscillators.length + sources.length > 40);
  assert.ok(oscillators.every((oscillator) => oscillator.stoppedAt !== null), 'every tone and the ringing end');
  assert.equal(rain.stoppedAt, null, 'the rain runs until stop()');
  const count = oscillators.length;
  sounds.stop();
  assert.ok(rain.stoppedAt > context.currentTime, 'stop() fades the rain and stops it');
  sounds.handle([fireAt(1, 1)], [origin], humans);
  assert.equal(oscillators.length, count);
});

test('a repeat inside its minimum gap is skipped, a different weapon is not', () => {
  const { oscillators, sources, context } = installFakeAudio();
  unlockAudio();
  const sounds = createFpsSounds();
  sounds.handle([], [origin], humans);
  const nodes = () => oscillators.length + sources.length;
  const before = nodes();
  sounds.handle([fireAt(2, 0, 'sniper')], [origin], humans);
  const one = nodes() - before;
  sounds.handle([fireAt(2, 0, 'sniper')], [origin], humans);
  assert.equal(nodes() - before, one, 'same weapon, same instant');
  sounds.handle([fireAt(2, 0, 'pistol')], [origin], humans);
  assert.ok(nodes() - before > one);
  context.currentTime += 1;
  sounds.handle([fireAt(2, 0, 'sniper')], [origin], humans);
  assert.ok(nodes() - before > one * 2);
});
