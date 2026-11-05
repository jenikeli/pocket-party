// Unit test for the phone's Item button logic: what describeItemSlot says the button shows for a race view's item.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeItemSlot } from '../../controller/kart/item-slot.js';

test('no item view (items off, 2D race) hides the button', () => {
  assert.equal(describeItemSlot(null).state, 'hidden');
});

test('nothing held is empty, with its effects still shown', () => {
  const effects = [{ item: 'magnet', secondsLeft: 3 }];
  const slot = describeItemSlot({ held: null, rolling: false, effects });
  assert.deepEqual(slot, { state: 'empty', held: null, effects });
});

test('rolling wins over held and empty', () => {
  assert.equal(describeItemSlot({ held: null, rolling: true, effects: [] }).state, 'rolling');
});

test('an id the icons do not know passes through unchanged (the drawing skips it)', () => {
  const effects = [{ item: 'future-item', secondsLeft: 2 }];
  const slot = describeItemSlot({ held: 'future-item', rolling: false, effects });
  assert.equal(slot.held, 'future-item');
  assert.deepEqual(slot.effects, effects);
});

test('effects are passed through while rolling', () => {
  const effects = [{ item: 'push', secondsLeft: 4 }];
  assert.deepEqual(describeItemSlot({ held: null, rolling: true, effects }).effects, effects);
});

test('a held item shows its id', () => {
  const slot = describeItemSlot({ held: 'ramp', rolling: false, effects: [] });
  assert.equal(slot.state, 'held');
  assert.equal(slot.held, 'ramp');
});
