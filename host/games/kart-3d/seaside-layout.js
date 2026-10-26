// Where Seaside Skyway's trackside dressing stands (M7d3): which barrier stands on each stretch of wall, the decks
// beside the road and the props on them, the grandstand, the bunting, and where steel trusses hold the road up
// instead of piers. The lap has two halves, themed on the course's name: the seaside (the last straight, the
// start and the first corners, s 1075-1213 and 0-340: a harbour with a boardwalk, beaches, palms and fences of
// wood and stone) and the sky (the climb to the hairpin and on round the anti-gravity wall, s 340-1075: steel
// guardrails and trusses among floating islands). Distances along the lap (s) follow the pieces in
// seaside-skyway.js. Plain data, unit tested in Node. Drawn by host/games/kart-3d/seaside-scenery.js.

import { BARRIER_STYLES } from './kit/layout-rules.js';

const { SPONSOR_WALL, GUARDRAIL, STRIPED_RAIL, RAIL_FENCE, BLOCK_CURBS } = BARRIER_STYLES;

export const BARRIER_RUNS = Object.freeze([
  // The harbour: the start straight between sponsor walls, then striped harbour rails to the first corner.
  { fromS: 0, toS: 100, side: 'both', style: SPONSOR_WALL },
  { fromS: 100, toS: 150, side: 'both', style: STRIPED_RAIL },
  // The beach: wooden rail fences round the first corner and along the straight, block curbs on its insides.
  { fromS: 150, toS: 236, side: 'left', style: RAIL_FENCE },
  { fromS: 150, toS: 236, side: 'right', style: BLOCK_CURBS },
  { fromS: 236, toS: 290, side: 'both', style: RAIL_FENCE },
  { fromS: 290, toS: 340, side: 'both', style: BLOCK_CURBS },
  // The sky: steel guardrails up the climb, round the sweeper and over the jump.
  { fromS: 340, toS: 700, side: 'both', style: GUARDRAIL },
  { fromS: 700, toS: 776, side: 'right', style: STRIPED_RAIL },
  { fromS: 700, toS: 776, side: 'left', style: GUARDRAIL },
  { fromS: 776, toS: 858, side: 'left', style: SPONSOR_WALL },
  { fromS: 776, toS: 858, side: 'right', style: GUARDRAIL },
  // Back down to the seaside after the anti-gravity wall.
  { fromS: 960, toS: 1076, side: 'both', style: RAIL_FENCE },
  { fromS: 1076, toS: 1150, side: 'left', style: RAIL_FENCE },
  { fromS: 1076, toS: 1150, side: 'right', style: BLOCK_CURBS },
  { fromS: 1150, toS: 1214, side: 'left', style: STRIPED_RAIL },
  { fromS: 1150, toS: 1214, side: 'right', style: BLOCK_CURBS },
]);

// Steel trusses under the sky half's high road, from the foot of the climb to the jump's landing; piers
// everywhere else.
export const TRUSS_RUNS = Object.freeze([{ fromS: 340, toS: 700 }]);

// The decks beside the road, each outside a wall: { fromS, toS, side, depth (out from the edge of the ground),
// ground: grass, paving, sand or boards }. A deck tapers away over its last 10 units at a free end
// (kit/layout-rules.js), so props keep clear of its ends.
export const PLATFORMS = Object.freeze([
  // Outside the last straight, round the last corner, along the start straight and on to the chicane, one deck
  // running on (joined decks share a depth): a beach, a boardwalk across the lap's start, a paved square for
  // the grandstand and a promenade past it.
  { fromS: 1078, toS: 1150, side: 'left', depth: 11, ground: 'sand' },
  { fromS: 1150, toS: 1220, side: 'left', depth: 11, ground: 'boards' },
  { fromS: 7, toS: 150, side: 'left', depth: 11, ground: 'paving' },
  // And on: a beach outside the first corner and along the straight after it, to the chicane.
  { fromS: 150, toS: 288, side: 'left', depth: 11, ground: 'sand' },
  // The boardwalk opposite the grandstand.
  { fromS: 2, toS: 146, side: 'right', depth: 9, ground: 'boards' },
  // In the sky: a garden up the outside of the climb, and a paddock beside the quiet straight.
  { fromS: 346, toS: 428, side: 'left', depth: 8, ground: 'grass' },
  { fromS: 782, toS: 852, side: 'left', depth: 8, ground: 'paving' },
]);

// The grandstand on the harbour square, its crowd looking at the grid: its middle's s, its length along the
// road and how far its front stands out from the edge of the ground (it is about 7 deep).
export const GRANDSTAND = Object.freeze({ s: 40, side: 'left', length: 44, out: 2.5 });

// Strings of bunting across the road. None between the grid and the gate: seen from the back of the grid, a
// string there hangs across the gate's sign or the start lights.
export const BUNTING = Object.freeze([92, 132, 262, 1100, 1128]);

const row = (piece, fromS, toS, spacing, side, out) => Array.from({ length: Math.floor((toS - fromS) / spacing) + 1 }, (_, index) => ({ piece, s: fromS + index * spacing, side, out }));
// A spot on a beach: a palm at the back, a parasol in front of it with a lounger beside, turned to the sun. The
// parasol stands far enough out to clear the turn boards round the corners.
const beachSpot = (s, side, depth) => [
  { piece: 'palm', s, side, out: depth - 1.5, turn: s * 37 },
  { piece: 'parasol', s: s + 3.5, side, out: 4.3 },
  { piece: 'lounger', s: s + 3.5, side, out: Math.min(7.3, depth - 1.2), turn: 15 },
];

// Every prop on the decks: { piece (a name in PROP_REACH), s, side, out, turn (degrees from facing the road) }.
export const PROPS = Object.freeze([
  // The harbour square round the grandstand: palms at its ends, lamps, the MKTV van and sponsor stands past it.
  { piece: 'barrels', s: 10, side: 'left', out: 2 },
  { piece: 'palm', s: 13, side: 'left', out: 6, turn: 40 },
  { piece: 'palm', s: 66, side: 'left', out: 10, turn: 200 },
  ...row('lantern-lamp', 66, 96, 10, 'left', 1.4),
  { piece: 'sponsor-stand', s: 71, side: 'left', out: 3.5 },
  { piece: 'mktv-van', s: 82, side: 'left', out: 8, turn: 90 },
  { piece: 'sponsor-stand', s: 91, side: 'left', out: 3.5 },
  { piece: 'palm', s: 95, side: 'left', out: 10, turn: 120 },
  // The boardwalk opposite: palms in a row with lamps between, lifebuoys, parasols and loungers.
  { piece: 'barrels', s: 9, side: 'right', out: 2.2 },
  ...row('palm', 12, 132, 12, 'right', 6),
  ...row('lantern-lamp', 16, 140, 24, 'right', 1.3),
  ...row('lifebuoy-post', 28, 136, 24, 'right', 1.3),
  ...[22, 46, 70, 94, 118].flatMap((spotS) => [
    { piece: 'parasol', s: spotS, side: 'right', out: 3.4 },
    { piece: 'lounger', s: spotS, side: 'right', out: 6.9, turn: 10 },
  ]),
  { piece: 'surfboards', s: 130, side: 'right', out: 3.6 },
  // The promenade past the grandstand to the first corner: lamps, palms and planters.
  ...row('lantern-lamp', 106, 146, 10, 'left', 1.4),
  ...row('palm', 112, 142, 15, 'left', 8),
  ...row('planter', 120, 135, 15, 'left', 4.5),
  // The beach outside the first corner, and along the straight after it.
  ...[160, 174, 188, 202, 216].flatMap((spotS) => beachSpot(spotS, 'left', 11)),
  { piece: 'surfboards', s: 222, side: 'left', out: 5 },
  ...row('lifebuoy-post', 166, 226, 30, 'left', 1.3),
  ...[236, 250, 264, 276].flatMap((spotS) => beachSpot(spotS, 'left', 11)),
  // The garden up the climb: round trees with hedges and planters between them, lamps along the rail.
  ...row('round-tree', 358, 406, 12, 'left', 5.2),
  ...row('hedge', 358, 418, 12, 'left', 2.2),
  ...row('planter', 364, 412, 24, 'left', 6.4),
  ...row('triple-lamp', 352, 424, 24, 'left', 1.3),
  // The paddock beside the quiet straight in the sky.
  ...row('triple-lamp', 786, 834, 16, 'left', 1.5),
  { piece: 'sponsor-stand', s: 794, side: 'left', out: 3.5 },
  { piece: 'tyre-stack', s: 800, side: 'left', out: 1.4 },
  { piece: 'tyre-stack', s: 801.2, side: 'left', out: 2.4 },
  { piece: 'mktv-van', s: 812, side: 'left', out: 5, turn: 90 },
  { piece: 'sponsor-stand', s: 830, side: 'left', out: 3.5 },
  { piece: 'barrels', s: 842, side: 'left', out: 4 },
  ...row('hedge', 822, 834, 12, 'left', 6.4),
  // The beach outside the last straight, then a boardwalk round the last corner.
  ...[1090, 1104, 1118, 1132].flatMap((spotS) => beachSpot(spotS, 'left', 11)),
  { piece: 'surfboards', s: 1140, side: 'left', out: 5.5 },
  ...row('lifebuoy-post', 1090, 1140, 25, 'left', 1.3),
  ...row('palm', 1162, 1217, 11, 'left', 6.5),
  ...row('lantern-lamp', 1166, 1214, 24, 'left', 1.3),
  { piece: 'barrels', s: 1185, side: 'left', out: 3 },
]);
