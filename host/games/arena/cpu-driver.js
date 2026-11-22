// The CPU player: every second or two it looks at the board and plays one affordable card through the same playCard
// door a person uses, so it cannot cheat. It defends a lane that has enemies on its half, throws a spell at a cluster,
// and pushes when it has elixir to spare. Level 1 reacts slowly and plays the biggest card that hits the threat;
// level 2 picks counters (anti-air for flyers, splash for swarms, a distraction building against tank-pushers) and
// pushes sooner; level 3 reacts fastest, also finishes a weak Warden with a spell, and never wastes a spell on fewer
// than three. Pure functions, unit tested. Used by index.js, session.js and tools/balance-sim.js.

import { cardById } from '../../../shared/arena-cards.js';
import { ARENA, BRIDGES, forward, halfOf, laneOf } from '../../../shared/arena-map.js';
import { canDeploy } from './placement.js';
import { gap } from './geometry.js';

// Reaction time range in seconds and the elixir at which a CPU starts a push, by level.
const LEVELS = {
  1: { react: [1, 2.5], pushAt: 7 },
  2: { react: [0.6, 1.4], pushAt: 6 },
  3: { react: [0.3, 0.8], pushAt: 5 },
};

// A CPU keeps its own timer and random numbers. `random` is a function returning 0 to 1.
export function createCpu(level, random) {
  const settings = LEVELS[level] ?? LEVELS[1];
  const wait = () => settings.react[0] + random() * (settings.react[1] - settings.react[0]);
  return { level, random, settings, wait, thinkIn: wait() };
}

function enemyUnits(world, team) {
  return world.units.filter((unit) => unit.alive && unit.team !== team && unit.deployLeft <= 0);
}

// Enemies that have crossed into this team's half, the closest to its Keep first.
function threats(world, team) {
  const keep = world.towers.find((tower) => tower.team === team && tower.kind === 'keep');
  return enemyUnits(world, team).filter((unit) => halfOf(unit.y) === team).sort((a, b) => Math.abs(a.y - keep.y) - Math.abs(b.y - keep.y));
}

function bestCluster(world, team, radius) {
  const foes = enemyUnits(world, team);
  let best = null;
  for (const centre of foes) {
    const count = foes.filter((foe) => gap(centre, foe) <= radius).length;
    if (count >= 3 && (!best || count > best.count)) {
      best = { x: centre.x, y: centre.y, count };
    }
  }
  return best;
}

// Candidate spots in a lane, behind the bridge on the CPU's own side.
function laneSpots(team, lane) {
  const cx = BRIDGES[lane].cx;
  const baseY = team === 0 ? 21 : ARENA.height - 21;
  return [[cx, baseY], [cx + (lane === 0 ? 1.5 : -1.5), baseY + forward(team) * -1.5], [cx, baseY - forward(team) * 2]];
}

function legalSpot(world, team, card, spots) {
  return spots.find(([x, y]) => canDeploy(world, team, card, x, y)) ?? null;
}

function canHit(card, foe) {
  const air = foe.def.flying;
  return card.targets === 'both' || (air ? card.targets === 'air' : card.targets === 'ground');
}

function isCluster(world, team, card) {
  return card.type === 'spell' && card.damage > 0 && bestCluster(world, team, card.radius);
}

// A spell that would finish a Warden that is low enough (level 3).
function finishingSpell(world, team, hand) {
  for (const tower of world.towers.filter((entry) => entry.alive && entry.team !== team && entry.kind === 'warden')) {
    const spell = hand.find((entry) => entry.card.type === 'spell' && entry.card.damage * 0.35 >= tower.hp);
    if (spell) {
      return { slot: spell.slot, x: tower.x, y: tower.y };
    }
  }
  return null;
}

// How well a card answers the enemies in a lane: it must be able to hit them; flyers want anti-air, swarms want
// splash, and a tank that only hits buildings is best met by a cheap fast hitter (level 2 and 3 only).
function answerScore(entry, danger, level) {
  const { card } = entry;
  if (card.type === 'spell') {
    return -1;
  }
  const works = card.damage + (card.traits.detonate || card.traits.spawner ? 1 : 0) > 0;
  if (!works || (card.damage > 0 && !canHit(card, danger[0]))) {
    return -1;
  }
  let score = card.cost;
  if (level >= 2) {
    const flyers = danger.some((unit) => unit.def.flying);
    const swarm = danger.filter((unit) => unit.def.count > 1 || unit.def.mass <= 1).length >= 3;
    const tank = danger[0].def.targets === 'buildings';
    score += (flyers && (card.targets === 'both' || card.targets === 'air') ? 3 : 0) + (swarm && card.splash > 0 ? 3 : 0) + (tank && card.damage / card.hit > 80 ? 2 : 0);
  }
  return score;
}

// A healing spell where two or more friends are hurt (level 2 and up).
function mendSpot(world, team, hand) {
  const mend = hand.find((entry) => entry.card.heal);
  if (!mend) {
    return null;
  }
  const hurt = world.units.filter((unit) => unit.alive && unit.team === team && unit.deployLeft <= 0 && unit.hp < unit.maxHp * 0.6);
  const centre = hurt.find((unit) => hurt.filter((other) => gap(unit, other) <= mend.card.radius).length >= 2);
  return centre ? { slot: mend.slot, x: centre.x, y: centre.y } : null;
}

// Backs up a friend that has crossed into the enemy half: a ranged or splash troop just behind it on our side.
function supportSpot(world, team, hand) {
  const pusher = world.units.find((unit) => unit.alive && unit.team === team && unit.deployLeft <= 0 && halfOf(unit.y) === 1 - team && unit.def.type === 'troop');
  const support = hand.filter((entry) => entry.card.type === 'troop' && (entry.card.ranged || entry.card.splash > 0)).sort((a, b) => b.card.cost - a.card.cost)[0];
  if (!pusher || !support) {
    return null;
  }
  const spot = legalSpot(world, team, support.card, laneSpots(team, laneOf(pusher.x)));
  return spot ? { slot: support.slot, x: spot[0], y: spot[1] } : null;
}

// Returns { slot, x, y } to play, or null to wait. Called every step with the step length.
export function cpuThink(match, player, cpu, dt) {
  cpu.thinkIn -= dt;
  if (cpu.thinkIn > 0) {
    return null;
  }
  cpu.thinkIn = cpu.wait();
  const { world } = match;
  const hand = player.deck.hand.map((id, slot) => ({ card: cardById(id), slot })).filter((entry) => entry.card.cost <= player.elixir);
  if (hand.length === 0) {
    return null;
  }
  if (cpu.level >= 3) {
    const finish = finishingSpell(world, player.team, hand);
    if (finish) {
      return finish;
    }
  }
  const danger = threats(world, player.team);
  if (danger.length > 0) {
    const spell = hand.find((entry) => isCluster(world, player.team, entry.card));
    if (spell) {
      const spot = bestCluster(world, player.team, spell.card.radius);
      return { slot: spell.slot, x: spot.x, y: spot.y };
    }
    const lane = laneOf(danger[0].x);
    const inLane = danger.filter((unit) => laneOf(unit.x) === lane);
    const pick = hand.map((entry) => ({ entry, score: answerScore(entry, inLane, cpu.level) })).filter((option) => option.score >= 0).sort((a, b) => b.score - a.score)[0]?.entry;
    const spot = pick && legalSpot(world, player.team, pick.card, laneSpots(player.team, lane));
    return spot ? { slot: pick.slot, x: spot[0], y: spot[1] } : null;
  }
  if (cpu.level >= 2) {
    const extra = mendSpot(world, player.team, hand) ?? (player.elixir >= 5 ? supportSpot(world, player.team, hand) : null);
    if (extra) {
      return extra;
    }
  }
  if (player.elixir < cpu.settings.pushAt) {
    return null;
  }
  const pushers = hand.filter((entry) => entry.card.type === 'troop' && entry.card.targets !== 'air');
  const pick = pushers.sort((a, b) => b.card.cost - a.card.cost)[0];
  const spot = pick && legalSpot(world, player.team, pick.card, laneSpots(player.team, cpu.random() < 0.5 ? 0 : 1));
  return spot ? { slot: pick.slot, x: spot[0], y: spot[1] } : null;
}
