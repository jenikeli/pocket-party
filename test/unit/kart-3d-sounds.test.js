// Unit tests for the 3D race's sounds: the snapshots and cue decisions (host/games/kart-3d/sound-snapshot.js,
// sound-cues.js) as plain functions, on a real race and on hand-made snapshots, and race-sounds.js against a
// fake Web Audio context, to check that the cues play and nothing is left running.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { createRace, stepRace, playerKart, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { soundSnapshot, knockedBy } from '../../host/games/kart-3d/sound-snapshot.js';
import { raceCues, playerShare } from '../../host/games/kart-3d/sound-cues.js';
import { createRaceSounds } from '../../host/games/kart-3d/race-sounds.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { addScaled } from '../../host/games/kart-3d/vector.js';
import { unlockAudio } from '../../host/audio/audio.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { KART_ITEMS } from '../../shared/protocol.js';
import { laneControls } from '../helpers/lane-driver.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);

// Steps `race` for `seconds`, collecting every cue heard.
function cuesOver(race, controlsFor, seconds) {
  const heard = [];
  let before = null;
  for (let step = 0; step < seconds * 60; step += 1) {
    stepRace(race, track, controlsFor, STEP);
    const after = soundSnapshot(race, track, race.karts.filter((kart) => kart.playerId !== null), before);
    heard.push(...raceCues(before, after));
    before = after;
  }
  return heard;
}

test('the countdown gives a beep for 3, 2 and 1 and a GO, once each, and a normal start nothing more', () => {
  const race = createRace(track, ['a'], 1, 150, 'normal');
  const heard = cuesOver(race, () => NEUTRAL_CONTROLS, 4);
  assert.deepEqual(heard, [
    { type: 'countdown', number: 3 },
    { type: 'countdown', number: 2 },
    { type: 'countdown', number: 1 },
    { type: 'go' },
  ]);
});

test('Go held from the start stalls, and pressed in the window is a rocket start with no second boost cue', () => {
  const stalled = createRace(track, ['a'], 1, 150, 'normal');
  // Only the start's cues: a rocket start can bump the kart into the CPU kart ahead.
  const startCues = (cues) => cues.filter((cue) => cue.playerId && cue.type !== 'hit');
  const stallCues = cuesOver(stalled, () => ({ ...NEUTRAL_CONTROLS, accelerate: true }), 3.5);
  assert.deepEqual(startCues(stallCues), [{ type: 'stall', playerId: 'a' }]);

  const rocket = createRace(track, ['a'], 1, 150, 'normal');
  // "2" shows at 1 s; the window is tuning.rocketFrom to rocketTo after it.
  const pressAt = 1 + (tuning.rocketFrom + tuning.rocketTo) / 2;
  const rocketCues = cuesOver(rocket, () => ({ ...NEUTRAL_CONTROLS, accelerate: rocket.time >= pressAt }), 3.5);
  assert.deepEqual(startCues(rocketCues), [{ type: 'rocketStart', playerId: 'a' }]);
});

test('a player driving a whole lap hears the finish, and the CPU karts make no cues', () => {
  const race = createRace(track, ['a'], 1, 150, 'normal');
  const controlsFor = (playerId) =>
    race.phase === RACE_PHASES.COUNTDOWN ? NEUTRAL_CONTROLS : { ...laneControls(track, playerKart(race, playerId), 0), drift: false };
  const heard = cuesOver(race, controlsFor, 150);
  assert.ok(heard.every((cue) => cue.playerId === undefined || cue.playerId === 'a'));
  assert.equal(heard.filter((cue) => cue.type === 'finish').length, 1);
});

// A kart snapshot standing still on the road, doing nothing, with `change` on top.
function kartState(change = {}) {
  return {
    lap: 1,
    onFinalLap: false,
    finished: false,
    first: false,
    startOutcome: 'normal',
    drifting: false,
    sparkLevel: 0,
    boostKind: null,
    boostLeft: 0,
    hopping: false,
    tricking: false,
    gliding: false,
    grounded: true,
    falling: false,
    rollLeft: 0,
    held: null,
    stuck: false,
    slideLeft: 0,
    speedShare: 0.8,
    spinTime: null,
    postCooldown: 0,
    knockedBy: 'wall',
    ...change,
  };
}

const RACE = {};
function snapshot(kart, change = {}) {
  return { race: RACE, results: false, countdown: null, teleportWarning: null, stickyLeft: 0, karts: new Map([['a', kart]]), ...change };
}

// The cues of player 'a' going from `was` to `now`, without the playerId.
function kartCuesBetween(was, now) {
  return raceCues(snapshot(kartState(was)), snapshot(kartState(now))).map(({ playerId, ...cue }) => cue);
}

test('drifting: the drift start, each mini-turbo level, and the boost with the level the drift had', () => {
  assert.deepEqual(kartCuesBetween({}, {}), []);
  assert.deepEqual(kartCuesBetween({}, { hopping: true }), [{ type: 'hop' }]);
  assert.deepEqual(kartCuesBetween({ hopping: true }, { drifting: true }), [{ type: 'driftStart' }]);
  assert.deepEqual(kartCuesBetween({ drifting: true }, { drifting: true, sparkLevel: 1 }), [{ type: 'miniTurboLevel', level: 1 }]);
  assert.deepEqual(kartCuesBetween({ drifting: true, sparkLevel: 2 }, { drifting: true, sparkLevel: 3 }), [{ type: 'miniTurboLevel', level: 3 }]);
  assert.deepEqual(kartCuesBetween({ drifting: true, sparkLevel: 3 }, { boostKind: BOOST_KINDS.MINI_TURBO, boostLeft: 2.5 }), [
    { type: 'boost', kind: BOOST_KINDS.MINI_TURBO, level: 3 },
  ]);
});

test('boosts: a new one or one topped up is a cue, one running down is not, and spins and rocket starts have their own', () => {
  const dash = { boostKind: BOOST_KINDS.DASH_PANEL, boostLeft: 1 };
  assert.deepEqual(kartCuesBetween({}, dash), [{ type: 'boost', kind: BOOST_KINDS.DASH_PANEL, level: 0 }]);
  assert.deepEqual(kartCuesBetween(dash, { ...dash, boostLeft: 0.98 }), []);
  assert.deepEqual(kartCuesBetween({ ...dash, boostLeft: 0.5 }, dash), [{ type: 'boost', kind: BOOST_KINDS.DASH_PANEL, level: 0 }]);
  assert.deepEqual(kartCuesBetween({}, { boostKind: BOOST_KINDS.ROCKET_START, boostLeft: 1 }), []);
  assert.deepEqual(kartCuesBetween({}, { boostKind: BOOST_KINDS.SPIN, boostLeft: 1, spinTime: 0 }), [{ type: 'spin', post: false }]);
  assert.deepEqual(kartCuesBetween({ spinTime: 0.3 }, { spinTime: 0, postCooldown: 0.6 }), [{ type: 'spin', post: true }]);
  assert.deepEqual(kartCuesBetween({ spinTime: 0.3 }, { spinTime: 0.32 }), []);
});

test('in the air: the trick, the glider opening and landing, and a fall', () => {
  assert.deepEqual(kartCuesBetween({}, { tricking: true, grounded: false }), [{ type: 'trick' }]);
  assert.deepEqual(kartCuesBetween({ grounded: false }, { gliding: true, grounded: false }), [{ type: 'glideStart' }]);
  assert.deepEqual(kartCuesBetween({ gliding: true, grounded: false }, { gliding: true, grounded: false }), []);
  assert.deepEqual(kartCuesBetween({ gliding: true, grounded: false }, {}), [{ type: 'glideLand' }]);
  assert.deepEqual(kartCuesBetween({ grounded: false }, { grounded: false, falling: true }), [{ type: 'fall' }]);
});

test('items: the pickup, the roulette ticking, the item landing and its use', () => {
  const roulette = 2;
  assert.deepEqual(kartCuesBetween({}, { rollLeft: roulette }), [{ type: 'itemPickup' }]);
  // Ticks every ROULETTE_TICK_SECONDS of the roll, not every step.
  let ticks = 0;
  for (let left = roulette; left > STEP; left -= STEP) {
    ticks += kartCuesBetween({ rollLeft: left }, { rollLeft: left - STEP }).filter((cue) => cue.type === 'rouletteTick').length;
  }
  assert.ok(ticks >= 23 && ticks <= 25, `${ticks} ticks in a 2 s roll`);
  assert.deepEqual(kartCuesBetween({ rollLeft: 0.01 }, { held: KART_ITEMS.JUMP }), [{ type: 'itemLanded', item: KART_ITEMS.JUMP }]);
  assert.deepEqual(kartCuesBetween({ held: KART_ITEMS.PUSH }, {}), [{ type: 'itemUsed', item: KART_ITEMS.PUSH }]);
});

test('hits: a loosened grip is a hit by what touched it, harder for more speed lost; a sticky wall holds without one', () => {
  const [bump] = kartCuesBetween({ slideLeft: 0.1 }, { slideLeft: 0.35, speedShare: 0.3, knockedBy: 'kart' });
  assert.equal(bump.type, 'hit');
  assert.equal(bump.by, 'kart');
  assert.ok(Math.abs(bump.strength - 0.9) < 1e-9, 'half the top speed lost');
  const [graze] = kartCuesBetween({ slideLeft: 0 }, { slideLeft: 0.35, speedShare: 0.8 });
  assert.equal(graze.by, 'wall');
  assert.ok(Math.abs(graze.strength - 0.4) < 1e-9, 'no speed lost is the softest hit');
  assert.deepEqual(kartCuesBetween({ slideLeft: 0.35 }, { slideLeft: 0.33 }), []);
  assert.deepEqual(kartCuesBetween({}, { stuck: true, speedShare: 0 }), [{ type: 'stuck' }]);
  assert.deepEqual(kartCuesBetween({ stuck: true, speedShare: 0 }, { slideLeft: 0.35, speedShare: 0.3 }), [], 'being let go is no hit');
});

test('laps: a new lap, the final lap, and the finish, first only for first place', () => {
  assert.deepEqual(kartCuesBetween({ lap: 1 }, { lap: 2 }), [{ type: 'lap' }]);
  assert.deepEqual(kartCuesBetween({ lap: 2 }, { lap: 3, onFinalLap: true }), [{ type: 'finalLap' }]);
  assert.deepEqual(kartCuesBetween({ lap: 3 }, { lap: 3, finished: true, first: true }), [{ type: 'finish', first: true }]);
  assert.deepEqual(kartCuesBetween({ lap: 3 }, { lap: 3, finished: true }), [{ type: 'finish', first: false }]);
});

test('race-wide cues have no player, and a new race or the results start afresh', () => {
  const quiet = snapshot(kartState());
  assert.deepEqual(raceCues(quiet, snapshot(kartState(), { teleportWarning: 1 })), [{ type: 'teleportWarning' }]);
  assert.deepEqual(raceCues(snapshot(kartState(), { teleportWarning: 0.02 }), snapshot(kartState(), { teleportWarning: 0 })), [{ type: 'teleportHop' }]);
  assert.deepEqual(raceCues(quiet, snapshot(kartState(), { stickyLeft: 6 })), [{ type: 'stickyWalls' }]);
  const lapped = snapshot(kartState({ lap: 2 }));
  assert.deepEqual(raceCues(snapshot(kartState(), { race: {} }), lapped), [], 'a snapshot of another race counts as none');
  assert.deepEqual(raceCues(snapshot(kartState(), { results: true }), lapped), [], 'nothing is heard behind the results');
  assert.deepEqual(raceCues(null, snapshot(kartState(), { countdown: 3 })), [{ type: 'countdown', number: 3 }]);
});

test('what touched a kart: another kart, a standing blocker, another kart\'s push, else a wall', () => {
  const race = createRace(track, ['a'], 1, 150, 'normal', [KART_ITEMS.BLOCKER]);
  const kart = playerKart(race, 'a');
  const others = race.karts.filter((other) => other !== kart);
  // Every other kart is sent far down the road, out of the way.
  others.forEach((other, index) => (other.position = addScaled(kart.position, kart.up, 100 + index * 10)));
  assert.equal(knockedBy(race, track, kart), 'wall');
  others[0].position = addScaled(kart.position, kart.forward, 2.1);
  assert.equal(knockedBy(race, track, kart), 'kart');
  others[0].position = addScaled(kart.position, kart.up, 100);
  race.items.objects.push({ id: 1, item: KART_ITEMS.BLOCKER, s: kart.s + 2.4, lateral: kart.lateral, left: 5 });
  assert.equal(knockedBy(race, track, kart), 'blocker');
  race.items.objects[0].left = 0;
  assert.equal(knockedBy(race, track, kart), 'wall', 'a blocker that has gone touches nothing');
  race.items.objects = [];
  others[0].item.effect = { item: KART_ITEMS.PUSH, left: 5 };
  // A push acts on the karts behind and beside the kart that used it.
  others[0].position = addScaled(kart.position, kart.forward, 4);
  others[0].distance = kart.distance + 4;
  assert.equal(knockedBy(race, track, kart), 'push');
});

// A stand-in for Web Audio that records the oscillators (and when each was stopped) and the levels the gains
// ramp to (an envelope's first ramp is its sound's volume). audio.js keeps the first context it is given, so the
// fake is made once and each test empties its lists.
let fakeAudio = null;
function installFakeAudio() {
  if (fakeAudio) {
    fakeAudio.oscillators.length = 0;
    fakeAudio.ramps.length = 0;
    return fakeAudio;
  }
  const oscillators = [];
  const ramps = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime: (value) => ramps.push(value),
    exponentialRampToValueAtTime() {},
    setTargetAtTime() {},
  });
  const node = (extra = {}) => ({ connect: (target) => target, start() {}, stop() {}, ...extra });
  const context = {
    currentTime: 1,
    sampleRate: 100,
    state: 'running',
    destination: {},
    resume: () => Promise.resolve(),
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
  globalThis.AudioContext = function AudioContext() {
    return context;
  };
  globalThis.document = { visibilityState: 'visible', addEventListener() {} };
  fakeAudio = { oscillators, ramps };
  unlockAudio();
  return fakeAudio;
}

test('no kart has an engine sound: a race with players leaves no sound running', () => {
  const { oscillators } = installFakeAudio();
  const sounds = createRaceSounds();
  const race = createRace(track, ['a', 'b', 'c'], 1, 150, 'normal', Object.values(KART_ITEMS));
  for (let step = 0; step < 120; step++) {
    stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
    sounds.update(race, track);
  }
  assert.ok(oscillators.every((oscillator) => oscillator.stoppedAt !== null), 'every tone has its end set');
  assert.equal(playerShare(4), 0.5);
});

test('a race with every item and four players runs through its sounds without failing', () => {
  installFakeAudio();
  const sounds = createRaceSounds();
  const race = createRace(track, ['a', 'b', 'c', 'd'], 1, 150, 'normal', Object.values(KART_ITEMS));
  const controlsFor = (playerId) =>
    race.phase === RACE_PHASES.COUNTDOWN ? NEUTRAL_CONTROLS : { ...laneControls(track, playerKart(race, playerId), 0), drift: false, item: race.time % 2 < 1 };
  for (let step = 0; step < 40 * 60; step += 1) {
    stepRace(race, track, controlsFor, STEP);
    sounds.update(race, track);
  }
});

// A race past its countdown, so no countdown cue plays, with the player karts given.
function racingRace(playerIds) {
  const race = createRace(track, playerIds, 1, 150, 'normal');
  race.phase = RACE_PHASES.RACING;
  race.time = 5;
  return race;
}

test('a kart grinding along a wall is heard once per 0.15 s, not every time its grip loosens', () => {
  const { oscillators } = installFakeAudio();
  const sounds = createRaceSounds();
  const race = racingRace(['a']);
  const kart = playerKart(race, 'a');
  const update = () => sounds.update(race, track);
  // Each step the grip loosens again (slideLeft rising from 0.1 to 0.35); counts the hit sounds' oscillators.
  const hitAfter = (seconds) => {
    kart.slideLeft = 0.1;
    update();
    const made = oscillators.length;
    race.time += seconds;
    kart.slideLeft = 0.35;
    update();
    return oscillators.length - made;
  };
  kart.slideLeft = 0.35;
  update();
  assert.equal(hitAfter(STEP), 1, 'the first hit is heard');
  assert.equal(hitAfter(STEP), 0, 'the next, a step later, is not');
  assert.equal(hitAfter(0.1), 0);
  assert.equal(hitAfter(0.2), 1, 'once 0.15 s have passed it is heard again');
});

test('a race-wide cue plays at full volume and a kart\'s cue at its player share', () => {
  const { ramps } = installFakeAudio();
  const sounds = createRaceSounds();
  const race = createRace(track, ['a', 'b', 'c', 'd'], 1, 150, 'normal');
  // The countdown's first beep (a square tone at 0.22) is race-wide.
  stepRace(race, track, () => NEUTRAL_CONTROLS, STEP);
  sounds.update(race, track);
  assert.deepEqual(ramps, [0.22]);
  // A hop (a sine at 0.15) is player 'a''s, so with four players it plays at half.
  ramps.length = 0;
  playerKart(race, 'a').hopping = true;
  sounds.update(race, track);
  assert.equal(ramps.length, 1);
  assert.ok(Math.abs(ramps[0] - 0.15 * playerShare(4)) < 1e-9, `${ramps[0]}`);
});

test('taking a snapshot leaves the race as it was, also on a hit that asks what touched the kart', () => {
  const race = racingRace(['a', 'b']);
  const playerKarts = race.karts.filter((kart) => kart.playerId !== null);
  const before = soundSnapshot(race, track, playerKarts, null);
  playerKart(race, 'a').slideLeft = 0.35;
  playerKart(race, 'b').item.effect = { item: KART_ITEMS.PUSH, left: 5 };
  const copy = structuredClone(race);
  const after = soundSnapshot(race, track, playerKarts, before);
  assert.equal(after.karts.get('a').knockedBy !== null, true, 'the hit asked what touched it');
  assert.equal(after.karts.get('b').knockedBy, null, 'a kart whose grip did not loosen is not asked');
  assert.deepEqual(race, copy);
});
