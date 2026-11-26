// Unit tests for the Saltline particle simulation (host/games/fps/effects-pool.js): spawning reuses the oldest slot,
// gravity pulls particles down, and a particle fades in, fades out and ends invisible.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createParticles } from '../../host/games/fps/effects-pool.js';

const KIND = { life: 1, size: 0.1, grav: 10, drag: 0, r: 1, g: 0.5, b: 0.2, a: 0.8 };

test('effects pool: gravity pulls a particle down and it ends invisible', () => {
  const pool = createParticles(4);
  const i = pool.spawn(KIND, 0, 5, 0, 0, 0, 0);
  pool.step(0.1);
  assert.ok(pool.pos[i * 3 + 1] < 5);
  // Float32 alpha stores 0.8 with a tiny rounding step; keep the cap assertion tolerant.
  assert.ok(pool.color[i * 4 + 3] > 0 && pool.color[i * 4 + 3] <= 0.800001);
  for (let t = 0; t < 20; t++) pool.step(0.1);
  assert.equal(pool.size[i], 0);
  assert.equal(pool.color[i * 4 + 3], 0);
});

test('effects pool: the ring reuses the oldest slot when full', () => {
  const pool = createParticles(3);
  const slots = [0, 1, 2, 3].map(() => pool.spawn(KIND, 0, 0, 0, 0, 0, 0));
  assert.deepEqual(slots, [0, 1, 2, 0]);
});
