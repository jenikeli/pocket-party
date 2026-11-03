// Unit tests for the CPU catch-up share (M7e) and for kartTopSpeed following a kart's paceShare.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { cpuPaceShare } from '../../host/games/kart-3d/cpu-pace.js';
import { kartTopSpeed } from '../../host/games/kart-3d/kart-driving.js';
import { tuning, setTuning, resetTuning } from '../../host/games/kart-3d/tuning.js';

afterEach(resetTuning);

function assertClose(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);
}

test('the share is 1 at gap 0', () => {
  assert.equal(cpuPaceShare(0), 1);
});

test('a kart behind gains the most at and beyond the range, one ahead loses the most', () => {
  const most = tuning.cpuCatchUp;
  const range = tuning.cpuCatchUpRange;
  assertClose(cpuPaceShare(-range), 1 + most);
  assertClose(cpuPaceShare(-range * 5), 1 + most);
  assertClose(cpuPaceShare(range), 1 - most);
  assertClose(cpuPaceShare(range * 5), 1 - most);
});

test('half the range gives half the effect', () => {
  const half = tuning.cpuCatchUpRange / 2;
  assertClose(cpuPaceShare(-half), 1 + tuning.cpuCatchUp / 2);
  assertClose(cpuPaceShare(half), 1 - tuning.cpuCatchUp / 2);
});

test('it follows a changed tuning value', () => {
  setTuning('cpuCatchUp', 0.1);
  setTuning('cpuCatchUpRange', 100);
  assertClose(cpuPaceShare(-100), 1.1);
  assertClose(cpuPaceShare(50), 0.95);
});

test('strength 0 gives 1 everywhere', () => {
  setTuning('cpuCatchUp', 0);
  for (const gap of [-1000, -50, 0, 50, 1000]) {
    assert.equal(cpuPaceShare(gap), 1);
  }
});

test('kartTopSpeed scales with paceShare and is unchanged at 1', () => {
  const kart = { engineClassShare: 0.9, paceShare: 1 };
  assertClose(kartTopSpeed(kart), tuning.topSpeed * 0.9);
  kart.paceShare = 1.05;
  assertClose(kartTopSpeed(kart), tuning.topSpeed * 0.9 * 1.05);
});
