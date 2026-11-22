// Spirefall's seats: 2 in a 1v1, 4 in a 2v2, each on a team and held by a person or a CPU. Plain functions, no DOM,
// so they are unit tested in Node. Used by host/games/arena/index.js; the CPU driver and the match will read the
// seats this makes.

import { ARENA_TEAMS } from '../../../shared/protocol.js';

export const MODES = Object.freeze({ '1v1': 1, '2v2': 2 });
export const DEFAULT_CPU_LEVEL = 1;

// How many people one team holds in a mode.
export function seatsPerTeam(mode) {
  return MODES[mode];
}

// `humans` is [{ playerId, team }] in the order they joined, `team` an ARENA_TEAMS value or null for no choice.
// Returns { seats, overflow }: `seats` is every seat in order (Dawn's seats, then Dusk's) as
// { team, playerId, cpuLevel }, where playerId is null for a CPU seat; `overflow` lists the people left with no seat.
// A person gets the team they asked for while it has room, then the other team; with no choice, the team with
// fewer people (Dawn on a tie). So alone you are Dawn, and a second phone in a 1v1 is Dusk.
export function buildSeats(mode, humans) {
  const size = seatsPerTeam(mode);
  const members = { [ARENA_TEAMS.DAWN]: [], [ARENA_TEAMS.DUSK]: [] };
  const overflow = [];
  for (const human of humans) {
    const team = pickTeam(members, size, human.team);
    if (team === null) {
      overflow.push(human.playerId);
    } else {
      members[team].push(human.playerId);
    }
  }
  const seats = [];
  for (const team of [ARENA_TEAMS.DAWN, ARENA_TEAMS.DUSK]) {
    for (let index = 0; index < size; index += 1) {
      seats.push({ team, playerId: members[team][index] ?? null, cpuLevel: DEFAULT_CPU_LEVEL });
    }
  }
  return { seats, overflow };
}

function pickTeam(members, size, wanted) {
  const other = wanted === ARENA_TEAMS.DAWN ? ARENA_TEAMS.DUSK : ARENA_TEAMS.DAWN;
  const hasRoom = (team) => members[team].length < size;
  if (wanted === ARENA_TEAMS.DAWN || wanted === ARENA_TEAMS.DUSK) {
    return [wanted, other].find(hasRoom) ?? null;
  }
  const fewer = members[ARENA_TEAMS.DUSK].length < members[ARENA_TEAMS.DAWN].length ? ARENA_TEAMS.DUSK : ARENA_TEAMS.DAWN;
  return [fewer, fewer === ARENA_TEAMS.DAWN ? ARENA_TEAMS.DUSK : ARENA_TEAMS.DAWN].find(hasRoom) ?? null;
}

// The seat a person holds, or undefined.
export function seatOf(seats, playerId) {
  return seats.find((seat) => seat.playerId === playerId);
}

// A person who dropped for good (or forfeited): a CPU takes their seat, so the team keeps playing.
export function takeOverSeat(seats, playerId) {
  const seat = seatOf(seats, playerId);
  if (seat) {
    seat.playerId = null;
  }
}

// A team forfeits only when no person is left on it.
export function teamHasHuman(seats, team) {
  return seats.some((seat) => seat.team === team && seat.playerId !== null);
}

// Whether the match can start: at least one person is seated and every seated person is ready (CPUs always are).
export function everyoneReady(seats, ready) {
  const people = seats.filter((seat) => seat.playerId !== null);
  return people.length > 0 && people.every((seat) => ready.has(seat.playerId));
}
