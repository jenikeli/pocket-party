// Unit tests for the UI pieces the host and the phone share: the icon set (shared/icons.js) and confirming by
// colour (shared/confirm-click.js), against a small fake button and page.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { icon, ICON_NAMES } from '../../shared/icons.js';
import { confirmOnSecondClick } from '../../shared/confirm-click.js';

test('every icon of the set is an SVG in currentColor, hidden from screen readers', () => {
  const expected = ['back', 'close', 'gear', 'add-players', 'user', 'check', 'stick', 'tilt', 'go-button', 'auto'];
  expected.push('again', 'minus', 'plus', 'play', 'leave');
  assert.deepEqual([...ICON_NAMES].sort(), expected.sort());
  for (const name of ICON_NAMES) {
    const svg = icon(name);
    assert.match(svg, /^<svg class="pp-icon" viewBox="0 0 24 24"/, name);
    assert.match(svg, /stroke="currentColor"/, name);
    assert.match(svg, /aria-hidden="true"/, name);
    assert.match(svg, /<\/svg>$/, name);
  }
  assert.throws(() => icon('rocket'), /No icon named/);
});

// A button and its page with only what confirm-click.js uses. click() and press(target) play the user.
function fakeButton() {
  const classes = new Set();
  const pageListeners = new Set();
  let onClick = null;
  const button = {
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name) },
    contains: (target) => target === button,
    addEventListener: (type, listener) => (onClick = listener),
    ownerDocument: {
      addEventListener: (type, listener) => pageListeners.add(listener),
      removeEventListener: (type, listener) => pageListeners.delete(listener),
    },
  };
  return {
    button,
    click: () => onClick(),
    press: (target) => [...pageListeners].forEach((listener) => listener({ target })),
    isArmed: () => classes.has('armed'),
    pageListenerCount: () => pageListeners.size,
  };
}

test('the first click arms the control and the second confirms', () => {
  const fake = fakeButton();
  let confirmed = 0;
  confirmOnSecondClick(fake.button, () => confirmed++);
  fake.click();
  assert.equal(fake.isArmed(), true);
  assert.equal(confirmed, 0);
  // The press that starts the second click lands on the button itself and must not disarm it.
  fake.press(fake.button);
  fake.click();
  assert.equal(confirmed, 1);
  assert.equal(fake.isArmed(), false);
  assert.equal(fake.pageListenerCount(), 0, 'nothing listens on the page once disarmed');
});

test('a press anywhere else, 3 seconds, or disarm() puts the control back', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fake = fakeButton();
  let confirmed = 0;
  const confirm = confirmOnSecondClick(fake.button, () => confirmed++);

  fake.click();
  fake.press({});
  assert.equal(fake.isArmed(), false, 'a press elsewhere disarms');
  fake.click();
  assert.equal(confirmed, 0, 'the click after a disarm only arms again');

  t.mock.timers.tick(2999);
  assert.equal(fake.isArmed(), true);
  t.mock.timers.tick(1);
  assert.equal(fake.isArmed(), false, '3 seconds disarm');

  fake.click();
  confirm.disarm();
  assert.equal(fake.isArmed(), false);
  fake.click();
  t.mock.timers.tick(3000);
  assert.equal(confirmed, 0);
  assert.equal(fake.pageListenerCount(), 0);
});
