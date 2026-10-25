// The words a course's layout uses for the kit (M7d2), and the rules that read them: which barrier stands on each
// of the kart rules' walls (the styles a course can choose for stretches of its walls, and the plain wall, or in
// anti-gravity sections the anti-gravity wall, wherever it chooses none), which side of the road a deck or prop
// is on, and the props a deck can carry with how far each reaches from its spot. Plain data and maths, no
// Three.js, unit tested in Node. Used by the kit's builders and the courses' layouts.

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
