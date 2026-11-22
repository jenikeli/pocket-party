// A Spirefall match: the clock and phases (intro, regulation, overtime, over), each seat's deck and elixir, playing a
// card, and the result with the tiebreak. Pure functions over a plain object, unit tested. Used by index.js, the
// CPU and tools/balance-sim.js.

import { cardById } from '../../../shared/arena-cards.js';
import { TUNING, elixirMultiplier } from './tuning.js';
import { createRng } from './rng.js';
import { createDeck, playSlot, nextCard } from './deck.js';
import { createWorld, emit, spawnUnit } from './world.js';
import { stepWorld } from './sim.js';
import { queueSpell } from './sim-spells.js';
import { canDeploy, snap, spawnOffsets } from './placement.js';

// `seats` is [{ team, playerId, cpuLevel }], `decks` one array of 8 card ids per seat. `settings` may hold
// regulationSeconds, overtimeSeconds, elixirScale and handicap ([dawn, dusk] percent extra tower HP).
export function createMatch({ seed, seats, decks, settings = {} }) {
  const config = { regulationSeconds: TUNING.regulationSeconds, overtimeSeconds: TUNING.overtimeSeconds, elixirScale: 1, handicap: [0, 0], ...settings };
  const random = createRng(seed ^ 0x9e3779b9);
  const players = seats.map((seat, index) => ({
    index, team: seat.team, playerId: seat.playerId, cpuLevel: seat.cpuLevel, deck: createDeck(decks[index], random), elixir: TUNING.startElixir,
  }));
  return { phase: 'intro', clock: TUNING.introSeconds, config, players, world: createWorld(seed, config.handicap), result: null };
}

export function isPlaying(match) {
  return match.phase === 'regulation' || match.phase === 'overtime';
}

// The lowest share of HP left on any of a team's towers (a fallen tower counts as 0): the tiebreak.
export function lowestTowerShare(world, team) {
  return Math.min(...world.towers.filter((tower) => tower.team === team).map((tower) => (tower.alive ? tower.hp / tower.maxHp : 0)));
}

function finish(match, winner, reason) {
  match.phase = 'over';
  match.result = { winner, reason, crowns: [...match.world.crowns] };
}

function leader(crowns) {
  return crowns[0] === crowns[1] ? null : crowns[0] > crowns[1] ? 0 : 1;
}

function endOfClock(match) {
  const { world } = match;
  if (match.phase === 'regulation' && leader(world.crowns) === null) {
    match.phase = 'overtime';
    match.clock = match.config.overtimeSeconds;
    return;
  }
  if (leader(world.crowns) !== null) {
    finish(match, leader(world.crowns), 'crowns');
    return;
  }
  const dawn = lowestTowerShare(world, 0);
  const dusk = lowestTowerShare(world, 1);
  finish(match, dawn === dusk ? null : dawn > dusk ? 0 : 1, dawn === dusk ? 'draw' : 'tiebreak');
}

export function stepMatch(match, dt) {
  if (match.phase === 'over') {
    return;
  }
  if (match.phase === 'intro') {
    match.clock -= dt;
    if (match.clock <= 0) {
      match.phase = 'regulation';
      match.clock = match.config.regulationSeconds;
    }
    return;
  }
  stepWorld(match.world, dt);
  const rate = (elixirMultiplier(match.phase, match.clock) * match.config.elixirScale) / TUNING.elixirSecondsPerPoint;
  for (const player of match.players) {
    player.elixir = Math.min(TUNING.maxElixir, player.elixir + rate * dt);
  }
  match.clock -= dt;
  if (match.world.winner !== null) {
    finish(match, match.world.winner, 'keep');
  } else if (match.phase === 'overtime' && leader(match.world.crowns) !== null) {
    finish(match, leader(match.world.crowns), 'overtime');
  } else if (match.clock <= 0) {
    endOfClock(match);
  }
}

// A whole team gave up (every human left): the other team wins.
export function forfeitTeam(match, team) {
  if (match.phase !== 'over') {
    finish(match, 1 - team, 'forfeit');
  }
}

// Plays the card in `slot` for a player at (x, y). Returns { ok: true, cardId } or { ok: false, reason } with
// reason 'not-playing', 'bad-slot', 'no-elixir' or 'bad-spot'. Nothing changes unless it is ok.
export function playCard(match, playerIndex, slot, x, y) {
  const player = match.players[playerIndex];
  if (!isPlaying(match)) {
    return { ok: false, reason: 'not-playing' };
  }
  const cardId = player.deck.hand[slot];
  if (!cardId) {
    return { ok: false, reason: 'bad-slot' };
  }
  const card = cardById(cardId);
  if (player.elixir < card.cost) {
    return { ok: false, reason: 'no-elixir' };
  }
  const point = { x: snap(x), y: snap(y) };
  if (!canDeploy(match.world, player.team, card, point.x, point.y)) {
    return { ok: false, reason: 'bad-spot' };
  }
  player.elixir -= card.cost;
  playSlot(player.deck, slot);
  const { world } = match;
  emit(world, 'play', { cardId, team: player.team, seat: playerIndex, x: point.x, y: point.y });
  if (card.type === 'spell') {
    queueSpell(world, cardId, player.team, point.x, point.y);
  } else {
    for (const [dx, dy] of spawnOffsets(card.count)) {
      spawnUnit(world, cardId, player.team, point.x + dx, point.y + dy, { deploy: TUNING.deploySeconds });
    }
  }
  return { ok: true, cardId };
}

// A tower's HP percent for the phone's strip: [left Warden, Keep, right Warden] of a team.
export function towerPercents(world, team) {
  const own = world.towers.filter((tower) => tower.team === team);
  const pick = (tower) => (tower.alive ? Math.ceil((tower.hp / tower.maxHp) * 100) : 0);
  return [own.find((tower) => tower.lane === 0), own.find((tower) => tower.kind === 'keep'), own.find((tower) => tower.lane === 1)].map(pick);
}

export function nextCardOf(player) {
  return nextCard(player.deck);
}
