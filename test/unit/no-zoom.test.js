// Tests controller/no-zoom.js: the zoom gestures' defaults are cancelled, other events are left alone.

import test from 'node:test';
import assert from 'node:assert/strict';
import { blockZoomGestures } from '../../controller/no-zoom.js';

function fire(target, eventName) {
  const event = new Event(eventName, { cancelable: true });
  target.dispatchEvent(event);
  return event;
}

test('double tap and the iOS pinch gestures are cancelled', () => {
  const target = new EventTarget();
  blockZoomGestures(target);
  for (const eventName of ['dblclick', 'gesturestart', 'gesturechange', 'gestureend']) {
    assert.equal(fire(target, eventName).defaultPrevented, true, eventName);
  }
});

test('other events keep their defaults', () => {
  const target = new EventTarget();
  blockZoomGestures(target);
  for (const eventName of ['click', 'submit', 'keydown']) {
    assert.equal(fire(target, eventName).defaultPrevented, false, eventName);
  }
});
