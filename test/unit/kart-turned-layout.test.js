// Unit tests for controller/kart/turned-layout.js: the stick's mapping in both page orientations, alone and fed
// by controller/inputs/drag.js from a fake surface, as the kart controls use it.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { stickFromDrag } from '../../controller/kart/turned-layout.js';
import * as dragInput from '../../controller/inputs/drag.js';

class FakeSurface extends EventTarget {
  setPointerCapture() {}
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

afterEach(async () => {
  dragInput.stop();
  await wait(40); // let the send throttle window pass
});

test('landscape page (not turned): the stick is the drag as it is', () => {
  const input = { kind: 'drag', x: -0.5, y: 0.25 };
  assert.deepEqual(stickFromDrag(input, false), input);
});

test('portrait page (turned): down the page is the player\'s right, the page\'s right is their up', () => {
  assert.deepEqual(stickFromDrag({ kind: 'drag', x: 0, y: 0.5 }, true), { kind: 'drag', x: 0.5, y: 0 });
  assert.deepEqual(stickFromDrag({ kind: 'drag', x: 0, y: -1 }, true), { kind: 'drag', x: -1, y: 0 });
  assert.deepEqual(stickFromDrag({ kind: 'drag', x: 0.4, y: 0 }, true), { kind: 'drag', x: 0, y: -0.4 });
});

test('a centred stick stays exactly 0 when turned (not -0)', () => {
  const stick = stickFromDrag({ kind: 'drag', x: 0, y: 0 }, true);
  assert.ok(Object.is(stick.x, 0) && Object.is(stick.y, 0));
});

// The thumb moving toward the phone's bottom end, held top end left, moves right in the player's eyes: on the
// portrait page that is down the page (clientY grows).
test('fed by drag.js: a thumb moved down the page steers right when turned, and not at all unturned', async () => {
  const surface = new FakeSurface();
  const sent = [];
  dragInput.onInput((input) => sent.push(input));
  dragInput.start(surface);
  const pointer = (type, clientX, clientY) =>
    surface.dispatchEvent(Object.assign(new Event(type), { pointerId: 1, clientX, clientY }));
  pointer('pointerdown', 100, 100);
  pointer('pointermove', 100, 140);
  await wait(10);
  assert.deepEqual(stickFromDrag(sent.at(-1), true), { kind: 'drag', x: 0.5, y: 0 });
  assert.equal(stickFromDrag(sent.at(-1), false).x, 0);
});
