// Unit tests for the kart effects' rules (host/games/kart-3d/items/effect-rules.js and where the other rule files
// read them): big, small and bouncy change top speed, turning, mass, size and bounce, and a kart with no `item`
// is untouched. The karts' `item` is set by hand, as items/item-rules.js would.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { KART_ITEMS } from '../../shared/protocol.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { createKart, stepKart, forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { kartTopSpeed } from '../../host/games/kart-3d/kart-driving.js';
import { bumpKarts, kartMass } from '../../host/games/kart-3d/kart-bumps.js';
import { KART_RADIUS } from '../../host/games/kart-3d/kart-walls.js';
import { tuning, resetTuning } from '../../host/games/kart-3d/tuning.js';
import {
  runningEffect, effectTopSpeedShare, effectTurnShare, effectMassShare, effectBounceShare, effectSize,
} from '../../host/games/kart-3d/items/effect-rules.js';
import { scale, subtract, dot, length } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const GO = Object.freeze({ steer: 0, accelerate: true, brake: false });
// A wide flat oval: straights 200 long, ends of radius 60, the walls 20 from the middle.
const track = buildTrack({ halfWidth: 20, startLine: 0, pieces: [{ straight: 200 }, { turn: 180, radius: 60 }, { straight: 200 }, { turn: 180, radius: 60 }] });

afterEach(resetTuning);

function withEffect(kart, item) {
  kart.item = { held: null, rollLeft: 0, effect: item ? { item, left: 5 } : null };
  return kart;
}

function movingKart(s, lateral, speed, item = null) {
  const kart = withEffect(createKart(track, s, lateral), item);
  kart.velocity = scale(kart.forward, speed);
  return kart;
}

test('a kart with no item, or no effect, has every share at 1', () => {
  for (const kart of [createKart(track, 10, 0), withEffect(createKart(track, 10, 0), null)]) {
    assert.equal(runningEffect(kart), null);
    for (const share of [effectTopSpeedShare, effectTurnShare, effectMassShare, effectBounceShare, effectSize]) {
      assert.equal(share(kart), 1);
    }
  }
});

test('each effect reads its tunables', () => {
  const big = withEffect(createKart(track, 10, 0), KART_ITEMS.BIG);
  assert.equal(runningEffect(big), KART_ITEMS.BIG);
  assert.equal(effectTopSpeedShare(big), tuning.bigSpeedShare);
  assert.equal(effectMassShare(big), tuning.bigMassShare);
  assert.equal(effectSize(big), tuning.bigSize);
  assert.equal(effectTurnShare(big), 1);
  const small = withEffect(createKart(track, 10, 0), KART_ITEMS.SMALL);
  assert.equal(effectTurnShare(small), tuning.smallTurnShare);
  assert.equal(effectMassShare(small), tuning.smallMassShare);
  assert.equal(effectSize(small), tuning.smallSize);
  assert.equal(effectTopSpeedShare(small), 1);
  const bouncy = withEffect(createKart(track, 10, 0), KART_ITEMS.BOUNCY);
  assert.equal(effectBounceShare(bouncy), tuning.bouncyBounceShare);
  assert.equal(effectSize(bouncy), 1);
  tuning.bigSpeedShare = 0.6;
  assert.equal(effectTopSpeedShare(big), 0.6);
});

test('a big kart tops out slower', () => {
  const normal = createKart(track, 10, 0);
  const big = withEffect(createKart(track, 10, 0), KART_ITEMS.BIG);
  assert.ok(Math.abs(kartTopSpeed(big) - kartTopSpeed(normal) * tuning.bigSpeedShare) < 1e-9);
  for (let step = 0; step < 6 * 60; step += 1) {
    stepKart(track, big, GO, STEP);
  }
  assert.ok(forwardSpeed(big) <= kartTopSpeed(big) + 1e-6);
  assert.ok(forwardSpeed(big) > kartTopSpeed(big) * 0.9);
});

test('a small kart turns tighter, in steering and in a drift', () => {
  const heading = (kart) => Math.atan2(kart.forward.x, kart.forward.z);
  const turnedIn = (item, controls, driftDirection) => {
    const kart = movingKart(10, 0, 20, item);
    kart.driftDirection = driftDirection;
    kart.driftHeld = driftDirection !== 0;
    const before = heading(kart);
    stepKart(track, kart, controls, STEP);
    return Math.abs(heading(kart) - before);
  };
  const steering = { steer: 1, accelerate: true, brake: false };
  assert.ok(Math.abs(turnedIn(KART_ITEMS.SMALL, steering, 0) / turnedIn(null, steering, 0) - tuning.smallTurnShare) < 0.01);
  const drifting = { steer: 0, accelerate: true, brake: false, drift: true };
  assert.ok(Math.abs(turnedIn(KART_ITEMS.SMALL, drifting, 1) / turnedIn(null, drifting, 1) - tuning.smallTurnShare) < 0.01);
});

test('mass follows the effect', () => {
  const normal = movingKart(10, 0, 20);
  const big = movingKart(10, 0, 20, KART_ITEMS.BIG);
  const small = movingKart(10, 0, 20, KART_ITEMS.SMALL);
  assert.ok(kartMass(big) > kartMass(normal) * tuning.bigMassShare * 0.99);
  assert.ok(Math.abs(kartMass(small) - kartMass(normal) * tuning.smallMassShare) < 1e-9);
});

// Two karts a little inside touching distance along the road, `second` ahead, with the given speeds and items.
function touchingPair(firstSpeed, secondSpeed, firstItem, secondItem) {
  const first = movingKart(50, 0, firstSpeed, firstItem);
  const second = movingKart(50, 0, secondSpeed, secondItem);
  const touching = KART_RADIUS * (effectSizeOf(firstItem) + effectSizeOf(secondItem)) * 0.95;
  second.position = subtract(first.position, scale(first.forward, -touching));
  return [first, second];
}

function effectSizeOf(item) {
  return effectSize(withEffect(createKart(track, 10, 0), item));
}

test('a big kart hit at speed by a normal one barely moves', () => {
  const bigSpeed = kartTopSpeed(withEffect(createKart(track, 10, 0), KART_ITEMS.BIG));
  const [normal, big] = touchingPair(kartTopSpeed(createKart(track, 10, 0)), bigSpeed, null, KART_ITEMS.BIG);
  const normalBefore = forwardSpeed(normal);
  bumpKarts([normal, big]);
  assert.ok(Math.abs(forwardSpeed(big) - bigSpeed) < Math.abs(forwardSpeed(normal) - normalBefore) / 3);
});

test('karts bump at the sum of their sizes', () => {
  const [big, small] = touchingPair(0, 0, KART_ITEMS.BIG, KART_ITEMS.SMALL);
  bumpKarts([big, small]);
  const gap = length(subtract(big.position, small.position));
  assert.ok(Math.abs(gap - KART_RADIUS * (tuning.bigSize + tuning.smallSize)) < 1e-6);
  // Two small karts 1.5 apart (under two normal radii, over two small ones) do not touch.
  const [first, second] = touchingPair(0, 0, KART_ITEMS.SMALL, KART_ITEMS.SMALL);
  second.position = subtract(first.position, scale(first.forward, -1.5));
  const before = second.position;
  bumpKarts([first, second]);
  assert.equal(second.position, before);
});

// A head-on bump of two karts closing at 40 units per second; the speed they part at, and the karts.
function headOn(firstItem, secondItem) {
  const [first, second] = touchingPair(20, -20, firstItem, secondItem);
  const normal = scale(subtract(second.position, first.position), 1 / length(subtract(second.position, first.position)));
  bumpKarts([first, second]);
  return { speed: dot(subtract(second.velocity, first.velocity), normal), first, second };
}

test('a bouncy kart parts at the bounce share times the usual speed, the extra going to the other kart', () => {
  const usual = headOn(null, null);
  const bouncyFirst = headOn(KART_ITEMS.BOUNCY, null);
  assert.ok(Math.abs(bouncyFirst.speed - usual.speed * tuning.bouncyBounceShare) < 1e-6);
  // The bouncy kart keeps its line: its velocity is the same as in a usual bump.
  assert.ok(length(subtract(bouncyFirst.first.velocity, usual.first.velocity)) < 1e-9);
  const bouncySecond = headOn(null, KART_ITEMS.BOUNCY);
  assert.ok(Math.abs(bouncySecond.speed - usual.speed * tuning.bouncyBounceShare) < 1e-6);
  assert.ok(length(subtract(bouncySecond.second.velocity, usual.second.velocity)) < 1e-9);
});

test('two bouncy karts part as usual', () => {
  const usual = headOn(null, null);
  const both = headOn(KART_ITEMS.BOUNCY, KART_ITEMS.BOUNCY);
  assert.ok(Math.abs(both.speed - usual.speed) < 1e-6);
});

test('the wall stops a big kart further from it and a small kart nearer', () => {
  // Starts inside the wall (the oval's half width is 20) and is pushed back to the wall minus its radius.
  const lateralAfterStep = (item) => {
    const kart = withEffect(createKart(track, 20, 19.9), item);
    stepKart(track, kart, { steer: 0, accelerate: false, brake: false }, STEP);
    return kart.lateral;
  };
  assert.ok(Math.abs(lateralAfterStep(null) - (20 - KART_RADIUS)) < 0.01);
  assert.ok(Math.abs(lateralAfterStep(KART_ITEMS.BIG) - (20 - KART_RADIUS * tuning.bigSize)) < 0.01);
  assert.ok(Math.abs(lateralAfterStep(KART_ITEMS.SMALL) - (20 - KART_RADIUS * tuning.smallSize)) < 0.01);
});
