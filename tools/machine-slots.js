// A few slots shared by every checkout on this machine (the main one and the implementers' worktrees), so only
// that many heavy runs (a headless Chromium drawing WebGL on the CPU) happen at once and the rest wait their
// turn. Used by tools/kit-shots.js. Dev box only.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WAIT_MS = 2000;

// Waits for one of `count` slots called `name` and returns release(). A slot is a directory in the system's temp
// folder: making a directory either succeeds or fails at once, so two runs can never take the same slot. The
// slot holds the owner's process id, so a slot left behind by a run that crashed is taken back.
export async function takeSlot(name, count) {
  let saidWaiting = false;
  for (;;) {
    for (let index = 0; index < count; index += 1) {
      const slot = path.join(os.tmpdir(), `${name}-slot-${index}`);
      if (tryTake(slot)) {
        return () => fs.rmSync(slot, { recursive: true, force: true });
      }
    }
    if (!saidWaiting) {
      console.log(`Waiting for a free ${name} slot (${count} runs at once on this machine)...`);
      saidWaiting = true;
    }
    await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
  }
}

function tryTake(slot) {
  try {
    fs.mkdirSync(slot);
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
    if (ownerIsAlive(slot)) {
      return false;
    }
    fs.rmSync(slot, { recursive: true, force: true });
    return tryTake(slot);
  }
  fs.writeFileSync(path.join(slot, 'pid'), String(process.pid));
  return true;
}

// A slot whose owner has not written its id yet counts as taken (it is being taken right now).
function ownerIsAlive(slot) {
  let pid;
  try {
    pid = Number(fs.readFileSync(path.join(slot, 'pid'), 'utf8'));
  } catch {
    return true;
  }
  try {
    // Signal 0 checks that the process exists without touching it.
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}
