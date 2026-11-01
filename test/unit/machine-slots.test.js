// Unit tests for the machine-wide slots that keep heavy dev runs from all starting at once (tools/machine-slots.js).

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { takeSlot } from '../../tools/machine-slots.js';

const NAME = `pocket-party-test-${process.pid}`;

test('a run waits while every slot is taken, and gets one when a slot is released', async () => {
  const releaseFirst = await takeSlot(NAME, 1);
  let gotSecond = false;
  const second = takeSlot(NAME, 1).then((release) => {
    gotSecond = true;
    return release;
  });
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal(gotSecond, false, 'the second run waits for the slot');
  releaseFirst();
  (await second)();
  assert.equal(gotSecond, true);
});

test('a slot left behind by a process that no longer runs is taken back', async () => {
  const slot = path.join(os.tmpdir(), `${NAME}-stale-slot-0`);
  fs.mkdirSync(slot, { recursive: true });
  // No process has this id (above Linux's largest).
  fs.writeFileSync(path.join(slot, 'pid'), '99999999');
  const release = await takeSlot(`${NAME}-stale`, 1);
  assert.equal(fs.readFileSync(path.join(slot, 'pid'), 'utf8'), String(process.pid));
  release();
});
