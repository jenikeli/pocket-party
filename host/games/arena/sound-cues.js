// What Spirefall sounds like, decided without any audio: which cues the rules' events and the match's phase imply
// for one frame. Plain functions, unit tested in Node; host/games/arena/sounds.js turns the cues into Web Audio.
// A cue is a small object { type, ... }; sound-voices.js knows how each type sounds.

import { cardById } from '../../../shared/arena-cards.js';

// At most this many cues play in one frame, and a swarm is thinned per kind first (the loudest ones stay).
export const MAX_CUES = 8;
const MAX_PER_KIND = { hit: 3, towerHit: 1, shot: 2, landed: 2, play: 2 };
// Lower plays first when the frame is over the cap: the big moments are never the ones dropped.
const PRIORITY = { result: 0, towerDown: 0, keepWake: 0, overtime: 0, elixir: 1, spell: 1, whistle: 1, play: 2, landed: 3, towerHit: 4, shot: 5, hit: 6 };
// Shots from these cards are airy whooshes; the cog faction ticks and clacks; everything else plucks.
const MAGES = ['pyre-mage', 'hexweaver', 'brook-sprite'];

function entityById(world, id) {
  return world?.units.find((unit) => unit.id === id) ?? world?.towers.find((tower) => tower.id === id);
}

function shotStyle(source) {
  if (MAGES.includes(source?.cardId)) {
    return 'whoosh';
  }
  return source?.def?.faction === 'cog' ? 'tick' : 'pluck';
}

// One event -> its cue, or null for an event with no sound (strikes, deaths, blasts, zones, spawns).
function cueOf(event, world) {
  switch (event.type) {
    case 'play':
      return { type: 'play', team: event.team };
    case 'landed':
      return { type: 'landed', mass: cardById(event.cardId)?.mass ?? 3 };
    case 'hit': {
      const tower = event.towerId ? entityById(world, event.towerId) : null;
      return event.towerId ? { type: 'towerHit', keep: tower?.kind === 'keep', amount: event.amount } : { type: 'hit', amount: event.amount };
    }
    case 'shot':
      return { type: 'shot', style: shotStyle(entityById(world, event.sourceId)) };
    case 'spellCast':
      return event.cardId === 'flare' ? { type: 'whistle' } : null;
    case 'spell':
      return { type: 'spell', card: event.cardId, team: event.team };
    case 'towerDown':
      return { type: 'towerDown', keep: event.kind === 'keep' };
    case 'keepWake':
      return { type: 'keepWake', team: event.team };
    default:
      return null;
  }
}

// How loud a cue's cause was, so thinning keeps the hardest hits.
const strength = (cue) => cue.amount ?? cue.mass ?? 0;

// Keeps the strongest few of each kind that has a limit.
function thinned(cues) {
  const seen = {};
  return [...cues].sort((a, b) => strength(b) - strength(a)).filter((cue) => {
    seen[cue.type] = (seen[cue.type] ?? 0) + 1;
    return seen[cue.type] <= (MAX_PER_KIND[cue.type] ?? Infinity);
  });
}

// The parts of the match the phase cues are read from, taken once per frame: { phase, multiplier, winner }.
// `multiplier` is the elixir speed (1, 2 or 3), passed in by the caller so this file needs no match rules.
export function matchSnapshot(match, multiplier) {
  return { phase: match.phase, multiplier, winner: match.result?.winner ?? null };
}

// The cues of a change between two snapshots (`before` is null on the first frame): the elixir speed going
// up, overtime starting, the match ending.
export function phaseCues(before, after) {
  const cues = [];
  if (!before) {
    return cues;
  }
  if (after.multiplier > before.multiplier && after.phase !== 'over') {
    cues.push({ type: 'elixir', multiplier: after.multiplier });
  }
  if (after.phase === 'overtime' && before.phase !== 'overtime') {
    cues.push({ type: 'overtime' });
  }
  if (after.phase === 'over' && before.phase !== 'over') {
    cues.push({ type: 'result', winner: after.winner });
  }
  return cues;
}

// Every cue for one frame, most important first and no more than MAX_CUES: the phase change, then the events.
export function frameCues(before, after, events, world) {
  const fromEvents = thinned(events.map((event) => cueOf(event, world)).filter(Boolean));
  const all = [...phaseCues(before, after), ...fromEvents];
  return all.sort((a, b) => PRIORITY[a.type] - PRIORITY[b.type]).slice(0, MAX_CUES);
}
