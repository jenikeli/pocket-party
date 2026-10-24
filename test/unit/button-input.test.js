// Unit tests for controller/inputs/button.js: press and release of held buttons, several fingers, and stop().
// button.js only needs addEventListener and closest(), so Node runs it with fake elements.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as buttonInput from '../../controller/inputs/button.js';

// Stands in for the pedals element.
class FakeSurface extends EventTarget {
  setPointerCapture() {}
}

// Stands in for an element inside the surface; `button` is its data-button, or undefined for a gap.
function fakeTarget(button) {
  return { closest: () => (button ? { dataset: { button } } : null) };
}

let surface;
let sent;

function pointer(type, pointerId, button) {
  const event = Object.assign(new Event(type), { pointerId });
  // dispatchEvent would set target to the surface itself; the real one is the element the finger landed on.
  Object.defineProperty(event, 'target', { value: fakeTarget(button) });
  surface.dispatchEvent(event);
}

beforeEach(() => {
  surface = new FakeSurface();
  sent = [];
  buttonInput.onInput((value) => sent.push(value));
  buttonInput.start(surface);
});

afterEach(() => buttonInput.stop());

test('pressing and lifting a finger sends pressed true, then false', () => {
  pointer('pointerdown', 1, 'accelerate');
  pointer('pointerup', 1);
  assert.deepEqual(sent, [
    { kind: 'button', button: 'accelerate', pressed: true },
    { kind: 'button', button: 'accelerate', pressed: false },
  ]);
});

test('two fingers hold two buttons at once, each released on its own', () => {
  pointer('pointerdown', 1, 'accelerate');
  pointer('pointerdown', 2, 'brake');
  pointer('pointerup', 2);
  assert.deepEqual(sent.map((input) => `${input.button} ${input.pressed}`), [
    'accelerate true',
    'brake true',
    'brake false',
  ]);
});

test('a button held by two fingers is released only when the last one lifts', () => {
  pointer('pointerdown', 1, 'accelerate');
  pointer('pointerdown', 2, 'accelerate');
  pointer('pointerup', 1);
  assert.equal(sent.length, 1);
  pointer('pointercancel', 2);
  assert.deepEqual(sent.at(-1), { kind: 'button', button: 'accelerate', pressed: false });
});

test('touches between the buttons are ignored', () => {
  pointer('pointerdown', 1, undefined);
  pointer('pointerup', 1);
  assert.deepEqual(sent, []);
});

test('stop releases anything still held, so the host is never left with a stuck button', () => {
  pointer('pointerdown', 1, 'accelerate');
  buttonInput.stop();
  assert.deepEqual(sent.at(-1), { kind: 'button', button: 'accelerate', pressed: false });
});
