// Unit tests for gliding (M9, host/games/kart-3d/kart-glide.js, through kart-physics.js and kart-techniques.js) off
// Palm Bay Airport's glide ramp: the glider opening at the lip, floating, banking, the corridor's air walls and
// floor, landing on the beach road, diving with Brake, the trick boosting at once, no falls at any engine class, the
// chase camera's lift, and a field of CPU karts gliding at every engine class.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTrack } from '../../host/games/kart-3d/track-builder.js';
import { PALM_BAY_AIRPORT } from '../../host/games/kart-3d/palm-bay-airport.js';
import { createKart, stepKart, GRAVITY } from '../../host/games/kart-3d/kart-physics.js';
import { bumpKarts } from '../../host/games/kart-3d/kart-bumps.js';
import { updateSlipstreams } from '../../host/games/kart-3d/slipstream.js';
import { BOOST_KINDS } from '../../host/games/kart-3d/kart-boosts.js';
import { KART_RADIUS } from '../../host/games/kart-3d/kart-walls.js';
import { jumps } from '../../host/games/kart-3d/racing-line-pins.js';
import { gridSpot, ENGINE_CLASSES, FIELD_SIZE } from '../../host/games/kart-3d/race.js';
import { createCpu, cpuControls } from '../../host/games/kart-3d/cpu-driver.js';
import { createChaseCamera, followKart } from '../../host/games/kart-3d/chase-camera.js';
import { progressBetween, pointAt } from '../../host/games/kart-3d/track.js';
import { tuning } from '../../host/games/kart-3d/tuning.js';
import { vec, scale } from '../../host/games/kart-3d/vector.js';

const STEP = 1 / 60;
const DEGREES = Math.PI / 180;
const track = buildTrack(PALM_BAY_AIRPORT);
const glideGap = jumps(track).find((jump) => jump.glide);
// The beach road's straight, from where the gap ends to the next turn.
const BEACH_STRAIGHT = 40;
const BEACH_HEIGHT = -6;

// A kart of `engineClass` driving onto the glide ramp from just past the dash panel before it, at its top speed
// (or `speedShare` of it), then across the gap with `controlsAt(kart)` until it lands or `seconds` pass. Returns the
// kart and what happened: { opened (s where the glider opened), landed (s where it landed, or null), airTime,
// highest (the most height above the lip), pastWall (the most |lateral| went past the air wall, the road's half
// width less the kart's, while gliding: negative if it never reached it), fell, maxRoll }.
function glideOff(controlsAt, { engineClass = 150, speedShare = 1, seconds = 6 } = {}) {
  const kart = createKart(track, glideGap.lipS - 25, 0, 1, ENGINE_CLASSES[engineClass]);
  kart.velocity = scale(kart.forward, tuning.topSpeed * ENGINE_CLASSES[engineClass] * speedShare);
  const lipY = kart.position.y + 2.5;
  const result = { opened: null, landed: null, airTime: 0, highest: -Infinity, pastWall: -Infinity, fell: false, maxRoll: 0 };
  for (let step = 0; step < seconds * 60 && result.landed === null; step += 1) {
    const wasGliding = kart.gliding;
    stepKart(track, kart, { accelerate: true, brake: false, drift: false, steer: 0, ...controlsAt(kart) }, STEP);
    result.fell ||= kart.respawnIn !== null;
    if (!wasGliding && kart.gliding) {
      result.opened = kart.s;
    }
    if (kart.gliding) {
      result.airTime += STEP;
      result.highest = Math.max(result.highest, kart.position.y - lipY);
      const wall = track.stations[kart.trackIndex].halfWidth - KART_RADIUS;
      result.pastWall = Math.max(result.pastWall, Math.abs(kart.lateral) - wall);
      result.maxRoll = Math.max(result.maxRoll, Math.abs(kart.bodyRoll));
    }
    if (wasGliding && !kart.gliding) {
      result.landed = kart.grounded ? kart.s : null;
    }
  }
  return { kart, ...result };
}

const floating = () => ({});
const diving = (kart) => ({ brake: kart.gliding });

test('the airport has one glide: its gap glides, the jump\'s does not', () => {
  assert.deepEqual(jumps(track).map((jump) => jump.glide), [false, true]);
  assert.ok(track.stations.some((station) => station.glide));
});

test('off the glide ramp at 150cc the glider opens at the lip, floats up and down gently, and lands on the beach road', () => {
  const { kart, opened, landed, airTime, highest, fell } = glideOff(floating);
  assert.ok(Math.abs(opened - glideGap.lipS) < 1, `opened at ${opened}, the lip is at ${glideGap.lipS}`);
  assert.equal(fell, false);
  assert.ok(highest > 1, `rose ${highest.toFixed(2)} above the lip`);
  // A jump at the normal gravity would be down in about 1.2 s from this lip; the glide floats over twice that.
  assert.ok(airTime > 2.4, `glided ${airTime.toFixed(2)} s`);
  assert.ok(landed >= glideGap.landingS && landed < glideGap.landingS + BEACH_STRAIGHT, `landed at ${landed}`);
  assert.ok(Math.abs(kart.position.y - BEACH_HEIGHT) < 0.01);
  assert.equal(kart.gliding, false);
  assert.equal(kart.glideTime, null);
  assert.ok(GRAVITY > tuning.glideGravity * 3);
});

test('while gliding the glider holds its air speed, Go or not, and counts its time', () => {
  // The speed across the ground 1.5 s into the glide, with Go held and not.
  const speedAt = (accelerate) => {
    let speed = null;
    glideOff((kart) => {
      if (kart.gliding && kart.glideTime >= 1.5 && speed === null) {
        speed = Math.hypot(kart.velocity.x, kart.velocity.z);
      }
      return { accelerate: kart.gliding ? accelerate : true };
    });
    return speed;
  };
  const airSpeed = tuning.topSpeed * tuning.glideSpeedShare;
  assert.ok(Math.abs(speedAt(true) - airSpeed) < 1, `${speedAt(true).toFixed(2)} against ${airSpeed}`);
  assert.equal(speedAt(false), speedAt(true), 'Go makes no difference');
});

test('steering turns the glider and banks the body into the turn; the air wall keeps it in the corridor', () => {
  const right = glideOff((kart) => ({ steer: kart.gliding ? 1 : 0 }));
  assert.equal(right.fell, false);
  assert.ok(right.maxRoll > tuning.glideBankDegrees * DEGREES * 0.95, `banked ${(right.maxRoll / DEGREES).toFixed(1)} degrees`);
  // The road's half width is blended between stations, so the wall is within a little of the station's.
  assert.ok(right.pastWall < 0.05 && right.pastWall > -0.05, `${right.pastWall.toFixed(3)} past the air wall`);
  assert.ok(right.landed !== null, 'landed');
  const left = glideOff((kart) => ({ steer: kart.gliding ? -1 : 0 }));
  assert.ok(left.kart.lateral < 0 && left.landed !== null && !left.fell);
});

test('the bank follows the stick\'s side: right steer rolls the body right', () => {
  const { kart } = glideOff((each) => ({ steer: each.gliding ? 0.5 : 0 }), { seconds: 1 });
  assert.ok(kart.gliding);
  const expected = 0.5 * tuning.glideBankDegrees * DEGREES;
  assert.ok(Math.abs(kart.bodyRoll - expected) < 0.01, `${kart.bodyRoll} against ${expected}`);
});

test('Brake dives: nose down, a little faster, and it lands sooner, riding the gap\'s line down onto the road', () => {
  // The nose half a second into the glide.
  const pitchAt = (controls) => {
    let pitch = null;
    const result = glideOff((kart) => {
      if (kart.gliding && kart.glideTime >= 0.5 && pitch === null) {
        pitch = Math.asin(kart.forward.y);
      }
      return controls(kart);
    });
    return { ...result, pitch };
  };
  const float = pitchAt(floating);
  const dive = pitchAt(diving);
  assert.equal(dive.fell, false);
  assert.ok(dive.pitch < -5 * DEGREES && float.pitch > 0, `nose ${dive.pitch / DEGREES} diving, ${float.pitch / DEGREES} floating`);
  assert.ok(dive.airTime < float.airTime - 0.1, `dive ${dive.airTime.toFixed(2)} s, float ${float.airTime.toFixed(2)} s`);
  assert.ok(dive.landed <= float.landed && dive.landed < glideGap.landingS + 2, `dive landed at ${dive.landed}`);
});

test('a trick at the glide lip boosts at once, as the glider opens, and not again on landing', () => {
  const jumpBoosts = new Set();
  let boostedWhileGliding = false;
  const { landed, kart } = glideOff((each) => {
    if (each.boost?.kind === BOOST_KINDS.JUMP) {
      jumpBoosts.add(each.boost);
      boostedWhileGliding ||= each.gliding && each.glideTime < 0.1;
    }
    // Drift pressed on the first step after the lip, inside the trick's window.
    return { drift: each.gliding && each.glideTime < 0.05 };
  });
  assert.ok(landed !== null);
  assert.ok(boostedWhileGliding, 'boosted as the glider opened');
  assert.equal(jumpBoosts.size, 1, 'one trick boost, none on landing');
  assert.equal(kart.tricking, false);
});

test('no fall over the bay floating or diving, at any engine class or a slow speed, and every glide lands', () => {
  for (const engineClass of Object.keys(ENGINE_CLASSES)) {
    for (const [name, controls] of [['float', floating], ['dive', diving]]) {
      for (const speedShare of [1, 0.5]) {
        const { fell, landed, kart } = glideOff(controls, { engineClass, speedShare, seconds: 10 });
        const label = `${engineClass}cc ${name} at ${speedShare} of top speed`;
        assert.equal(fell, false, `${label} fell`);
        assert.ok(landed !== null && landed < glideGap.landingS + BEACH_STRAIGHT, `${label} landed at ${landed}`);
        assert.ok(kart.position.y > BEACH_HEIGHT - 0.01, `${label} is on the beach road`);
      }
    }
  }
});

test('the chase camera rides higher and further back while its kart glides, eased in and back', () => {
  const pose = { position: vec(0, 0, 0), forward: vec(1, 0, 0), up: vec(0, 1, 0) };
  const camera = createChaseCamera();
  followKart(camera, pose, STEP);
  const normal = camera.position;
  followKart(camera, pose, STEP, false, true);
  assert.ok(camera.position.y < normal.y + tuning.glideCameraLift * 0.5, 'eased, not snapped');
  for (let frame = 0; frame < 120; frame += 1) {
    followKart(camera, pose, STEP, false, true);
  }
  assert.ok(Math.abs(camera.position.y - normal.y - tuning.glideCameraLift) < 0.05, `${camera.position.y} high`);
  assert.ok(Math.abs(-camera.position.x + normal.x - tuning.glideCameraPullBack) < 0.05, `${camera.position.x} behind`);
  for (let frame = 0; frame < 300; frame += 1) {
    followKart(camera, pose, STEP, false, false);
  }
  assert.ok(Math.abs(camera.position.y - normal.y) < 0.05);
});

// Every engine class: a field of 12 CPU karts (levels and weights in turn, as kart-3d-cpu-driver.test.js's) laps
// the airport three times, stepped as race.js does; each glides once a lap, lands, and nobody falls.
for (const engineClass of Object.keys(ENGINE_CLASSES)) {
  test(`a field of 12 CPU karts glides and lands every lap of the airport at ${engineClass}cc, with nobody falling`, () => {
    const levels = ['easy', 'normal', 'hard'];
    const karts = Array.from({ length: FIELD_SIZE }, (_, gridIndex) => {
      const { s, lateral } = gridSpot(track, gridIndex);
      const kart = createKart(track, s, lateral, [0.8, 1, 1.25][gridIndex % 3], ENGINE_CLASSES[engineClass]);
      kart.cpu = createCpu(levels[gridIndex % 3], gridIndex);
      kart.log = { distance: kart.s - track.startLine, glides: 0, landings: [], falls: 0 };
      return kart;
    });
    const lapsDone = () => karts.every((kart) => kart.log.distance >= 3 * track.length);
    for (let step = 0; step < 400 * 60 && !lapsDone(); step += 1) {
      const controls = karts.map((kart) => cpuControls(track, kart, karts, STEP));
      karts.forEach((kart, index) => {
        const before = { s: kart.s, gliding: kart.gliding, falling: kart.respawnIn !== null };
        stepKart(track, kart, controls[index], STEP);
        kart.log.distance += progressBetween(track, before.s, kart.s);
        kart.log.glides += !before.gliding && kart.gliding ? 1 : 0;
        kart.log.falls += !before.falling && kart.respawnIn !== null ? 1 : 0;
        if (before.gliding && !kart.gliding) {
          kart.log.landings.push(kart.grounded ? kart.s : null);
        }
      });
      bumpKarts(karts);
      updateSlipstreams(karts, STEP);
    }
    for (const kart of karts) {
      const label = `${kart.cpu.level} kart ${kart.cpu.seed}`;
      assert.ok(kart.log.distance >= 3 * track.length, `${label} finished`);
      assert.equal(kart.log.falls, 0, `${label} fell`);
      assert.equal(kart.log.glides, 3, `${label} glided each lap`);
      for (const landing of kart.log.landings) {
        // On the beach road, a slipstreamed float now and then into the start of the turn after its straight.
        assert.ok(landing !== null && landing >= glideGap.landingS - 1 && landing < glideGap.landingS + BEACH_STRAIGHT + 20, `${label} landed at ${landing}`);
      }
    }
  });
}

test('a kart on the road is never gliding: one put on the road mid-glide (a teleport) folds the glider', () => {
  const { kart } = glideOff(floating, { seconds: 1 });
  assert.ok(kart.gliding);
  // As items/teleport.js puts a kart down: on the road, its frame the road's, grounded.
  const spot = pointAt(track, 50);
  Object.assign(kart, { position: spot.position, forward: spot.forward, up: spot.normal, trackIndex: spot.index, grounded: true });
  kart.velocity = scale(spot.forward, 20);
  stepKart(track, kart, { steer: 0, accelerate: true, brake: false, drift: false }, STEP);
  assert.equal(kart.gliding, false);
  assert.equal(kart.glideTime, null);
});
