// Unit tests for which design each kart draws (host/games/kart-3d/karts/kart-roster.js): players get their colour
// slot's design, CPU karts the rest, every kart different, and designs repeat only when there are too few.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignDesigns } from '../../host/games/kart-3d/karts/kart-roster.js';

const TWELVE_DESIGNS = Array.from({ length: 12 }, (unused, slot) => ({ id: `design-${slot}`, slot }));

// A race's karts as createRace makes them: the CPU karts first on the grid, then the players.
function karts(cpuCount, playerIds) {
  return [...Array.from({ length: cpuCount }, () => ({ playerId: null })), ...playerIds.map((playerId) => ({ playerId }))];
}

function players(colorIndexes) {
  return new Map(colorIndexes.map((colorIndex, index) => [`p${index}`, { playerId: `p${index}`, colorIndex }]));
}

test('each player drives the design of their colour slot', () => {
  const assigned = assignDesigns(karts(8, ['p0', 'p1', 'p2', 'p3']), players([0, 2, 5, 7]), TWELVE_DESIGNS);
  assert.deepEqual(assigned.slice(8), [0, 2, 5, 7]);
});

test('CPU karts take the designs nobody holds, lowest slot first, so all 12 differ', () => {
  const assigned = assignDesigns(karts(10, ['p0', 'p1']), players([1, 3]), TWELVE_DESIGNS);
  assert.deepEqual(assigned.slice(0, 10), [0, 2, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.equal(new Set(assigned).size, 12);
});

test('a kart whose player has left the room counts as a CPU kart', () => {
  const assigned = assignDesigns(karts(11, ['gone']), new Map(), TWELVE_DESIGNS);
  assert.equal(new Set(assigned).size, 12);
});

test('designs are found by slot, not by their place in the list', () => {
  const shuffled = [{ slot: 7 }, { slot: 0 }, { slot: 3 }];
  const assigned = assignDesigns(karts(2, ['p0']), players([0]), shuffled);
  assert.deepEqual(assigned, [2, 0, 1]);
});

test('with fewer designs than karts the extra karts repeat designs in turn', () => {
  const assigned = assignDesigns(karts(3, ['p0']), players([0]), [{ slot: 0 }, { slot: 1 }]);
  assert.deepEqual(assigned, [1, 0, 1, 0]);
});
