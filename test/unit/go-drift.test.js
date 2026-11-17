// Unit tests for controller/kart/go-drift.js: which button a press of Go sends in the 3D race with the stick
// (a plain hold accelerates, a tap then a hold drifts).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGoDrift, createGoButton } from '../../controller/kart/go-drift.js';

const ACCELERATE_DOWN = { button: 'accelerate', pressed: true };
const ACCELERATE_UP = { button: 'accelerate', pressed: false };

test('a plain hold is accelerate, and so is its release', () => {
  const go = createGoDrift();
  assert.deepEqual(go.press(1000), ACCELERATE_DOWN);
  assert.deepEqual(go.release(3000), ACCELERATE_UP);
});

test('a tap then a hold is drift, and its release is drift released', () => {
  const go = createGoDrift();
  assert.deepEqual(go.press(1000), ACCELERATE_DOWN);
  assert.deepEqual(go.release(1100), ACCELERATE_UP);
  assert.deepEqual(go.press(1300), { button: 'drift', pressed: true });
  assert.deepEqual(go.release(2500), { button: 'drift', pressed: false });
});

test('after a drift the next press is accelerate, even a quick one', () => {
  const go = createGoDrift();
  go.press(1000);
  go.release(1100);
  go.press(1200);
  go.release(1250);
  assert.deepEqual(go.press(1300), ACCELERATE_DOWN);
});

test('a hold, a release and a quick press is accelerate', () => {
  const go = createGoDrift();
  go.press(1000);
  go.release(1500);
  assert.deepEqual(go.press(1600), ACCELERATE_DOWN);
});

test('a press after the window is accelerate', () => {
  const go = createGoDrift();
  go.press(1000);
  go.release(1100);
  assert.deepEqual(go.press(1401), ACCELERATE_DOWN);
});

test('the two times can be set', () => {
  const go = createGoDrift({ doubleTapMs: 500, shortTapMs: 400 });
  go.press(1000);
  go.release(1350);
  assert.deepEqual(go.press(1800), { button: 'drift', pressed: true });
});

test('Go\'s button input goes through the double tap only while Go drifts, and a release follows its press', () => {
  const press = { kind: 'button', button: 'accelerate', pressed: true };
  const release = { kind: 'button', button: 'accelerate', pressed: false };
  const plain = createGoButton();
  assert.deepEqual(plain(press, false, 0), press, 'Go does not drift: the input as it came');
  assert.deepEqual(plain(release, false, 100), release);
  const go = createGoButton();
  go(press, true, 0);
  go(release, true, 100);
  assert.deepEqual(go(press, true, 200), { kind: 'button', button: 'drift', pressed: true }, 'tap, then press: drift');
  // The steering changed while Drift was held: the release still names Drift.
  assert.deepEqual(go(release, false, 900), { kind: 'button', button: 'drift', pressed: false });
});
