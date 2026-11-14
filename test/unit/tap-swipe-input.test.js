// Unit tests for controller/inputs/tap.js and swipe.js: what each gesture sends, and what it ignores.
// Both only need addEventListener and performance.now, so Node runs them with a fake surface.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as tapInput from '../../controller/inputs/tap.js';
import * as swipeInput from '../../controller/inputs/swipe.js';

// Stands in for the input pad: 400 x 300 CSS px, so the swipe speed is measured against 300 px.
class FakeSurface extends EventTarget {
  setPointerCapture() {}
  getBoundingClientRect() {
    return { width: 400, height: 300 };
  }
}

let surface;
let sent;

function pointer(type, pointerId, clientX = 0, clientY = 0) {
  surface.dispatchEvent(Object.assign(new Event(type), { pointerId, clientX, clientY }));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  surface = new FakeSurface();
  sent = [];
  tapInput.onInput((value) => sent.push(value));
  swipeInput.onInput((value) => sent.push(value));
});

afterEach(() => {
  tapInput.stop();
  swipeInput.stop();
});

test('tap: every finger landing sends a tap at once, including a second finger', () => {
  tapInput.start(surface);
  pointer('pointerdown', 1);
  pointer('pointerdown', 2);
  pointer('pointerup', 1);
  assert.deepEqual(sent, [{ kind: 'tap' }, { kind: 'tap' }]);
});

test('tap: stop() removes the listener', () => {
  tapInput.start(surface);
  tapInput.stop();
  pointer('pointerdown', 1);
  assert.deepEqual(sent, []);
});

test('swipe: a quick flick sends its direction, unit vector and speed on release', async () => {
  swipeInput.start(surface);
  pointer('pointerdown', 1, 100, 200);
  await wait(100);
  pointer('pointerup', 1, 100, 50);
  assert.equal(sent.length, 1);
  const { kind, direction, x, y, speed } = sent[0];
  assert.deepEqual({ kind, direction, x, y }, { kind: 'swipe', direction: 'up', x: 0, y: -1 });
  // 150 px is half the 300 px surface, in about 0.1 s: about 5 surfaces per second. Timers usually add a little,
  // but Node can also fire the 100 ms timer a fraction early (a run gave 5.01), hence the small margin above 5.
  assert.ok(speed > 3.5 && speed <= 5.1, `speed ${speed}`);
});

test('swipe: the axis that moved most decides the direction', () => {
  swipeInput.start(surface);
  pointer('pointerdown', 1, 0, 0);
  pointer('pointerup', 1, -80, 30);
  assert.equal(sent[0].direction, 'left');
  pointer('pointerdown', 1, 0, 0);
  pointer('pointerup', 1, 20, 60);
  assert.equal(sent[1].direction, 'down');
});

test('swipe: a short movement or a slow drag is not a swipe', async () => {
  swipeInput.start(surface);
  pointer('pointerdown', 1, 0, 0);
  pointer('pointerup', 1, 20, 0);
  pointer('pointerdown', 1, 0, 0);
  await wait(650);
  pointer('pointerup', 1, 200, 0);
  assert.deepEqual(sent, []);
});

test('swipe: pointercancel (the browser took the touch) sends nothing', () => {
  swipeInput.start(surface);
  pointer('pointerdown', 1, 0, 0);
  pointer('pointercancel', 1, 200, 0);
  pointer('pointerup', 1, 200, 0);
  assert.deepEqual(sent, []);
});

test('swipe: only the first finger counts', () => {
  swipeInput.start(surface);
  pointer('pointerdown', 1, 0, 0);
  pointer('pointerdown', 2, 0, 0);
  pointer('pointerup', 2, 200, 0);
  assert.deepEqual(sent, []);
});
