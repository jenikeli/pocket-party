// The Spirefall world: units, towers, projectiles, zones, spells waiting to land, the crowns and the events the
// host turns into sound and effects. Made once per match. Used by sim.js and everything it calls.

import { ARENA_TEAMS } from '../../../shared/protocol.js';
import { towerLayout, laneOf } from '../../../shared/arena-map.js';
import { cardById } from '../../../shared/arena-cards.js';
import { TUNING } from './tuning.js';
import { createRng } from './rng.js';

// `handicap` is [dawnPercent, duskPercent] extra tower HP.
export function createWorld(seed, handicap = [0, 0]) {
  const world = { time: 0, nextId: 1, units: [], projectiles: [], zones: [], spells: [], events: [], towers: [], crowns: [0, 0], winner: null, random: createRng(seed) };
  for (const team of [ARENA_TEAMS.DAWN, ARENA_TEAMS.DUSK]) {
    for (const layout of towerLayout(team)) {
      const stats = TUNING[layout.kind];
      const hp = Math.round(stats.hp * (1 + handicap[team] / 100));
      world.towers.push({
        ...layout, id: `t${world.nextId++}`, team, isTower: true, hp, maxHp: hp, alive: true,
        awake: layout.kind === 'warden', wakeLeft: 0, attackTimer: stats.hit, targetId: null, sinceHit: 0,
      });
    }
  }
  return world;
}

// Events are plain objects { type, time, ... } the host drains after drawing: 'play', 'landed', 'hit', 'death',
// 'towerDown', 'keepWake', 'spell', 'shot', 'spawn'.
export function emit(world, type, data = {}) {
  world.events.push({ type, time: world.time, ...data });
}

export function drainEvents(world) {
  return world.events.splice(0);
}

// A new unit of `cardId` for `team` at (x, y). It lands after `deploy` seconds (0 for tokens made by other units).
export function spawnUnit(world, cardId, team, x, y, { deploy = 0, ownerId = null } = {}) {
  const def = cardById(cardId);
  const unit = {
    id: `u${world.nextId++}`, cardId, def, team, x, y, previousX: x, previousY: y, hp: def.hp, maxHp: def.hp,
    alive: true, deployLeft: deploy, lane: laneOf(x), ownerId, targetId: null, retargetIn: 0, attackTimer: def.hit * TUNING.windupShare,
    engaged: false, chargeRun: 0, sinceHit: 0, shield: def.traits.shield?.amount ?? 0,
    stun: 0, slow: { factor: 1, left: 0 }, curse: { stacks: 0, left: 0 }, heal: { rate: 0, left: 0 },
    spawnTimer: def.traits.spawner?.every ?? 0, lifeLeft: def.traits.lifetime ?? 0, facing: 0,
  };
  world.units.push(unit);
  return unit;
}

export function findEntity(world, id) {
  return world.units.find((unit) => unit.id === id && unit.alive) ?? world.towers.find((tower) => tower.id === id && tower.alive);
}

// Everything on the other team that can be hit: landed units and standing towers.
export function foesOf(world, team) {
  return [...world.units.filter((unit) => unit.alive && unit.team !== team && unit.deployLeft <= 0), ...world.towers.filter((tower) => tower.alive && tower.team !== team)];
}
