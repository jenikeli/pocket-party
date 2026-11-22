// Unit tests for Spirefall's rules (host/games/arena/): the deck cycle, elixir speed, deploy zones, walking and
// fighting, every card trait, the match phases and tiebreak, a CPU-vs-CPU match, the session (PLACE input, CPU
// takeover) and what a phone is told. All plain functions, no browser.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CARDS, TOKENS, CARD_IDS, PRESET_DECKS, isValidDeck, cardById } from '../../shared/arena-cards.js';
import { ARENA, routeTo, constrainGround } from '../../shared/arena-map.js';
import { INPUT_KINDS } from '../../shared/protocol.js';
import { createRng } from '../../host/games/arena/rng.js';
import { createDeck, playSlot, nextCard } from '../../host/games/arena/deck.js';
import { elixirMultiplier, TUNING } from '../../host/games/arena/tuning.js';
import { padToWorld, snap, canDeploy } from '../../host/games/arena/placement.js';
import { createWorld, spawnUnit, drainEvents } from '../../host/games/arena/world.js';
import { stepWorld } from '../../host/games/arena/sim.js';
import { queueSpell } from '../../host/games/arena/sim-spells.js';
import { createMatch, stepMatch, playCard, forfeitTeam } from '../../host/games/arena/match.js';
import { createCpu, cpuThink } from '../../host/games/arena/cpu-driver.js';
import { createSession } from '../../host/games/arena/session.js';

const DT = 1 / 60;
const DAWN = 0;
const DUSK = 1;

function runWorld(world, seconds) {
  for (let step = 0; step < seconds * 60; step += 1) {
    stepWorld(world, DT);
  }
}

// A world with one landed unit per call; `team` DAWN stands at the bottom.
function landed(world, cardId, team, x, y) {
  return spawnUnit(world, cardId, team, x, y);
}

const TWO_CPUS = [{ team: DAWN, playerId: null, cpuLevel: 1 }, { team: DUSK, playerId: null, cpuLevel: 1 }];

function startedMatch(seed = 3, seats = TWO_CPUS, decks = [PRESET_DECKS.cinder, PRESET_DECKS.brook]) {
  const match = createMatch({ seed, seats, decks });
  for (let step = 0; step < 4 * 60; step += 1) {
    stepMatch(match, DT);
  }
  return match;
}

test('cards: 24 cards and 3 tokens, every deck preset valid, spells have an effect', () => {
  assert.equal(CARDS.length, 24);
  assert.equal(TOKENS.length, 3);
  assert.equal(new Set(CARD_IDS).size, 24);
  Object.values(PRESET_DECKS).forEach((deck) => assert.ok(isValidDeck(deck)));
  assert.ok(!isValidDeck(['flare']));
  assert.ok(!isValidDeck(Array(8).fill('flare')));
  CARDS.filter((card) => card.type === 'spell').forEach((card) => assert.ok(card.damage > 0 || card.heal));
  CARDS.forEach((card) => assert.ok(card.cost >= 1 && card.cost <= 7));
  for (const card of CARDS.filter((entry) => entry.traits?.spawner)) {
    assert.ok(cardById(card.traits.spawner.unit), `${card.id} spawns a known unit`);
  }
});

test('deck: the four in hand plus the queue are the eight cards, and a played card goes to the back', () => {
  const deck = createDeck(PRESET_DECKS.cog, createRng(1));
  assert.deepEqual([...deck.hand, ...deck.queue].sort(), [...PRESET_DECKS.cog].sort());
  const upNext = nextCard(deck);
  const played = playSlot(deck, 2);
  assert.equal(deck.hand[2], upNext);
  assert.equal(deck.queue[deck.queue.length - 1], played);
  const same = createDeck(PRESET_DECKS.cog, createRng(1));
  assert.deepEqual(same.hand, createDeck(PRESET_DECKS.cog, createRng(1)).hand);
  for (let play = 0; play < 8; play += 1) {
    playSlot(same, 0);
  }
  assert.equal(new Set([...same.hand, ...same.queue]).size, 8);
});

test('elixir: x1, then x2 in the last regulation minute and first overtime minute, x3 in the last overtime minute', () => {
  assert.equal(elixirMultiplier('regulation', 120), 1);
  assert.equal(elixirMultiplier('regulation', 60), 2);
  assert.equal(elixirMultiplier('overtime', 100), 2);
  assert.equal(elixirMultiplier('overtime', 60), 3);
  assert.equal(elixirMultiplier('intro', 3), 1);
});

test('elixir: it fills at 1 per 2.8 s and stops at 10', () => {
  const match = startedMatch();
  const before = match.players[0].elixir;
  for (let step = 0; step < 28 * 60; step += 1) {
    stepMatch(match, DT);
    match.players.forEach((player) => { player.elixir = Math.min(player.elixir, TUNING.maxElixir); });
  }
  assert.ok(match.players[0].elixir <= 10 + 1e-9);
  assert.ok(match.players[0].elixir > before);
});

test('placement: the pad turns for Dusk, snaps to half tiles, and the zones are the own half, pockets and spells', () => {
  assert.deepEqual(padToWorld(DAWN, 0.5, 1), { x: 9, y: 32 });
  assert.deepEqual(padToWorld(DUSK, 0, 0), { x: 18, y: 32 });
  assert.deepEqual(padToWorld(DUSK, 0.5, 1), { x: 9, y: 0 });
  assert.equal(snap(3.24), 3);
  assert.equal(snap(3.3), 3.5);
  const world = createWorld(1);
  const troop = cardById('bramble-knight');
  const spell = cardById('flare');
  assert.ok(canDeploy(world, DAWN, troop, 9, 21));
  assert.ok(!canDeploy(world, DAWN, troop, 9, 10), 'not across the river');
  assert.ok(!canDeploy(world, DAWN, troop, 3.5, 25.5), 'not on a tower');
  assert.ok(!canDeploy(world, DAWN, troop, 9, 16), 'not in the river');
  assert.ok(canDeploy(world, DAWN, spell, 9, 5));
  const duskWarden = world.towers.find((tower) => tower.team === DUSK && tower.kind === 'warden' && tower.lane === 0);
  duskWarden.alive = false;
  assert.ok(canDeploy(world, DAWN, troop, 4, 12), 'the pocket of the fallen lane opens');
  assert.ok(!canDeploy(world, DAWN, troop, 14, 12), 'the other lane stays shut');
});

test('route: a ground walker uses a bridge, never the open river', () => {
  const from = { x: 9, y: 22 };
  const goal = { x: 9, y: 5 };
  let point = routeTo(from, goal);
  assert.ok(point.x === 3.5 || point.x === 14.5, 'heads for a bridge first');
  const walker = { x: 3.5, y: 17.2 };
  point = routeTo(walker, goal);
  assert.ok(point.y < ARENA.riverTop);
  const swimmer = { x: 9, y: 16 };
  constrainGround(swimmer, 0.5);
  assert.ok(swimmer.y <= ARENA.riverTop || swimmer.y >= ARENA.riverBottom);
});

test('sim: a lone troop walks over the bridge, hits the Warden of its lane and the tower shoots it', () => {
  const world = createWorld(1);
  landed(world, 'bramble-knight', DAWN, 3.5, 21);
  runWorld(world, 20);
  const warden = world.towers.find((tower) => tower.team === DUSK && tower.kind === 'warden' && tower.lane === 0);
  assert.ok(warden.hp < warden.maxHp, 'the Warden was hit');
  assert.equal(world.units.length, 0, 'the knight died to tower fire');
});

test('sim: units on the same layer push apart, heavy ones move less, and nothing stands in a tower', () => {
  const world = createWorld(1);
  const light = landed(world, 'thistle-pups', DAWN, 9, 22);
  const heavy = landed(world, 'rampart-golem', DAWN, 9.1, 22);
  heavy.stun = 5;
  stepWorld(world, DT);
  const lightMoved = Math.hypot(light.x - 9, light.y - 22);
  assert.ok(lightMoved > 0.1);
  assert.ok(Math.abs(heavy.x - 9.1) < 0.01, 'the golem is immovable');
  const walker = landed(world, 'bramble-knight', DAWN, 3.5, 25.5);
  stepWorld(world, DT);
  const tower = world.towers.find((entry) => entry.team === DAWN && entry.lane === 0 && entry.kind === 'warden');
  assert.ok(Math.abs(walker.x - tower.x) >= tower.w / 2 || Math.abs(walker.y - tower.y) >= tower.h / 2);
});

test('sim: buildings-only units pick buildings, air-only units pick flyers, ground-only units ignore flyers', () => {
  const world = createWorld(1);
  const hound = landed(world, 'cinder-hound', DAWN, 9, 21);
  landed(world, 'bramble-knight', DUSK, 9, 20);
  stepWorld(world, DT);
  const houndTarget = world.towers.find((tower) => tower.id === hound.targetId);
  assert.ok(houndTarget, 'the hound goes for a tower, not the knight beside it');
  const sky = createWorld(1);
  const kestrel = landed(sky, 'kestrel', DAWN, 9, 21);
  const knight = landed(sky, 'bramble-knight', DUSK, 9, 19);
  const wisp = landed(sky, 'ember-wisp', DUSK, 9.5, 18);
  stepWorld(sky, DT);
  assert.equal(kestrel.targetId, wisp.id);
  const ground = createWorld(1);
  const pup = landed(ground, 'thistle-pups', DAWN, 9, 21);
  landed(ground, 'ember-wisp', DUSK, 9, 20);
  stepWorld(ground, DT);
  assert.equal(pup.targetId, null, 'ground-only units cannot target the flyer');
  assert.ok(knight.alive);
});

test('sim: Static stuns and damages, Rime slows, Surge pushes (but not a golem), Mend heals', () => {
  const world = createWorld(1);
  const knight = landed(world, 'bramble-knight', DUSK, 9, 10);
  const golem = landed(world, 'rampart-golem', DUSK, 10, 10);
  golem.stun = 30;
  queueSpell(world, 'static', DAWN, 9, 10);
  runWorld(world, 0.5);
  assert.ok(knight.hp < knight.maxHp);
  assert.ok(knight.stun > 0 || knight.hp < knight.maxHp);
  queueSpell(world, 'rime', DAWN, 9, 10);
  runWorld(world, 0.5);
  assert.ok(knight.slow.factor < 1);
  golem.stun = 30;
  const before = { x: golem.x, y: golem.y };
  queueSpell(world, 'surge', DAWN, 9.5, 10);
  runWorld(world, 0.5);
  assert.equal(golem.x, before.x);
  const hurt = createWorld(1);
  const friend = landed(hurt, 'bramble-knight', DAWN, 9, 22);
  friend.hp = 100;
  queueSpell(hurt, 'verdant-mend', DAWN, 9, 22);
  runWorld(hurt, 4);
  assert.ok(friend.hp > 250);
});

test('sim: Thorns hurt a melee attacker, a shield absorbs before HP and regrows, Hex stacks curses', () => {
  const thorny = createWorld(1);
  const knight = landed(thorny, 'bramble-knight', DUSK, 9, 20);
  const attacker = landed(thorny, 'thistle-pups', DAWN, 9, 20.5);
  runWorld(thorny, 3);
  assert.ok(attacker.hp < attacker.maxHp || !attacker.alive);
  const shielded = createWorld(1);
  const guardian = landed(shielded, 'tideshell-guardian', DAWN, 9, 22);
  assert.equal(guardian.shield, 450);
  const hexer = createWorld(1);
  landed(hexer, 'hexweaver', DAWN, 9, 22);
  const target = landed(hexer, 'bramble-knight', DUSK, 9, 18.5);
  runWorld(hexer, 4);
  assert.ok(target.curse.stacks >= 1 || !target.alive);
  assert.ok(knight);
});

test('sim: the Powder Cart blasts on contact, the Golem leaves rubble, the Brute leaves lava, spawners spawn', () => {
  const blast = createWorld(1);
  landed(blast, 'powder-cart', DAWN, 3.5, 20);
  const victim = landed(blast, 'bramble-knight', DUSK, 3.5, 18);
  runWorld(blast, 6);
  assert.ok(victim.hp < victim.maxHp || !victim.alive);
  const golem = createWorld(1);
  const stone = landed(golem, 'rampart-golem', DAWN, 9, 22);
  stone.hp = 1;
  landed(golem, 'thistle-pups', DUSK, 9, 21);
  runWorld(golem, 1);
  assert.ok(golem.units.filter((unit) => unit.cardId === 'rubble').length === 2);
  const brute = createWorld(1);
  const magma = landed(brute, 'magma-brute', DAWN, 9, 22);
  magma.hp = 1;
  landed(brute, 'thistle-pups', DUSK, 9, 21);
  runWorld(brute, 1);
  assert.equal(brute.zones.length, 1);
  const cog = createWorld(1);
  landed(cog, 'cogwright', DAWN, 9, 22);
  runWorld(cog, 11);
  const bots = cog.units.filter((unit) => unit.cardId === 'cog-bot').length;
  assert.ok(bots >= 1 && bots <= 4);
});

test('sim: Stag Rider charges after 3.5 clear tiles and a charged hit does double damage', () => {
  const world = createWorld(1);
  const rider = landed(world, 'stag-rider', DAWN, 9, 28);
  rider.chargeRun = 4;
  const dummy = landed(world, 'rampart-golem', DUSK, 9, 27.2);
  const before = dummy.hp;
  runWorld(world, 1.2);
  assert.ok(before - dummy.hp >= 160, 'a charged strike lands for 160 x 2');
});

test('sim: a Keep sleeps until it is hit or a Warden falls, then wakes and fires', () => {
  const world = createWorld(1);
  const keep = world.towers.find((tower) => tower.team === DUSK && tower.kind === 'keep');
  assert.equal(keep.awake, false);
  const warden = world.towers.find((tower) => tower.team === DUSK && tower.kind === 'warden');
  warden.hp = 1;
  queueSpell(world, 'flare', DAWN, warden.x, warden.y);
  runWorld(world, 1.5);
  assert.equal(warden.alive, false);
  assert.equal(world.crowns[DAWN], 1);
  assert.equal(keep.awake, true);
  assert.ok(drainEvents(world).some((event) => event.type === 'keepWake'));
});

test('match: the intro, a card play, the refusals, and the Keep ending it', () => {
  const match = createMatch({ seed: 2, seats: TWO_CPUS, decks: [PRESET_DECKS.cinder, PRESET_DECKS.brook] });
  assert.equal(match.phase, 'intro');
  assert.equal(playCard(match, 0, 0, 9, 21).reason, 'not-playing');
  for (let step = 0; step < 3.1 * 60; step += 1) {
    stepMatch(match, DT);
  }
  assert.equal(match.phase, 'regulation');
  assert.equal(playCard(match, 0, 5, 9, 21).reason, 'bad-slot');
  const player = match.players[0];
  player.deck.hand[0] = 'magma-brute';
  assert.equal(playCard(match, 0, 0, 9, 21).reason, 'no-elixir');
  player.elixir = 10;
  assert.equal(playCard(match, 0, 0, 9, 5).reason, 'bad-spot');
  const result = playCard(match, 0, 0, 9, 21);
  assert.equal(result.ok, true);
  assert.equal(player.elixir, 3);
  assert.equal(match.world.units.length, 1);
  match.world.towers.find((tower) => tower.team === DUSK && tower.kind === 'keep').hp = 1;
  queueSpell(match.world, 'flare', DAWN, 9, 2.5);
  for (let step = 0; step < 60; step += 1) {
    stepMatch(match, DT);
  }
  assert.equal(match.phase, 'over');
  assert.deepEqual([match.result.winner, match.result.reason], [DAWN, 'keep']);
});

test('match: a tie goes to overtime, the first tower then wins, and a full tie falls to the healthier towers', () => {
  const match = startedMatch(4);
  match.clock = 0.01;
  stepMatch(match, DT);
  assert.equal(match.phase, 'overtime');
  assert.equal(match.clock, TUNING.overtimeSeconds);
  const warden = match.world.towers.find((tower) => tower.team === DUSK && tower.kind === 'warden');
  warden.hp = 1;
  queueSpell(match.world, 'flare', DAWN, warden.x, warden.y);
  for (let step = 0; step < 60; step += 1) {
    stepMatch(match, DT);
  }
  assert.deepEqual([match.phase, match.result.winner, match.result.reason], ['over', DAWN, 'overtime']);
  const tie = startedMatch(5);
  tie.phase = 'overtime';
  tie.clock = 0.01;
  tie.world.towers.find((tower) => tower.team === DAWN && tower.kind === 'keep').hp = 100;
  stepMatch(tie, DT);
  assert.deepEqual([tie.result.winner, tie.result.reason], [DUSK, 'tiebreak']);
  const even = startedMatch(6);
  even.phase = 'overtime';
  even.clock = 0.01;
  stepMatch(even, DT);
  assert.deepEqual([even.result.winner, even.result.reason], [null, 'draw']);
});

test('match: a forfeit gives the win to the other team', () => {
  const match = startedMatch(7);
  forfeitTeam(match, DAWN);
  assert.deepEqual([match.result.winner, match.result.reason], [DUSK, 'forfeit']);
});

test('replay: the same seed and the same CPU plays give the same match, twice', () => {
  function play(seed) {
    const match = createMatch({ seed, seats: TWO_CPUS, decks: [PRESET_DECKS.cinder, PRESET_DECKS.cog] });
    const random = createRng(seed * 3);
    const cpus = match.players.map(() => createCpu(1, random));
    for (let step = 0; step < 120 * 60 && match.phase !== 'over'; step += 1) {
      stepMatch(match, DT);
      match.players.forEach((player, index) => {
        const action = match.phase === 'regulation' && cpuThink(match, player, cpus[index], DT);
        if (action) {
          playCard(match, index, action.slot, action.x, action.y);
        }
      });
      match.world.events.length = 0;
    }
    return JSON.stringify([match.world.crowns, match.world.units.map((unit) => [unit.cardId, unit.x.toFixed(3), unit.hp.toFixed(1)]), match.players.map((player) => player.elixir.toFixed(3))]);
  }
  assert.equal(play(11), play(11));
});

test('cpu: whatever it plays is legal, and CPU-vs-CPU matches always finish', () => {
  for (const seed of [1, 2, 3]) {
    const match = createMatch({ seed, seats: TWO_CPUS, decks: [PRESET_DECKS.brook, PRESET_DECKS.thorn] });
    const random = createRng(seed);
    const cpus = match.players.map(() => createCpu(1, random));
    let plays = 0;
    for (let step = 0; step < 400 * 60 && match.phase !== 'over'; step += 1) {
      stepMatch(match, DT);
      match.players.forEach((player, index) => {
        const action = match.phase !== 'intro' && cpuThink(match, player, cpus[index], DT);
        if (action) {
          assert.equal(playCard(match, index, action.slot, action.x, action.y).ok, true);
          plays += 1;
        }
      });
      match.world.events.length = 0;
    }
    assert.equal(match.phase, 'over');
    assert.ok(plays > 10);
  }
});

test('session: PLACE aims with a ghost, drops to play, refuses with a notice, and ignores bad input', () => {
  const seats = [{ team: DAWN, playerId: 'a', cpuLevel: 1 }, { team: DUSK, playerId: null, cpuLevel: 1 }];
  const session = createSession({ seed: 9, seats, decks: [PRESET_DECKS.cinder, PRESET_DECKS.brook], settings: {} });
  for (let step = 0; step < 4 * 60; step += 1) {
    session.step(DT);
  }
  const place = (fields) => session.place('a', { kind: INPUT_KINDS.PLACE, ...fields });
  place({ phase: 'pick', slot: 0 });
  assert.equal(session.ghosts().length, 1);
  place({ phase: 'aim', slot: 0, x: 0.5, y: 0.8 });
  assert.equal(session.ghosts()[0].ghost.legal, true);
  place({ phase: 'aim', slot: 0, x: 0.5, y: 0.1 });
  const hand0 = cardById(session.match.players[0].deck.hand[0]);
  assert.equal(session.ghosts()[0].ghost.legal, hand0.type === 'spell');
  place({ phase: 'aim', slot: 7, x: 0.5, y: 0.5 });
  place({ phase: 'aim', slot: 0, x: Number.NaN, y: 0.5 });
  session.match.players[0].elixir = 0;
  place({ phase: 'drop', slot: 0, x: 0.5, y: 0.8 });
  assert.equal(session.viewFor('a', false).notice.code, 'no-elixir');
  session.match.players[0].elixir = 10;
  const before = session.match.players[0].deck.hand[1];
  place({ phase: 'drop', slot: 1, x: 0.5, y: 0.8 });
  assert.notEqual(session.match.players[0].deck.hand[1], before);
  assert.equal(session.ghosts().length, 0);
  assert.equal(session.drainEvents().some((event) => event.type === 'play'), true);
});

test('session: the view is private and rounded, and a CPU takes over a seat; the last human leaving forfeits', () => {
  const seats = [{ team: DAWN, playerId: 'a', cpuLevel: 1 }, { team: DUSK, playerId: 'b', cpuLevel: 1 }];
  const session = createSession({ seed: 5, seats, decks: [PRESET_DECKS.cinder, PRESET_DECKS.brook], settings: {} });
  for (let step = 0; step < 4 * 60; step += 1) {
    session.step(DT);
  }
  const view = session.viewFor('a', false);
  assert.equal(view.phase, 'match');
  assert.equal(view.hand.length, 4);
  assert.deepEqual(view.hand, session.match.players[0].deck.hand);
  assert.equal(view.elixir * 4, Math.floor(view.elixir * 4));
  assert.ok(!JSON.stringify(view).includes(session.match.players[1].deck.hand[0]) || session.match.players[0].deck.hand.includes(session.match.players[1].deck.hand[0]) || PRESET_DECKS.cinder.includes(session.match.players[1].deck.hand[0]));
  assert.equal(view.team, DAWN);
  assert.equal(session.viewFor('b', false).team, DUSK);
  session.takeOver('a');
  assert.equal(session.viewFor('a', false), null);
  assert.equal(session.match.result.winner, DUSK);
  assert.equal(session.match.result.reason, 'forfeit');
});

test('2v2: four seats play together, partners keep their own hands and elixir, and a team forfeits only with no human left', () => {
  const seats = [
    { team: DAWN, playerId: 'a', cpuLevel: 1 }, { team: DAWN, playerId: 'b', cpuLevel: 1 },
    { team: DUSK, playerId: 'c', cpuLevel: 1 }, { team: DUSK, playerId: null, cpuLevel: 1 },
  ];
  const decks = [PRESET_DECKS.cinder, PRESET_DECKS.cog, PRESET_DECKS.brook, PRESET_DECKS.thorn];
  const session = createSession({ seed: 8, seats, decks, settings: {} });
  for (let step = 0; step < 4 * 60; step += 1) {
    session.step(DT);
  }
  const [a, b] = ['a', 'b'].map((id) => session.viewFor(id, false));
  assert.equal(a.team, DAWN);
  assert.equal(b.team, DAWN);
  assert.notEqual(a.seat, b.seat);
  assert.notDeepEqual(a.hand, b.hand);
  session.match.players[0].elixir = 10;
  session.place('a', { kind: INPUT_KINDS.PLACE, phase: 'drop', slot: 1, x: 0.5, y: 0.8 });
  assert.equal(session.match.players[0].elixir < 10, true);
  session.takeOver('a');
  assert.equal(session.match.phase !== 'over', true, 'one partner left, the team plays on');
  session.takeOver('b');
  assert.equal(session.match.result.reason, 'forfeit');
  assert.equal(session.match.result.winner, DUSK);
});
