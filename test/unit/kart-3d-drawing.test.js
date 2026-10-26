// Unit tests for M7d4b, the Measure tool and drawing the 3D race, that run without a browser: sorting things into
// cells of the ground and their bounds (cells.js), where a view's shadow map is centred and how it snaps to whole
// texels (shadow-fit.js), how far a course reaches (track.js), the drawing switches (tuning.js: M7d4b2's trials),
// the Measure tool's plan, report and run (measure-plan.js, measure-run.js, the run with a stand-in renderer), and
// the maths of baking shade (occlusion.js).

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { groupByCell, boundsOf } from '../../host/games/kart-3d/cells.js';
import { viewShadowCentre, snapToTexels, VIEW_SHADOW_AHEAD } from '../../host/games/kart-3d/shadow-fit.js';
import { courseExtent } from '../../host/games/kart-3d/track.js';
import { TUNABLES, tuning, setTuning, resetTuning, drawingSwitches } from '../../host/games/kart-3d/tuning.js';
import {
  createMeasureRaces,
  measureSetups,
  measureCases,
  describeMeasurement,
  median,
  MEASURED_PARTS,
  VIEW_COUNTS,
  WARM_UP_FRAMES,
  TIMED_FRAMES,
} from '../../host/games/kart-3d/measure-plan.js';
import { createMeasureRun } from '../../host/games/kart-3d/measure-run.js';
import { KIT_PARTS } from '../../host/games/kart-3d/kit/layout-rules.js';
import { RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { dot, cross, normalize, length, subtract } from '../../host/games/kart-3d/vector.js';
import { sphereDirections, unpackDepth, shadeFor } from '../../host/games/kart-3d/occlusion.js';

const seaside = buildTrack(SEASIDE_SKYWAY);
const DRAWING = { textureDetail: 1, bakedShade: 1, courseLight: 1, photoAsphalt: 1 };
const ALL_OFF = { textureDetail: 0, bakedShade: 0, courseLight: 0, photoAsphalt: 0 };

afterEach(() => resetTuning());

test('groupByCell puts items in the same square cell together, in their order, and leaves no cell empty', () => {
  const points = [{ x: 5, z: 5 }, { x: 150, z: 5 }, { x: 99, z: 99 }, { x: -1, z: 5 }, { x: 101, z: 0 }];
  const groups = groupByCell(points.length, (index) => points[index], 100);
  assert.deepEqual(groups, [[0, 2], [1, 4], [3]]);
  assert.deepEqual(groupByCell(0, () => ({ x: 0, z: 0 }), 100), []);
});

test('boundsOf gives a sphere round the middle of the points\' box that holds every point', () => {
  const points = [{ x: 0, y: 0, z: 0 }, { x: 10, y: 2, z: 0 }, { x: 4, y: 0, z: 6 }];
  const { centre, radius } = boundsOf(points.length, (index) => points[index]);
  assert.deepEqual(centre, { x: 5, y: 1, z: 3 });
  for (const point of points) {
    assert.ok(length(subtract(point, centre)) <= radius + 1e-9);
  }
  assert.ok(Math.abs(radius - Math.hypot(5, 1, 3)) < 1e-9, 'and no bigger than the farthest point');
});

test('a view\'s shadow square is centred on level ground ahead of its camera', () => {
  const centre = viewShadowCentre({ x: 0, y: 5, z: 0 }, normalize({ x: 0, y: -0.5, z: 1 }));
  assert.deepEqual(centre, { x: 0, y: 5, z: VIEW_SHADOW_AHEAD });
  const straightDown = viewShadowCentre({ x: 3, y: 5, z: 4 }, { x: 0, y: -1, z: 0 });
  assert.deepEqual(straightDown, { x: 3, y: 5, z: 4 });
});

test('the shadow square snaps to whole texels as the sun sees them, moving less than a texel', () => {
  const sun = { x: -90, y: 120, z: -150 };
  const back = normalize(sun);
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, back));
  const up = cross(back, right);
  const texel = 140 / 1024;
  for (const point of [{ x: 12.3, y: 4, z: -88.8 }, { x: -300.01, y: 20, z: 151.7 }]) {
    const snapped = snapToTexels(point, sun, texel);
    for (const axis of [right, up]) {
      const steps = dot(snapped, axis) / texel;
      assert.ok(Math.abs(steps - Math.round(steps)) < 1e-6, 'on a whole texel across and up the sun\'s view');
    }
    assert.ok(Math.abs(dot(subtract(snapped, point), back)) < 1e-9, 'not moved toward or away from the sun');
    assert.ok(length(subtract(snapped, point)) <= texel, 'and moved less than a texel');
  }
});

test('courseExtent is the middle of the course\'s box seen from above and half its longer side', () => {
  const { centre, reach } = courseExtent(seaside);
  const xs = seaside.stations.map((station) => station.point.x);
  const zs = seaside.stations.map((station) => station.point.z);
  for (const station of seaside.stations) {
    assert.ok(Math.abs(station.point.x - centre.x) <= reach + 1e-9 && Math.abs(station.point.z - centre.z) <= reach + 1e-9);
  }
  assert.equal(reach, Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2);
});

test('the drawing switches are M7d4b2\'s trials in the tuning panel\'s Drawing group, each on or off, on to start', () => {
  const drawing = TUNABLES.filter((tunable) => tunable.group === 'Drawing');
  assert.deepEqual(drawing.map((tunable) => tunable.key), Object.keys(DRAWING));
  for (const toggle of drawing) {
    assert.deepEqual([toggle.min, toggle.max, toggle.step, toggle.value], [0, 1, 1, 1], `${toggle.key} is on (1) or off (0)`);
  }
  assert.deepEqual(drawingSwitches(), DRAWING);
  setTuning('bakedShade', 0);
  assert.deepEqual(drawingSwitches(), { ...DRAWING, bakedShade: 0 }, 'the switches as they are now');
  const keys = TUNABLES.map((tunable) => tunable.key);
  for (const gone of ['cullCellSize', 'smallPartShadows', 'shadowPerView']) {
    assert.ok(!keys.includes(gone), `M7d4b1's ${gone} was decided and is no longer a switch`);
  }
});

test('the Measure races are copies at each moment: on the grid, then later and later in the race', () => {
  const { races, players } = createMeasureRaces(seaside);
  assert.equal(players.length, 4);
  assert.deepEqual(players.map((player) => player.colorIndex), [0, 1, 2, 3]);
  assert.equal(races[0].phase, RACE_PHASES.COUNTDOWN);
  assert.equal(races[0].time, 0);
  for (let index = 1; index < races.length; index += 1) {
    assert.equal(races[index].phase, RACE_PHASES.RACING);
    assert.ok(races[index].time > races[index - 1].time);
    assert.notEqual(races[index].karts[0], races[index - 1].karts[0], 'each moment is its own copy');
  }
  // The stand-ins for players drive themselves, like the CPU karts, and so get round as far.
  const last = races[races.length - 1];
  for (const player of players) {
    const kart = last.karts.find((each) => each.playerId === player.playerId);
    assert.notEqual(kart.lane, null);
    assert.ok(kart.distance > 200, `${player.name}'s kart drove on (${kart.distance.toFixed(0)} units)`);
  }
});

test('the Measure setups: the quality levels, Medium without each part, each drawing switch the other way, then all off', () => {
  const setups = measureSetups(DRAWING);
  const labels = setups.map((setup) => setup.label);
  assert.deepEqual(labels.slice(0, 4), ['High', 'Medium', 'Low', 'Medium, no shadows']);
  assert.ok(setups[0].look.bloom && !setups[1].look.bloom);
  assert.equal(setups[2].look.pixelRatio, 0.7);
  assert.equal(setups[3].look.shadows, false);
  for (const part of MEASURED_PARTS) {
    const setup = setups.find((each) => each.label === `Medium, no ${part}`);
    assert.deepEqual(setup.look.hidden, [part]);
  }
  assert.ok(Object.values(KIT_PARTS).every((part) => MEASURED_PARTS.includes(part)), 'every part of the dressing is measured');
  const byLabel = (label) => setups.find((setup) => setup.label === label);
  for (const key of Object.keys(DRAWING)) {
    assert.deepEqual(byLabel(`Medium, ${key} off`).drawing, { ...DRAWING, [key]: 0 }, `${key} alone switched off`);
  }
  // Every other setup keeps the switches as set, and the ones that rebuild the course come last, M7d4a's drawing
  // (the baseline) at the very end.
  assert.deepEqual(setups[1].drawing, DRAWING);
  assert.equal(labels.at(-1), 'Medium, as M7d4a (every trial off)');
  assert.deepEqual(setups.at(-1).drawing, ALL_OFF);
  const fromOff = measureSetups(ALL_OFF).map((setup) => setup.label);
  assert.ok(Object.keys(DRAWING).every((key) => fromOff.includes(`Medium, ${key} on`)));
  assert.ok(!fromOff.some((label) => label.includes('as M7d4a')), 'M7d4a\'s drawing is not measured twice');
});

test('the Measure cases cover every setup, view count and moment, one setup at a time', () => {
  const cases = measureCases(3);
  assert.equal(cases.length, 3 * VIEW_COUNTS.length * 4);
  assert.deepEqual(cases[0], { setupIndex: 0, viewCount: 1, momentIndex: 0 });
  assert.deepEqual(cases[4], { setupIndex: 0, viewCount: 4, momentIndex: 0 });
  assert.deepEqual(cases[8], { setupIndex: 1, viewCount: 1, momentIndex: 0 });
  for (let index = 1; index < cases.length; index += 1) {
    assert.ok(cases[index].setupIndex >= cases[index - 1].setupIndex);
  }
});

test('median is the middle value, or the mean of the two middle ones', () => {
  assert.equal(median([3, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});

test('the Measure report has the host, the switches set and one row per setup with both view counts', () => {
  const setups = measureSetups(DRAWING).slice(0, 2);
  const frame = (totalMs) => ({ totalMs, cpuMs: totalMs / 4, drawCalls: 200, triangles: 512000 });
  const results = measureCases(2).map((each) => ({ ...each, frames: [frame(10 + each.momentIndex), frame(12 + each.momentIndex), frame(30)] }));
  const context = { course: 'Seaside Skyway', canvas: '1180x820', devicePixelRatio: 2, gpu: 'Apple GPU', userAgent: 'Safari', drawing: DRAWING };
  const lines = describeMeasurement(setups, results, context).split('\n');
  assert.ok(lines.some((line) => line.includes('Seaside Skyway') && line.includes('1180x820') && line.includes('Apple GPU')));
  assert.ok(lines.some((line) => line.includes('Drawing set: textureDetail = 1, bakedShade = 1, courseLight = 1, photoAsphalt = 1')));
  const high = lines.find((line) => line.startsWith('High'));
  // Medians 12, 13, 14 and 15 at the four moments: 13.5 on average, 15 at worst, CPU a quarter.
  assert.match(high, /^High\s+13\.5\s+15\.0\s+3\.4\s+200\s+512\s+13\.5\s+15\.0\s+3\.4\s+200\s+512$/);
  assert.ok(lines.some((line) => line.startsWith('Medium ')));
  assert.ok(!lines.some((line) => line.startsWith('Stopped early')));
  const partial = describeMeasurement(setups, results.slice(0, 5), context);
  assert.match(partial, /Stopped early: 5 of 16 cases drawn\./);
  assert.ok(!partial.split('\n').some((line) => line.startsWith('Medium ')), 'a setup with nothing drawn has no row');
});

// A renderer that records what the run asks of it, with a draw that takes no time.
function createStandInRenderer() {
  const calls = { looks: [], draws: [], waits: 0, drawingAtDraw: [] };
  return {
    calls,
    setLook: (look) => calls.looks.push(look),
    draw: (race, players, alpha, dt) => {
      calls.draws.push({ race, viewCount: players.size, alpha, dt });
      calls.drawingAtDraw.push(tuning.bakedShade);
    },
    waitForGpu: () => (calls.waits += 1),
    frameStats: () => ({ drawCalls: 100, triangles: 300000 }),
  };
}

test('a Measure run draws every case, warm-up frames first, sets each look once and puts the switches back', () => {
  const testTrack = buildTrack(TEST_TRACK);
  setTuning('bakedShade', 0);
  const renderer = createStandInRenderer();
  const run = createMeasureRun(renderer, testTrack, { course: 'Test track', canvas: '960x540', devicePixelRatio: 1, gpu: 'test', userAgent: 'node' });
  const setups = measureSetups({ ...DRAWING, bakedShade: 0 });
  const caseCount = setups.length * VIEW_COUNTS.length * 4;
  let progress = run.frame();
  assert.match(progress, /^Measuring 1 of \d+: High, 1 view\(s\)$/);
  let frames = 1;
  while (progress !== null) {
    progress = run.frame();
    frames += 1;
  }
  assert.equal(frames, caseCount * (WARM_UP_FRAMES + TIMED_FRAMES));
  assert.equal(renderer.calls.draws.length, frames);
  assert.equal(renderer.calls.waits, frames, 'every frame waits for the GPU');
  assert.equal(renderer.calls.looks.length, caseCount, 'the look is set at the start of each case');
  assert.ok(renderer.calls.draws.every((draw) => draw.alpha === 1 && draw.dt === 0), 'frozen moments: nothing moves on');
  assert.deepEqual([...new Set(renderer.calls.draws.map((draw) => draw.viewCount))].sort(), [1, 4]);
  // The baked shade was drawn on (its own look) and off (as set); afterwards it is off again, as set.
  assert.ok(renderer.calls.drawingAtDraw.includes(0) && renderer.calls.drawingAtDraw.includes(1));
  assert.equal(tuning.bakedShade, 0);
  assert.equal(run.frame(), null, 'a finished run draws nothing more');
  const report = run.report();
  assert.ok(report.includes('Course: Test track'));
  assert.ok(report.includes('bakedShade = 0'));
  assert.equal(report.split('\n').filter((line) => line.startsWith('Medium')).length, setups.length - 2);
  assert.equal(setups.at(-1).label, 'Medium, as M7d4a (every trial off)', 'M7d4a\'s drawing was measured');
});

test('a Measure run stopped early puts the switches back and reports what it drew', () => {
  const renderer = createStandInRenderer();
  const run = createMeasureRun(renderer, seaside, { course: 'Seaside Skyway', canvas: '960x540', devicePixelRatio: 1, gpu: 'test', userAgent: 'node' });
  const setupCount = measureSetups(DRAWING).length;
  // Into the case that switches every trial off (the last): the switches are off while it draws.
  const framesPerSetup = VIEW_COUNTS.length * 4 * (WARM_UP_FRAMES + TIMED_FRAMES);
  for (let frame = 0; frame < framesPerSetup * (setupCount - 1) + 1; frame += 1) {
    run.frame();
  }
  assert.deepEqual(drawingSwitches(), ALL_OFF);
  run.stop();
  assert.deepEqual(drawingSwitches(), DRAWING);
  assert.equal(run.frame(), null);
  assert.match(run.report(), new RegExp(`Stopped early: ${(setupCount - 1) * VIEW_COUNTS.length * 4} of`));
});

test('the shade bake looks in directions spread evenly over the whole sphere', () => {
  const directions = sphereDirections(40);
  assert.equal(directions.length, 40);
  for (const direction of directions) {
    assert.ok(Math.abs(length(direction) - 1) < 1e-9, 'each of length 1');
  }
  const sum = directions.reduce((total, direction) => ({ x: total.x + direction.x, y: total.y + direction.y, z: total.z + direction.z }), { x: 0, y: 0, z: 0 });
  assert.ok(length(sum) < 0.5, 'balanced: no side of the sphere favoured');
  assert.equal(directions.filter((direction) => direction.y > 0).length, 20, 'half of them above the horizon');
});

test('unpackDepth reads back the depth Three.js packs into four bytes', () => {
  // Three.js's packDepthToRGBA (its shader chunk packing), in plain numbers.
  const pack = (depth) => {
    let whole = Math.floor(depth * 256 ** 3);
    const alpha = depth * 256 ** 3 - whole;
    const blue = (whole % 256) / 256;
    whole = Math.floor(whole / 256);
    const green = (whole % 256) / 256;
    whole = Math.floor(whole / 256);
    const toByte = (share) => Math.round(share * 255);
    return [whole, toByte((green * 256) / 255), toByte((blue * 256) / 255), toByte(alpha)];
  };
  for (const depth of [0.001, 0.25, 0.5, 0.731, 0.999]) {
    assert.ok(Math.abs(unpackDepth(...pack(depth)) - depth) < 1e-6, `depth ${depth}`);
  }
  assert.ok(unpackDepth(255, 255, 255, 255) > 0.999, 'the clear colour reads as the far plane');
});

test('shadeFor: open sky keeps the colour, no sky darkens it to the darkest share, in between in proportion', () => {
  assert.equal(shadeFor(3, 3, 0.45), 1);
  assert.equal(shadeFor(0, 3, 0.45), 0.45);
  assert.ok(Math.abs(shadeFor(1, 2, 0.45) - 0.725) < 1e-9);
  assert.equal(shadeFor(0, 0, 0.45), 1, 'a vertex that faced no direction is left as it is');
});
