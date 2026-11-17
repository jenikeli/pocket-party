// Unit tests for controller/kart/phone-screen.js: which screen the kart phone shows for a view.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneScreen, PHONE_SCREENS } from '../../controller/kart/phone-screen.js';

test('the setup screen until Ready, then the controls while waiting for the race', () => {
  assert.equal(phoneScreen({ phase: 'setup', ready: false }), PHONE_SCREENS.SETUP);
  assert.equal(phoneScreen({ phase: 'setup', ready: true }), PHONE_SCREENS.WAITING);
});

test('the race\'s controls in every race phase, and for a phone with no kart', () => {
  for (const phase of ['countdown', 'racing', 'finished']) {
    assert.equal(phoneScreen({ phase, ready: true }), PHONE_SCREENS.RACE);
  }
  assert.equal(phoneScreen(null), PHONE_SCREENS.RACE);
});
