// Unit tests for host/game-runner.js, with a hand-driven requestAnimationFrame so each frame's time is chosen
// by the test. The step maths itself is tested in fixed-step.test.js.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { startGameRunner } from '../../host/game-runner.js';
import { STEP_SECONDS } from '../../host/fixed-step.js';

// The callback the runner asked for, or null. runFrame(ms) calls it as the browser would.
let pendingFrame = null;

function runFrame(timeMs) {
  const callback = pendingFrame;
  pendingFrame = null;
  callback(timeMs);
}

beforeEach(() => {
  globalThis.requestAnimationFrame = (callback) => {
    pendingFrame = callback;
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {
    pendingFrame = null;
  };
});

afterEach(() => {
  delete globalThis.requestAnimationFrame;
  delete globalThis.cancelAnimationFrame;
});

// A game that records each call as 'step' or 'render', and is done once `done` is set.
function recordingGame() {
  const calls = [];
  return {
    calls,
    done: false,
    step(dt) {
      assert.equal(dt, STEP_SECONDS);
      calls.push('step');
    },
    render() {
      calls.push('render');
    },
    isDone() {
      return this.done;
    },
  };
}

test('each frame runs the steps that fit, then renders once', () => {
  const game = recordingGame();
  startGameRunner(game, () => assert.fail('the game should not end'));
  // The first frame only sets the clock.
  runFrame(1000);
  assert.deepEqual(game.calls, ['render']);
  game.calls.length = 0;
  // 50 ms later: three 1/60 s steps fit.
  runFrame(1050);
  assert.deepEqual(game.calls, ['step', 'step', 'step', 'render']);
  assert.notEqual(pendingFrame, null);
});

test('when the game says it is done, the loop stops and onDone gets no error', () => {
  const game = recordingGame();
  let doneWith;
  startGameRunner(game, (error) => (doneWith = error));
  runFrame(0);
  game.done = true;
  runFrame(20);
  assert.equal(doneWith, null);
  assert.equal(pendingFrame, null);
});

test('a game that throws ends the loop, and onDone gets the error', () => {
  const game = recordingGame();
  game.render = () => {
    throw new Error('boom');
  };
  let doneWith;
  startGameRunner(game, (error) => (doneWith = error));
  runFrame(0);
  assert.equal(doneWith.message, 'boom');
  assert.equal(pendingFrame, null);
});

test('stop() ends the loop from outside', () => {
  const game = recordingGame();
  const runner = startGameRunner(game, () => assert.fail('stop() should not call onDone'));
  runFrame(0);
  runner.stop();
  assert.equal(pendingFrame, null);
});
