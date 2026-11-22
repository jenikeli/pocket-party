// What each phone is told in Spirefall (the `view` of CONTROLLER_STATE), made from the seats. Plain functions, no
// DOM, so they are unit tested in Node. Used by host/games/arena/index.js; controller/games/arena/index.js shows them.

import { seatOf } from './seats.js';
import { cardById } from '../../../shared/arena-cards.js';
import { TUNING, elixirMultiplier } from './tuning.js';
import { isPlaying, towerPercents } from './match.js';
import { nextCard } from './deck.js';

// The setup screen of a seated person: their team and seat (0 or 1 within the team), the mode, whether they are
// ready, the partner's name in a 2v2, and how many seated people are ready. `names` is Map(playerId -> name).
export function setupView({ seats, mode, playerId, ready, names, deck = null }) {
  const seat = seatOf(seats, playerId);
  const people = seats.filter((other) => other.playerId !== null);
  const mate = seats.find((other) => other.team === seat.team && other !== seat && other.playerId !== null);
  return {
    phase: 'setup',
    mode,
    team: seat.team,
    seat: seats.filter((other) => other.team === seat.team).indexOf(seat),
    ready: ready.has(playerId),
    deck,
    mate: mate ? names.get(mate.playerId) : null,
    readyCount: people.filter((other) => ready.has(other.playerId)).length,
    peopleCount: people.length,
  };
}

// One player's view during a match: their private hand and elixir, the clock, both teams' towers and the crowns.
// Elixir is rounded to a quarter and the clock to a second, so the view only changes when something worth sending
// did; `rate` lets the phone fill the bar smoothly between views. `extras` is { ghost, notice, paused }.
export function matchView(match, index, extras) {
  const player = match.players[index];
  const playing = isPlaying(match);
  const multiplier = playing ? elixirMultiplier(match.phase, match.clock) * match.config.elixirScale : 0;
  const crowns = player.team === 0 ? match.world.crowns : [...match.world.crowns].reverse();
  let result = null;
  if (match.result) {
    const { winner, reason } = match.result;
    result = { outcome: winner === null ? 'draw' : winner === player.team ? 'win' : 'lose', reason, crowns };
  }
  return {
    phase: 'match',
    stage: match.phase,
    t: Math.max(0, Math.ceil(match.clock)),
    mult: multiplier,
    rate: playing && !extras.paused ? Math.round((multiplier / TUNING.elixirSecondsPerPoint) * 1000) / 1000 : 0,
    elixir: Math.floor(player.elixir * 4) / 4,
    hand: [...player.deck.hand],
    next: nextCard(player.deck),
    cost: player.deck.hand.map((id) => cardById(id).cost),
    team: player.team,
    seat: index,
    towers: { own: towerPercents(match.world, player.team), foe: towerPercents(match.world, 1 - player.team) },
    crowns,
    selected: extras.ghost?.slot ?? null,
    notice: extras.notice,
    paused: extras.paused,
    result,
  };
}

// A person with no seat (the mode is full): the phone says so and waits.
export function fullView(mode) {
  return { phase: 'full', mode };
}
