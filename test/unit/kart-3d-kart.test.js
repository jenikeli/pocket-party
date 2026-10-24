// Unit tests for the 3D race's kart rules (host/games/kart-3d/kart-driving.js, kart-physics.js and
// kart-bumps.js), driven with scripted controls: MK8DX's speed curve, the steering curve, off-road, the jump,
// falling off and being put back, driving on the anti-gravity wall, and bumps decided by weight. Walls and
// bounces (M7a) are in kart-3d-feel.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { locate, stationIndexAt, SURFACES } from '../../host/games/kart-3d/track.js';
import { nextSpeed, turnAngle, OFF_ROAD_SPEED_SHARE } from '../../host/games/kart-3d/kart-driving.js';
import { tuning, resetTuning } from '../../host/games/kart-3d/tuning.js';
import { createKart, stepKart, forwardSpeed, RESPAWN_DELAY } from '../../host/games/kart-3d/kart-physics.js';
import { KART_RADIUS } from '../../host/games/kart-3d/kart-walls.js';
import { bumpKarts, kartMass } from '../../host/games/kart-3d/kart-bumps.js';
import { dummyControls } from '../../host/games/kart-3d/dummy-driver.js';
import { scale, addScaled, dot, length, subtract } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const TOP_SPEED = tuning.topSpeed;
const DEGREES = Math.PI / 180;
const GO = Object.freeze({ steer: 0, accelerate: true, brake: false });
const testTrack = buildTrack(TEST_TRACK);
// A wide flat oval for driving tests that must not meet anything: straights 200 long, ends of radius 60.
const oval = buildTrack({
  halfWidth: 20,
  startLine: 0,
  pieces: [{ straight: 200 }, { turn: 180, radius: 60 }, { straight: 200 }, { turn: 180, radius: 60 }],
});

// The kart at distance `s` and `lateral`, already moving along the road at `speed`.
function movingKart(track, s, lateral, speed) {
  const kart = createKart(track, s, lateral);
  kart.velocity = scale(kart.forward, speed);
  return kart;
}

function drive(track, kart, controls, seconds) {
  for (let step = 0; step < Math.round(seconds * 60); step += 1) {
    stepKart(track, kart, typeof controls === 'function' ? controls(kart) : controls, STEP);
  }
}

function distanceAt(track, x, y, z, roughS) {
  return locate(track, { x, y, z }, stationIndexAt(track, roughS)).s;
}

test('MK8DX\'s speed curve: one frame adds at most its limit, and 90% of top speed takes about 3.8 s', () => {
  // The first frame closes 1% of the gap to top speed, just under the limit (0.08 / 7.75 of top speed).
  assert.ok(Math.abs(nextSpeed(0, GO, false, STEP, null, TOP_SPEED) - TOP_SPEED * 0.01) < 1e-9);
  assert.ok(TOP_SPEED * 0.01 < (0.08 / 7.75) * TOP_SPEED);
  let speed = 0;
  let frames = 0;
  while (speed < TOP_SPEED * 0.9) {
    speed = nextSpeed(speed, GO, false, STEP, null, TOP_SPEED);
    frames += 1;
  }
  assert.ok(frames >= 225 && frames <= 235, `${frames} frames to 90%`);
  for (let frame = 0; frame < 3000; frame += 1) {
    speed = nextSpeed(speed, GO, false, STEP, null, TOP_SPEED);
  }
  assert.ok(speed <= TOP_SPEED && speed > TOP_SPEED - 0.01);
});

test('braking stops the kart and then reverses it slowly; coasting rolls to a stop', () => {
  let speed = TOP_SPEED;
  // Braking takes 30 units/s off every second, then reverses at 8 units/s^2.
  for (let frame = 0; frame < (TOP_SPEED / 30 + 0.5) * 60; frame += 1) {
    speed = nextSpeed(speed, { steer: 0, accelerate: false, brake: true }, false, STEP, null, TOP_SPEED);
  }
  assert.ok(speed < 0 && speed > -6, `reversing at ${speed}`);
  assert.equal(nextSpeed(0.05, { steer: 0, accelerate: false, brake: false }, false, STEP, null, TOP_SPEED), 0);
});

test('a kart accelerates from a standstill on the road and keeps to the ground', () => {
  const kart = createKart(oval, 10, 0);
  drive(oval, kart, GO, 2);
  // Each frame closes 1% of the gap to top speed: top speed x (1 - 0.99 ^ 120).
  const expected = TOP_SPEED * (1 - 0.99 ** 120);
  assert.ok(Math.abs(forwardSpeed(kart) - expected) < 0.1, `speed ${forwardSpeed(kart)} after 2 s, expected ${expected}`);
  assert.equal(kart.grounded, true);
  assert.ok(Math.abs(kart.position.y) < 1e-9, 'on the flat road');
});

test('full steering turns the nose at the full steer rate, at any speed above a crawl', () => {
  for (const speed of [8, 20]) {
    const kart = movingKart(oval, 20, 0, speed);
    const before = kart.forward;
    drive(oval, kart, { steer: 1, accelerate: true, brake: false }, 0.5);
    const turned = Math.acos(Math.min(dot(before, kart.forward), 1));
    assert.ok(Math.abs(turned - tuning.fullSteerRate * DEGREES * 0.5) < 0.01, `turned ${turned} rad at ${speed}`);
    // Steering right turns toward the road's right (+z here).
    assert.ok(kart.forward.z > 0);
  }
});

test('the steering curve: small movements turn as gently as MK8DX\'s 0.011 radians a frame, full stick much tighter', () => {
  const perFrame = (steer) => turnAngle(steer, TOP_SPEED, STEP);
  // The M6 steering was a straight line, 0.011 a frame at full stick.
  for (const steer of [0.05, 0.1, 0.2]) {
    const m6 = 0.011 * steer;
    assert.ok(perFrame(steer) >= m6 && perFrame(steer) < m6 * 1.1, `steer ${steer}: ${perFrame(steer)} against ${m6}`);
  }
  assert.ok(perFrame(1) > 1.5 * 0.011, `full stick turns ${perFrame(1)} a frame`);
  for (let steer = 0; steer < 1; steer += 0.05) {
    assert.ok(perFrame(steer + 0.05) > perFrame(steer), 'more stick always turns more');
  }
  assert.ok(Math.abs(perFrame(-0.6) + perFrame(0.6)) < 1e-12, 'left mirrors right');
  // A curve of 1 is a straight line to the full rate.
  tuning.steerCurve = 1;
  assert.ok(Math.abs(perFrame(0.5) - perFrame(1) / 2) < 1e-12);
  resetTuning();
});

test('off-road the kart slows to half of top speed', () => {
  const shoulders = distanceAt(testTrack, 90, 0, 68, 430);
  const kart = movingKart(testTrack, shoulders + 5, -11, TOP_SPEED);
  drive(testTrack, kart, GO, 2);
  assert.equal(kart.surface, SURFACES.OFF_ROAD);
  assert.ok(Math.abs(forwardSpeed(kart) - TOP_SPEED * OFF_ROAD_SPEED_SHARE) < 0.2, `speed ${forwardSpeed(kart)}`);
});

test('a wall stops the kart going through it, bounces it, and turns a shallow nose along it', () => {
  const kart = movingKart(oval, 20, 0, 20);
  let deepest = 0;
  drive(oval, kart, (each) => {
    deepest = Math.max(deepest, Math.abs(locate(oval, each.position, each.trackIndex).lateral));
    return { steer: 0.6, accelerate: true, brake: false };
  }, 4);
  assert.ok(deepest <= 20 - KART_RADIUS + 0.5, `went ${deepest} from the middle`);
  assert.ok(forwardSpeed(kart) < 20, 'scraping the wall slows the kart');
  assert.equal(kart.grounded, true);
});

test('the jump: at speed the kart flies over the gap and lands; too slow, it falls in and is put back', () => {
  const rampStart = distanceAt(testTrack, 160, 0, 80, 225);
  const fast = movingKart(testTrack, rampStart - 20, 0, TOP_SPEED);
  let airSteps = 0;
  drive(testTrack, fast, (kart) => {
    airSteps += kart.grounded ? 0 : 1;
    return GO;
  }, 3);
  assert.ok(airSteps > 30 && airSteps < 70, `${airSteps} steps in the air`);
  assert.equal(fast.respawnIn, null, 'it made the jump');
  assert.ok(fast.s > rampStart + 16 + 12, 'it is past the gap');

  // Coasting up the ramp from 18, it leaves the lip at about 11 units a second: too slow.
  const slow = movingKart(testTrack, rampStart - 0.5, 0, 18);
  let fell = false;
  drive(testTrack, slow, (kart) => {
    fell ||= kart.respawnIn !== null;
    return { steer: 0, accelerate: false, brake: false };
  }, 3);
  assert.ok(fell, 'it fell');
  assert.equal(slow.grounded, true);
  assert.ok(slow.s < rampStart, `put back before the ramp, at ${slow.s}`);
  assert.equal(Math.abs(locate(testTrack, slow.position, slow.trackIndex).lateral) < 1e-6, true, 'in the middle of the road');
});

test('the hill has no walls: steering off its edge falls, and about 1.5 s later the kart is back on the road', () => {
  const kart = movingKart(testTrack, 70, 0, 20);
  let leftRoadAt = null;
  let backAt = null;
  for (let step = 0; step < 240 && backAt === null; step += 1) {
    const wasFalling = kart.respawnIn !== null;
    stepKart(testTrack, kart, { steer: 1, accelerate: true, brake: false }, STEP);
    if (leftRoadAt === null && !kart.grounded) {
      leftRoadAt = step;
    }
    if (wasFalling && kart.respawnIn === null) {
      backAt = step;
    }
  }
  assert.notEqual(backAt, null, 'it was put back');
  const seconds = (backAt - leftRoadAt) / 60;
  assert.ok(seconds > 1.2 && seconds < 2, `${seconds} s from leaving the road to being back`);
  assert.equal(kart.grounded, true);
  assert.ok(kart.s > 30 && kart.s < 70, `put back near where it left, at ${kart.s}`);
  assert.equal(length(kart.velocity), 0);
});

test('on the anti-gravity wall the kart drives on the vertical road, and gravity pulls it back to the road', () => {
  const wallMiddle = distanceAt(testTrack, -34, 0, 34, 580);
  const kart = movingKart(testTrack, wallMiddle - 30, 0, 20);
  drive(testTrack, kart, (each) => dummyControls(testTrack, each, 0), 1.5);
  assert.equal(kart.grounded, true);
  assert.equal(kart.antiGravity, true);
  assert.ok(Math.abs(kart.up.y) < 0.05, `up ${JSON.stringify(kart.up)} lies flat: the kart is on the wall`);
  // Thrown off the wall, it comes back to it instead of falling down.
  kart.velocity = addScaled(kart.velocity, kart.up, 5);
  kart.grounded = false;
  drive(testTrack, kart, GO, 1);
  assert.equal(kart.respawnIn, null);
  assert.equal(kart.grounded, true);
});

test('bumps: equal karts push each other equally; a heavy fast kart shoves a light slow one aside', () => {
  const first = movingKart(oval, 20, 0, 10);
  const second = movingKart(oval, 20, 1.5, 10);
  const firstStart = first.position;
  const secondStart = second.position;
  bumpKarts([first, second]);
  const pushes = [length(subtract(first.position, firstStart)), length(subtract(second.position, secondStart))];
  assert.ok(Math.abs(pushes[0] - pushes[1]) < 1e-9 && pushes[0] > 0);
  assert.ok(length(subtract(second.position, first.position)) >= 2 * KART_RADIUS - 1e-9);

  const heavy = movingKart(oval, 20, 0, TOP_SPEED);
  heavy.weight = 1.25;
  const light = createKart(oval, 21.5, 0, 0.8);
  assert.ok(kartMass(heavy) > 2 * kartMass(light), 'mass grows with weight and speed');
  const heavyStart = heavy.position;
  const lightStart = light.position;
  const momentumBefore = addScaled(scale(heavy.velocity, kartMass(heavy)), light.velocity, kartMass(light));
  const heavyMass = kartMass(heavy);
  const lightMass = kartMass(light);
  bumpKarts([heavy, light]);
  assert.ok(length(subtract(light.position, lightStart)) > 2 * length(subtract(heavy.position, heavyStart)));
  assert.ok(forwardSpeed(light) > 10, 'the light kart is shoved forward');
  const momentumAfter = addScaled(scale(heavy.velocity, heavyMass), light.velocity, lightMass);
  assert.ok(length(subtract(momentumAfter, momentumBefore)) < 1e-9, 'momentum is kept');
});

test('a kart falling after leaving the road is left out of bumps', () => {
  const falling = createKart(oval, 20, 0);
  falling.respawnIn = RESPAWN_DELAY;
  const standing = createKart(oval, 20, 0.5);
  const start = standing.position;
  bumpKarts([falling, standing]);
  assert.deepEqual(standing.position, start);
});
