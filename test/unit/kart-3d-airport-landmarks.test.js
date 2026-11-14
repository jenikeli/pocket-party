// Unit tests for the airport's terminal and control tower (M9), which run without a browser
// (their maps and pictures need a canvas, so the shapes are checked): every part is whole (positions, colours,
// texture coordinates, no NaN), each fits its triangle budget, stands on y = 0 and stays inside the footprint it
// reports, and the terminal's gates stand in front of it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

// The kit imports Three.js by its bare name, which the browser's import map points at the vendored copy; a
// resolve hook does the same here (as in kart-3d-lighthouse.test.js).
const threeFolder = pathToFileURL(new URL('../../host/vendor/three-0.186.1/', import.meta.url).pathname).href;
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'three') {
      return next(`${threeFolder}three.module.js`, context);
    }
    if (specifier.startsWith('three/addons/')) {
      return next(`${threeFolder}addons/${specifier.slice('three/addons/'.length)}`, context);
    }
    return next(specifier, context);
  },
});

const { terminalGeometry, terminalFootprint, terminalGates } = await import('../../host/games/kart-3d/kit/terminal.js');
const { controlTowerGeometry, CONTROL_TOWER_FOOTPRINT } = await import('../../host/games/kart-3d/kit/control-tower.js');

// The spec's budgets.
const TERMINAL_BUDGET = 120000;
const TOWER_BUDGET = 30000;
const LENGTH = 160;

const terminal = terminalGeometry(LENGTH);
const tower = controlTowerGeometry();

function triangles(parts) {
  return Object.values(parts).reduce((sum, geometry) => sum + geometry.index.count / 3, 0);
}

// The box round every part together.
function bounds(parts) {
  const boxes = Object.values(parts).map((geometry) => {
    geometry.computeBoundingBox();
    return geometry.boundingBox;
  });
  const reduce = (pick, choose) => choose(...boxes.map(pick));
  return {
    min: { x: reduce((box) => box.min.x, Math.min), y: reduce((box) => box.min.y, Math.min), z: reduce((box) => box.min.z, Math.min) },
    max: { x: reduce((box) => box.max.x, Math.max), y: reduce((box) => box.max.y, Math.max), z: reduce((box) => box.max.z, Math.max) },
  };
}

function assertWhole(parts) {
  for (const [name, geometry] of Object.entries(parts)) {
    const { position, color, uv } = geometry.attributes;
    assert.ok(color && uv && geometry.index, `${name} lacks colours, texture coordinates or an index`);
    assert.ok(position.array.every(Number.isFinite), `${name} has a NaN position`);
    assert.ok(uv.array.every(Number.isFinite), `${name} has a NaN texture coordinate`);
  }
}

test('every part of both landmarks is whole', () => {
  assertWhole(terminal);
  assertWhole(tower);
});

test('the terminal fits its triangle budget, also a longer one', () => {
  assert.ok(triangles(terminal) < TERMINAL_BUDGET, `${triangles(terminal)} triangles`);
  assert.ok(triangles(terminalGeometry(200)) < TERMINAL_BUDGET, 'a terminal 200 long');
});

test('the control tower fits its triangle budget', () => {
  assert.ok(triangles(tower) < TOWER_BUDGET, `${triangles(tower)} triangles`);
});

test('the terminal stands on y = 0, about 160 long, 18 to 25 tall to its roof and about 30 deep, inside its footprint', () => {
  const box = bounds(terminal);
  const footprint = terminalFootprint(LENGTH);
  assert.ok(Math.abs(box.min.y) < 0.05, `foot at ${box.min.y}`);
  assert.ok(box.min.x >= footprint.minX - 0.01 && box.max.x <= footprint.maxX + 0.01, `x from ${box.min.x} to ${box.max.x}`);
  assert.ok(box.min.z >= footprint.minZ - 0.01 && box.max.z <= footprint.maxZ + 0.01, `z from ${box.min.z} to ${box.max.z}`);
  assert.ok(box.max.y <= footprint.height + 0.01, `top at ${box.max.y}`);
  assert.ok(terminal.roof.boundingBox.max.y >= 18 && terminal.roof.boundingBox.max.y <= 25, 'the roof\'s height');
  assert.ok(-footprint.minX >= 25 && -footprint.minX <= 32, 'the depth behind the glass');
});

test('the terminal\'s three gates stand in front of its glass, along it and inside its footprint', () => {
  const gates = terminalGates(LENGTH);
  const footprint = terminalFootprint(LENGTH);
  assert.equal(gates.length, 3);
  for (const gate of gates) {
    assert.ok(gate.x > 15 && gate.x <= footprint.maxX, `gate x ${gate.x}`);
    assert.ok(gate.y > 2 && gate.y < 5, `door height ${gate.y}`);
    assert.ok(Math.abs(gate.z) < LENGTH / 2, `gate z ${gate.z}`);
  }
});

test('the control tower stands on y = 0, about 40 tall, inside its footprint, its radar on its own axis', () => {
  const { radar, ...standing } = tower;
  const box = bounds(standing);
  assert.ok(Math.abs(box.min.y) < 0.05, `foot at ${box.min.y}`);
  assert.ok(box.max.y > 36 && box.max.y <= CONTROL_TOWER_FOOTPRINT.height + 0.01, `top at ${box.max.y}`);
  assert.ok(Math.max(-box.min.x, box.max.x, -box.min.z, box.max.z) <= CONTROL_TOWER_FOOTPRINT.radius + 0.01, 'reach');
  radar.computeBoundingBox();
  assert.ok(Math.abs(radar.boundingBox.min.y) < 0.01 && Math.abs(radar.boundingBox.max.x + radar.boundingBox.min.x) < 0.01, 'the radar turns round its middle');
});
