// Frame-time numbers for the M6a spike: the live readout over the last couple of seconds, and the summary of a
// benchmark run. Plain maths (no DOM), unit tested in Node. Used by the spike's panel and benchmark.js.

// Summarises frame intervals in ms: { fps, averageMs, p95Ms, worstMs, count }. p95 is the interval 95% of
// frames beat; with a steady frame rate it stays close to the average, so it shows uneven pacing.
export function summarizeFrames(intervals) {
  if (intervals.length === 0) {
    return { fps: 0, averageMs: 0, p95Ms: 0, worstMs: 0, count: 0 };
  }
  const sorted = [...intervals].sort((a, b) => a - b);
  const averageMs = average(sorted);
  return {
    fps: 1000 / averageMs,
    averageMs,
    p95Ms: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))],
    worstMs: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

export function average(values) {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Keeps the samples of the last `windowMs`, for the live readout. A sample is { at, frameMs, renderMs }.
export function createRecentFrames(windowMs = 2000) {
  const samples = [];

  function record(at, frameMs, renderMs) {
    samples.push({ at, frameMs, renderMs });
    while (samples.length > 0 && samples[0].at < at - windowMs) {
      samples.shift();
    }
  }

  function summary() {
    return {
      ...summarizeFrames(samples.map((sample) => sample.frameMs)),
      renderMs: average(samples.map((sample) => sample.renderMs)),
    };
  }

  return { record, summary };
}
