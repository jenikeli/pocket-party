// The fixed-timestep maths behind host/game-runner.js: how many 1/60 s rule steps fit into the real time that
// has passed, and how far time has got towards the next one. A plain function, so it is unit tested in Node.

export const STEP_SECONDS = 1 / 60;

// The most real time one frame may catch up on (15 steps). A tab that was in the background, or a long
// garbage-collection pause, would otherwise run thousands of steps at once and freeze the page; instead the
// game simply loses that time, as if it had been paused.
export const MAX_FRAME_SECONDS = 0.25;

// Floating-point sums of 1/60 land a hair under whole steps (2/60 / (1/60) = 1.9999...), which would lose a step.
const EPSILON = 1e-9;

// `leftoverSeconds` is what the previous call returned as leftoverSeconds (0 to start). Returns
// { steps, alpha, leftoverSeconds }: run `steps` steps now, draw at `alpha` (0..1) of the way to the next step,
// and pass leftoverSeconds back in next frame.
export function countSteps(leftoverSeconds, elapsedSeconds) {
  const total = leftoverSeconds + Math.min(Math.max(elapsedSeconds, 0), MAX_FRAME_SECONDS);
  const steps = Math.floor(total / STEP_SECONDS + EPSILON);
  const left = Math.max(total - steps * STEP_SECONDS, 0);
  return { steps, alpha: left / STEP_SECONDS, leftoverSeconds: left };
}
