// A running Spirefall match as the host handles it: the match, the CPU players, each seat's aiming ghost and
// notices, the events for effects and sound, a phone's PLACE messages, and a CPU taking over a seat. No DOM, so it is
// unit tested in Node. Used by host/games/arena/index.js.

import { INPUT_KINDS } from '../../../shared/protocol.js';
import { cardById } from '../../../shared/arena-cards.js';
import { createMatch, stepMatch, playCard, isPlaying, forfeitTeam } from './match.js';
import { createCpu, cpuThink } from './cpu-driver.js';
import { createRng } from './rng.js';
import { padToWorld, snap, canDeploy } from './placement.js';
import { drainEvents } from './world.js';
import { matchView } from './views.js';

// `seats` is [{ team, playerId, cpuLevel }] with playerId null for a CPU, `decks` one 8-card array per seat.
export function createSession({ seats, decks, seed, settings }) {
  const match = createMatch({ seed, seats, decks, settings });
  const random = createRng(seed ^ 0x51ed);
  const cpus = match.players.map((player) => (player.playerId === null ? createCpu(player.cpuLevel, random) : null));
  const ghosts = match.players.map(() => null);
  const notices = match.players.map(() => ({ code: null, n: 0 }));
  const hadHuman = [0, 1].map((team) => match.players.some((player) => player.team === team && player.playerId !== null));
  const events = [];

  const indexOf = (playerId) => match.players.findIndex((player) => player.playerId === playerId);

  function step(dt) {
    stepMatch(match, dt);
    if (isPlaying(match)) {
      match.players.forEach((player, index) => {
        const action = cpus[index] && cpuThink(match, player, cpus[index], dt);
        if (action) {
          playCard(match, index, action.slot, action.x, action.y);
        }
      });
    }
    events.push(...drainEvents(match.world));
  }

  function notify(index, code) {
    notices[index] = { code, n: notices[index].n + 1 };
  }

  // A phone's PLACE input: pick (card pressed), aim (finger moving over the pad), drop (let go) or cancel.
  function place(playerId, input) {
    const index = indexOf(playerId);
    const { phase, slot, x, y } = input;
    if (index < 0 || input.kind !== INPUT_KINDS.PLACE || !Number.isInteger(slot) || slot < 0 || slot > 3) {
      return;
    }
    const player = match.players[index];
    if (phase === 'cancel') {
      ghosts[index] = null;
    } else if (phase === 'pick') {
      ghosts[index] = { slot, x: null, y: null, legal: false };
    } else if ((phase === 'aim' || phase === 'drop') && Number.isFinite(x) && Number.isFinite(y)) {
      const point = padToWorld(player.team, x, y);
      const spot = { x: snap(point.x), y: snap(point.y) };
      if (phase === 'aim') {
        const card = cardById(player.deck.hand[slot]);
        ghosts[index] = { slot, ...spot, legal: Boolean(card) && canDeploy(match.world, player.team, card, spot.x, spot.y) };
      } else {
        const result = playCard(match, index, slot, spot.x, spot.y);
        ghosts[index] = null;
        if (!result.ok) {
          notify(index, result.reason);
        }
      }
    }
  }

  // The person left for good: a CPU takes the seat. A team that had people and has none left forfeits.
  function takeOver(playerId) {
    const index = indexOf(playerId);
    if (index < 0) {
      return;
    }
    const player = match.players[index];
    player.playerId = null;
    cpus[index] = createCpu(1, random);
    ghosts[index] = null;
    if (hadHuman[player.team] && !match.players.some((other) => other.team === player.team && other.playerId !== null)) {
      forfeitTeam(match, player.team);
    }
  }

  function viewFor(playerId, paused) {
    const index = indexOf(playerId);
    return index < 0 ? null : matchView(match, index, { ghost: ghosts[index], notice: notices[index], paused });
  }

  return {
    match, step, place, takeOver, viewFor, indexOf,
    ghosts: () => match.players.map((player, index) => ({ team: player.team, seat: index, ghost: ghosts[index], card: ghosts[index] ? cardById(player.deck.hand[ghosts[index].slot]) : null })).filter((entry) => entry.ghost),
    // Events from the steps so far and from plays made since (a play happens between steps).
    drainEvents: () => {
      events.push(...drainEvents(match.world));
      return events.splice(0);
    },
  };
}
