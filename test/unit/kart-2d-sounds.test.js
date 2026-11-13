// Unit tests for the 2D race's and the shell's sounds: the cue decisions (host/games/kart-2d/sound-cues.js,
// host/shell-sounds.js) as plain functions, and race-sounds.js against a fake Web Audio context, to check that
// no sound is left running (the karts have no engine sound since M10b).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace } from '../../host/games/kart-2d/race.js';
import { soundSnapshot, raceCues } from '../../host/games/kart-2d/sound-cues.js';
import { createRaceSounds } from '../../host/games/kart-2d/race-sounds.js';
import { unlockAudio } from '../../host/audio/audio.js';
import { rosterCues, playRosterSounds, forgetRoster } from '../../host/shell-sounds.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';

const DT = 1 / 60;

function snapshotOf(countdown, finishedIds = []) {
  return { countdown, finishedIds };
}

test('the countdown gives a beep for 3, 2 and 1 and a GO, once each, and nothing in between', () => {
  const race = createRace(['a', 'b'], 1);
  const heard = [];
  let before = null;
  for (let step = 0; step < 6 * 60; step++) {
    stepRace(race, () => NEUTRAL_CONTROLS, DT);
    const after = soundSnapshot(race);
    heard.push(...raceCues(before, after));
    before = after;
  }
  assert.deepEqual(heard, [
    { type: 'countdown', number: 3 },
    { type: 'countdown', number: 2 },
    { type: 'countdown', number: 1 },
    { type: 'go' },
  ]);
});

test('a kart crossing the line is a finish cue, first for the first of the race only', () => {
  const running = snapshotOf(null);
  assert.deepEqual(raceCues(running, snapshotOf(null, ['a'])), [{ type: 'finish', playerId: 'a', first: true }]);
  assert.deepEqual(raceCues(snapshotOf(null, ['a']), snapshotOf(null, ['a', 'b'])), [
    { type: 'finish', playerId: 'b', first: false },
  ]);
  assert.deepEqual(raceCues(running, snapshotOf(null, ['a', 'b'])), [
    { type: 'finish', playerId: 'a', first: true },
    { type: 'finish', playerId: 'b', first: false },
  ]);
  assert.deepEqual(raceCues(snapshotOf(null, ['a']), snapshotOf(null, ['a'])), []);
});

test('joins and leaves of the roster are cues, and a first look makes none', () => {
  assert.deepEqual(rosterCues(null, ['a', 'b']), []);
  assert.deepEqual(rosterCues(['a'], ['a']), []);
  assert.deepEqual(rosterCues(['a'], ['a', 'b']), ['join']);
  assert.deepEqual(rosterCues(['a', 'b'], ['a']), ['leave']);
  assert.deepEqual(rosterCues(['a', 'b'], ['b', 'c']), ['join', 'leave']);
  assert.deepEqual(rosterCues(new Set(['a']), new Set(['a', 'b'])), ['join']);
});

test('the roster watcher runs through joins, leaves and a restart without failing before the unlock', () => {
  // Before the unlock the sounds are no-ops, so this checks only that the calls run and do not throw.
  forgetRoster();
  playRosterSounds(new Map([['a', {}]]));
  playRosterSounds(new Map([['a', {}], ['b', {}]]));
  playRosterSounds(new Map([['b', {}]]));
  forgetRoster();
  playRosterSounds(new Map());
});

// A stand-in for Web Audio that records the oscillators and when each was stopped.
function installFakeAudio() {
  const oscillators = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  });
  const node = (extra = {}) => ({
    connect: (target) => target,
    start() {},
    stop() {},
    ...extra,
  });
  const context = {
    currentTime: 1,
    sampleRate: 100,
    state: 'running',
    destination: {},
    resume: () => Promise.resolve(),
    createBuffer: () => ({}),
    createBufferSource: () => node(),
    createOscillator() {
      const oscillator = node({ type: '', frequency: param(), stoppedAt: null });
      oscillator.stop = (when) => (oscillator.stoppedAt = when);
      oscillators.push(oscillator);
      return oscillator;
    },
    createGain: () => node({ gain: param() }),
    createBiquadFilter: () => node({ frequency: param(), Q: {} }),
    createDynamicsCompressor: () => node({ threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} }),
  };
  globalThis.AudioContext = function AudioContext() {
    return context;
  };
  globalThis.document = { visibilityState: 'visible', addEventListener() {} };
  return oscillators;
}

test('a race plays its cues as short tones and leaves nothing running', () => {
  const oscillators = installFakeAudio();
  unlockAudio();
  const sounds = createRaceSounds();
  const race = createRace(['a', 'b', 'c'], 1);
  for (let step = 0; step < 6 * 60; step++) {
    stepRace(race, () => NEUTRAL_CONTROLS, DT);
    sounds.update(race);
  }
  assert.equal(oscillators.length, 4, 'three countdown beeps and GO');
  assert.ok(oscillators.every((oscillator) => oscillator.stoppedAt !== null), 'every tone has its end set');
  sounds.update(null);
  assert.equal(oscillators.length, 4, 'the setup screen makes no sound');
});
