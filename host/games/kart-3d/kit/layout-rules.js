// The words a course's layout uses for the kit (M7d2), and the rules that read them: which barrier stands on each
// of the kart rules' walls (the styles a course can choose for stretches of its walls, and the plain wall, or in
// anti-gravity sections the anti-gravity wall, wherever it chooses none), which side of the road a deck or prop
// is on, the props a deck can carry with how far each reaches from its spot, how deep a deck is along it, and
// where turn boards stand (M7d3).
// Plain data and maths, no Three.js, unit tested in Node. Used by the kit's builders and the courses' layouts.

import { turnAhead } from '../track.js';

export const BARRIER_STYLES = Object.freeze({
  WALL: 'wall',
  ANTI_GRAVITY_WALL: 'anti-gravity-wall',
  SPONSOR_WALL: 'sponsor-wall',
  GUARDRAIL: 'guardrail',
  STRIPED_RAIL: 'striped-rail',
  RAIL_FENCE: 'rail-fence',
  BLOCK_CURBS: 'block-curbs',
});

// Each prop's name, and how far it reaches from its spot seen from above, so a layout can be checked to keep
// every prop on its deck and clear of the barrier. A street lamp counts only its foot: its arm or crossbar
// reaches out high above any barrier.
export const PROP_REACH = Object.freeze({
  cone: 0.3,
  'tyre-stack': 0.5,
  'warp-pipe': 1.15,
  'giant-mushroom': 3,
  'mktv-van': 2.4,
  'sponsor-stand': 1.35,
  'lantern-lamp': 0.3,
  'triple-lamp': 0.3,
  floodlight: 1.7,
  // The seaside's (M7d3). A palm counts only its trunk: its fronds spread high above any barrier.
  palm: 0.5,
  parasol: 1.6,
  lounger: 1.05,
  surfboards: 1,
  'lifebuoy-post': 0.3,
  barrels: 0.85,
  // A round tree's crown spreads 2.2 from its trunk, above the barriers but low enough to reach a kart's camera.
  'round-tree': 2.2,
  hedge: 1.25,
  planter: 0.95,
});

// A side's name in a layout ('left' or 'right') as -1 or 1.
export function sideSign(name) {
  return name === 'right' ? 1 : -1;
}

// `runs` is a course's list of [{ fromS, toS, side: 'left', 'right' or 'both', style }]: the first run that
// holds the station's distance along the road (fromS <= s < toS) on that side decides. `side` is -1 (left) or 1
// (right).
export function barrierStyleAt(runs, station, side) {
  const run = runs.find((candidate) => (candidate.side === 'both' || sideSign(candidate.side) === side) && station.s >= candidate.fromS && station.s < candidate.toS);
  if (run) {
    return run.style;
  }
  return station.antiGravity ? BARRIER_STYLES.ANTI_GRAVITY_WALL : BARRIER_STYLES.WALL;
}

// A turn board stands every BOARD_SPACING stations round the outside of each corner (turning more than
// BOARD_DEGREES over the next 10 stations), on level road with a wall, and only behind a barrier low enough for
// the board to clear (a padded wall's fence or the blocks would run into it).
const BOARD_SPACING = 8;
const BOARD_DEGREES = 8;
const LOW_BARRIERS = [BARRIER_STYLES.GUARDRAIL, BARRIER_STYLES.STRIPED_RAIL, BARRIER_STYLES.RAIL_FENCE];

// Where turn boards stand on a course whose barriers are `runs`: [{ index, side, turnsRight }], side -1 (left)
// or 1 (right), pointing the way the road turns.
export function turnBoardSpots(track, runs) {
  const spots = [];
  for (let index = 0; index < track.stations.length; index += BOARD_SPACING) {
    const turn = turnAhead(track, index);
    const station = track.stations[index];
    // On the outside of the corner: the left of a right turn.
    const side = turn > 0 ? -1 : 1;
    const walled = side > 0 ? station.wallRight : station.wallLeft;
    if (Math.abs(turn) < (BOARD_DEGREES * Math.PI) / 180 || !walled || station.gap || station.antiGravity || station.normal.y < 0.95) {
      continue;
    }
    if (LOW_BARRIERS.includes(barrierStyleAt(runs, station, side))) {
      spots.push({ index, side, turnsRight: turn > 0 });
    }
  }
  return spots;
}

// Under the turn boards the ledge the barriers stand on widens to BOARD_LEDGE, so a board stands out clear of the
// rails with both posts on concrete (the M7d3 device run saw boards hanging off the narrow ledge). It is wide
// within BOARD_LEDGE_HOLD stations of a board (boards are BOARD_SPACING apart, so a corner's boards share one
// wide ledge) and eases back over BOARD_LEDGE_EASE stations in an S curve, so its edge never steps.
export const BOARD_LEDGE = 2.7;
const BOARD_LEDGE_HOLD = BOARD_SPACING / 2;
const BOARD_LEDGE_EASE = 12;

// How wide the ledge is on `side` at station `index` of a `stationCount`-station lap, from the turn board
// `spots` (turnBoardSpots) and its width away from them, `narrow`.
export function ledgeWidthAt(spots, index, side, stationCount, narrow) {
  let nearest = Infinity;
  for (const spot of spots) {
    if (spot.side === side) {
      const apart = Math.abs(spot.index - index);
      nearest = Math.min(nearest, apart, stationCount - apart);
    }
  }
  const share = Math.min(1, Math.max(0, nearest - BOARD_LEDGE_HOLD) / BOARD_LEDGE_EASE);
  return narrow + (BOARD_LEDGE - narrow) * (1 - smoothstep(share));
}

// A deck tapers over its last DECK_TAPER units at each free end, in an S curve down to nothing at the wall, so it
// never ends in a blunt cut (the M7d3 device run saw them). Where it meets another deck end to end on the same
// side, it keeps its depth there: decks that join must have the same depth.
export const DECK_TAPER = 10;
// Two decks join where one's end and the other's start are this close (stations are a unit apart).
const JOIN_TOLERANCE = 1;

// How deep `platform` is at distance `s` along the lap (inside it); `platforms` are the course's decks (to find
// the ones it joins) and `lapLength` the track's length (decks may run across the lap's start).
export function deckDepthAt(platform, s, platforms, lapLength) {
  const wrap = (distance) => ((distance % lapLength) + lapLength) % lapLength;
  const meets = (end, start) => Math.min(wrap(end - start), wrap(start - end)) < JOIN_TOLERANCE;
  const joins = (atStart) => platforms.some((other) => other !== platform && other.side === platform.side && (atStart ? meets(other.toS, platform.fromS) : meets(platform.toS, other.fromS)));
  const length = platform.toS - platform.fromS;
  // A deck's first station can sit a little before its start and its last a little past its end: count either
  // as at that end (wrapped, a point just before the start would read as almost a lap in, at full depth).
  let into = wrap(s - platform.fromS);
  if (into > length) {
    into = into - length < lapLength - into ? length : 0;
  }
  const taper = (distance) => smoothstep(Math.min(1, Math.max(0, distance) / DECK_TAPER));
  const atStart = joins(true) ? 1 : taper(into);
  const atEnd = joins(false) ? 1 : taper(length - into);
  return platform.depth * atStart * atEnd;
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
