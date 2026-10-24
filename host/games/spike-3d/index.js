// The 3D performance spike (M6a), a throwaway developer tool in the lobby's list: 12 scripted karts on a looping
// road drawn with Three.js in 1, 2 or 4 split-screen views, with a switch for each cost of an MK8DX-like look
// and a benchmark, to measure what the host device can afford. Loaded through host/games/index.js and run by
// the shell (host/game-session.js). M7 removes it.

import { createKarts, stepKarts } from './kart-paths.js';
import { createRecentFrames } from './frame-stats.js';
import { benchmarkConfigs, createBenchmark, advanceBenchmark, formatResults } from './benchmark.js';
import { timeImport } from './load-timing.js';
import { createPanel } from './panel.js';

// With the cap on, a frame is drawn only once this long has passed since the last one. A little under 1/30 s,
// because animation frames arrive with a few ms of jitter: on a 60 Hz screen that draws every other frame.
const CAP_INTERVAL_MS = 1000 / 30 - 4;
const READOUT_INTERVAL_MS = 500;
// Starts plain, the baseline each cost is measured against; the panel adds them one by one.
const DEFAULT_SETTINGS = Object.freeze({
  views: 1, karts: 12, shadows: false, glossy: false, bloom: false, particles: false, detailedKarts: false,
  fullResolution: false, cap30: false,
});

// Returns a fresh spike that follows the game module interface in plan.md.
export function createGame() {
  let rendererModule = null;
  let loadTiming = null;
  let spike = null;
  let panel = null;
  const karts = createKarts();
  let settings = { ...DEFAULT_SETTINGS };
  const recentFrames = createRecentFrames();
  let lastDrawAt = null;
  let lastReadoutAt = 0;
  let firstFrameMs = null;
  let buildMs = 0;
  // While it runs, the benchmark picks the settings for each frame and whether to wait for the GPU.
  let benchmark = null;
  let measureBusy = false;
  let lastBusyMs = null;

  // Three.js is fetched here, not when the lobby loads, and timed (see load-timing.js).
  async function load() {
    const { module, timing } = await timeImport(() => import('./spike-renderer.js'));
    rendererModule = module;
    loadTiming = timing;
  }

  function start(shell) {
    const startedAt = performance.now();
    spike = rendererModule.createSpikeRenderer(shell.container, karts);
    spike.apply(settings);
    buildMs = performance.now() - startedAt;
    panel = createPanel(shell.container, { onChoose: choose, onToggle: toggle, onBenchmark: startBenchmark });
    panel.showSettings(settings);
  }

  function choose(key, value) {
    settings = { ...settings, [key]: value };
    spike.apply(settings);
    panel.showSettings(settings);
  }

  function toggle(key) {
    choose(key, !settings[key]);
  }

  // The spike takes no input from phones.
  function onMessage() {}

  function step(dt) {
    stepKarts(karts, dt);
  }

  function render(alpha) {
    const now = performance.now();
    if (settings.cap30 && !benchmark && lastDrawAt !== null && now - lastDrawAt < CAP_INTERVAL_MS) {
      return;
    }
    const frameMs = lastDrawAt === null ? null : now - lastDrawAt;
    lastDrawAt = now;
    if (benchmark) {
      driveBenchmark(now, frameMs);
    }
    const waitForGpu = measureBusy || firstFrameMs === null;
    // A long pause (a hidden tab) must not throw the particles a long way at once. 0.25 s is the runner's own cap
    // (host/fixed-step.js), so even at a few fps the camera keeps up with its kart.
    spike.draw(alpha, Math.min((frameMs ?? 0) / 1000, 0.25));
    const renderMs = performance.now() - now;
    if (waitForGpu) {
      spike.waitForGpu();
    }
    lastBusyMs = measureBusy ? performance.now() - now : null;
    if (firstFrameMs === null) {
      // The first frame builds every shader the current settings need, which is part of loading.
      firstFrameMs = performance.now() - now;
      panel.showLoad(describeLoad(loadTiming, buildMs, firstFrameMs));
    }
    if (frameMs !== null) {
      recentFrames.record(now, frameMs, renderMs);
    }
    if (now - lastReadoutAt >= READOUT_INTERVAL_MS) {
      lastReadoutAt = now;
      panel.showStats(describeFrames(recentFrames.summary(), spike.frameInfo()));
    }
  }

  function startBenchmark() {
    benchmark = createBenchmark(benchmarkConfigs());
  }

  function driveBenchmark(now, frameMs) {
    const next = advanceBenchmark(benchmark, now, frameMs ?? 0, lastBusyMs);
    if (next === null) {
      finishBenchmark();
      return;
    }
    spike.apply(next.settings);
    measureBusy = next.measureBusy;
    const config = benchmark.configs[benchmark.index];
    panel.showProgress(`Benchmark ${benchmark.index + 1} of ${benchmark.configs.length}: ${config.label}`);
  }

  function finishBenchmark() {
    const text = formatResults(benchmark.results, describeDevice());
    console.log(text);
    panel.showResults(text);
    panel.showProgress('');
    benchmark = null;
    measureBusy = false;
    spike.apply(settings);
  }

  function describeDevice() {
    return [
      navigator.userAgent,
      `Screen ${window.innerWidth}x${window.innerHeight} CSS px, devicePixelRatio ${window.devicePixelRatio}`,
      `GPU: ${spike.describeGpu()}, Three.js r${rendererModule.THREE_REVISION}`,
      describeLoad(loadTiming, buildMs, firstFrameMs),
    ];
  }

  // Removing a player changes nothing here: no kart belongs to anyone.
  function onPlayerLeft() {}

  // The spike never ends by itself; the host ends it with the shell's "End game".
  function isDone() {
    return false;
  }

  function stop() {
    spike.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}

function describeFrames(frames, info) {
  return [
    `${frames.fps.toFixed(1)} fps, frame ${frames.averageMs.toFixed(1)} ms (p95 ${frames.p95Ms.toFixed(1)}, worst ${frames.worstMs.toFixed(1)})`,
    `CPU in render ${frames.renderMs.toFixed(1)} ms, ${info.drawCalls} draw calls, ${Math.round(info.triangles / 1000)}k triangles`,
    `${info.bufferWidth}x${info.bufferHeight} px (ratio ${info.pixelRatio}), ${info.kartTriangles} triangles per kart`,
  ].join('\n');
}

function describeLoad(timing, buildMs, firstFrameMs) {
  const megabytes = (bytes) => (bytes / 1e6).toFixed(2);
  return [
    `Load: ${timing.files} files, ${megabytes(timing.bytes)} MB over the network (${megabytes(timing.fileBytes)} MB of files);`,
    `network ${Math.round(timing.networkMs)} ms, import with parse ${Math.round(timing.totalMs)} ms,`,
    `scene ${Math.round(buildMs)} ms, first frame ${Math.round(firstFrameMs)} ms`,
  ].join(' ');
}
