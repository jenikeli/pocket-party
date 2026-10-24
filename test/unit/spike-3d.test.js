// Unit tests for the DOM-free parts of the 3D performance spike (M6a, host/games/spike-3d/): the road loop, the
// scripted karts, the split-screen layout, the frame-time numbers and the benchmark's plan and table.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roadPoint, roadFrame, pointBeside, distanceFromCentreLine, ROAD_HALF_WIDTH } from '../../host/games/spike-3d/road.js';
import { createKarts, stepKarts, kartPose, MAX_KARTS } from '../../host/games/spike-3d/kart-paths.js';
import { viewRects } from '../../host/games/kart-3d/view-layout.js';
import { summarizeFrames, createRecentFrames } from '../../host/games/spike-3d/frame-stats.js';
import {
  benchmarkConfigs,
  createBenchmark,
  advanceBenchmark,
  formatResults,
  LOOK_SWITCHES,
} from '../../host/games/spike-3d/benchmark.js';

test('the road is a closed loop with a hill and is flat elsewhere', () => {
  const start = roadPoint(0);
  const end = roadPoint(1);
  assert.ok(Math.hypot(start.x - end.x, start.y - end.y, start.z - end.z) < 1e-9);
  assert.ok(roadPoint(0.25).y > 11, 'the top of the hill');
  assert.ok(roadPoint(0.75).y < 0.01, 'the far side is flat');
});

test('the road frame points along the road, with the side to the right and flat', () => {
  const frame = roadFrame(0.1);
  const ahead = roadPoint(0.1 + 0.001);
  const step = { x: ahead.x - frame.point.x, z: ahead.z - frame.point.z };
  assert.ok(step.x * frame.forward.x + step.z * frame.forward.z > 0, 'forward points the way u grows');
  assert.ok(Math.abs(Math.hypot(frame.forward.x, frame.forward.y, frame.forward.z) - 1) < 1e-9);
  assert.equal(frame.side.y, 0);
  assert.ok(Math.abs(frame.side.x * frame.forward.x + frame.side.z * frame.forward.z) < 1e-9, 'side is square to forward');
  // Right of the direction of travel (with +y up) is forward x up, so forward x side points down: its y is
  // negative.
  assert.ok(frame.forward.z * frame.side.x - frame.forward.x * frame.side.z < 0);
  const edge = pointBeside(frame, 1);
  assert.ok(Math.abs(Math.hypot(edge.x - frame.point.x, edge.z - frame.point.z) - ROAD_HALF_WIDTH) < 1e-9);
});

test('distanceFromCentreLine is zero on the road and grows away from it', () => {
  const point = roadPoint(0.6);
  assert.ok(distanceFromCentreLine(point.x, point.z) < 1.5);
  assert.ok(distanceFromCentreLine(0, 0) > 30, 'the middle of the loop is clear of the road');
});

test('scripted karts start on a grid, move round the loop and stay on the road', () => {
  const karts = createKarts();
  assert.equal(karts.length, MAX_KARTS);
  const startU = karts.map((kart) => kart.u);
  for (let i = 0; i < 60 * 30; i += 1) {
    stepKarts(karts, 1 / 60);
    for (const kart of karts) {
      assert.ok(Math.abs(kart.lane) <= 0.8 + 1e-9, `kart ${kart.index} left the road`);
      assert.ok(kart.u >= 0 && kart.u < 1);
    }
  }
  // 30 s at about 30 units per second is more than a lap of about 800 units, so each kart has crossed the line.
  karts.forEach((kart, index) => assert.notEqual(kart.u, startU[index]));
});

test('kartPose blends between the last two steps, also across the line where u wraps', () => {
  const [kart] = createKarts();
  Object.assign(kart, { previousU: 0.999, u: 0.001, previousLane: 0, lane: 0 });
  const middle = kartPose(kart, 0.5).position;
  const atLine = roadPoint(0);
  assert.ok(Math.hypot(middle.x - atLine.x, middle.z - atLine.z) < 0.1, 'halfway is at the line, not across the loop');
});

test('view rectangles: 1 fills the canvas, 2 stack, 4 are quarters, all inside it with gaps between', () => {
  assert.deepEqual(viewRects(1, 1920, 1080), [{ x: 0, y: 0, width: 1920, height: 1080 }]);
  const [top, bottom] = viewRects(2, 1920, 1080);
  assert.equal(top.y + top.height, 1080);
  assert.equal(bottom.y, 0);
  assert.ok(bottom.y + bottom.height < top.y, 'a gap between them');
  const quarters = viewRects(4, 1920, 1080);
  assert.equal(quarters.length, 4);
  for (const rect of quarters) {
    assert.ok(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= 1920 && rect.y + rect.height <= 1080);
  }
  assert.ok(quarters[0].x + quarters[0].width < quarters[1].x, 'a gap between left and right');
  assert.throws(() => viewRects(3, 1920, 1080));
});

test('summarizeFrames gives fps, average, p95 and worst', () => {
  const intervals = [...Array(19).fill(16), 50];
  const summary = summarizeFrames(intervals);
  assert.equal(summary.count, 20);
  assert.equal(summary.worstMs, 50);
  assert.equal(summary.p95Ms, 50);
  assert.ok(Math.abs(summary.averageMs - (19 * 16 + 50) / 20) < 1e-9);
  assert.ok(Math.abs(summary.fps - 1000 / summary.averageMs) < 1e-9);
  assert.equal(summarizeFrames([]).fps, 0);
});

test('the recent frames keep only the last window', () => {
  const recent = createRecentFrames(1000);
  recent.record(0, 100, 5);
  recent.record(1500, 20, 3);
  recent.record(1600, 20, 3);
  const summary = recent.summary();
  assert.equal(summary.count, 2);
  assert.equal(summary.averageMs, 20);
  assert.equal(summary.renderMs, 3);
});

test('the benchmark covers 1, 2 and 4 views, each cost alone, the full look and fewer karts', () => {
  const configs = benchmarkConfigs();
  for (const views of [1, 2, 4]) {
    for (const name of LOOK_SWITCHES) {
      const alone = configs.find((config) => config.settings.views === views && config.label.endsWith(`+ ${name}`));
      assert.ok(alone, `${views} views + ${name}`);
      const onSwitches = LOOK_SWITCHES.filter((key) => alone.settings[key]);
      assert.deepEqual(onSwitches, [name]);
      assert.equal(alone.settings.fullResolution, false);
    }
  }
  assert.ok(configs.some((config) => config.settings.karts === 4 && config.settings.views === 4));
  assert.ok(configs.every((config) => config.settings.cap30 === false), 'the benchmark measures uncapped');
});

test('the benchmark warms up, measures frames, then GPU-waited frames, for each setting in turn', () => {
  const configs = [
    { label: 'a', settings: { views: 1 } },
    { label: 'b', settings: { views: 4 } },
  ];
  const bench = createBenchmark(configs);
  let now = 0;
  let busyMs = null;
  const seen = [];
  while (now < 20000) {
    const next = advanceBenchmark(bench, now, 20, busyMs);
    if (next === null) {
      break;
    }
    seen.push(next);
    // A frame drawn with a GPU wait reports its busy time to the next call.
    busyMs = next.measureBusy ? 12 : null;
    now += 20;
  }
  assert.equal(bench.results.length, 2);
  assert.deepEqual(bench.results.map((row) => row.label), ['a', 'b']);
  for (const row of bench.results) {
    assert.equal(row.averageMs, 20);
    assert.equal(row.busyMs, 12);
    // 2.5 s of 20 ms frames.
    assert.ok(row.count >= 120 && row.count <= 126, `about 125 frames, got ${row.count}`);
  }
  assert.ok(seen.some((next) => next.measureBusy) && seen.some((next) => !next.measureBusy));
  // Each setting runs for about 4.5 s.
  assert.ok(now >= 8900 && now <= 9100, `about 9 s for two settings, got ${now}`);
});

test('formatResults lists the device lines, then one row per setting', () => {
  const row = { label: '4 view full look', fps: 30, averageMs: 33.3, p95Ms: 35, worstMs: 50, busyMs: 28.4 };
  const text = formatResults([row], ['iPad', 'GPU: Apple GPU']);
  const lines = text.split('\n');
  assert.equal(lines[0], 'iPad');
  assert.match(lines[3], /^setting\s+fps\s+avg ms/);
  assert.match(lines[4], /^4 view full look\s+30\.0\s+33\.3\s+35\.0\s+50\.0\s+28\.4$/);
});
