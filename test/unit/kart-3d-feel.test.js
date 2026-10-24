// Unit tests for the 3D race's feel pass (M7a): the tuned numbers (host/games/kart-3d/tuning.js) and the rules
// they changed: wall hits that cost speed and bounce, so riding the wall is never the fast line; bumps that
// throw karts apart; the higher hop; and the body's eased lean and trick roll (kart-body.js).

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { createKart, stepKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { nextSpeed, steeringRate, steerForRate } from '../../host/games/kart-3d/kart-driving.js';
import { bumpKarts } from '../../host/games/kart-3d/kart-bumps.js';
import { springToward, startTrickRoll, moveBody } from '../../host/games/kart-3d/kart-body.js';
import { dummyControls } from '../../host/games/kart-3d/dummy-driver.js';
import { TUNABLES, tuning, setTuning, resetTuning, describeTuning } from '../../host/games/kart-3d/tuning.js';
import { scale, addScaled, subtract, cross, dot } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const NEUTRAL = Object.freeze({ steer: 0, accelerate: false, brake: false, drift: false });
const testTrack = buildTrack(TEST_TRACK);
// A wide flat oval: straights 200 long, ends of radius 60, the walls 20 from the middle.
const oval = buildTrack({
  halfWidth: 20,
  startLine: 0,
  pieces: [{ straight: 200 }, { turn: 180, radius: 60 }, { straight: 200 }, { turn: 180, radius: 60 }],
});
const HAIRPIN_START = 284.5;
const HAIRPIN_END = 347.3;

// Tests below change tuned values; every test starts from the defaults.
afterEach(resetTuning);

// The kart at distance `s` and `lateral`, already moving along the road at `speed`.
function movingKart(track, s, lateral, speed) {
  const kart = createKart(track, s, lateral);
  kart.velocity = scale(kart.forward, speed);
  return kart;
}

function rightOf(kart) {
  return cross(kart.forward, kart.up);
}

test('tuning: every default sits inside its slider, keys are unique, values are clamped, and Copy marks changes', () => {
  assert.equal(new Set(TUNABLES.map((tunable) => tunable.key)).size, TUNABLES.length);
  for (const { key, min, max, value } of TUNABLES) {
    assert.ok(value >= min && value <= max, `${key} = ${value} outside ${min}-${max}`);
  }
  setTuning('topSpeed', 1000);
  assert.equal(tuning.topSpeed, 48, 'kept to the slider\'s top');
  setTuning('hopHeight', 0.8);
  assert.throws(() => setTuning('topSpeeed', 30), /No tuned number is called topSpeeed/);
  const text = describeTuning();
  assert.match(text, /^3D race tuning/);
  const defaults = Object.fromEntries(TUNABLES.map((tunable) => [tunable.key, tunable.value]));
  assert.ok(text.includes(`\ntopSpeed = 48   (default ${defaults.topSpeed})\n`));
  assert.ok(text.includes(`\nhopHeight = 0.8   (default ${defaults.hopHeight})\n`));
  assert.match(text, /\ngrip = 8\n/, 'unchanged values carry no default');
  assert.equal(text.split('\n').length, TUNABLES.length + 1);
  resetTuning();
  assert.equal(tuning.topSpeed, defaults.topSpeed);
});

test('the rules read the live values: a higher top speed takes effect at once', () => {
  const go = { ...NEUTRAL, accelerate: true };
  let speed = 0;
  setTuning('topSpeed', 36);
  for (let frame = 0; frame < 3000; frame += 1) {
    speed = nextSpeed(speed, go, false, STEP);
  }
  assert.ok(speed > 35.9 && speed <= 36, `reached ${speed}`);
});

test('steerForRate finds the stick for a turn rate on the curve', () => {
  for (const steer of [-0.9, -0.3, 0.05, 0.5, 0.99]) {
    assert.ok(Math.abs(steerForRate(steeringRate(steer)) - steer) < 1e-6, `steer ${steer}`);
  }
  assert.equal(steerForRate(steeringRate(1) * 2), 1, 'more than a full turn asks for the full stick');
});

// One step into the oval's right-hand wall at `degrees` from the road's direction, from just inside it.
function hitWallAt(degrees, speed = 20) {
  const kart = createKart(oval, 40, 18.99);
  const angle = (degrees * Math.PI) / 180;
  kart.velocity = addScaled(scale(kart.forward, speed * Math.cos(angle)), rightOf(kart), speed * Math.sin(angle));
  const alongBefore = speed * Math.cos(angle);
  stepKart(oval, kart, NEUTRAL, STEP);
  return { kart, kept: dot(kart.velocity, kart.forward) / alongBefore, away: -dot(kart.velocity, rightOf(kart)) };
}

test('a wall hit costs speed by how square it was, and bounces the kart off with loose grip', () => {
  const glancing = hitWallAt(15);
  const square = hitWallAt(60);
  assert.ok(glancing.kept < 1 - tuning.wallGrazeLoss + 0.05, `a glancing hit kept ${glancing.kept} of the speed along the wall`);
  assert.ok(square.kept < glancing.kept - 0.2, `a square hit kept ${square.kept}, a glancing one ${glancing.kept}`);
  for (const { kart, away } of [glancing, square]) {
    // The slide grip took only a little of the bounce in the step.
    assert.ok(away > tuning.wallBounceSpeed * 0.9, `bounced away at ${away}`);
    assert.ok(kart.slideLeft > 0, 'grip is loose after a hit');
  }
  assert.ok(square.away > glancing.away, 'a harder hit bounces harder');
});

test('resting against the wall only scrapes: no hit loss, no bounce', () => {
  const kart = createKart(oval, 40, 18.99);
  kart.velocity = addScaled(scale(kart.forward, 20), rightOf(kart), 0.5);
  stepKart(oval, kart, NEUTRAL, STEP);
  assert.equal(kart.slideLeft, 0);
  assert.ok(forwardSpeed(kart) > 20 * 0.95, `kept ${forwardSpeed(kart)}`);
});

// Seconds from 258 on the test track (top speed) to 40 past the hairpin's end.
function timeThroughHairpin(controlsFor) {
  const kart = movingKart(testTrack, 258, 0, tuning.topSpeed);
  for (let frame = 0; frame < 20 * 60; frame += 1) {
    stepKart(testTrack, kart, controlsFor(kart), STEP);
    if (kart.s >= HAIRPIN_END + 40 && kart.s < HAIRPIN_END + 90) {
      return (frame + 1) / 60;
    }
  }
  return Infinity;
}

test('riding the wall round the hairpin is slower than slowing down for it', () => {
  // The dummy driver brakes for the hairpin and drives round it in the middle lane, off the walls.
  const clean = timeThroughHairpin((kart) => dummyControls(testTrack, kart, 0));
  const flatOut = { ...NEUTRAL, accelerate: true };
  const wallRiders = {
    'half steer, flat out': (kart) => ({ ...flatOut, steer: kart.s > HAIRPIN_START - 4 ? 0.5 : 0 }),
    'no steering, flat out': () => flatOut,
    'hugging the outside wall, flat out': (kart) => ({ ...dummyControls(testTrack, kart, -7.5), accelerate: true, brake: false }),
  };
  for (const [name, controlsFor] of Object.entries(wallRiders)) {
    const time = timeThroughHairpin(controlsFor);
    assert.ok(time > clean + 0.5, `${name}: ${time.toFixed(2)} s against ${clean.toFixed(2)} s slowing down`);
  }
});

// Two karts beside each other on the oval, just overlapping, the second moving toward the first at `closing`.
function sideBySide(closing) {
  const first = movingKart(oval, 40, 0, 15);
  const second = movingKart(oval, 40, 1.9, 15);
  second.velocity = addScaled(second.velocity, rightOf(second), -closing);
  bumpKarts([first, second]);
  const parting = dot(subtract(second.velocity, first.velocity), rightOf(first));
  return { first, second, parting };
}

test('bumps: karts part at a share of their closing speed, and never slower than the least parting speed', () => {
  const gentle = sideBySide(0.5);
  assert.ok(Math.abs(gentle.parting - tuning.bumpMinSpeed) < 1e-9, `a gentle touch parts at ${gentle.parting}`);
  // Fast enough that the bounce's share is above the least parting speed.
  const closing = (2 * tuning.bumpMinSpeed) / tuning.bumpBounce;
  const hard = sideBySide(closing);
  assert.ok(Math.abs(hard.parting - tuning.bumpBounce * closing) < 1e-9, `a hard bump parts at ${hard.parting}`);
  assert.ok(gentle.first.slideLeft > 0 && gentle.second.slideLeft > 0, 'both slide loose');
});

test('after a bump the loose grip lets the kart slide well away instead of stopping dead', () => {
  const slid = (slideSeconds) => {
    setTuning('slideSeconds', slideSeconds);
    const { first } = sideBySide(0.5);
    const start = first.position;
    for (let frame = 0; frame < 30; frame += 1) {
      stepKart(oval, first, { ...NEUTRAL, accelerate: true }, STEP);
    }
    return -dot(subtract(first.position, start), rightOf(first));
  };
  const loose = slid(0.35);
  const firm = slid(0);
  assert.ok(loose > 2 * firm && loose > 0.6, `slid ${loose} sideways with loose grip, ${firm} without`);
});

test('the hop reaches its tuned height and lasts its tuned time, also when retuned', () => {
  for (const [height, seconds] of [[tuning.hopHeight, tuning.hopSeconds], [1, 0.4]]) {
    setTuning('hopHeight', height);
    setTuning('hopSeconds', seconds);
    const kart = movingKart(oval, 40, 0, 20);
    let highest = 0;
    let airFrames = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      stepKart(oval, kart, { ...NEUTRAL, accelerate: true, drift: true }, STEP);
      highest = Math.max(highest, kart.position.y);
      airFrames += kart.grounded ? 0 : 1;
    }
    assert.ok(Math.abs(highest - height) < 0.05, `hop of ${height}: reached ${highest}`);
    assert.ok(Math.abs(airFrames - seconds * 60) <= 1, `hop of ${seconds} s: ${airFrames} frames in the air`);
  }
});

test('the lean spring starts gently, never overshoots and has settled by the lean time', () => {
  const stiffness = 6 / tuning.leanSeconds;
  let state = { value: 0, speed: 0 };
  const values = [];
  for (let frame = 0; frame < tuning.leanSeconds * 60 * 2; frame += 1) {
    state = springToward(state.value, state.speed, 1, stiffness, STEP);
    values.push(state.value);
  }
  // The M6c lean closed 15% of the way in its first frame.
  assert.ok(values[0] < 0.05, `first frame ${values[0]}`);
  assert.ok(values.every((value, index) => value <= 1 && (index === 0 || value > values[index - 1])), 'rises steadily, no overshoot');
  assert.ok(values[Math.round(tuning.leanSeconds * 60) - 1] > 0.97);
});

test('the body leans into a drift already during the hop, and eases back after it', () => {
  const kart = movingKart(oval, 40, 0, 20);
  const leans = [];
  for (let frame = 0; frame < 60; frame += 1) {
    stepKart(oval, kart, { ...NEUTRAL, accelerate: true, drift: true, steer: 0.8 }, STEP);
    leans.push({ lean: kart.driftLean, grounded: kart.grounded, drifting: kart.driftDirection !== 0 });
  }
  const lastInAir = leans.findIndex((each) => each.grounded) - 1;
  assert.ok(leans[lastInAir].lean > 0.1, `leaning ${leans[lastInAir].lean} rad right before landing`);
  assert.ok(leans.at(-1).drifting && leans.at(-1).lean > (tuning.driftLeanDegrees * Math.PI) / 180 - 0.01);
  const leaning = kart.driftLean;
  stepKart(oval, kart, { ...NEUTRAL, accelerate: true }, STEP);
  // The M6c lean lost 15% in the first frame after letting go.
  assert.ok(kart.driftLean > 0.9 * leaning, 'letting go eases back, it does not snap straight');
});

test('a trick\'s roll plays out in full even if the kart lands first', () => {
  const kart = createKart(oval, 40, 0);
  startTrickRoll(kart);
  const rolls = [];
  for (let frame = 0; frame < tuning.trickSeconds * 60 + 5; frame += 1) {
    moveBody(kart, NEUTRAL, STEP);
    rolls.push(kart.bodyRoll);
  }
  assert.ok(kart.grounded, 'on the road the whole time');
  assert.ok(rolls.slice(0, tuning.trickSeconds * 60 - 1).every((roll, index) => index === 0 || roll > rolls[index - 1]));
  assert.ok(Math.max(...rolls) > 2 * Math.PI - 0.05, 'all the way round');
  assert.equal(kart.trickTime, null);
  assert.equal(rolls.at(-1), 0);
});
