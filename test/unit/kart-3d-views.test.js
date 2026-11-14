// Unit tests for what the 3D race shows (host/games/kart-3d/race-views.js, view-layout.js, chase-camera.js,
// readout.js and step-timer.js): the phones' setup and race views, each split-screen view's kart and HUD, the
// host's clock and countdown, the results' standings, the drawn poses, the chase camera, the readout and the
// step timer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { SEASIDE_SKYWAY } from '../../host/games/kart-3d/seaside-skyway.js';
import { createRace, stepRace, removeKart, playerKart, RACE_PHASES } from '../../host/games/kart-3d/race.js';
import { raceClock } from '../../host/games/kart-3d/race-finish.js';
import {
  setupView,
  roomIsOpen,
  raceView,
  viewHud,
  viewTargets,
  standingRows,
  describeClock,
  describeCountdown,
  describeRaceSummary,
  kartPose,
  describeKart,
  BANNERS,
} from '../../host/games/kart-3d/race-views.js';
import { viewRects } from '../../host/games/kart-3d/view-layout.js';
import { createChaseCamera, followKart } from '../../host/games/kart-3d/chase-camera.js';
import { createStepTimer } from '../../host/games/kart-3d/step-timer.js';
import { createReadout, describeTimings } from '../../host/games/kart-3d/readout.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { createSetup, applyChoice } from '../../host/kart/setup.js';
import { addPlayer, changeColor, colorChoices } from '../../host/roster.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { vec, subtract, length, dot, normalize, addScaled, rotate } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const track = buildTrack(SEASIDE_SKYWAY);
// A Go press that arrives inside the rocket start window, 0.45 s after "2" (shown from 1 s).
const ROCKET_PRESS = 1.45;

function runRace(race, controlsFor, seconds) {
  for (let step = 0; step < seconds * 60; step += 1) {
    stepRace(race, track, controlsFor, STEP);
  }
}

test('phone views: the setup view has the laps, engine class and course; the race view carries the control style', () => {
  const setup = createSetup();
  applyChoice(setup, 'p1', { choice: 'steering', value: 'tilt' }, true);
  const players = new Map();
  addPlayer(players, 'p1');
  assert.deepEqual(setupView(setup, 200, 'Seaside Skyway', players, 'p1'), {
    phase: 'setup',
    laps: 3,
    engineClass: 200,
    courseName: 'Seaside Skyway',
    steering: 'tilt',
    autoAccelerate: false,
    leftHanded: false,
    ready: false,
    colorIndex: 0,
    colors: colorChoices(players, 'p1'),
    driverName: 'Blaze',
  });
  const race = createRace(track, ['p1'], 3, 200, 'normal');
  assert.deepEqual(raceView(race, setup, 'p1'), {
    phase: 'countdown',
    steering: 'tilt',
    autoAccelerate: false,
    leftHanded: false,
    countdown: 3,
    spark: null,
    start: null,
    lap: 1,
    laps: 3,
    place: 12,
    finalLap: false,
    finished: false,
    item: null,
  });
  assert.equal(raceView(race, setup, 'late'), null, 'a player with no kart waits for the next race');
  applyChoice(setup, 'p1', { choice: 'leftHanded', value: true }, false);
  assert.equal(raceView(race, setup, 'p1').leftHanded, true);
});

test('the setup view follows the colour: the driver changes with it, and the others see it taken', () => {
  const setup = createSetup();
  const players = new Map();
  addPlayer(players, 'p1');
  addPlayer(players, 'p2');
  assert.equal(changeColor(players, 'p1', 8), true);
  const view = setupView(setup, 200, 'Seaside Skyway', players, 'p1');
  assert.equal(view.colorIndex, 8);
  assert.equal(view.driverName, 'Sprout');
  assert.equal(setupView(setup, 200, 'Seaside Skyway', players, 'p2').colors[8].takenBy, 'Lime');
});

test('phone views count down, then show the drift\'s spark colour and, for a moment after GO, the start', () => {
  const setup = createSetup();
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  const countdowns = [];
  for (let step = 0; step < (GO_AT + 0.5) * 60; step += 1) {
    stepRace(race, track, () => ({ ...NEUTRAL_CONTROLS, accelerate: race.time >= ROCKET_PRESS }), STEP);
    countdowns.push(raceView(race, setup, 'p1').countdown);
  }
  assert.deepEqual([...new Set(countdowns)], [3, 2, 1, 0]);
  const view = raceView(race, setup, 'p1');
  assert.equal(view.phase, 'racing');
  assert.equal(view.start, 'rocket');
  const kart = playerKart(race, 'p1');
  kart.driftDirection = 1;
  kart.driftCharge = 600;
  assert.equal(raceView(race, setup, 'p1').spark, 'orange');
  runRace(race, () => NEUTRAL_CONTROLS, 2);
  assert.deepEqual([raceView(race, setup, 'p1').countdown, raceView(race, setup, 'p1').start], [null, null]);
});

test('the final lap shows for 3 s on the phone and in the view; then the finish', () => {
  const setup = createSetup();
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  runRace(race, () => NEUTRAL_CONTROLS, GO_AT + 10);
  const kart = playerKart(race, 'p1');
  // As if the kart had just started its last lap.
  kart.lap = 3;
  kart.lapStartedAt = raceClock(race) - 1;
  assert.equal(raceView(race, setup, 'p1').finalLap, true);
  assert.deepEqual(viewHud(race, kart), { lap: 3, laps: 3, place: kart.place, banner: BANNERS.FINAL_LAP, item: null });
  kart.lapStartedAt = raceClock(race) - 3.5;
  assert.equal(raceView(race, setup, 'p1').finalLap, false);
  assert.equal(viewHud(race, kart).banner, null);
  kart.finishTime = raceClock(race);
  assert.equal(raceView(race, setup, 'p1').finished, true);
  assert.equal(viewHud(race, kart).banner, BANNERS.FINISH);
  const cpu = race.karts[0];
  assert.deepEqual(viewHud(race, cpu), { lap: null, laps: 3, place: cpu.place, banner: null, item: null }, 'a CPU kart\'s view shows only its place');
});

test('the room is open on the setup screen and the results, closed while a course is built and while karts race', () => {
  assert.equal(roomIsOpen(null, false), true);
  assert.equal(roomIsOpen(null, true), false);
  const race = createRace(track, ['p1'], 1, 150, 'normal');
  assert.equal(roomIsOpen(race, false), false);
  race.phase = RACE_PHASES.RACING;
  assert.equal(roomIsOpen(race, false), false);
  race.phase = RACE_PHASES.RESULTS;
  assert.equal(roomIsOpen(race, false), true);
});

test('the host\'s countdown and clock, with the time left once a player has finished', () => {
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  assert.equal(describeCountdown(race), '3');
  assert.equal(describeClock(race), '', 'no clock before GO');
  runRace(race, () => NEUTRAL_CONTROLS, GO_AT + 0.5);
  assert.equal(describeCountdown(race), 'GO!');
  // Adding up 1/60 s steps lands a hair either side of half a second.
  assert.match(describeClock(race), /^0:00\.(49|50)$/);
  runRace(race, () => NEUTRAL_CONTROLS, 1);
  assert.equal(describeCountdown(race), '');
  race.firstPlayerFinishTime = raceClock(race) - 10.5;
  assert.match(describeClock(race), /^0:01\.(49|50)\nRace ends in 20 s$/);
  race.phase = RACE_PHASES.RESULTS;
  assert.equal(describeClock(race), '');
});

test('standings list every kart in place order, with finish times', () => {
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  playerKart(race, 'p1').finishTime = 101.5;
  playerKart(race, 'p1').place = 1;
  race.karts[0].place = 12;
  const rows = standingRows(race);
  assert.equal(rows.length, 12);
  assert.deepEqual(rows[0], { place: 1, playerId: 'p1', finishTime: 101.5 });
  assert.deepEqual(rows[11], { place: 12, playerId: null, finishTime: null });
});

test('the results\' summary says the course, the speed and the laps', () => {
  assert.equal(describeRaceSummary('Seaside Skyway', 150, 3), 'Seaside Skyway · 150cc · 3 laps');
  assert.equal(describeRaceSummary('Test track', 50, 1), 'Test track · 50cc · 1 lap');
});

test('views: one per player kart in slot order; 3 players get a CPU kart in the fourth quarter', () => {
  const players = new Map();
  for (const playerId of ['a', 'b', 'c']) {
    addPlayer(players, playerId);
  }
  const race = createRace(track, ['c', 'b', 'a'], 3, 150, 'normal');
  const targets = viewTargets(race, players);
  assert.deepEqual(targets.map((target) => target.player?.playerId ?? null), ['a', 'b', 'c', null]);
  assert.equal(targets[0].kart, playerKart(race, 'a'));
  assert.equal(targets[3].kart.playerId, null);
  removeKart(race, 'c');
  assert.equal(viewTargets(race, players).length, 2, 'a player without a kart gets no view');
  removeKart(race, 'a');
  removeKart(race, 'b');
  assert.deepEqual(viewTargets(race, players).map((target) => target.player), [null], 'nobody left: follow a CPU kart');
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

test('poses between steps and the readout line', () => {
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  const kart = playerKart(race, 'p1');
  kart.previousPosition = vec(0, 0, 0);
  kart.position = vec(1, 0, 0);
  assert.deepEqual(kartPose(kart, 0.25).position, vec(0.25, 0, 0));
  kart.velocity = addScaled(vec(0, 0, 0), kart.forward, 12);
  assert.match(describeKart(kart, track), /^12\.0 units\/s \(6\.0 kart lengths\/s\), road, \d+% round$/);
  kart.grounded = false;
  assert.match(describeKart(kart, track), /, in the air, /);
  kart.gliding = true;
  assert.match(describeKart(kart, track), /, gliding, /, 'the glider open (M9)');
  kart.respawnIn = 1;
  assert.match(describeKart(kart, track), /fell off/);
});

test('the drawn body leans into a drift and spins the short way round, while the camera follows the travel', () => {
  const kart = playerKart(createRace(track, ['p1'], 3, 150, 'normal'), 'p1');
  kart.previousBodyYaw = 0.3;
  kart.bodyYaw = 0.3;
  const leaning = kartPose(kart, 0.5);
  assert.deepEqual(leaning.forward, kart.forward, 'the camera\'s forward is the travel');
  const side = Math.asin(dot(leaning.bodyForward, normalize(rotate(kart.forward, kart.up, -Math.PI / 2))));
  assert.ok(Math.abs(side - 0.3) < 1e-6, `the body is turned ${side} rad to the right`);
  // A spin ending: from almost a full turn to 0 goes forward the last bit, not back round.
  kart.previousBodyYaw = 2 * Math.PI - 0.1;
  kart.bodyYaw = 0;
  const ending = kartPose(kart, 0.5);
  assert.ok(Math.abs(Math.acos(Math.min(dot(ending.bodyForward, kart.forward), 1)) - 0.05) < 1e-6);
});

// A kart pose driving along +x on flat ground.
function pose(x, forward = vec(1, 0, 0), y = 0) {
  return { position: vec(x, y, 0), forward, up: vec(0, 1, 0) };
}

test('the chase camera sits behind and above its kart, and looks ahead of it', () => {
  const camera = createChaseCamera();
  followKart(camera, pose(0), STEP);
  assert.ok(camera.position.x < -5 && camera.position.y > 2, `camera at ${JSON.stringify(camera.position)}`);
  assert.ok(camera.look.x > 0);
  assert.deepEqual(camera.up, vec(0, 1, 0));
});

test('the chase camera turns after its kart with a short lag, and cuts when the kart is put back elsewhere', () => {
  const camera = createChaseCamera();
  followKart(camera, pose(0), STEP);
  const turned = normalize(rotate(vec(1, 0, 0), vec(0, 1, 0), -0.5));
  followKart(camera, pose(0.4, turned), STEP);
  const lag = Math.acos(dot(camera.forward, turned));
  assert.ok(lag > 0.4 && lag < 0.5, `one frame later it has turned only a little (${lag} rad behind)`);
  for (let frame = 0; frame < 120; frame += 1) {
    followKart(camera, pose(0.4, turned), STEP);
  }
  assert.ok(Math.acos(Math.min(dot(camera.forward, turned), 1)) < 0.01, 'two seconds later it has caught up');
  followKart(camera, pose(200, turned), STEP);
  assert.ok(length(subtract(camera.look, addScaled(vec(200, 0, 0), turned, 4))) < 1.5, 'it cut to the new spot');
});

test('the chase camera rises after a jumping kart smoothly, not all at once', () => {
  const camera = createChaseCamera();
  followKart(camera, pose(0), STEP);
  const heightBefore = camera.position.y;
  followKart(camera, pose(0.4, vec(1, 0, 0), 1), STEP);
  const rise = camera.position.y - heightBefore;
  assert.ok(rise > 0 && rise < 0.5, `the kart rose 1, the camera ${rise}`);
});

test('while boosting the chase camera pulls back and widens its view, and comes back after', () => {
  const camera = createChaseCamera();
  followKart(camera, pose(0), STEP);
  const normalBehind = -camera.position.x;
  const normalView = camera.fieldOfView;
  for (let frame = 0; frame < 60; frame += 1) {
    followKart(camera, pose(0), STEP, true);
  }
  assert.ok(-camera.position.x > normalBehind + 1.5, `${-camera.position.x} behind while boosting`);
  assert.ok(camera.fieldOfView > normalView + 6);
  for (let frame = 0; frame < 240; frame += 1) {
    followKart(camera, pose(0), STEP, false);
  }
  assert.ok(Math.abs(-camera.position.x - normalBehind) < 0.05);
});

test('the step timer averages the kept steps and finds the worst', () => {
  const timer = createStepTimer();
  assert.equal(timer.summary(), null);
  timer.record(0.1);
  timer.record(0.3);
  assert.deepEqual(timer.summary(), { averageMs: 0.2, worstMs: 0.3, count: 2 });
  for (let step = 0; step < 500; step += 1) {
    timer.record(0.05);
  }
  assert.equal(timer.summary().count, 240);
  assert.equal(timer.summary().worstMs, 0.05, 'old steps are forgotten');
});

test('the readout is rebuilt four times a second during a race, from the frames drawn since the last time', () => {
  const readout = createReadout();
  const players = new Map();
  addPlayer(players, 'p1');
  const race = createRace(track, ['p1'], 3, 150, 'normal');
  assert.equal(readout.frameDrawn(1000, 5, null, track, players, null), null, 'nothing on the setup screen');
  assert.equal(readout.frameDrawn(1100, 3, race, track, players, null), null, 'not yet');
  const text = readout.frameDrawn(1250, 3, race, track, players, null);
  assert.match(text, /^Physics step: not measured yet\nDrawing: 8 fps, 3\.0 ms CPU per frame\n/);
  assert.equal(readout.frameDrawn(1300, 3, race, track, players, null), null, 'a new count started');
});

test('the readout keeps each player\'s last starts across races, the lip timing and the round trips', () => {
  assert.equal(
    describeTimings([{ outcome: 'rocket', offset: 0.31 }, { outcome: 'stall', offset: -0.2 }, { outcome: 'normal', offset: null }], { offset: 0.12, trick: true }, [42, 35, 60]),
    'Go after "2": +0.31 rocket, -0.20 stall, no press | Drift from lip: +0.12 trick | round trip 60 ms (35-60)',
  );
  assert.equal(describeTimings(), 'Go after "2": none yet | Drift from lip: none yet | round trip not measured yet');
  const readout = createReadout();
  const players = new Map();
  addPlayer(players, 'p1');
  readout.recordRoundTrip('p1', 40);
  for (const pressAt of [ROCKET_PRESS, 0.5]) {
    const race = createRace(track, ['p1'], 3, 150, 'normal');
    for (let step = 0; step < GO_AT * 60 + 1; step += 1) {
      stepRace(race, track, () => ({ ...NEUTRAL_CONTROLS, accelerate: race.time >= pressAt }), STEP);
    }
    // Described twice, as every quarter second: each start is listed once.
    readout.describe(race, track, players, null, 60, 2);
    const text = readout.describe(race, track, players, null, 60, 2);
    assert.match(text, /Physics step: not measured yet\nDrawing: 60 fps, 2\.0 ms CPU per frame\n/);
    assert.match(text, /units\/s/);
    if (pressAt === 0.5) {
      assert.match(text, /Go after "2": \+0\.4\d rocket, -0\.4\d stall \| Drift from lip: none yet \| round trip 40 ms/);
    }
  }
});
