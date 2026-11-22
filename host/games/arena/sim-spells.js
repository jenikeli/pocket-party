// Spells: a cast waits a short time, then hits everything of the other team in its circle (damage, stun, slow,
// push) or heals friends. Pure functions over the world. Used by match.js (queueSpell) and sim.js (stepSpells).

import { cardById } from '../../../shared/arena-cards.js';
import { ARENA } from '../../../shared/arena-map.js';
import { TUNING } from './tuning.js';
import { emit, foesOf } from './world.js';
import { gap } from './geometry.js';
import { damageEntity } from './sim-combat.js';

export function queueSpell(world, cardId, team, x, y) {
  const card = cardById(cardId);
  world.spells.push({ cardId, team, x, y, at: world.time + TUNING.spellCastSeconds });
  emit(world, 'spellCast', { cardId, team, x, y, radius: card.radius });
}

function pushAway(unit, center, distance) {
  const dx = unit.x - center.x;
  const dy = unit.y - center.y;
  const length = Math.hypot(dx, dy) || 1;
  unit.x = Math.min(Math.max(unit.x + (dx / length) * distance, 0), ARENA.width);
  unit.y = Math.min(Math.max(unit.y + (dy / length) * distance, 0), ARENA.height);
}

function land(world, spell) {
  const card = cardById(spell.cardId);
  const point = { x: spell.x, y: spell.y };
  for (const foe of foesOf(world, spell.team)) {
    if (gap(point, foe) > card.radius) {
      continue;
    }
    if (card.damage > 0) {
      damageEntity(world, foe, foe.isTower ? card.damage * TUNING.towerSpellFactor : card.damage);
    }
    if (foe.isTower || !foe.alive) {
      continue;
    }
    if (card.stun) {
      foe.stun = card.stun;
      foe.attackTimer = foe.def.hit * TUNING.windupShare;
    }
    if (card.slow) {
      foe.slow = { ...card.slow };
    }
    if (card.push && !foe.def.traits.immovable) {
      pushAway(foe, point, card.push);
    }
  }
  if (card.heal) {
    for (const friend of world.units) {
      if (friend.alive && friend.team === spell.team && friend.deployLeft <= 0 && gap(point, friend) <= card.radius) {
        friend.heal = { rate: card.heal.amount / card.heal.seconds, left: card.heal.seconds };
      }
    }
  }
  emit(world, 'spell', { cardId: spell.cardId, team: spell.team, x: spell.x, y: spell.y, radius: card.radius });
}

export function stepSpells(world) {
  const due = world.spells.filter((spell) => spell.at <= world.time);
  world.spells = world.spells.filter((spell) => spell.at > world.time);
  due.forEach((spell) => land(world, spell));
}
