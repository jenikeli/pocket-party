// The Measure tool's plan and report (M7d4b): what it draws and how it writes up the times. It needs no phones:
// a race of 12 karts driving themselves (four of them stand in for players, stand-ins.js, so there are 1 and 4
// views to draw), stopped at a few fixed moments, drawn in a list of looks: the quality levels, then Medium with
// the shadows or one part of the course switched off at a time. Plain data and functions, unit tested in Node.
// Used by host/games/kart-3d/measure-run.js.

import { stepRace, DEFAULT_ENGINE_CLASS } from './race.js';
import { createStandInRace, MAX_STAND_INS } from './stand-ins.js';
import { GO_AT } from './rocket-start.js';
import { KIT_PARTS } from './kit/layout-rules.js';
import { NEUTRAL_CONTROLS } from '../../kart/kart-controls.js';

export const VIEW_COUNTS = Object.freeze([1, 4]);
// Each look, view count and moment is drawn this many frames untimed (new shaders and buffers are made in the
// first), then this many timed.
export const WARM_UP_FRAMES = 3;
export const TIMED_FRAMES = 8;
// The moments drawn, as race times: on the grid before the countdown (the gate, the grandstand and its crowd in
// view), then every 10 s into the race, round most of a lap of Seaside Skyway (39 s for these karts).
const MOMENTS = Object.freeze([0, GO_AT + 10, GO_AT + 20, GO_AT + 30]);
const STEP_SECONDS = 1 / 60;
// Everything a look can hide: the road and the sea (scenery.js), each part of the dressing, and the karts.
export const MEASURED_PARTS = Object.freeze(['road', 'sea', ...Object.values(KIT_PARTS), 'karts']);
// The labels are padded to this width in the report.
const LABEL_WIDTH = 40;
const MEDIUM = Object.freeze({ bloom: false, pixelRatio: 1, shadows: true, hidden: [] });

// The race at each moment, as separate copies (the race is plain data), and the stand-in players, in slot
// order, whose karts the views follow: { races, players }.
export function createMeasureRaces(track) {
  const { race, players } = createStandInRace(track, MAX_STAND_INS, 3, DEFAULT_ENGINE_CLASS);
  const races = MOMENTS.map((moment) => {
    while (race.time < moment - 1e-9) {
      stepRace(race, track, () => NEUTRAL_CONTROLS, STEP_SECONDS);
    }
    return structuredClone(race);
  });
  return { races, players: [...players.values()] };
}

// The looks to draw, in order, each { label, look }: look is what renderer.js's setLook takes.
export function measureSetups() {
  return [
    { label: 'High', look: { ...MEDIUM, bloom: true } },
    { label: 'Medium', look: MEDIUM },
    { label: 'Low', look: { ...MEDIUM, pixelRatio: 0.7 } },
    { label: 'Medium, no shadows', look: { ...MEDIUM, shadows: false } },
    ...MEASURED_PARTS.map((part) => ({ label: `Medium, no ${part}`, look: { ...MEDIUM, hidden: [part] } })),
  ];
}

// Every case to draw, in order: [{ setupIndex, viewCount, momentIndex }], the looks outermost, so a look is set
// once for all its cases.
export function measureCases(setupCount) {
  const cases = [];
  for (let setupIndex = 0; setupIndex < setupCount; setupIndex += 1) {
    for (const viewCount of VIEW_COUNTS) {
      MOMENTS.forEach((moment, momentIndex) => cases.push({ setupIndex, viewCount, momentIndex }));
    }
  }
  return cases;
}

// The report as text to paste back to Claude. `results` are the cases drawn, each a case with `frames`, the timed
// frames' { cpuMs, totalMs, drawCalls, triangles }; `context` is { course, canvas, devicePixelRatio, gpu,
// userAgent } (canvas as 'width x height' in CSS pixels). For each look and
// view count: the average over the moments of each moment's median frame time, the worst moment's, the CPU's
// share of it, and the draw calls and triangles drawn (shadow passes included).
export function describeMeasurement(setups, results, context) {
  const lines = [
    'Measure, 3D race (host/games/kart-3d/measure-plan.js)',
    `Course: ${context.course}; canvas ${context.canvas} CSS px at device pixel ratio ${context.devicePixelRatio}; GPU: ${context.gpu}`,
    `Browser: ${context.userAgent}`,
    `Frame times in ms with the GPU made to finish each frame: the median of ${TIMED_FRAMES} frames at each of ${MOMENTS.length} moments, averaged (and the worst moment); CPU is the part before waiting for the GPU. Calls and triangles include the shadow passes.`,
    `${''.padEnd(LABEL_WIDTH)}${VIEW_COUNTS.map((count) => `${count} view${count > 1 ? 's' : ''}`.padEnd(38)).join('')}`,
    `${''.padEnd(LABEL_WIDTH)}${VIEW_COUNTS.map(() => `${'ms'.padStart(7)}${'worst'.padStart(7)}${'CPU'.padStart(6)}${'calls'.padStart(7)}${'k tris'.padStart(8)}   `).join('')}`,
  ];
  setups.forEach((setup, setupIndex) => {
    const columns = VIEW_COUNTS.map((viewCount) => describeColumn(results.filter((result) => result.setupIndex === setupIndex && result.viewCount === viewCount)));
    if (columns.some((column) => column !== null)) {
      lines.push(`${setup.label.padEnd(LABEL_WIDTH)}${columns.map((column) => column ?? ''.padEnd(38)).join('')}`.trimEnd());
    }
  });
  if (results.length < setups.length * VIEW_COUNTS.length * MOMENTS.length) {
    lines.push(`Stopped early: ${results.length} of ${setups.length * VIEW_COUNTS.length * MOMENTS.length} cases drawn.`);
  }
  return lines.join('\n');
}

// One look and view count's columns, or null if none of its cases were drawn.
function describeColumn(results) {
  if (results.length === 0) {
    return null;
  }
  const totals = results.map((result) => median(result.frames.map((frame) => frame.totalMs)));
  const cpus = results.map((result) => median(result.frames.map((frame) => frame.cpuMs)));
  const lastFrames = results.map((result) => result.frames[result.frames.length - 1]);
  const average = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
  return [
    average(totals).toFixed(1).padStart(7),
    Math.max(...totals).toFixed(1).padStart(7),
    average(cpus).toFixed(1).padStart(6),
    Math.round(average(lastFrames.map((frame) => frame.drawCalls))).toString().padStart(7),
    Math.round(average(lastFrames.map((frame) => frame.triangles)) / 1000).toString().padStart(8),
    '   ',
  ].join('');
}

export function median(values) {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
