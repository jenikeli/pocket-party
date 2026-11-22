// Tower behaviour: a Warden shoots the nearest enemy unit in range; the Keep sleeps until it is hit or a Warden on its
// side falls, then wakes and does the same. Pure functions over the world. Used by sim.js.

import { TUNING } from './tuning.js';
import { emit, findEntity, foesOf } from './world.js';
import { gap, nearestOf } from './geometry.js';
import { fireProjectile } from './sim-combat.js';

export function stepTowers(world, dt) {
  for (const tower of world.towers) {
    if (!tower.alive) {
      continue;
    }
    tower.sinceHit += dt;
    if (!tower.awake) {
      if (tower.wakeLeft > 0) {
        tower.wakeLeft -= dt;
        if (tower.wakeLeft <= 0) {
          tower.wakeLeft = 0;
          tower.awake = true;
          emit(world, 'keepWake', { team: tower.team, x: tower.x, y: tower.y });
        }
      }
      continue;
    }
    const stats = TUNING[tower.kind];
    let target = findEntity(world, tower.targetId);
    if (!target || target.isTower || gap(tower, target) > stats.range) {
      const inRange = foesOf(world, tower.team).filter((foe) => !foe.isTower && gap(tower, foe) <= stats.range);
      target = nearestOf(tower, inRange);
      tower.targetId = target?.id ?? null;
    }
    if (!target) {
      tower.attackTimer = stats.hit * TUNING.windupShare;
      continue;
    }
    tower.attackTimer -= dt;
    if (tower.attackTimer <= 0) {
      fireProjectile(world, { team: tower.team, x: tower.x, y: tower.y, target, damage: stats.damage, splash: 0, targets: 'both', traits: {}, speed: TUNING.towerProjectileSpeed, sourceId: tower.id });
      tower.attackTimer = stats.hit;
    }
  }
}
