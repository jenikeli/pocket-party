// Unit tests for Saltline match flow, especially Uplink plant and defuse.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, stepMatch } from '../../host/games/fps/match.js';
import { createSession } from '../../host/games/fps/session.js';
import { matchView, viewersFor } from '../../host/games/fps/views.js';
import { layoutViews } from '../../host/games/temple-run/layout.js';
import { INPUT_KINDS } from '../../shared/protocol.js';

function readyMatch() {
  const match = createMatch({
    mapId: 'harbor', modeId: 'sad', botLevel: 1, seed: 19,
    people: [{ id: 'a', name: 'Attacker', team: 0, primary: 'rifle' }, { id: 'd', name: 'Defender', team: 1, primary: 'rifle' }],
  });
  match.phase = 'play';
  match.clock = 0;
  const attacker = match.world.players.find((player) => player.id === 'a');
  const defender = match.world.players.find((player) => player.id === 'd');
  attacker.x = -34;
  attacker.z = -20;
  defender.x = 34;
  defender.z = 20;
  return { match, attacker, defender };
}

test('attacker holds Use for 3 seconds to plant Uplink', () => {
  const { match, attacker } = readyMatch();
  attacker.held.use = true;
  stepMatch(match, 3.1);
  assert.equal(match.uplink.planted, true);
  assert.equal(match.uplink.site, 'A');
  assert.ok(match.uplink.remaining >= 39 && match.uplink.remaining <= 40);
  assert.equal(match.phase, 'play');
});

test('defender holds Use for 3 seconds to defuse the planted Uplink', () => {
  const { match, attacker, defender } = readyMatch();
  attacker.held.use = true;
  stepMatch(match, 3.1);
  attacker.held.use = false;
  defender.x = -34;
  defender.z = -20;
  defender.held.use = true;
  stepMatch(match, 3.1);
  assert.equal(match.phase, 'over');
  assert.equal(match.result.reason, 'defused');
  assert.equal(match.result.winner, 1);
});

test('Relay Recovery spawns Gulls and Hounds and completes after the crew cuts all three relays', () => {
  const match = createMatch({
    mapId: 'harbor', modeId: 'relay', botLevel: 1, seed: 23,
    people: [{ id: 'crew', name: 'Crew', team: 0, primary: 'rifle' }],
  });
  const player = match.world.players.find((entry) => entry.id === 'crew');
  assert.deepEqual(match.world.players.filter((entry) => entry.enemyType).map((entry) => entry.enemyType), ['gull', 'hound', 'hound', 'gull', 'hound']);
  match.phase = 'play';
  match.world.players.filter((entry) => entry.enemyType).forEach((entry) => { entry.alive = false; });
  player.held.use = true;
  for (const relay of match.relays) {
    player.x = relay.x;
    player.z = relay.z;
    stepMatch(match, 4.1);
  }
  assert.equal(match.phase, 'over');
  assert.equal(match.result.reason, 'mission-complete');
  assert.equal(match.relays.filter((relay) => relay.cut).length, 3);
});

test('Relay Recovery controller view exposes a nearby relay prompt', () => {
  const match = createMatch({
    mapId: 'harbor', modeId: 'relay', botLevel: 1, seed: 29,
    people: [{ id: 'crew', name: 'Crew', team: 0, primary: 'rifle' }],
  });
  const player = match.world.players.find((entry) => entry.id === 'crew');
  match.phase = 'play';
  player.x = match.relays[0].x;
  player.z = match.relays[0].z;
  const view = matchView(match, player);
  assert.equal(view.mode, 'relay');
  assert.equal(view.relay.id, '01');
  assert.equal(view.relay.canUse, true);
  assert.equal(view.relays.length, 3);
  assert.equal(view.crouching, false);
});

test('one to four human players each get a split-screen view', () => {
  for (let count = 1; count <= 4; count += 1) {
    const people = Array.from({ length: count }, (_, index) => ({
      id: `human${index}`, name: `Player ${index}`, team: index % 2, primary: 'rifle',
    }));
    const match = createMatch({ mapId: 'harbor', modeId: 'tdm', botLevel: 2, seed: count, people });
    const viewers = viewersFor(match);
    assert.deepEqual(viewers, people.map((person) => person.id));
    assert.equal(layoutViews(viewers.length).length, count);
  }
});

test('human players stay on the original PAC-9 Longshore', () => {
  const session = createSession({
    people: [{ id: 'human', name: 'Player', team: 0, primary: 'rifle' }],
    modeId: 'tdm', botLevel: 1, seed: 39, mapId: 'harbor',
  });
  const player = session.playerOf('human');
  session.input('human', { kind: INPUT_KINDS.BUTTON, button: 'swap', pressed: true });
  session.input('human', { kind: INPUT_KINDS.CHOICE, choice: 'primary', value: 'sniper' });
  session.step(1 / 60);
  assert.equal(player.slot, 'primary');
  assert.equal(matchView(session.match, player).weapon.name, 'PAC-9 Longshore');
});

test('a bot-only match gives the host one CPU view while the CPUs fight', () => {
  const match = createMatch({ mapId: 'harbor', modeId: 'tdm', botLevel: 2, seed: 42, people: [] });
  assert.ok(match.world.players.every((player) => player.bot && !player.human));
  const viewers = viewersFor(match);
  assert.deepEqual(viewers, ['bot0']);
  assert.equal(layoutViews(viewers.length).length, 1);

  match.phase = 'play';
  for (let step = 0; step < 20 * 60; step += 1) {
    stepMatch(match, 1 / 60);
  }
  assert.ok(match.world.players.some((player) => player.kills > 0));
  assert.ok(match.scores.some((score) => score > 0));
});
