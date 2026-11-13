// Unit tests for the plain parts of the 3D race's HTML panels (M10 G): what a results row shows, how the tuning
// panel writes a number, and the stage and stylesheet the panels share. The DOM itself is checked by the browser tests.

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { describeResultRow } from '../../host/games/kart-3d/results-panel.js';
import { tuningValueText } from '../../host/games/kart-3d/tuning-panel.js';
import { createRaceStage } from '../../host/games/kart-3d/race-stage.js';
import { addPlayer, colorText } from '../../host/roster.js';

function playerNamed(name) {
  const players = new Map();
  addPlayer(players, 'p1');
  players.get('p1').name = name;
  return players.get('p1');
}

test('a results row shows the place, the name and the finish time, a player in their colour and a CPU kart in grey', () => {
  const player = playerNamed('Cy');
  const playerRow = describeResultRow({ place: 1, playerId: 'p1', finishTime: 101.256 }, player);
  assert.deepEqual(playerRow, { place: '1st', name: 'Cy', color: colorText(player), time: '1:41.25', isPlayer: true });
  const cpuRow = describeResultRow({ place: 12, playerId: null, finishTime: null }, undefined);
  assert.deepEqual(cpuRow, { place: '12th', name: 'CPU', color: '#9aa4bf', time: '--', isPlayer: false });
});

test('a tuned number is written with the decimals of its slider\'s step, then its unit', () => {
  assert.equal(tuningValueText({ step: 0.5, unit: 'units/s' }, 44), '44.0 units/s');
  assert.equal(tuningValueText({ step: 0.01, unit: 'share' }, 0.35), '0.35 share');
  assert.equal(tuningValueText({ step: 1, unit: 'deg/s' }, 67), '67 deg/s');
  assert.equal(tuningValueText({ step: 0.1, unit: '' }, 3), '3.0', 'no unit, no trailing space');
});

// A stand-in for the few parts of the page createRaceStage uses.
function fakeElement() {
  const element = { children: [], dataset: {}, className: '' };
  element.append = (child) => element.children.push(child);
  element.querySelector = (selector) => {
    assert.equal(selector, 'link[data-race-panels]');
    return element.children.find((child) => child.rel === 'stylesheet') ?? null;
  };
  return element;
}

afterEach(() => {
  delete globalThis.document;
});

test('the panels share one stylesheet link per container, and each gets its own stage', () => {
  globalThis.document = { createElement: fakeElement };
  const container = fakeElement();
  const first = createRaceStage(container, 'k3d-race-stage');
  const second = createRaceStage(container, 'k3d-race-stage k3d-stage-over');
  const links = container.children.filter((child) => child.rel === 'stylesheet');
  assert.equal(links.length, 1);
  assert.equal(links[0].href, '/host/games/kart-3d/race-panels.css');
  assert.equal(first.className, 'pp-stage k3d-race-stage');
  assert.equal(second.className, 'pp-stage k3d-race-stage k3d-stage-over');
  assert.deepEqual(container.children.filter((child) => child !== links[0]), [first, second]);
});
