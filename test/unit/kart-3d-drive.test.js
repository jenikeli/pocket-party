// Unit tests for the 3D test drive (host/games/kart-3d/drive.js, dummy-driver.js, chase-camera.js,
// drive-views.js, readout.js and step-timer.js): the grid, a full field of dummy karts lapping the test track
// through every feature, the chase camera and its boost pull-back, the phone views, the drawn body's lean and
// spin, the readout, and the step timer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { TEST_TRACK } from '../../host/games/kart-3d/test-track.js';
import { progressBetween } from '../../host/games/kart-3d/track.js';
import { createDrive, stepDrive, removeKart, playerKart, FIELD_SIZE } from '../../host/games/kart-3d/drive.js';
import { forwardSpeed } from '../../host/games/kart-3d/kart-physics.js';
import { KART_RADIUS } from '../../host/games/kart-3d/kart-walls.js';
import { createChaseCamera, followKart } from '../../host/games/kart-3d/chase-camera.js';
import { setupView, drivingView, viewTargets, kartPose, describeKart } from '../../host/games/kart-3d/drive-views.js';
import { addPlayer } from '../../host/roster.js';
import { createStepTimer } from '../../host/games/kart-3d/step-timer.js';
import { createReadout, describeTimings } from '../../host/games/kart-3d/readout.js';
import { GO_AT } from '../../host/games/kart-3d/rocket-start.js';
import { createSetup, applyChoice } from '../../host/kart/setup.js';
import { NEUTRAL_CONTROLS } from '../../host/kart/kart-controls.js';
import { vec, subtract, length, dot, normalize, addScaled, rotate } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const track = buildTrack(TEST_TRACK);

test('the grid: dummies fill the field to 12, players at the back, all on the road behind the line, apart', () => {
  const drive = createDrive(track, ['p1', 'p2']);
  assert.equal(drive.karts.length, FIELD_SIZE);
  assert.deepEqual(drive.karts.slice(-3).map((kart) => kart.playerId), [null, 'p1', 'p2']);
  assert.ok(playerKart(drive, 'p2').s < drive.karts[0].s, 'the players are behind the dummies');
  assert.equal(drive.karts.filter((kart) => kart.playerId === null).length, 10);
  for (const kart of drive.karts) {
    assert.ok(kart.s > 0 && kart.s < track.startLine, `on the start straight behind the line: ${kart.s}`);
    assert.equal(kart.grounded, true);
  }
  for (let i = 0; i < drive.karts.length; i += 1) {
    for (let j = i + 1; j < drive.karts.length; j += 1) {
      assert.ok(length(subtract(drive.karts[i].position, drive.karts[j].position)) > 2 * KART_RADIUS);
    }
  }
});

test('12 dummy karts lap the test track twice: over the jump, round the hairpin and up the wall, none falling off', () => {
  const drive = createDrive(track, []);
  const laps = drive.karts.map(() => ({ distance: 0, falls: 0, airSteps: 0, wallSteps: 0, slowest: Infinity }));
  for (let step = 0; step < 65 * 60; step += 1) {
    const before = drive.karts.map((kart) => kart.s);
    stepDrive(drive, track, () => NEUTRAL_CONTROLS, STEP);
    drive.karts.forEach((kart, index) => {
      const lap = laps[index];
      lap.distance += progressBetween(track, before[index], kart.s);
      lap.falls += kart.respawnIn !== null ? 1 : 0;
      lap.airSteps += kart.grounded ? 0 : 1;
      lap.wallSteps += kart.antiGravity && Math.abs(kart.up.y) < 0.1 ? 1 : 0;
      lap.slowest = Math.min(lap.slowest, kart.s > 300 && kart.s < 360 ? forwardSpeed(kart) : Infinity);
    });
  }
  laps.forEach((lap, index) => {
    assert.equal(lap.falls, 0, `dummy ${index} fell off`);
    assert.ok(lap.distance > 2 * track.length, `dummy ${index} drove ${lap.distance}`);
    assert.ok(lap.airSteps > 2 * 30, `dummy ${index} jumped (${lap.airSteps} steps in the air)`);
    assert.ok(lap.wallSteps > 2 * 30, `dummy ${index} drove on the vertical wall`);
    assert.ok(lap.slowest < 16, `dummy ${index} slowed for the hairpin (${lap.slowest})`);
  });
});

test('a player kart follows its controls after the countdown; a removed player\'s kart leaves the track', () => {
  const drive = createDrive(track, ['p1']);
  const go = { steer: 0, accelerate: true, brake: false, drift: false };
  for (let step = 0; step < (GO_AT + 1) * 60; step += 1) {
    stepDrive(drive, track, (playerId) => (playerId === 'p1' && drive.started ? go : NEUTRAL_CONTROLS), STEP);
  }
  assert.ok(forwardSpeed(playerKart(drive, 'p1')) > 4);
  removeKart(drive, 'p1');
  assert.equal(playerKart(drive, 'p1'), null);
  assert.equal(drive.karts.length, FIELD_SIZE - 1);
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

test('phone views: the setup view has no laps; the driving view carries the control style', () => {
  const setup = createSetup();
  applyChoice(setup, 'p1', { choice: 'steering', value: 'tilt' }, true);
  assert.deepEqual(setupView(setup, 'p1'), { phase: 'setup', laps: null, steering: 'tilt', autoAccelerate: false, ready: false });
  const drive = createDrive(track, ['p1']);
  assert.deepEqual(drivingView(drive, setup, 'p1'), {
    phase: 'countdown',
    steering: 'tilt',
    autoAccelerate: false,
    countdown: 3,
    spark: null,
    start: null,
  });
  assert.equal(drivingView(drive, setup, 'late'), null, 'a player with no kart waits for the next drive');
});

test('views: one per player kart in slot order; 3 players get a dummy in the fourth quarter', () => {
  const players = new Map();
  for (const playerId of ['a', 'b', 'c']) {
    addPlayer(players, playerId);
  }
  const drive = createDrive(track, ['c', 'b', 'a']);
  const targets = viewTargets(drive, players);
  assert.deepEqual(targets.map((target) => target.player?.playerId ?? null), ['a', 'b', 'c', null]);
  assert.equal(targets[0].kart, playerKart(drive, 'a'));
  assert.equal(targets[3].kart.playerId, null);
  removeKart(drive, 'c');
  assert.equal(viewTargets(drive, players).length, 2, 'a player without a kart gets no view');
  removeKart(drive, 'a');
  removeKart(drive, 'b');
  assert.deepEqual(viewTargets(drive, players).map((target) => target.player), [null], 'nobody left: follow a dummy');
});

test('poses between steps and the readout line', () => {
  const drive = createDrive(track, ['p1']);
  const kart = playerKart(drive, 'p1');
  kart.previousPosition = vec(0, 0, 0);
  kart.position = vec(1, 0, 0);
  assert.deepEqual(kartPose(kart, 0.25).position, vec(0.25, 0, 0));
  kart.velocity = addScaled(vec(0, 0, 0), kart.forward, 12);
  assert.match(describeKart(kart, track), /^12\.0 units\/s \(6\.0 kart lengths\/s\), road, \d+% round$/);
  kart.respawnIn = 1;
  assert.match(describeKart(kart, track), /fell off/);
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

test('phone views count down, then show the drift\'s spark colour and, for a moment after GO, the start', () => {
  const setup = createSetup();
  const drive = createDrive(track, ['p1']);
  const countdowns = [];
  for (let step = 0; step < (GO_AT + 0.5) * 60; step += 1) {
    stepDrive(drive, track, () => ({ ...NEUTRAL_CONTROLS, accelerate: drive.time >= 1.2 }), STEP);
    countdowns.push(drivingView(drive, setup, 'p1').countdown);
  }
  assert.deepEqual([...new Set(countdowns)], [3, 2, 1, 0]);
  const view = drivingView(drive, setup, 'p1');
  assert.equal(view.phase, 'driving');
  assert.equal(view.start, 'rocket');
  const kart = playerKart(drive, 'p1');
  kart.driftDirection = 1;
  kart.driftCharge = 600;
  assert.equal(drivingView(drive, setup, 'p1').spark, 'orange');
  for (let step = 0; step < 2 * 60; step += 1) {
    stepDrive(drive, track, () => NEUTRAL_CONTROLS, STEP);
  }
  assert.deepEqual([drivingView(drive, setup, 'p1').countdown, drivingView(drive, setup, 'p1').start], [null, null]);
});

test('the drawn body leans into a drift and spins the short way round, while the camera follows the travel', () => {
  const kart = playerKart(createDrive(track, ['p1']), 'p1');
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

test('the readout keeps each player\'s last starts across drives, the lip timing and the round trips', () => {
  assert.equal(
    describeTimings([{ outcome: 'rocket', offset: 0.31 }, { outcome: 'stall', offset: -0.2 }, { outcome: 'normal', offset: null }], { offset: 0.12, trick: true }, [42, 35, 60]),
    'Go after "2": +0.31 rocket, -0.20 stall, no press | Drift from lip: +0.12 trick | round trip 60 ms (35-60)',
  );
  assert.equal(describeTimings(), 'Go after "2": none yet | Drift from lip: none yet | round trip not measured yet');
  const readout = createReadout();
  const players = new Map();
  addPlayer(players, 'p1');
  readout.recordRoundTrip('p1', 40);
  for (const pressAt of [1.2, 0.5]) {
    const drive = createDrive(track, ['p1']);
    for (let step = 0; step < GO_AT * 60 + 1; step += 1) {
      stepDrive(drive, track, () => ({ ...NEUTRAL_CONTROLS, accelerate: drive.time >= pressAt }), STEP);
    }
    // Described twice, as every quarter second: each start is listed once.
    readout.describe(drive, track, players, null, 60, 2);
    const text = readout.describe(drive, track, players, null, 60, 2);
    assert.match(text, /Physics step: not measured yet\nDrawing: 60 fps, 2\.0 ms CPU per frame\n/);
    assert.match(text, /units\/s/);
    if (pressAt === 0.5) {
      assert.match(text, /Go after "2": \+0\.2\d rocket, -0\.4\d stall \| Drift from lip: none yet \| round trip 40 ms/);
    }
  }
});
