// Attacks, damage, projectiles and death: strikes (melee, ranged, splash, pierce, detonate), shields, curses,
// thorns, the Keep waking and towers falling. Pure functions over the world. Used by sim.js, towers.js, sim-spells.js
// and sim-status.js.

import { TUNING } from './tuning.js';
import { emit, findEntity, foesOf, spawnUnit } from './world.js';
import { gap } from './geometry.js';
import { canAttack, canStrike, aimOf } from './sim-targeting.js';

export function wakeKeep(world, team) {
  const keep = world.towers.find((tower) => tower.team === team && tower.kind === 'keep' && tower.alive);
  if (keep && !keep.awake && keep.wakeLeft === 0) {
    keep.wakeLeft = TUNING.keep.wakeSeconds;
  }
}

function destroyTower(world, tower) {
  tower.alive = false;
  tower.hp = 0;
  const crowns = tower.kind === 'keep' ? 3 : 1;
  world.crowns[1 - tower.team] += crowns;
  emit(world, 'towerDown', { id: tower.id, team: tower.team, kind: tower.kind, lane: tower.lane, x: tower.x, y: tower.y });
  if (tower.kind === 'warden') {
    wakeKeep(world, tower.team);
  } else {
    world.winner = 1 - tower.team;
  }
}

// One hit of `amount` on a unit or tower: curses add to it, a shield takes the first of it, a Keep wakes.
export function damageEntity(world, target, amount) {
  if (target.isTower) {
    target.hp -= amount;
    target.sinceHit = 0;
    wakeKeep(world, target.team);
    if (target.hp <= 0) {
      destroyTower(world, target);
    }
    return;
  }
  let remaining = amount * (1 + target.curse.stacks * (target.curse.perStack ?? 0));
  const absorbed = Math.min(target.shield, remaining);
  target.shield -= absorbed;
  remaining -= absorbed;
  target.hp -= remaining;
  target.sinceHit = 0;
  if (target.hp <= 0) {
    killUnit(world, target);
  }
}

export function killUnit(world, unit) {
  if (!unit.alive) {
    return;
  }
  unit.alive = false;
  emit(world, 'death', { id: unit.id, cardId: unit.cardId, team: unit.team, x: unit.x, y: unit.y });
  const { detonate, deathSpawn, deathPool } = unit.def.traits;
  if (detonate && !unit.exploded) {
    explode(world, unit);
  }
  if (deathSpawn) {
    for (let index = 0; index < deathSpawn.count; index += 1) {
      const side = index % 2 === 0 ? -0.6 : 0.6;
      spawnUnit(world, deathSpawn.unit, unit.team, unit.x + side, unit.y);
    }
  }
  if (deathPool) {
    world.zones.push({ kind: 'lava', team: unit.team, x: unit.x, y: unit.y, radius: deathPool.radius, dps: deathPool.dps, until: world.time + deathPool.seconds });
    emit(world, 'zone', { kind: 'lava', x: unit.x, y: unit.y, radius: deathPool.radius });
  }
}

// Damage to every foe of `team` within `radius` of (x, y) that `targets` may hit; buildings take `buildingFactor` times.
export function areaDamage(world, team, targets, x, y, radius, amount, buildingFactor = 1) {
  const point = { x, y };
  for (const foe of foesOf(world, team)) {
    if (canAttack(targets, foe) && gap(point, foe) <= radius) {
      const isBuilding = foe.isTower || foe.def.type === 'building';
      damageEntity(world, foe, isBuilding ? amount * buildingFactor : amount);
    }
  }
}

function explode(world, unit) {
  unit.exploded = true;
  const { detonate } = unit.def.traits;
  areaDamage(world, unit.team, 'ground', unit.x, unit.y, detonate.radius, detonate.damage, detonate.buildingFactor);
  emit(world, 'blast', { x: unit.x, y: unit.y, radius: detonate.radius });
}

// The effects a hit carries besides damage: Drizzle slows, Hex curses, Thorns hurt a melee attacker.
function applyHitEffects(world, traits, source, target) {
  if (target.isTower) {
    return;
  }
  if (traits.slowOnHit) {
    target.slow = { factor: traits.slowOnHit.factor, left: traits.slowOnHit.seconds };
  }
  if (traits.hex) {
    const { perStack, max, seconds } = traits.hex;
    target.curse = { stacks: Math.min(target.curse.stacks + 1, max), left: seconds, perStack };
  }
  if (target.def.traits.thorns && source && !source.def.ranged && source.def.range <= 1) {
    damageEntity(world, source, target.def.traits.thorns);
  }
}

function hit(world, source, target, amount) {
  damageEntity(world, target, amount);
  emit(world, 'hit', { x: target.x, y: target.y, amount, towerId: target.isTower ? target.id : null, flying: Boolean(target.def?.flying) });
  applyHitEffects(world, source.def.traits, source, target);
}

export function fireProjectile(world, { team, x, y, target, damage, splash, targets, traits, speed, sourceId }) {
  world.projectiles.push({ id: `p${world.nextId++}`, team, x, y, previousX: x, previousY: y, speed, targetId: target.id, tx: target.x, ty: target.y, damage, splash, targets, traits, sourceId });
  emit(world, 'shot', { team, x, y, sourceId });
}

export function stepProjectiles(world, dt) {
  for (const shot of world.projectiles) {
    const target = findEntity(world, shot.targetId);
    if (target) {
      shot.tx = target.x;
      shot.ty = target.y;
    }
    shot.previousX = shot.x;
    shot.previousY = shot.y;
    const distance = Math.hypot(shot.tx - shot.x, shot.ty - shot.y);
    const step = shot.speed * dt;
    if (distance > step) {
      shot.x += ((shot.tx - shot.x) / distance) * step;
      shot.y += ((shot.ty - shot.y) / distance) * step;
      continue;
    }
    shot.done = true;
    if (shot.splash > 0) {
      areaDamage(world, shot.team, shot.targets, shot.tx, shot.ty, shot.splash, shot.damage);
      emit(world, 'blast', { x: shot.tx, y: shot.ty, radius: shot.splash });
    } else if (target) {
      damageEntity(world, target, shot.damage);
      emit(world, 'hit', { x: target.x, y: target.y, amount: shot.damage, towerId: target.isTower ? target.id : null, flying: Boolean(target.def?.flying) });
      applyHitEffects(world, shot.traits, null, target);
    }
  }
  world.projectiles = world.projectiles.filter((shot) => !shot.done);
}

// Every foe in a thin line from the attacker through its target, out to the attacker's reach.
function pierceLine(world, unit, target, damage) {
  const length = Math.hypot(target.x - unit.x, target.y - unit.y) || 1;
  const dx = (target.x - unit.x) / length;
  const dy = (target.y - unit.y) / length;
  for (const foe of foesOf(world, unit.team)) {
    const along = (foe.x - unit.x) * dx + (foe.y - unit.y) * dy;
    const across = Math.abs((foe.x - unit.x) * dy - (foe.y - unit.y) * dx);
    if (canAttack(unit.def.targets, foe) && along > 0 && along <= unit.def.range + 1 && across <= 0.5 + (foe.def?.radius ?? 1.5)) {
      hit(world, unit, foe, damage);
    }
  }
}

function strike(world, unit, target) {
  const { def } = unit;
  if (def.traits.detonate) {
    explode(world, unit);
    killUnit(world, unit);
    return;
  }
  const charge = def.traits.charge;
  const damage = charge && unit.chargeRun >= charge.distance ? def.damage * charge.damageFactor : def.damage;
  unit.chargeRun = 0;
  emit(world, 'strike', { id: unit.id, targetId: target.id });
  if (def.ranged) {
    fireProjectile(world, { team: unit.team, x: unit.x, y: unit.y, target, damage, splash: def.splash, targets: def.targets, traits: def.traits, speed: TUNING.projectileSpeed, sourceId: unit.id });
  } else if (def.traits.pierce) {
    pierceLine(world, unit, target, damage);
  } else if (def.splash > 0) {
    areaDamage(world, unit.team, def.targets, target.x, target.y, def.splash, damage);
    emit(world, 'blast', { x: target.x, y: target.y, radius: def.splash });
  } else {
    hit(world, unit, target, damage);
  }
}

export function stepAttacks(world, dt) {
  for (const unit of world.units) {
    const { def } = unit;
    if (!unit.alive || unit.deployLeft > 0 || !canStrike(def)) {
      continue;
    }
    const aim = aimOf(world, unit);
    const inRange = aim && unit.stun <= 0 && canAttack(def.targets, aim) && gap(unit, aim) <= def.range;
    if (!inRange) {
      unit.engaged = false;
      unit.attackTimer = def.hit * TUNING.windupShare;
      continue;
    }
    unit.engaged = true;
    unit.targetId = aim.id;
    unit.attackTimer -= dt * unit.slow.factor;
    if (unit.attackTimer <= 0) {
      strike(world, unit, aim);
      unit.attackTimer = def.hit;
    }
  }
}
