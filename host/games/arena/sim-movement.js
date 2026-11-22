// Walking, pushing apart and staying inside the arena for every landed unit. Pure functions over the world.
// Used by sim.js.

import { ARENA, routeTo, constrainGround } from '../../../shared/arena-map.js';
import { gap } from './geometry.js';
import { aimOf } from './sim-targeting.js';

export function moveUnits(world, dt) {
  for (const unit of world.units) {
    const { def } = unit;
    if (!unit.alive || unit.deployLeft > 0 || unit.stun > 0 || def.speed === 0) {
      continue;
    }
    const aim = aimOf(world, unit);
    if (!aim || gap(unit, aim) <= (def.traits.holdGap ?? def.range)) {
      unit.chargeRun = 0;
      continue;
    }
    const charge = def.traits.charge;
    const charged = charge && unit.chargeRun >= charge.distance;
    const speed = def.speed * unit.slow.factor * (charged ? charge.speedFactor : 1);
    const free = def.flying || def.traits.leap;
    const point = free ? aim : routeTo(unit, aim);
    const distance = Math.hypot(point.x - unit.x, point.y - unit.y);
    const step = Math.min(speed * dt, distance);
    if (distance > 0.0001) {
      unit.x += ((point.x - unit.x) / distance) * step;
      unit.y += ((point.y - unit.y) / distance) * step;
      unit.facing = Math.atan2(point.y - unit.y, point.x - unit.x);
    }
    unit.chargeRun += step;
  }
}

function weightOf(unit) {
  return unit.def.traits.immovable ? Infinity : unit.def.mass;
}

// Overlapping units on the same layer (ground or air) push apart, the lighter one moving more.
function pushPair(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const distance = Math.hypot(dx, dy) || 0.0001;
  const overlap = a.def.radius + b.def.radius - distance;
  if (overlap <= 0) {
    return;
  }
  const massA = weightOf(a);
  const massB = weightOf(b);
  const shareA = massA === Infinity ? 0 : massB === Infinity ? 1 : massB / (massA + massB);
  const nx = distance === 0.0001 ? 1 : dx / distance;
  const ny = distance === 0.0001 ? 0 : dy / distance;
  a.x -= nx * overlap * shareA;
  a.y -= ny * overlap * shareA;
  b.x += nx * overlap * (1 - shareA);
  b.y += ny * overlap * (1 - shareA);
}

// Ground units cannot stand inside a tower: push the circle out of the box along its shortest way out.
function pushOutOfTower(unit, tower) {
  const dx = unit.x - tower.x;
  const dy = unit.y - tower.y;
  const reachX = tower.w / 2 + unit.def.radius;
  const reachY = tower.h / 2 + unit.def.radius;
  if (Math.abs(dx) >= reachX || Math.abs(dy) >= reachY) {
    return;
  }
  if (reachX - Math.abs(dx) < reachY - Math.abs(dy)) {
    unit.x = tower.x + Math.sign(dx || 1) * reachX;
  } else {
    unit.y = tower.y + Math.sign(dy || 1) * reachY;
  }
}

export function separate(world) {
  const landed = world.units.filter((unit) => unit.alive && unit.deployLeft <= 0);
  for (let first = 0; first < landed.length; first += 1) {
    for (let second = first + 1; second < landed.length; second += 1) {
      if (landed[first].def.flying === landed[second].def.flying) {
        pushPair(landed[first], landed[second]);
      }
    }
  }
  for (const unit of landed) {
    const { radius, flying, traits } = unit.def;
    if (!flying) {
      world.towers.filter((tower) => tower.alive).forEach((tower) => pushOutOfTower(unit, tower));
    }
    if (flying || traits.leap) {
      unit.x = Math.min(Math.max(unit.x, radius), ARENA.width - radius);
      unit.y = Math.min(Math.max(unit.y, radius), ARENA.height - radius);
    } else {
      constrainGround(unit, radius);
    }
  }
}
