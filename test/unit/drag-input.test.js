// Unit tests for controller/inputs/drag.js: stick values, clamping, release, and send throttling.
// drag.js only needs addEventListener, setTimeout and performance.now, so Node can run it with a fake surface.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as dragInput from '../../controller/inputs/drag.js';

// Stands in for the drag pad element.
class FakeSurface extends EventTarget {
  setPointerCapture() {}
}

let surface;
let sent; // [{ value, at }] in the order drag.js handed them to the callback

function pointer(type, pointerId, clientX, clientY) {
  surface.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX, clientY }));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  surface = new FakeSurface();
  sent = [];
  dragInput.onInput((value) => sent.push({ value, at: performance.now() }));
  dragInput.start(surface);
});

afterEach(async () => {
  dragInput.stop();
  // Let the throttle window pass so the next test starts fresh.
  await wait(40);
});

test('sends how far the finger moved, as a fraction of the 80 px radius', async () => {
  pointer('pointerdown', 1, 100, 100);
  pointer('pointermove', 1, 140, 80);
  await wait(10);
  assert.deepEqual(sent.map((entry) => entry.value), [{ kind: 'drag', x: 0.5, y: -0.25 }]);
});

test('clamps to a circle, so a diagonal drag past the radius has length 1', async () => {
  pointer('pointerdown', 1, 0, 0);
  // 100 px each way is past the radius on both axes (1.25), but must still come out at length 1.
  pointer('pointermove', 1, 100, 100);
  await wait(10);
  assert.deepEqual(sent[0].value, { kind: 'drag', x: 0.71, y: 0.71 });
});

test('lifting the finger sends 0, 0, even right after a move', async () => {
  pointer('pointerdown', 1, 0, 0);
  pointer('pointermove', 1, 80, 0);
  await wait(10);
  pointer('pointermove', 1, 60, 0);
  pointer('pointerup', 1, 60, 0);
  await wait(50);
  assert.deepEqual(sent.at(-1).value, { kind: 'drag', x: 0, y: 0 });
});

test('pointercancel counts as lifting the finger', async () => {
  pointer('pointerdown', 1, 0, 0);
  pointer('pointermove', 1, 80, 0);
  pointer('pointercancel', 1, 80, 0);
  await wait(50);
  assert.deepEqual(sent.at(-1).value, { kind: 'drag', x: 0, y: 0 });
});

test('a burst of moves sends only the newest value', async () => {
  pointer('pointerdown', 1, 0, 0);
  for (let x = 1; x <= 40; x += 1) {
    pointer('pointermove', 1, x, 0);
  }
  await wait(10);
  assert.deepEqual(sent.map((entry) => entry.value), [{ kind: 'drag', x: 0.5, y: 0 }]);
});

test('sends at most about every 33 ms', async () => {
  pointer('pointerdown', 1, 0, 0);
  for (let i = 1; i <= 15; i += 1) {
    pointer('pointermove', 1, i, 0);
    await wait(5);
  }
  await wait(40);
  // Moves for ~75 ms, then the last queued value goes out: roughly 4 sends, 0-33-66-99 ms.
  assert.ok(sent.length >= 3 && sent.length <= 5, `expected 3-5 sends, got ${sent.length}`);
  for (let i = 1; i < sent.length; i += 1) {
    // A little slack for timer jitter.
    assert.ok(sent[i].at - sent[i - 1].at >= 30, `sends ${i - 1} and ${i} were too close`);
  }
  assert.deepEqual(sent.at(-1).value, { kind: 'drag', x: 0.19, y: 0 });
});

test('only the first finger steers', async () => {
  pointer('pointerdown', 1, 0, 0);
  pointer('pointerdown', 2, 500, 500);
  pointer('pointermove', 2, 600, 600);
  pointer('pointerup', 2, 600, 600);
  await wait(50);
  assert.deepEqual(sent, []);
});

test('stop() removes the listeners', async () => {
  dragInput.stop();
  pointer('pointerdown', 1, 0, 0);
  pointer('pointermove', 1, 80, 0);
  await wait(50);
  assert.deepEqual(sent, []);
});
