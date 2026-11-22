// Unit test for tools/balance-sim.js: a few headless matches finish and the report covers every card.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runBalance } from '../../tools/balance-sim.js';
import { CARDS } from '../../shared/arena-cards.js';

test('balance-sim: a few matches finish and the report lists every card with a win rate between 0 and 1', () => {
  const report = runBalance({ matches: 3, level: 2, seed: 4 });
  assert.equal(report.byCard.length, CARDS.length);
  assert.ok(!('unfinished' in report.reasons));
  assert.ok(report.byCard.every((card) => card.winRate >= 0 && card.winRate <= 1));
  assert.ok(report.averageSeconds > 30);
});
