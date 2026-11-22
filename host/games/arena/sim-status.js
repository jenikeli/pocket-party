// The timers on units and zones: deploying, stun, slow, curses, healing, shield regrowth, building lifetimes,
// spawners (Cogwright, Rootspout) and lava pools. Pure functions over the world. Used by sim.js.

import { emit, spawnUnit, foesOf } from './world.js';
import { gap } from './geometry.js';
import { damageEntity, killUnit } from './sim-combat.js';
import { forward } from '../../../shared/arena-map.js';

function runSpawner(world, unit, dt) {
  const spawner = unit.def.traits.spawner;
  if (!spawner || unit.stun > 0) {
    return;
  }
  unit.spawnTimer -= dt;
  if (unit.spawnTimer > 0) {
    return;
  }
  unit.spawnTimer = spawner.every;
  const alive = world.units.filter((child) => child.alive && child.ownerId === unit.id).length;
  for (let index = 0; index < spawner.count && alive + index < spawner.max; index += 1) {
    const sideways = (index - (spawner.count - 1) / 2) * 0.7;
    const made = spawnUnit(world, spawner.unit, unit.team, unit.x + sideways, unit.y + forward(unit.team) * (unit.def.radius + 0.5), { ownerId: unit.id });
    emit(world, 'spawn', { id: made.id, x: made.x, y: made.y });
  }
}

function tickUnit(world, unit, dt) {
  if (unit.deployLeft > 0) {
    unit.deployLeft -= dt;
    if (unit.deployLeft <= 0) {
      unit.deployLeft = 0;
      emit(world, 'landed', { id: unit.id, cardId: unit.cardId, team: unit.team, x: unit.x, y: unit.y });
    }
    return;
  }
  const { traits } = unit.def;
  unit.sinceHit += dt;
  unit.stun = Math.max(0, unit.stun - dt);
  if (unit.slow.left > 0 && (unit.slow.left -= dt) <= 0) {
    unit.slow = { factor: 1, left: 0 };
  }
  if (unit.curse.left > 0 && (unit.curse.left -= dt) <= 0) {
    unit.curse = { stacks: 0, left: 0 };
  }
  if (unit.heal.left > 0) {
    unit.hp = Math.min(unit.maxHp, unit.hp + unit.heal.rate * dt);
    unit.heal.left -= dt;
  }
  if (traits.shield && unit.sinceHit >= traits.shield.regrowAfter) {
    unit.shield = traits.shield.amount;
  }
  if (traits.lifetime) {
    unit.hp -= (unit.maxHp / traits.lifetime) * dt;
    if (unit.hp <= 0) {
      killUnit(world, unit);
      return;
    }
  }
  runSpawner(world, unit, dt);
}

function tickZones(world, dt) {
  for (const zone of world.zones) {
    for (const foe of foesOf(world, zone.team)) {
      if (!foe.isTower && !foe.def.flying && gap(zone, foe) <= zone.radius) {
        damageEntity(world, foe, zone.dps * dt);
      }
    }
  }
  world.zones = world.zones.filter((zone) => zone.until > world.time);
}

export function tickStatus(world, dt) {
  for (const unit of [...world.units]) {
    if (unit.alive) {
      tickUnit(world, unit, dt);
    }
  }
  tickZones(world, dt);
}
