// Unit tests for Spirefall's sounds: the cue decisions (host/games/arena/sound-cues.js) as plain functions, the
// tune choice by phase, and sounds.js against a fake Web Audio context (no sound is left running, no throw).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchSnapshot, phaseCues, frameCues, MAX_CUES } from '../../host/games/arena/sound-cues.js';
import { createArenaSounds } from '../../host/games/arena/sounds.js';
import { tuneForArena } from '../../host/audio/music.js';
import { TUNES } from '../../host/audio/tunes/index.js';
import { unlockAudio } from '../../host/audio/audio.js';

const world = { units: [{ id: 'u1', cardId: 'pyre-mage', def: { faction: 'cinder' } }, { id: 'u2', cardId: 'kestrel', def: { faction: 'cog' } }], towers: [{ id: 't1', kind: 'keep' }, { id: 't2', kind: 'warden' }] };
const types = (cues) => cues.map((cue) => cue.type);

test('dropping a card is a play cue with the team; landing is pitched by the card mass', () => {
  const cues = frameCues(null, null, [{ type: 'play', team: 1 }, { type: 'landed', cardId: 'magma-brute' }], world);
  assert.deepEqual(cues, [{ type: 'play', team: 1 }, { type: 'landed', mass: 25 }]);
});

test('ranged shots sound by the shooter: mage whoosh, cog tick, otherwise pluck', () => {
  const style = (sourceId) => frameCues(null, null, [{ type: 'shot', sourceId }], world)[0].style;
  assert.deepEqual(['u1', 'u2', 't2', 'gone'].map(style), ['whoosh', 'tick', 'pluck', 'pluck']);
});

test('tower hits are a knock, lower for a Keep; other hits are bursts scaled by damage', () => {
  const [keep] = frameCues(null, null, [{ type: 'hit', towerId: 't1', amount: 50 }], world);
  const [ward] = frameCues(null, null, [{ type: 'hit', towerId: 't2', amount: 50 }], world);
  const [melee] = frameCues(null, null, [{ type: 'hit', towerId: null, amount: 120 }], world);
  assert.deepEqual([keep.keep, ward.keep], [true, false]);
  assert.deepEqual(melee, { type: 'hit', amount: 120 });
});

test('Flare whistles when cast and booms on landing; every spell has a landing cue; strikes and deaths are silent', () => {
  const events = [{ type: 'spellCast', cardId: 'flare' }, { type: 'spellCast', cardId: 'rime' }, { type: 'spell', cardId: 'flare', team: 0 }, { type: 'strike' }, { type: 'death' }, { type: 'blast' }];
  assert.deepEqual(types(frameCues(null, null, events, world)), ['whistle', 'spell']);
});

test('tower fall and the Keep waking are cues', () => {
  const cues = frameCues(null, null, [{ type: 'towerDown', kind: 'keep' }, { type: 'keepWake', team: 0 }], world);
  assert.deepEqual(cues, [{ type: 'towerDown', keep: true }, { type: 'keepWake', team: 0 }]);
});

test('a swarm is thinned: the hardest few hits stay, and a frame never goes over the cap', () => {
  const hits = Array.from({ length: 30 }, (_, index) => ({ type: 'hit', towerId: null, amount: index }));
  const cues = frameCues(null, null, hits, world);
  assert.deepEqual(cues.map((cue) => cue.amount), [29, 28, 27]);
  const mixed = [...hits, ...Array.from({ length: 20 }, () => ({ type: 'play', team: 0 })), ...Array.from({ length: 20 }, () => ({ type: 'towerDown', kind: 'warden' }))];
  const frame = frameCues(null, null, mixed, world);
  assert.equal(frame.length, MAX_CUES);
  assert.equal(types(frame).filter((type) => type === 'towerDown').length, 8, 'big moments come first');
});

const snap = (phase, multiplier, winner = null) => ({ phase, multiplier, winner });

test('phase cues: elixir rising, overtime starting, the result; nothing when nothing changes', () => {
  assert.deepEqual(phaseCues(null, snap('intro', 1)), []);
  assert.deepEqual(phaseCues(snap('regulation', 1), snap('regulation', 1)), []);
  assert.deepEqual(phaseCues(snap('regulation', 1), snap('regulation', 2)), [{ type: 'elixir', multiplier: 2 }]);
  assert.deepEqual(phaseCues(snap('regulation', 2), snap('overtime', 2)), [{ type: 'overtime' }]);
  assert.deepEqual(phaseCues(snap('overtime', 2), snap('overtime', 3)), [{ type: 'elixir', multiplier: 3 }]);
  assert.deepEqual(phaseCues(snap('overtime', 3), snap('over', 3, 1)), [{ type: 'result', winner: 1 }]);
  assert.deepEqual(phaseCues(snap('overtime', 3), snap('over', 3, null)), [{ type: 'result', winner: null }]);
  assert.deepEqual(phaseCues(snap('over', 3, 1), snap('over', 3, 1)), []);
});

test('matchSnapshot reads the phase, the speed and the winner', () => {
  assert.deepEqual(matchSnapshot({ phase: 'over', result: { winner: 0 } }, 2), snap('over', 2, 0));
  assert.deepEqual(matchSnapshot({ phase: 'intro', result: null }, 1), snap('intro', 1, null));
});

test('the tune follows the phase and the elixir speed, and every name exists', () => {
  assert.equal(tuneForArena(null, 1), null);
  assert.equal(tuneForArena({ phase: 'intro' }, 1), null);
  assert.equal(tuneForArena({ phase: 'over' }, 3), null);
  const named = [['regulation', 1, 'arena'], ['regulation', 2, 'arena-double'], ['overtime', 2, 'arena-overtime'], ['overtime', 3, 'arena-final']];
  for (const [phase, multiplier, name] of named) {
    assert.equal(tuneForArena({ phase }, multiplier), name);
    assert.ok(TUNES[name]);
  }
});

function installFakeAudio() {
  const oscillators = [];
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} });
  const node = (extra = {}) => ({ connect: (target) => target, start() {}, stop() {}, ...extra });
  const context = {
    currentTime: 1, sampleRate: 100, state: 'running', destination: {}, resume: () => Promise.resolve(),
    createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
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
  globalThis.AudioContext = function AudioContext() { return context; };
  globalThis.document = { visibilityState: 'visible', addEventListener() {} };
  return { oscillators, context };
}

test('sounds play every cue type without throwing, end every tone, and stop() silences it', () => {
  const { oscillators, context } = installFakeAudio();
  unlockAudio();
  const sounds = createArenaSounds();
  const match = { phase: 'regulation', clock: 100, result: null, world };
  sounds.handle([], match);
  const events = [
    { type: 'play', team: 0 }, { type: 'play', team: 1 }, { type: 'landed', cardId: 'kestrel' }, { type: 'hit', towerId: null, amount: 80 },
    { type: 'hit', towerId: 't1', amount: 80 }, { type: 'shot', sourceId: 'u1' }, { type: 'shot', sourceId: 'u2' }, { type: 'shot', sourceId: 't2' },
    { type: 'spellCast', cardId: 'flare' }, { type: 'keepWake', team: 1 }, { type: 'towerDown', kind: 'warden' },
  ];
  for (const [index, cardId] of ['static', 'rime', 'surge', 'flare', 'verdant-mend'].entries()) {
    context.currentTime += 1;
    sounds.handle(index === 0 ? events : [{ type: 'spell', cardId, team: 0 }], match);
  }
  for (const [phase, clock, winner] of [['regulation', 50, null], ['overtime', 50, null], ['overtime', 20, null], ['over', 0, 1], ['over', 0, 0]]) {
    context.currentTime += 1;
    sounds.handle([], { phase, clock, result: phase === 'over' ? { winner } : null, world });
  }
  context.currentTime += 1;
  sounds.handle([{ type: 'over', cardId: 'x' }], { ...match, phase: 'over', result: { winner: null } });
  assert.ok(oscillators.length > 30);
  assert.ok(oscillators.every((oscillator) => oscillator.stoppedAt !== null));
  const count = oscillators.length;
  sounds.stop();
  sounds.handle([{ type: 'play', team: 0 }], match);
  sounds.handle([{ type: 'play', team: 0 }], null);
  assert.equal(oscillators.length, count);
});
