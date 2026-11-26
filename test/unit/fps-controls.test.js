// Unit tests for Saltline's phone-driven movement and aiming (host/games/fps/player.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPlayer, setStick, applyLook, movePlayer } from '../../host/games/fps/player.js';
import { createWorld } from '../../host/games/fps/world.js';
import { TUNING } from '../../host/games/fps/tuning.js';

const map = { id: 'flat', boxes: [], bounds: { x0: -100, x1: 100, z0: -100, z1: 100 } };

test('forward stick moves toward the yaw-zero -Z direction and strafe moves right', () => {
  const world = createWorld(map, 7);
  const player = createPlayer({ id: 'p1', name: 'P1', team: 0, human: true, primary: 'rifle' });
  world.players.push(player);
  player.alive = true;
  setStick(player, 0, 1);
  for (let i = 0; i < 20; i++) movePlayer(world, player, 1 / 60);
  assert.ok(player.z < -0.5);
  assert.ok(Math.abs(player.x) < 0.01);

  setStick(player, 1, 0);
  const oldX = player.x;
  for (let i = 0; i < 20; i++) movePlayer(world, player, 1 / 60);
  assert.ok(player.x > oldX + 0.5);
});

test('sensitivity scales look and ADS reduces yaw and pitch movement', () => {
  const player = createPlayer({ id: 'p1', name: 'P1', team: 0, human: true, primary: 'rifle' });
  applyLook(player, 0.5, 0.25);
  const normalYaw = player.yaw;
  const normalPitch = player.pitch;

  applyLook(player, -0.5, -0.25);
  assert.equal(player.yaw, 0);
  assert.ok(Math.abs(player.pitch) < 0.000001);

  player.zoom = 1;
  applyLook(player, 0.5, 0.25);
  assert.ok(Math.abs(player.yaw) < Math.abs(normalYaw));
  assert.ok(Math.abs(player.pitch) < Math.abs(normalPitch));
});

test('stick magnitude selects walk, run and sprint speed classes', () => {
  const world = createWorld(map, 11);
  const player = createPlayer({ id: 'p1', name: 'P1', team: 0, human: true, primary: 'rifle' });
  world.players.push(player);
  player.alive = true;
  setStick(player, 0, 0.3);
  movePlayer(world, player, 1 / 60);
  assert.equal(player.speedClass, 'silent');
  setStick(player, 0, 0.7);
  movePlayer(world, player, 1 / 60);
  assert.equal(player.speedClass, 'run');
  setStick(player, 0, 1);
  movePlayer(world, player, 1 / 60);
  assert.equal(player.speedClass, 'sprint');
  assert.ok(TUNING.sprint > TUNING.run);
});
