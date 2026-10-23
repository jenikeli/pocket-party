// The frame loop for a running game: each animation frame it runs as many fixed 1/60 s steps as the real time
// allows, then draws once, then asks the game whether it is done. Used by host/game-session.js.

// Relative, not /host/..., so the unit tests can load this file in Node.
import { STEP_SECONDS, countSteps } from './fixed-step.js';

// `game` follows the game module interface in plan.md. `onDone(error)` runs once, when the game says it is
// done (error null) or when step or render threw (the error); the loop has stopped by then.
// Returns { stop() } for ending the game from outside (End game, Close room).
export function startGameRunner(game, onDone) {
  let frameId = null;
  let lastFrameTime = null;
  let leftoverSeconds = 0;

  // `now` is the requestAnimationFrame timestamp in ms. A browser does not call requestAnimationFrame for a
  // hidden tab, so coming back gives one long frame, which countSteps caps.
  function frame(now) {
    const elapsedSeconds = lastFrameTime === null ? 0 : (now - lastFrameTime) / 1000;
    lastFrameTime = now;
    try {
      const counted = countSteps(leftoverSeconds, elapsedSeconds);
      leftoverSeconds = counted.leftoverSeconds;
      for (let i = 0; i < counted.steps; i += 1) {
        game.step(STEP_SECONDS);
      }
      game.render(counted.alpha);
      if (game.isDone()) {
        onDone(null);
        return;
      }
    } catch (error) {
      onDone(error);
      return;
    }
    frameId = requestAnimationFrame(frame);
  }

  frameId = requestAnimationFrame(frame);
  return { stop: () => cancelAnimationFrame(frameId) };
}
