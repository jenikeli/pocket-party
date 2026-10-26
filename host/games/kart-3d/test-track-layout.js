// Where the Test track's dressing stands (M7d2), chosen so that every piece of the kit shows somewhere round the
// lap: which barrier stands on each stretch of wall, the decks beside the road and the props on them, the
// grandstand and the bunting. Distances along the lap (s) follow the pieces in test-track.js: start straight
// 0-60 (the start line at 34), hill 60-120 (no walls), first turn 120-183 (right), the straight to the jump
// 183-241, the landing straight 253-281, the hairpin 281-344 (right), the straight back 344-384, the banked
// curve 384-431 (left), the off-road straight 431-521 (its walls 14 out, past the grass) and the anti-gravity
// curve 521-628. Plain data, unit tested in Node. Drawn by host/games/kart-3d/test-track-scenery.js.

import { BARRIER_STYLES } from './kit/layout-rules.js';

export const BARRIER_RUNS = Object.freeze([
  { fromS: 0, toS: 60, side: 'both', style: BARRIER_STYLES.SPONSOR_WALL },
  { fromS: 120, toS: 183, side: 'both', style: BARRIER_STYLES.GUARDRAIL },
  { fromS: 183, toS: 245, side: 'both', style: BARRIER_STYLES.STRIPED_RAIL },
  { fromS: 245, toS: 281, side: 'both', style: BARRIER_STYLES.RAIL_FENCE },
  { fromS: 281, toS: 344, side: 'both', style: BARRIER_STYLES.BLOCK_CURBS },
  { fromS: 344, toS: 384, side: 'both', style: BARRIER_STYLES.PROMENADE_RAIL },
  { fromS: 384, toS: 431, side: 'both', style: BARRIER_STYLES.STRIPED_RAIL },
  { fromS: 431, toS: 521, side: 'left', style: BARRIER_STYLES.SPONSOR_WALL },
  { fromS: 431, toS: 521, side: 'right', style: BARRIER_STYLES.RAIL_FENCE },
  { fromS: 610, toS: 640, side: 'both', style: BARRIER_STYLES.WALL },
]);

// The decks beside the road, each outside a wall (the road floats, so props need ground): { fromS, toS, side,
// depth (out from the edge of the ground), ground: 'grass' or 'paving' }.
export const PLATFORMS = Object.freeze([
  { fromS: 3, toS: 58, side: 'left', depth: 12, ground: 'paving' },
  { fromS: 3, toS: 58, side: 'right', depth: 10, ground: 'paving' },
  { fromS: 128, toS: 178, side: 'left', depth: 8, ground: 'grass' },
  { fromS: 284, toS: 341, side: 'right', depth: 10, ground: 'grass' },
  { fromS: 440, toS: 515, side: 'right', depth: 7, ground: 'grass' },
]);

// The grandstand on the start straight's left deck: its middle's s, its length along the road and how far its
// front stands out from the edge of the ground (it is about 7 deep).
export const GRANDSTAND = Object.freeze({ s: 30, side: 'left', length: 36, out: 2.5 });

// Strings of bunting across the road, at these distances along the lap. None between the grid and the gate:
// seen from the back of the grid, a string there hangs across the gate's sign or the start lights.
export const BUNTING = Object.freeze([52, 365, 478]);

const cones = (fromS, toS, side, out) => Array.from({ length: Math.floor((toS - fromS) / 2) + 1 }, (_, index) => ({ piece: 'cone', s: fromS + index * 2, side, out }));

// Every prop on the decks: { piece (a name in PROP_REACH), s, side, out, turn (degrees from facing the road) }.
export const PROPS = Object.freeze([
  // The start straight's right deck: the paddock, with floodlights at the back (the left deck's ends, where it
  // tapers, are too narrow for them beside the grandstand).
  { piece: 'tyre-stack', s: 9, side: 'right', out: 1.3 },
  { piece: 'tyre-stack', s: 10.2, side: 'right', out: 2.3 },
  { piece: 'tyre-stack', s: 11.4, side: 'right', out: 1.3 },
  { piece: 'sponsor-stand', s: 14, side: 'right', out: 2.2 },
  { piece: 'floodlight', s: 17, side: 'right', out: 6.5 },
  { piece: 'floodlight', s: 40, side: 'right', out: 6.5 },
  { piece: 'lantern-lamp', s: 17, side: 'right', out: 1.4 },
  { piece: 'sponsor-stand', s: 22, side: 'right', out: 2.2 },
  ...cones(26, 32, 'right', 1.2),
  { piece: 'lantern-lamp', s: 37, side: 'right', out: 1.4 },
  { piece: 'mktv-van', s: 46, side: 'right', out: 4.5, turn: 90 },
  { piece: 'lantern-lamp', s: 55, side: 'right', out: 1.4 },
  // Outside the first turn.
  { piece: 'triple-lamp', s: 134, side: 'left', out: 2 },
  { piece: 'tyre-stack', s: 142, side: 'left', out: 1.3 },
  { piece: 'tyre-stack', s: 143.2, side: 'left', out: 2.3 },
  { piece: 'palm', s: 139, side: 'left', out: 5.5 },
  { piece: 'sponsor-stand', s: 150, side: 'left', out: 3 },
  { piece: 'triple-lamp', s: 160, side: 'left', out: 2 },
  { piece: 'sponsor-stand', s: 168, side: 'left', out: 3 },
  { piece: 'triple-lamp', s: 172, side: 'left', out: 2 },
  // Inside the hairpin: a giant mushroom between two warp pipes.
  { piece: 'giant-mushroom', s: 312, side: 'right', out: 6 },
  { piece: 'warp-pipe', s: 293, side: 'right', out: 3.5 },
  { piece: 'warp-pipe', s: 331, side: 'right', out: 3.5 },
  ...cones(288, 291, 'right', 1.2),
  // The seaside's props (M7d3), on the same deck.
  { piece: 'parasol', s: 300, side: 'right', out: 3.5 },
  { piece: 'lounger', s: 303, side: 'right', out: 7 },
  { piece: 'surfboards', s: 322, side: 'right', out: 3.5 },
  ...cones(334, 338, 'right', 1.2),
  // Beside the off-road straight.
  { piece: 'lantern-lamp', s: 446, side: 'right', out: 1.3 },
  { piece: 'lifebuoy-post', s: 451, side: 'right', out: 1.3 },
  { piece: 'barrels', s: 452, side: 'right', out: 4.6 },
  { piece: 'warp-pipe', s: 458, side: 'right', out: 3.5 },
  { piece: 'lantern-lamp', s: 466, side: 'right', out: 1.3 },
  { piece: 'tyre-stack', s: 476, side: 'right', out: 1.3 },
  { piece: 'round-tree', s: 482, side: 'right', out: 4.5 },
  { piece: 'hedge', s: 491, side: 'right', out: 5.2 },
  { piece: 'planter', s: 501, side: 'right', out: 5.2 },
  { piece: 'lantern-lamp', s: 486, side: 'right', out: 1.3 },
  { piece: 'sponsor-stand', s: 496, side: 'right', out: 3 },
  { piece: 'lantern-lamp', s: 506, side: 'right', out: 1.3 },
]);
