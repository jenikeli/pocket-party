// One step of the Spirefall world, in the order of docs/arena-plan.md section 5.4: timers, spells, retargeting,
// walking, pushing apart, attacks, towers, projectiles. Used by match.js. Units are processed in id order, so a
// match is the same every time for the same seed and plays.

import { tickStatus } from './sim-status.js';
import { stepSpells } from './sim-spells.js';
import { retarget } from './sim-targeting.js';
import { moveUnits, separate } from './sim-movement.js';
import { stepAttacks, stepProjectiles } from './sim-combat.js';
import { stepTowers } from './towers.js';

export function stepWorld(world, dt) {
  world.time += dt;
  for (const unit of world.units) {
    unit.previousX = unit.x;
    unit.previousY = unit.y;
  }
  tickStatus(world, dt);
  stepSpells(world);
  retarget(world, dt);
  moveUnits(world, dt);
  separate(world);
  stepAttacks(world, dt);
  stepTowers(world, dt);
  stepProjectiles(world, dt);
  world.units = world.units.filter((unit) => unit.alive);
}
