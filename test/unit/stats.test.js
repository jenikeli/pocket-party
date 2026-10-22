// Unit tests for the input lab's numbers: shared/rate-meter.js and host/latency-stats.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateMeter } from '../../shared/rate-meter.js';
import { createRoundTripStats, createJitterMeter } from '../../host/latency-stats.js';

test('rate meter counts the events in the last second', () => {
  const meter = createRateMeter();
  for (let time = 0; time < 1000; time += 33) {
    meter.record(time);
  }
  assert.equal(meter.perSecond(990), 31);
  // Half a second later, the first half of those events has left the window.
  assert.equal(meter.perSecond(1500), 15);
  assert.equal(meter.perSecond(5000), 0);
});

test('round-trip stats: none yet is null, then last / average / max of the newest 10', () => {
  const stats = createRoundTripStats();
  assert.equal(stats.summary(), null);
  stats.add(500); // pushed out by the ten below
  for (const ms of [20, 30, 40, 20, 30, 40, 20, 30, 40, 31.6]) {
    stats.add(ms);
  }
  assert.deepEqual(stats.summary(), { last: 32, average: 30, max: 40 });
});

test('jitter is the spread of (received - sent) over the last second, whatever the clock difference', () => {
  const meter = createJitterMeter();
  // The phone's clock is 5000 ms behind the host's; one-way delays are 20, 35 and 25 ms.
  meter.record(10_000, 10_000 - 5000 - 20);
  assert.equal(meter.spread(10_000), null);
  meter.record(10_033, 10_033 - 5000 - 35);
  meter.record(10_066, 10_066 - 5000 - 25);
  assert.equal(meter.spread(10_066), 15);
  assert.equal(meter.spread(20_000), null);
});
