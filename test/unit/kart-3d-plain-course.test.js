// Unit tests for the plain course setting (host/games/kart-3d/plain-course.js): read from the host's localStorage,
// true only for '1', and false (with the error logged) when storage is missing or throws.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadPlainCourse, PLAIN_COURSE_STORAGE_KEY } from '../../host/games/kart-3d/plain-course.js';

const realStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

function stubStorage(getItem) {
  Object.defineProperty(globalThis, 'localStorage', { value: { getItem }, configurable: true });
}

afterEach(() => {
  if (realStorage) {
    Object.defineProperty(globalThis, 'localStorage', realStorage);
  } else {
    delete globalThis.localStorage;
  }
});

test('the plain course is on only when the stored value is "1", read from its own key', () => {
  const asked = [];
  stubStorage((key) => {
    asked.push(key);
    return '1';
  });
  assert.equal(loadPlainCourse(), true);
  assert.deepEqual(asked, [PLAIN_COURSE_STORAGE_KEY]);
});

test('the plain course is off when nothing or anything else is stored', () => {
  for (const stored of [null, '0', '', 'true']) {
    stubStorage(() => stored);
    assert.equal(loadPlainCourse(), false, `stored ${JSON.stringify(stored)}`);
  }
});

test('the plain course is off, and the error logged, when storage throws', (t) => {
  const logged = t.mock.method(console, 'error', () => {});
  stubStorage(() => {
    throw new Error('blocked');
  });
  assert.equal(loadPlainCourse(), false);
  assert.equal(logged.mock.callCount(), 1);
});

test('the plain course is off when there is no localStorage at all', (t) => {
  t.mock.method(console, 'error', () => {});
  delete globalThis.localStorage;
  assert.equal(loadPlainCourse(), false);
});
