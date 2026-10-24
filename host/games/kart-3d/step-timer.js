// Measures how long the 3D race's physics steps take on the host device (M6b's question: can the iPad step a
// full field of 12 karts). Keeps the most recent step times and sums them up. Plain data, unit tested in Node.
// Used by host/games/kart-3d/index.js for the host's readout.

// 4 seconds of steps at 60 Hz.
const KEPT_STEPS = 240;

// Returns { record(ms), summary() }. summary() gives { averageMs, worstMs, count } over the kept steps, or null
// before the first one.
export function createStepTimer() {
  const times = [];

  function record(ms) {
    times.push(ms);
    if (times.length > KEPT_STEPS) {
      times.shift();
    }
  }

  function summary() {
    if (times.length === 0) {
      return null;
    }
    const total = times.reduce((sum, ms) => sum + ms, 0);
    return { averageMs: total / times.length, worstMs: Math.max(...times), count: times.length };
  }

  return { record, summary };
}
