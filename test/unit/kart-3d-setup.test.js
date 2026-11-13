// Unit tests for the 3D race's setup screen's plain parts (M10): the host's choices (host-choices.js), the course
// built in stages behind the loading bar (staged-build.js's runStages) and the course loader (course-loader.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHostChoices, setChoice } from '../../host/games/kart-3d/host-choices.js';
import { runStages } from '../../host/games/kart-3d/staged-build.js';
import { createCourseLoader } from '../../host/games/kart-3d/course-loader.js';
import { COURSES } from '../../host/games/kart-3d/courses.js';
import { DEFAULT_ENGINE_CLASS } from '../../host/games/kart-3d/race.js';

test('the host\'s choices start on the first course and change only to valid values', () => {
  const choices = createHostChoices('medium');
  assert.equal(choices.courseId, COURSES[0].id);
  assert.equal(choices.engineClass, DEFAULT_ENGINE_CLASS);
  assert.equal(choices.quality, 'medium');
  assert.equal(setChoice(choices, 'courseId', 'test-track'), true);
  assert.equal(choices.courseId, 'test-track');
  assert.equal(setChoice(choices, 'courseId', 'test-track'), false, 'the same value is no change');
  assert.equal(setChoice(choices, 'courseId', 'nowhere'), false);
  assert.equal(setChoice(choices, 'engineClass', 200), true);
  assert.equal(setChoice(choices, 'engineClass', 75), false);
  assert.equal(setChoice(choices, 'cpuLevel', 'hard'), true);
  assert.equal(setChoice(choices, 'cpuLevel', 'impossible'), false);
  assert.equal(setChoice(choices, 'quality', 'low'), true);
  assert.equal(setChoice(choices, 'quality', 'ultra'), false);
  assert.deepEqual(
    { courseId: choices.courseId, engineClass: choices.engineClass, cpuLevel: choices.cpuLevel, quality: choices.quality },
    { courseId: 'test-track', engineClass: 200, cpuLevel: 'hard', quality: 'low' },
  );
});

// A stand-in for the browser's frames: each wait is logged, so the test sees a frame between every two stages.
function recorder() {
  const log = [];
  return {
    log,
    onProgress: (fraction, label) => log.push(label === undefined ? `bar ${fraction}` : `bar ${fraction} ${label}`),
    nextFrame: async () => log.push('frame'),
  };
}

test('stages run in order with a frame before each, and the bar moves by their weights to the end', async () => {
  const { log, onProgress, nextFrame } = recorder();
  const stages = [
    { label: 'one', weight: 3, run: () => log.push('run one') },
    { label: 'two', weight: 1, run: () => log.push('run two') },
  ];
  const done = await runStages(stages, { onProgress, nextFrame, isCancelled: () => false });
  assert.equal(done, true);
  assert.deepEqual(log, ['bar 0 one', 'frame', 'run one', 'bar 0.75 two', 'frame', 'run two', 'bar 1']);
});

test('a build stops at the next stage once cancelled (the game ended), and a stage\'s error rejects it', async () => {
  const { log, onProgress, nextFrame } = recorder();
  let cancelled = false;
  const stages = [
    { label: 'one', weight: 1, run: () => (cancelled = true) },
    { label: 'two', weight: 1, run: () => log.push('run two') },
  ];
  assert.equal(await runStages(stages, { onProgress, nextFrame, isCancelled: () => cancelled }), false);
  assert.equal(log.includes('run two'), false);
  const failing = [{ label: 'bad', weight: 1, run: () => { throw new Error('no memory'); } }];
  await assert.rejects(runStages(failing, { onProgress, nextFrame, isCancelled: () => false }), /no memory/);
});

// A stand-in for the shell's loading screen that says whether it is up.
function fakeLoadingScreen() {
  const screen = { shown: 0, progress: [] };
  screen.showLoading = ({ title, picture }) => {
    screen.shown += 1;
    screen.up = true;
    screen.title = title;
    screen.picture = picture;
    return { setProgress: (fraction) => screen.progress.push(fraction), hide: () => (screen.up = false) };
  };
  return screen;
}

// A renderer whose build waits until the test lets it finish, with true (built) or false (destroyed meanwhile).
function fakeRenderer() {
  const renderer = { builds: 0 };
  renderer.buildCourse = (track, onProgress) => {
    renderer.builds += 1;
    onProgress(0, 'Building the course');
    return new Promise((resolve, reject) => Object.assign(renderer, { finish: resolve, fail: reject }));
  };
  return renderer;
}

const SEASIDE = COURSES.find((course) => course.id === 'seaside-skyway');

test('the course loader builds behind the loading screen once, and runs a built course\'s `then` at once', async () => {
  const screen = fakeLoadingScreen();
  const renderer = fakeRenderer();
  const loader = createCourseLoader(renderer, screen.showLoading);
  let started = 0;
  const first = loader.withCourseBuilt(SEASIDE, {}, () => (started += 1));
  assert.equal(loader.isBuilding(), true);
  assert.deepEqual([screen.up, screen.title, screen.picture], [true, 'Seaside Skyway', '/assets/kart-3d/previews/seaside-skyway.jpg']);
  assert.deepEqual(screen.progress, [0]);
  renderer.finish(true);
  await first;
  assert.deepEqual([started, screen.up, loader.isBuilding()], [1, false, false]);
  await loader.withCourseBuilt(SEASIDE, {}, () => (started += 1));
  assert.deepEqual([started, renderer.builds, screen.shown], [2, 1, 1], 'no second build, no loading screen');
});

test('stopping during a build leaves no loading screen and never runs `then`', async () => {
  const screen = fakeLoadingScreen();
  const renderer = fakeRenderer();
  const loader = createCourseLoader(renderer, screen.showLoading);
  let started = false;
  const build = loader.withCourseBuilt(SEASIDE, {}, () => (started = true));
  loader.stop();
  assert.equal(screen.up, false);
  renderer.finish(false);
  await build;
  assert.deepEqual([started, screen.up, loader.isBuilding()], [false, false, false]);
});

test('a build\'s error is kept, hides the loading screen, and throwIfFailed throws it', async () => {
  const screen = fakeLoadingScreen();
  const renderer = fakeRenderer();
  const loader = createCourseLoader(renderer, screen.showLoading);
  loader.throwIfFailed();
  let started = false;
  const build = loader.withCourseBuilt(SEASIDE, {}, () => (started = true));
  renderer.fail(new Error('out of memory'));
  await build;
  assert.deepEqual([started, screen.up], [false, false]);
  assert.throws(() => loader.throwIfFailed(), /out of memory/);
});
