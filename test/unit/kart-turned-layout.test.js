// Unit tests for controller/kart/turned-layout.js: the stick's mapping in both page orientations, alone and fed
// by controller/inputs/drag.js from a fake surface, as the kart controls use it, and where a touch lands in a
// turned box (the floating stick).

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { stickFromDrag, pointInTurnedBox } from '../../controller/kart/turned-layout.js';
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

// The stick zone as getBoundingClientRect() gives it: on the page, 100 to 300 across and 50 to 450 down.
const ZONE_BOX = { left: 100, top: 50, right: 300, bottom: 450 };

test('a touch in a box that is not turned is measured from its top left corner', () => {
  assert.deepEqual(pointInTurnedBox(130, 70, ZONE_BOX, false), { x: 30, y: 20 });
});

test('turned, a touch at the box\'s top right on the page is its own top left, and down the page is its own right', () => {
  assert.deepEqual(pointInTurnedBox(300, 50, ZONE_BOX, true), { x: 0, y: 0 });
  assert.deepEqual(pointInTurnedBox(300, 450, ZONE_BOX, true), { x: 400, y: 0 });
  assert.deepEqual(pointInTurnedBox(100, 50, ZONE_BOX, true), { x: 0, y: 200 });
});
