// Unit tests for the 2D race's and the shell's sounds: the cue decisions (host/games/kart-2d/sound-cues.js,
// host/shell-sounds.js) as plain functions, and race-sounds.js against a fake Web Audio context, to check that
// every engine voice is stopped when the race ends or the game stops.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRace, stepRace, removeKart, RACE_PHASES } from '../../host/games/kart-2d/race.js';
import { soundSnapshot, raceCues, engineLevels } from '../../host/games/kart-2d/sound-cues.js';
import { MAX_SPEED } from '../../host/games/kart-2d/kart-physics.js';
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

test('an engine rises with speed, is quieter in a bigger field and is silent once the kart finished', () => {
  const standing = { velocityX: 0, velocityY: 0, finishTime: null };
  const flying = { velocityX: MAX_SPEED * 0.6, velocityY: MAX_SPEED * 0.8, finishTime: null };
  const idle = engineLevels(standing, 0, 1);
  const full = engineLevels(flying, 0, 1);
  assert.ok(full.frequency > idle.frequency);
  assert.ok(full.filterFrequency > idle.filterFrequency);
  assert.ok(full.volume > idle.volume && idle.volume > 0);
  assert.ok(engineLevels(flying, 0, 9).volume < full.volume);
  assert.ok(engineLevels(flying, 0, 9).volume * 9 < full.volume * 4, 'nine karts are not nine times as loud');
  assert.notEqual(engineLevels(flying, 1, 9).frequency, full.frequency, 'neighbouring karts are detuned');
  assert.equal(engineLevels({ ...flying, finishTime: 12 }, 0, 1).volume, 0);
  const faster = { velocityX: MAX_SPEED * 3, velocityY: 0, finishTime: null };
  assert.equal(engineLevels(faster, 0, 1).frequency, full.frequency, 'past top speed the pitch stops rising');
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

test('every engine voice is stopped when the race ends, a kart leaves, the race is dropped or the game stops', () => {
  const oscillators = installFakeAudio();
  unlockAudio();
  // The engines are the sawtooth oscillators; the cues' tones are square, triangle or sine.
  const engines = () => oscillators.filter((oscillator) => oscillator.type === 'sawtooth');
  const running = () => engines().filter((oscillator) => oscillator.stoppedAt === null);

  const sounds = createRaceSounds();
  const race = createRace(['a', 'b', 'c'], 1);
  stepRace(race, () => NEUTRAL_CONTROLS, DT);
  sounds.update(race);
  assert.equal(running().length, 3, 'one voice per kart from the countdown');
  sounds.update(race);
  assert.equal(engines().length, 3, 'a voice is made once, not every step');

  removeKart(race, 'c');
  sounds.update(race);
  assert.equal(running().length, 2, 'a kart that left has its voice stopped');

  race.karts[0].finishTime = 5;
  race.karts[1].finishTime = 6;
  race.phase = RACE_PHASES.RESULTS;
  sounds.update(race);
  assert.equal(running().length, 0, 'no engine runs on the results screen');

  const second = createRace(['a', 'b'], 1);
  sounds.update(second);
  assert.equal(running().length, 2);
  sounds.update(null);
  assert.equal(running().length, 0, 'going back to the setup screen stops them');

  sounds.update(second);
  sounds.stop();
  assert.equal(running().length, 0, 'stop() ends them for good');
});
