// Unit tests for controller/inputs/tilt.js: the permission flow, calibration, smoothing, clamping and the
// no-sensor timeout. Node has no window, so the tests give it a fake one that they fire orientation events on.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as tiltInput from '../../controller/inputs/tilt.js';

let sent;

function orientation(beta, gamma) {
  window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma }));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  globalThis.window = new EventTarget();
  window.DeviceOrientationEvent = class {};
  globalThis.DeviceOrientationEvent = window.DeviceOrientationEvent;
  sent = [];
  tiltInput.onInput((value) => sent.push(value));
});

afterEach(async () => {
  tiltInput.stop();
  delete globalThis.window;
  delete globalThis.DeviceOrientationEvent;
  await wait(40); // let the send throttle window pass
});

test('requestAccess: no DeviceOrientationEvent (plain HTTP) is "unsupported"', async () => {
  delete window.DeviceOrientationEvent;
  assert.equal(await tiltInput.requestAccess(), 'unsupported');
});

test('requestAccess: without a permission API, access is granted straight away', async () => {
  assert.equal(await tiltInput.requestAccess(), 'granted');
});

test('requestAccess: passes on the answer of requestPermission, and treats a rejection as denied', async () => {
  DeviceOrientationEvent.requestPermission = async () => 'granted';
  assert.equal(await tiltInput.requestAccess(), 'granted');
  DeviceOrientationEvent.requestPermission = async () => 'denied';
  assert.equal(await tiltInput.requestAccess(), 'denied');
  DeviceOrientationEvent.requestPermission = async () => {
    throw new Error('NotAllowedError: not from a user gesture');
  };
  const originalError = console.error;
  console.error = () => {}; // the rejection is logged on purpose; keep the test output clean
  try {
    assert.equal(await tiltInput.requestAccess(), 'denied');
  } finally {
    console.error = originalError;
  }
});

test('requestAccess calls requestPermission synchronously, so it still runs inside the tap', () => {
  let called = false;
  DeviceOrientationEvent.requestPermission = () => {
    called = true;
    return Promise.resolve('granted');
  };
  tiltInput.requestAccess();
  assert.equal(called, true);
});

test('start resolves true on the first real reading, and that pose becomes zero', async () => {
  const started = tiltInput.start();
  orientation(null, null); // a browser without a sensor sends this; it must not count
  orientation(40, -10);
  assert.equal(await started, true);
  await wait(40);
  assert.deepEqual(sent.at(-1), { kind: 'tilt', x: 0, y: 0 });
});

test('start resolves false when no real reading arrives within 2 seconds', async () => {
  const started = tiltInput.start();
  orientation(null, null);
  assert.equal(await started, false);
});

test('tilting moves the value toward the new pose smoothly and clamps at 25 degrees', async () => {
  const started = tiltInput.start();
  orientation(0, 0);
  await started;
  // Tilt the right edge down 12.5 degrees: halfway, but the smoothing only goes part of the way at first.
  orientation(0, 12.5);
  await wait(40);
  const firstStep = sent.at(-1).x;
  assert.ok(firstStep > 0 && firstStep < 0.5, `first step ${firstStep}`);
  for (let i = 0; i < 30; i += 1) {
    orientation(-60, 12.5); // top edge far away from you: past the full tilt on y
  }
  await wait(40);
  assert.deepEqual(sent.at(-1), { kind: 'tilt', x: 0.5, y: -1 });
});

test('beta wrapping from 180 to -180 counts as a small tilt, not a full turn', async () => {
  const started = tiltInput.start();
  orientation(175, 0);
  await started;
  for (let i = 0; i < 30; i += 1) {
    orientation(-175, 0); // 10 degrees further, across the wrap
  }
  await wait(40);
  assert.deepEqual(sent.at(-1), { kind: 'tilt', x: 0, y: 0.4 });
});

test('calibrate makes the current pose the new zero', async () => {
  const started = tiltInput.start();
  orientation(0, 0);
  await started;
  for (let i = 0; i < 30; i += 1) {
    orientation(20, 10);
  }
  await wait(40);
  assert.notDeepEqual(sent.at(-1), { kind: 'tilt', x: 0, y: 0 });
  tiltInput.calibrate();
  await wait(40);
  assert.deepEqual(sent.at(-1), { kind: 'tilt', x: 0, y: 0 });
});

test('stop() stops listening and ends a pending start with false', async () => {
  const started = tiltInput.start();
  tiltInput.stop();
  assert.equal(await started, false);
  orientation(10, 10);
  await wait(40);
  assert.deepEqual(sent, []);
});
