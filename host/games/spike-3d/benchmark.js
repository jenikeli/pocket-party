// The M6a spike's benchmark: runs the scene in a list of settings one after another, measures each, and
// formats a table to copy into docs/3d-findings.md. Plain data and maths (no DOM), unit tested in Node. Driven
// once per drawn frame from the spike's render().

import { summarizeFrames, average } from './frame-stats.js';

// The look's costs that the panel switches on and off, in the order the table lists them.
export const LOOK_SWITCHES = ['shadows', 'glossy', 'bloom', 'particles', 'detailedKarts'];

// Each setting runs WARMUP first (shader compiles and caches settle), then FRAMES (frame intervals as the
// screen shows them), then BUSY (each frame waits for the GPU, which shows the real cost of a frame even when
// it is under the display's 16.7 ms: a 60 Hz screen never gives intervals below that).
const PHASE_MS = { warmup: 1000, frames: 2500, busy: 1000 };
const NEXT_PHASE = { warmup: 'frames', frames: 'busy', busy: 'warmup' };

const PLAIN = { karts: 12, shadows: false, glossy: false, bloom: false, particles: false, detailedKarts: false, fullResolution: false, cap30: false };
const FULL_LOOK = { ...PLAIN, shadows: true, glossy: true, bloom: true, particles: true, detailedKarts: true };

// For 1, 2 and 4 views: plain, each cost alone, the full look, and both at the device's pixel ratio. Then the
// full look with 4 views and fewer karts, to find how many karts the device can carry.
export function benchmarkConfigs() {
  const configs = [];
  for (const views of [1, 2, 4]) {
    configs.push({ label: `${views} view plain`, settings: { ...PLAIN, views } });
    for (const name of LOOK_SWITCHES) {
      configs.push({ label: `${views} view + ${name}`, settings: { ...PLAIN, views, [name]: true } });
    }
    configs.push({ label: `${views} view full look`, settings: { ...FULL_LOOK, views } });
    configs.push({ label: `${views} view full look, full res`, settings: { ...FULL_LOOK, views, fullResolution: true } });
    configs.push({ label: `${views} view plain, full res`, settings: { ...PLAIN, views, fullResolution: true } });
  }
  for (const karts of [8, 4]) {
    configs.push({ label: `4 view full look, ${karts} karts`, settings: { ...FULL_LOOK, views: 4, karts } });
  }
  return configs;
}

export function createBenchmark(configs) {
  return { configs, index: 0, phase: 'warmup', phaseStartedAt: null, frameSamples: [], busySamples: [], results: [] };
}

// Called once per drawn frame with the time (ms), the interval since the last drawn frame, and how long the
// last frame took with a GPU wait (null if it did not wait). Returns what to draw next, { settings,
// measureBusy }, or null once every setting has been measured (the table is then in bench.results).
export function advanceBenchmark(bench, now, frameMs, busyMs) {
  if (bench.phaseStartedAt === null) {
    bench.phaseStartedAt = now;
  }
  if (bench.phase === 'frames') {
    bench.frameSamples.push(frameMs);
  } else if (bench.phase === 'busy' && busyMs !== null) {
    bench.busySamples.push(busyMs);
  }
  if (now - bench.phaseStartedAt >= PHASE_MS[bench.phase]) {
    moveToNextPhase(bench, now);
  }
  if (bench.index >= bench.configs.length) {
    return null;
  }
  return { settings: bench.configs[bench.index].settings, measureBusy: bench.phase === 'busy' };
}

function moveToNextPhase(bench, now) {
  if (bench.phase === 'busy') {
    bench.results.push({
      label: bench.configs[bench.index].label,
      ...summarizeFrames(bench.frameSamples),
      busyMs: average(bench.busySamples),
    });
    bench.index += 1;
    bench.frameSamples = [];
    bench.busySamples = [];
  }
  bench.phase = NEXT_PHASE[bench.phase];
  bench.phaseStartedAt = now;
}

// A plain-text table (fixed-width columns), with the device described in `deviceLines` above it.
export function formatResults(results, deviceLines) {
  const header = `${'setting'.padEnd(36)} ${'fps'.padStart(5)} ${'avg ms'.padStart(7)} ${'p95 ms'.padStart(7)} ${'worst'.padStart(7)} ${'busy ms'.padStart(8)}`;
  const rows = results.map(
    (row) =>
      `${row.label.padEnd(36)} ${row.fps.toFixed(1).padStart(5)} ${row.averageMs.toFixed(1).padStart(7)} ` +
      `${row.p95Ms.toFixed(1).padStart(7)} ${row.worstMs.toFixed(1).padStart(7)} ${row.busyMs.toFixed(1).padStart(8)}`,
  );
  return [...deviceLines, '', header, ...rows].join('\n');
}
