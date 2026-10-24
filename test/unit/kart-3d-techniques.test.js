// Unit tests for the 3D race's techniques (host/games/kart-3d/kart-techniques.js, kart-boosts.js,
// slipstream.js, rocket-start.js and the hooks in kart-physics.js, kart-bumps.js and drive.js), driven with
// scripted inputs: hop and drift, MK8DX's charge counter and mini-turbo lengths, a purple drift through the
// test track's hairpin, the trick window at the ramp's lip, the rocket start window, dash panels, slipstream
// and the anti-gravity spin boost.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { createKart, stepKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { bumpKarts } from '../../host/games/kart-3d/kart-bumps.js';
import { updateSlipstreams, SLIPSTREAM_SECONDS } from '../../host/games/kart-3d/slipstream.js';
import { sparkLevel, MIN_DRIFT_SPEED, TRICK_EARLY, TRICK_LATE } from '../../host/games/kart-3d/kart-techniques.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { driftTurnAngle, DRIFT_STEERING_RATE, TOP_SPEED } from '../../host/games/kart-3d/kart-driving.js';
import { countdownNumber, judgeStart, GO_AT, STALL_SECONDS } from '../../host/games/kart-3d/rocket-start.js';
import { createDrive, stepDrive, playerKart } from '../../host/games/kart-3d/drive.js';
import { scale, subtract, addScaled } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const testTrack = buildTrack(TEST_TRACK);
// A huge flat loop with no dash panels: room to drift in circles without meeting a wall.
const field = buildTrack({
  halfWidth: 60,
  startLine: 0,
  pieces: [{ straight: 400 }, { turn: 180, radius: 100 }, { straight: 400 }, { turn: 180, radius: 100 }],
});
// The test track's features, by distance along it (see host/games/kart-3d/test-track.js).
const LIP = 241.8;
const HAIRPIN_START = 284.5;
const HAIRPIN_END = 347.3;

function controls(values = {}) {
  return { steer: 0, accelerate: true, brake: false, drift: false, ...values };
}

// A kart at distance `s` and `lateral`, already moving along the road at `speed`.
function movingKart(track, s, lateral, speed = TOP_SPEED) {
  const kart = createKart(track, s, lateral);
  kart.velocity = scale(kart.forward, speed);
  return kart;
}

// Steps the kart `frames` times; `controlsAt(frame, kart)` gives each step's controls. Returns what each step
// left behind: [{ grounded, level, boost, speed }].
function run(track, kart, frames, controlsAt) {
  const steps = [];
  for (let frame = 0; frame < frames; frame += 1) {
    stepKart(track, kart, controlsAt(frame, kart), STEP);
    steps.push({ grounded: kart.grounded, level: sparkLevel(kart), boost: kart.boost?.kind ?? null, speed: forwardSpeed(kart) });
  }
  return steps;
}

// Holds Drift from frame 0 with `steer`, so the kart hops, lands and drifts. Returns the frame it landed on.
function hopIntoDrift(kart, steer) {
  const steps = run(field, kart, 30, () => controls({ drift: true, steer }));
  return steps.findIndex((step) => step.grounded);
}

test('pressing Drift hops for about a quarter of a second; landing with the stick over starts a drift that way', () => {
  const kart = movingKart(field, 20, -40);
  const landedAt = hopIntoDrift(kart, -0.8);
  assert.ok(landedAt >= 12 && landedAt <= 18, `in the air for ${landedAt} frames`);
  assert.equal(kart.driftDirection, -1, 'a left drift');
  const straight = movingKart(field, 20, -40);
  hopIntoDrift(straight, 0);
  assert.equal(straight.driftDirection, 0, 'landing with the stick in the middle is only a hop');
});

test('a drift turns at MK8DX\'s drift rate pushed into it, wider pushed away, but always toward its side', () => {
  const into = driftTurnAngle(1, 1, TOP_SPEED, STEP);
  assert.ok(Math.abs(into - 0.019) < 1e-9, `${into} rad a frame into the turn`);
  assert.ok(Math.abs(DRIFT_STEERING_RATE - 0.019 * 60) < 1e-9);
  const middle = driftTurnAngle(1, 0, TOP_SPEED, STEP);
  const away = driftTurnAngle(1, -1, TOP_SPEED, STEP);
  assert.ok(middle > 0.011 && middle < into, `the middle (${middle}) is between a full normal turn and the tightest`);
  assert.ok(away > 0 && away < middle, 'pushed away it widens but still turns right');
  assert.ok(Math.abs(driftTurnAngle(-1, -1, TOP_SPEED, STEP) + into) < 1e-9, 'a left drift mirrors it');
});

test('the charge counter: blue, orange and purple after 52, 109 and 166 frames held hard, 2.5 times as long held softly', () => {
  for (const [steer, perFrame] of [[1, 5], [0.3, 2]]) {
    const kart = movingKart(field, 20, -40);
    hopIntoDrift(kart, 1);
    const charged = kart.driftCharge;
    const steps = run(field, kart, 450, () => controls({ drift: true, steer }));
    const reached = [1, 2, 3].map((level) => steps.findIndex((step) => step.level >= level) + 1);
    const expected = [256, 542, 828].map((threshold) => Math.ceil((threshold - charged) / perFrame));
    assert.deepEqual(reached, expected, `steer ${steer}`);
  }
  // From the landing: 256 / 5 = 51.2, so blue shows on the 52nd frame of a hard drift.
  assert.deepEqual([256, 542, 828].map((threshold) => Math.ceil(threshold / 5)), [52, 109, 166]);
});

test('letting go fires a mini-turbo as long as the level: 30, 90 or 150 frames at 1.1 times top speed', () => {
  for (const [level, frames] of [[1, 30], [2, 90], [3, 150]]) {
    const kart = movingKart(field, 20, -40);
    hopIntoDrift(kart, 1);
    let boosted = 0;
    let fastest = 0;
    let released = false;
    for (let frame = 0; frame < 500; frame += 1) {
      // Let go on the first frame the level shows.
      released ||= sparkLevel(kart) >= level;
      stepKart(field, kart, controls({ drift: !released, steer: released ? 0 : 1 }), STEP);
      boosted += kart.boost?.kind === BOOST_KINDS.MINI_TURBO ? 1 : 0;
      fastest = Math.max(fastest, forwardSpeed(kart));
    }
    assert.equal(kart.driftDirection, 0, 'the drift ended');
    assert.ok(Math.abs(boosted - frames) <= 1, `level ${level} boosted ${boosted} frames`);
    assert.ok(Math.abs(fastest - TOP_SPEED * 1.1) < 0.01, `level ${level} reached ${fastest}`);
  }
});

test('letting go before blue gives nothing; a drift that slows below its minimum speed ends with no boost', () => {
  const early = movingKart(field, 20, -40);
  hopIntoDrift(early, 1);
  run(field, early, 10, () => controls({ drift: false }));
  assert.equal(early.boost, null);
  const braking = movingKart(field, 20, -40);
  hopIntoDrift(braking, 1);
  const steps = run(field, braking, 120, () => controls({ drift: true, steer: 1, accelerate: false, brake: true }));
  assert.equal(braking.driftDirection, 0, 'the drift ended');
  assert.ok(steps[steps.length - 1].speed < MIN_DRIFT_SPEED);
  run(field, braking, 2, () => controls());
  assert.equal(braking.boost, null);
});

test('a player can drift the test track\'s hairpin at full speed on its outside lane to a purple mini-turbo, off the walls', () => {
  const kart = movingKart(testTrack, 258, -4);
  let best = 0;
  let wallSteps = 0;
  run(testTrack, kart, 6 * 60, (frame, each) => {
    best = Math.max(best, sparkLevel(each));
    wallSteps += Math.abs(each.lateral) > TEST_TRACK.halfWidth - 1.1 ? 1 : 0;
    // The drift starts on the straight just before the hairpin.
    if (each.s < HAIRPIN_START - 4.5 || each.s > HAIRPIN_END + 2) {
      return controls();
    }
    // Hop with the stick right, then hold the outside lane: tighter when drifting out, wider when in.
    const steer = each.driftDirection === 0 ? 1 : Math.min(Math.max(0.75 + 0.3 * (-4 - each.lateral), -1), 1);
    return controls({ drift: true, steer });
  });
  assert.equal(best, 3, 'purple sparks');
  assert.equal(wallSteps, 0);
  assert.ok(kart.s > HAIRPIN_END + 30 && kart.respawnIn === null, 'through the hairpin and on');
});

test('a trick: Drift pressed just before or after the ramp\'s lip boosts 25 frames at 1.35 times top speed on landing', () => {
  const lipTime = (LIP - 190) / TOP_SPEED;
  const tries = [-TRICK_EARLY - 0.05, -TRICK_EARLY + 0.02, 0.1, TRICK_LATE - 0.02, TRICK_LATE + 0.05];
  const results = tries.map((pressAt) => {
    const kart = movingKart(testTrack, 190, 3);
    let jumpFrames = 0;
    let fastest = 0;
    run(testTrack, kart, 5 * 60, (frame, each) => {
      jumpFrames += each.boost?.kind === BOOST_KINDS.JUMP ? 1 : 0;
      fastest = Math.max(fastest, each.boost?.kind === BOOST_KINDS.JUMP ? forwardSpeed(each) : 0);
      const time = frame * STEP;
      return controls({ drift: time >= lipTime + pressAt && time < lipTime + pressAt + 0.1 });
    });
    assert.equal(kart.respawnIn, null, 'over the gap');
    return { jumpFrames, fastest, timing: kart.lipTiming };
  });
  assert.deepEqual(results.map((result) => result.jumpFrames > 0), [false, true, true, true, false]);
  for (const result of results.filter((each) => each.jumpFrames > 0)) {
    assert.ok(Math.abs(result.jumpFrames - 26) <= 1, `${result.jumpFrames} boosted frames`);
    assert.ok(result.fastest > TOP_SPEED * 1.3, `${result.fastest}`);
  }
  assert.ok(Math.abs(results[2].timing.offset - 0.1) < 0.02 && results[2].timing.trick, 'the readout gets the press time');
  assert.ok(results[0].timing.offset < -TRICK_EARLY && !results[0].timing.trick);
});

test('the countdown shows 3, 2 and 1 a second each, then GO for a second', () => {
  assert.deepEqual([0, 0.99, 1, 2.5, 3, 3.99, 4].map(countdownNumber), [3, 3, 2, 1, 0, 0, null]);
});

test('rocket start: Go arriving just after "2" and held boosts; earlier stalls; later or let go is a normal start', () => {
  assert.equal(judgeStart(1.3).outcome, 'rocket');
  assert.ok(Math.abs(judgeStart(1.3).offset - 0.3) < 1e-9);
  assert.equal(judgeStart(0.9).outcome, 'stall');
  assert.equal(judgeStart(1.8).outcome, 'normal');
  assert.deepEqual(judgeStart(null), { outcome: 'normal', offset: null });
  const outcomes = [
    { pressAt: 1.25, letGoAt: Infinity },
    { pressAt: 0.5, letGoAt: Infinity },
    { pressAt: 1.25, letGoAt: 2.5 },
    { pressAt: 2.5, letGoAt: Infinity },
  ].map(({ pressAt, letGoAt }) => {
    const drive = createDrive(testTrack, ['p1']);
    const goHeld = () => drive.time >= pressAt && (drive.started || drive.time < letGoAt);
    const speeds = [];
    for (let step = 0; step < (GO_AT + 1.5) * 60; step += 1) {
      stepDrive(drive, testTrack, () => controls({ accelerate: goHeld() }), STEP);
      speeds.push(forwardSpeed(playerKart(drive, 'p1')));
    }
    const kart = playerKart(drive, 'p1');
    return { outcome: kart.startResult.outcome, stillAfterGo: speeds[(GO_AT + STALL_SECONDS) * 60 - 5] === 0, fastest: Math.max(...speeds) };
  });
  assert.deepEqual(outcomes.map((each) => each.outcome), ['rocket', 'stall', 'normal', 'normal']);
  assert.ok(outcomes[0].fastest > TOP_SPEED, `the rocket start boosted to ${outcomes[0].fastest}`);
  assert.ok(outcomes[1].stillAfterGo, 'the stalled kart stood still for a second after GO');
  assert.ok(outcomes[3].fastest < TOP_SPEED * 0.7, 'a normal start just accelerates');
});

test('a dash panel boosts a kart driving over it, and a boost keeps its speed on the grass', () => {
  const panel = TEST_TRACK.dashPanels[0];
  const kart = movingKart(testTrack, panel.s - 10, panel.lateral, 20);
  const steps = run(testTrack, kart, 60, () => controls());
  assert.ok(steps.some((step) => step.boost === BOOST_KINDS.DASH_PANEL));
  assert.ok(Math.max(...steps.map((step) => step.speed)) > TOP_SPEED);
  // On the grass shoulder of the off-road straight (434 to 524).
  const onGrass = movingKart(testTrack, 450, -11);
  const grassSteps = run(testTrack, onGrass, 30, () => controls());
  assert.ok(grassSteps[29].speed < TOP_SPEED * 0.8, 'the grass slows a kart without a boost');
  onGrass.boost = { kind: BOOST_KINDS.MINI_TURBO, timeLeft: 1, speedShare: 1.1, acceleration: 30 };
  const boosted = run(testTrack, onGrass, 30, () => controls());
  assert.ok(boosted[29].speed > TOP_SPEED, `boosting on the grass at ${boosted[29].speed}`);
});

test('slipstream: 3 s close behind another kart boosts; beside it does nothing; a bump ends the boost', () => {
  for (const [lateral, expected] of [[0, true], [4, false]]) {
    const leader = movingKart(field, 106, lateral === 0 ? -20 : -20 + lateral, 22);
    const follower = movingKart(field, 100, -20, 22);
    let boostedAt = null;
    for (let frame = 0; frame < (SLIPSTREAM_SECONDS + 0.5) * 60 && boostedAt === null; frame += 1) {
      stepKart(field, leader, controls({ accelerate: false }), STEP);
      leader.velocity = scale(leader.forward, 22);
      stepKart(field, follower, controls({ accelerate: false }), STEP);
      follower.velocity = scale(follower.forward, 22);
      updateSlipstreams([leader, follower], STEP);
      boostedAt = follower.boost?.kind === BOOST_KINDS.SLIPSTREAM ? frame + 1 : null;
    }
    assert.equal(boostedAt !== null, expected, `lateral ${lateral}`);
    if (expected) {
      assert.ok(Math.abs(boostedAt - SLIPSTREAM_SECONDS * 60) <= 1, `after ${boostedAt} frames`);
      assert.equal(leader.boost, null, 'the kart in front gets nothing');
      follower.position = addScaled(leader.position, leader.forward, -1.5);
      bumpKarts([leader, follower]);
      assert.equal(follower.boost, null, 'touching the kart in front ends it');
    }
  }
});

test('two karts bumping in the anti-gravity section both spin boost; on normal road they only bounce', () => {
  for (const [s, antiGravity] of [[580, true], [20, false]]) {
    const first = movingKart(testTrack, s, -1, 20);
    const second = movingKart(testTrack, s, 0.5, 10);
    assert.equal(first.antiGravity, antiGravity);
    second.velocity = addScaled(second.velocity, subtract(first.position, second.position), 3);
    bumpKarts([first, second]);
    const kinds = [first, second].map((kart) => kart.boost?.kind ?? null);
    assert.deepEqual(kinds, antiGravity ? ['spin', 'spin'] : [null, null], `at ${s}`);
    assert.equal(first.spinTime !== null, antiGravity);
    if (antiGravity) {
      run(testTrack, first, 40, () => controls());
      assert.equal(first.spinTime, null, 'the spin is over');
    }
  }
});
