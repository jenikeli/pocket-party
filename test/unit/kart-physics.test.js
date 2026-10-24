// Unit tests for host/games/kart-2d/kart-physics.js: pedals, steering, walls and bumps.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { driveKart, hitWalls, bumpKarts, wrapAngle, KART_RADIUS } from '../../host/games/kart-2d/kart-physics.js';
import { TRACK } from '../../host/games/kart-2d/track.js';

const DT = 1 / 60;
const MIDDLE_Y = TRACK.centerY + (TRACK.innerRadius + TRACK.outerRadius) / 2;

function kartAt(x, y, heading = 0, velocityX = 0, velocityY = 0) {
  return { x, y, heading, velocityX, velocityY };
}

function drive(kart, controls, seconds) {
  for (let step = 0; step < Math.round(seconds * 60); step += 1) {
    driveKart(kart, { steer: 0, accelerate: false, brake: false, ...controls }, DT);
  }
}

function speedOf(kart) {
  return Math.hypot(kart.velocityX, kart.velocityY);
}

test('accelerating reaches a top speed and stays there', () => {
  const kart = kartAt(0, 0);
  drive(kart, { accelerate: true }, 0.5);
  const afterHalfSecond = speedOf(kart);
  drive(kart, { accelerate: true }, 3);
  assert.ok(afterHalfSecond > 200 && afterHalfSecond < 420, `speed after 0.5 s: ${afterHalfSecond}`);
  assert.equal(Math.round(speedOf(kart)), 420);
  assert.ok(kart.x > 1000 && Math.abs(kart.y) < 1e-6, 'drove straight along its heading');
});

test('letting go coasts to a stop; braking stops sooner, then reverses slowly', () => {
  const coasting = kartAt(0, 0, 0, 400, 0);
  drive(coasting, {}, 1);
  const braking = kartAt(0, 0, 0, 400, 0);
  drive(braking, { brake: true }, 0.4);
  assert.ok(speedOf(braking) < speedOf(coasting));
  drive(coasting, {}, 2);
  assert.equal(speedOf(coasting), 0);

  drive(braking, { brake: true }, 2);
  assert.ok(braking.velocityX < -100 && braking.velocityX >= -140, `reversing at ${braking.velocityX}`);
});

test('brake wins when both pedals are held', () => {
  const kart = kartAt(0, 0, 0, 200, 0);
  drive(kart, { accelerate: true, brake: true }, 0.1);
  assert.ok(kart.velocityX < 200);
});

test('steering right turns clockwise on screen, and a kart standing still cannot turn', () => {
  const standing = kartAt(0, 0);
  drive(standing, { steer: 1 }, 1);
  assert.equal(standing.heading, 0);

  const moving = kartAt(0, 0, 0, 300, 0);
  drive(moving, { steer: 1, accelerate: true }, 0.2);
  assert.ok(moving.heading > 0.3, `heading ${moving.heading}`);
  assert.ok(moving.velocityY > 0, 'now moving down the screen as well as right');
});

test('a kart driving into the outer wall is put back on the road and loses its speed into the wall', () => {
  // Heading straight down at the bottom wall, already a little through it.
  const kart = kartAt(TRACK.centerX, TRACK.centerY + TRACK.outerRadius - 10, Math.PI / 2, 0, 300);
  assert.equal(hitWalls(kart, DT), true);
  assert.equal(kart.y, TRACK.centerY + TRACK.outerRadius - KART_RADIUS);
  assert.ok(kart.velocityY < 0 && kart.velocityY > -100, `bounced back gently: ${kart.velocityY}`);
  assert.equal(kart.heading, Math.PI / 2, 'head-on, the nose is left as it was');
});

test('a kart meeting a wall at a shallow angle turns to slide along it', () => {
  const heading = 0.3;
  const kart = kartAt(TRACK.centerX, TRACK.centerY + TRACK.outerRadius - 10, heading, 300 * Math.cos(heading), 300 * Math.sin(heading));
  hitWalls(kart, DT);
  assert.ok(Math.abs(kart.heading) < 1e-9, `now heading along the wall: ${kart.heading}`);
  assert.ok(kart.velocityX > 250, 'kept most of its speed along the wall');
});

test('hitWalls leaves a kart in the middle of the road alone', () => {
  const kart = kartAt(TRACK.centerX, MIDDLE_Y, 0, 300, 0);
  assert.equal(hitWalls(kart, DT), false);
  assert.deepEqual(kart, kartAt(TRACK.centerX, MIDDLE_Y, 0, 300, 0));
});

test('two overlapping karts are pushed apart and swap their closing speed', () => {
  const behind = kartAt(100, 0, 0, 300, 0);
  const ahead = kartAt(120, 0, 0, 100, 0);
  bumpKarts([behind, ahead]);
  assert.equal(ahead.x - behind.x, 2 * KART_RADIUS);
  assert.ok(ahead.velocityX > behind.velocityX, 'the one in front now goes faster');
  assert.equal(behind.velocityX + ahead.velocityX, 400, 'equal masses: the total is kept');
});

test('karts that do not touch are not bumped, and karts on the same spot still separate', () => {
  const apart = [kartAt(0, 0, 0, 100, 0), kartAt(2 * KART_RADIUS + 1, 0)];
  bumpKarts(apart);
  assert.equal(apart[0].velocityX, 100);

  const sameSpot = [kartAt(50, 50), kartAt(50, 50)];
  bumpKarts(sameSpot);
  assert.equal(Math.hypot(sameSpot[1].x - sameSpot[0].x, sameSpot[1].y - sameSpot[0].y), 2 * KART_RADIUS);
});

test('wrapAngle keeps headings within -PI..PI', () => {
  assert.ok(Math.abs(wrapAngle(3 * Math.PI) - Math.PI) < 1e-9);
  assert.ok(Math.abs(wrapAngle(-Math.PI / 2 - 2 * Math.PI) + Math.PI / 2) < 1e-9);
});
