// Who a unit wants to hit and where it heads when nobody is near: the rules of section 5.4 of docs/arena-plan.md.
// Pure functions over the world. Used by sim-movement.js, sim-combat.js and towers.js.

import { TUNING } from './tuning.js';
import { foesOf, findEntity } from './world.js';
import { gap, nearestOf } from './geometry.js';

// Whether a unit with these `targets` ('both', 'ground', 'air', 'buildings') may hit this foe.
export function canAttack(targets, foe) {
  if (targets === 'buildings') {
    return foe.isTower || foe.def.type === 'building';
  }
  if (foe.isTower) {
    return targets !== 'air';
  }
  return foe.def.flying ? targets === 'both' || targets === 'air' : targets !== 'air';
}

// Cogwright and Rootspout never hit anything.
export function canStrike(def) {
  return def.damage > 0 || Boolean(def.traits.detonate);
}

// The nearest troop in sight, else the nearest building or tower in sight; a buildings-only unit picks the
// nearest building anywhere. Null when there is nothing to hit.
export function chooseTarget(world, unit) {
  const { def } = unit;
  if (!canStrike(def)) {
    return null;
  }
  const foes = foesOf(world, unit.team).filter((foe) => canAttack(def.targets, foe));
  if (def.targets === 'buildings') {
    return nearestOf(unit, foes);
  }
  const inSight = foes.filter((foe) => gap(unit, foe) <= TUNING.sightRange);
  const troops = inSight.filter((foe) => !foe.isTower && foe.def.type !== 'building');
  return nearestOf(unit, troops.length > 0 ? troops : inSight);
}

// Where a unit with no target heads: the enemy Warden of its lane, else the Keep, else any standing tower.
export function goalOf(world, unit) {
  const towers = world.towers.filter((tower) => tower.alive && tower.team !== unit.team);
  return towers.find((tower) => tower.kind === 'warden' && tower.lane === unit.lane)
    ?? towers.find((tower) => tower.kind === 'keep')
    ?? towers[0] ?? null;
}

// The unit's target if it still stands, else its goal.
export function aimOf(world, unit) {
  return findEntity(world, unit.targetId) ?? goalOf(world, unit);
}

// Looks for a target every retarget interval, unless the unit is mid-fight with one that still stands.
export function retarget(world, dt) {
  for (const unit of world.units) {
    if (!unit.alive || unit.deployLeft > 0) {
      continue;
    }
    unit.retargetIn -= dt;
    if (unit.retargetIn > 0) {
      continue;
    }
    unit.retargetIn = TUNING.retargetSeconds;
    const current = findEntity(world, unit.targetId);
    if (unit.engaged && current) {
      continue;
    }
    unit.targetId = chooseTarget(world, unit)?.id ?? null;
  }
}
