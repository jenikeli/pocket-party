// Unit tests for host/fixed-step.js, the step-counting maths of the game runner (host/game-runner.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STEP_SECONDS, MAX_FRAME_SECONDS, countSteps } from '../../host/fixed-step.js';

// Runs countSteps over a list of frame lengths, as the runner does, and returns the steps of each frame.
function stepsPerFrame(frameSeconds) {
  let leftoverSeconds = 0;
  return frameSeconds.map((elapsed) => {
    const counted = countSteps(leftoverSeconds, elapsed);
    leftoverSeconds = counted.leftoverSeconds;
    return counted.steps;
  });
}

test('a 60 Hz screen runs exactly one step per frame', () => {
  assert.deepEqual(stepsPerFrame(Array(120).fill(STEP_SECONDS)), Array(120).fill(1));
});

test('a slow frame runs several steps at once', () => {
  assert.equal(countSteps(0, 2 * STEP_SECONDS).steps, 2);
  assert.equal(countSteps(0, 3 * STEP_SECONDS).steps, 3);
  // 30 fps: two steps every frame.
  assert.deepEqual(stepsPerFrame(Array(30).fill(1 / 30)), Array(30).fill(2));
});

test('a fast frame runs no step, and the time is kept for the next frame', () => {
  // 120 fps: a step every other frame, and alpha says how far towards the next step time has got.
  assert.deepEqual(stepsPerFrame(Array(8).fill(1 / 120)), [0, 1, 0, 1, 0, 1, 0, 1]);
  const half = countSteps(0, STEP_SECONDS / 2);
  assert.equal(half.steps, 0);
  assert.ok(Math.abs(half.alpha - 0.5) < 1e-9, `alpha ${half.alpha}`);
});

test('over a whole second the step count matches real time, whatever the frame rate', () => {
  for (const fps of [30, 50, 60, 75, 120, 144]) {
    const total = stepsPerFrame(Array(fps).fill(1 / fps)).reduce((sum, steps) => sum + steps, 0);
    assert.ok(Math.abs(total - 60) <= 1, `${fps} fps ran ${total} steps`);
  }
});

test('a long pause (a backgrounded tab) is capped instead of running thousands of steps', () => {
  const maxSteps = Math.floor(MAX_FRAME_SECONDS / STEP_SECONDS + 1e-9);
  assert.equal(countSteps(0, 60).steps, maxSteps);
  assert.equal(countSteps(0, MAX_FRAME_SECONDS).steps, maxSteps);
  // After the capped frame, the game carries on normally.
  assert.deepEqual(stepsPerFrame([600, STEP_SECONDS, STEP_SECONDS]), [maxSteps, 1, 1]);
});

test('a clock going backwards counts as no time', () => {
  assert.deepEqual(countSteps(0, -1), { steps: 0, alpha: 0, leftoverSeconds: 0 });
});
