// Palm Bay Airport's props beside the road (M9): the apron's ground vehicles round the parked planes, floodlight
// masts with banners, windsocks, taxiway signs at the junctions and edge lights along the airfield's roads, and on
// the beach road palms, parasols and loungers. Each spot is { piece (a name in PROP_REACH), s, side, out (from the
// edge of the ground), turn (degrees from facing the road; 90 lies a vehicle along the road) }, as kit/props.js
// places them; they stand on the ground beside the road, which is level with it there (airport-ground.js).
// Distances along the lap (s) are the track's own. Plain data, unit tested in Node. Drawn by
// host/games/kart-3d/airport-scenery.js.

const row = (piece, fromS, toS, spacing, side, out) => Array.from({ length: Math.floor((toS - fromS) / spacing) + 1 }, (_, index) => ({ piece, s: fromS + index * spacing, side, out }));
// Edge lights along a stretch, leaving out any within 4 of the distances in `except` (where something else stands
// at the edge).
const lights = (fromS, toS, spacing, side, except = []) => row('runway-light', fromS, toS, spacing, side, 1.6).filter((spot) => except.every((s) => Math.abs(spot.s - s) > 4));
// The vehicles serving a plane parked at the terminal, its middle at `s` (its nose toward +s): a container dolly
// behind its wing, a belt loader at its hold and stairs at its front door, each lying along the road, with cones.
const atGate = (s) => [
  { piece: 'uld-dolly', s: s - 17, side: 'left', out: 5, turn: 90 },
  { piece: 'belt-loader', s: s - 6, side: 'left', out: 5, turn: 90 },
  { piece: 'stair-truck', s: s + 12, side: 'left', out: 5, turn: 90 },
  { piece: 'cone', s: s + 7, side: 'left', out: 1.5 },
  { piece: 'cone', s: s + 17, side: 'left', out: 1.5 },
];
// A spot on the beach: a palm at the back, a parasol nearer the road with a lounger beside it, turned to the sun.
const beachSpot = (s, side, back) => [
  { piece: 'palm', s, side, out: back, turn: s * 37 },
  { piece: 'parasol', s: s + 4, side, out: back - 6 },
  { piece: 'lounger', s: s + 4, side, out: back - 3, turn: 15 },
];

export const PROPS = Object.freeze([
  // The start straight. On the left, the apron in front of the terminal: its planes (at s 8.5, 56.5 and 104.5)
  // served by their vehicles (the first plane's dolly would stand back round the last corner), floodlight masts
  // between them.
  ...[8.5, 56.5, 104.5].flatMap(atGate).filter((spot) => spot.s > 0),
  ...row('airport-floodlight', 32, 128, 48, 'left', 6),
  // On the right, the grid's side: floodlight masts, a windsock, a sign, a fuel truck and the follow-me car by the
  // control tower, edge lights between.
  ...row('airport-floodlight', 20, 120, 50, 'right', 6),
  { piece: 'windsock', s: 95, side: 'right', out: 6 },
  { piece: 'taxiway-sign', s: 52, side: 'right', out: 4.5 },
  { piece: 'fuel-truck', s: 108, side: 'right', out: 6, turn: 90 },
  { piece: 'follow-me-car', s: 136, side: 'right', out: 4, turn: 90 },
  ...lights(8, 148, 10, 'right', [52]),
  // The first corner: the apron outside it (past its turn boards), edge lights inside.
  { piece: 'baggage-train', s: 166, side: 'left', out: 9, turn: 90 },
  { piece: 'airport-floodlight', s: 182, side: 'left', out: 9 },
  { piece: 'uld-dolly', s: 196, side: 'left', out: 8, turn: 90 },
  { piece: 'taxiway-sign', s: 210, side: 'left', out: 6 },
  { piece: 'fuel-truck', s: 222, side: 'left', out: 8, turn: 90 },
  ...lights(155, 225, 10, 'right'),
  // Down to the taxiway: its edge lights on both sides, the follow-me car on the tarmac.
  { piece: 'follow-me-car', s: 242, side: 'left', out: 4, turn: 90 },
  ...lights(234, 248, 10, 'right'),
  ...lights(322, 446, 11, 'right', [326, 358, 375]),
  ...lights(250, 290, 10, 'left'),
  // The taxiway: in front of its hangars, the hangars' carts and trucks; on the right, signs either side of the
  // link down to the runway and a windsock.
  { piece: 'baggage-train', s: 300, side: 'left', out: 7, turn: 90 },
  { piece: 'uld-dolly', s: 335, side: 'left', out: 6, turn: 90 },
  { piece: 'baggage-train', s: 352, side: 'left', out: 9, turn: 90 },
  { piece: 'follow-me-car', s: 362, side: 'left', out: 3.5, turn: 90 },
  { piece: 'fuel-truck', s: 372, side: 'left', out: 6, turn: 90 },
  ...row('cone', 324, 344, 10, 'left', 1.5),
  { piece: 'taxiway-sign', s: 326, side: 'right', out: 4.5 },
  { piece: 'taxiway-sign', s: 358, side: 'right', out: 4.5 },
  { piece: 'windsock', s: 375, side: 'right', out: 8 },
  // The turn toward the runway: a floodlight outside it.
  { piece: 'airport-floodlight', s: 420, side: 'left', out: 9 },
  // Out of the hangar toward the runway: a windsock, a floodlight and a fuel truck on the right, a baggage train
  // and the runway's hold sign on the left, edge lights along both.
  { piece: 'windsock', s: 800, side: 'right', out: 7 },
  { piece: 'fuel-truck', s: 815, side: 'right', out: 6, turn: 90 },
  { piece: 'airport-floodlight', s: 832, side: 'right', out: 7 },
  { piece: 'baggage-train', s: 805, side: 'left', out: 7, turn: 90 },
  { piece: 'taxiway-sign', s: 842, side: 'left', out: 4.5 },
  ...lights(786, 852, 11, 'left', [842]),
  ...lights(786, 852, 11, 'right'),
  // Round onto the runway and down it: edge lights all along (low, so the plane taking off clears them), signs at
  // the link from the taxiway, a windsock past the tunnel.
  ...lights(860, 920, 10, 'left'),
  ...lights(924, 1100, 12, 'left'),
  ...lights(924, 1100, 12, 'right', [1024, 1056]),
  { piece: 'taxiway-sign', s: 1024, side: 'right', out: 4.5 },
  { piece: 'taxiway-sign', s: 1056, side: 'right', out: 4.5 },
  { piece: 'windsock', s: 990, side: 'left', out: 10 },
  // Off the runway's right, a floodlight on the grass and a train and the follow-me car on the link.
  { piece: 'airport-floodlight', s: 1005, side: 'right', out: 28 },
  { piece: 'baggage-train', s: 1040, side: 'right', out: 18 },
  { piece: 'follow-me-car', s: 1034, side: 'right', out: 8 },
  // The beach road: palms, parasols and loungers either side, round the turn and along the straight after it.
  ...[1216, 1232].flatMap((s) => beachSpot(s, 'left', 13)),
  ...[1220, 1238].flatMap((s) => beachSpot(s, 'right', 11)),
  ...[1262, 1280, 1298, 1316].flatMap((s) => beachSpot(s, 'left', 13)),
  ...row('palm', 1262, 1322, 15, 'right', 3),
  ...[1344, 1362].flatMap((s) => beachSpot(s, 'left', 12)),
  ...row('palm', 1342, 1378, 12, 'right', 4),
  // The S-bend climbing back up: palms on the dunes.
  ...row('palm', 1392, 1460, 17, 'left', 2.5),
  ...row('palm', 1412, 1454, 14, 'right', 2.5),
  // The last corner, back on the apron: a floodlight and a windsock outside it, edge lights inside.
  { piece: 'airport-floodlight', s: 1480, side: 'left', out: 8 },
  { piece: 'windsock', s: 1515, side: 'left', out: 9 },
  ...lights(1478, 1548, 10, 'right'),
]);
