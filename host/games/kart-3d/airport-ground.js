// Palm Bay Airport's ground plan (M9): where the airfield, the beach and the sea are, how high the ground stands
// at any point, which parts are paved, where the seawalls and beaches meet the water, the cutting and tunnel under
// the runway, and the ground's height beside the road (the embankments). Plain data and maths in world x, z (x
// east, z south, as palm-bay-airport.js draws it), unit tested in Node. Used by airport-scenery.js, which builds
// the ground from it with the kit (kit/terrain.js and its neighbours).
//
// The land: the airfield is a plateau at 0. In the south-west a lowland at the beach's level (-6) holds the beach
// road; the ground climbs from it to the plateau over a broad gentle slope, the one the S-bend climbs. The sea (at
// -8.2, scenery.js's, a little under the cutting's floor; its bed down to -10) lies west and south-west, with the
// bay the glide crosses between the runway's west end and the beach. Where the plateau meets the sea a seawall
// stands; where the lowland does, a beach slopes in.

// The ground's square grid: its corners and the size of a cell. Every paved area, seawall and hole lies on its
// lines, so their edges are straight.
export const GROUND = Object.freeze({ cell: 4, minX: -200, maxX: 680, minZ: -240, maxZ: 600 });
export const BEACH_LEVEL = -6;
export const SEA_BED = -10;
// The lowland: everything west of x 92 and south of z 136, and the slope round it this many units wide.
const LOWLAND = Object.freeze({ maxX: 92, minZ: 136, slope: 75 });
// Round the grid's edges the land sinks into the sea over this many units, so the airfield ends as an island.
const BORDER = 48;
// Off a beach the sea bed falls from the beach's level to SEA_BED over this many units.
const SHELF = 14;

// The bay the glide crosses, between the runway's end and the beach, open to the sea in the south.
export const BAY = Object.freeze({ fromX: 92, toX: 184, fromZ: 192, toZ: 272 });
// The sea, as rectangles { fromX, toX, fromZ, toZ }: the open sea west and south-west, and the bay.
export const SEA_RECTS = Object.freeze([
  { fromX: GROUND.minX, toX: -72, fromZ: GROUND.minZ, toZ: 136 },
  { fromX: GROUND.minX, toX: -40, fromZ: 136, toZ: GROUND.maxZ },
  { fromX: GROUND.minX, toX: 184, fromZ: 272, toZ: GROUND.maxZ },
  BAY,
]);
// Where the lowland's sand runs into the sea: [[x, z], [x, z]] lines along the sea's edge.
export const BEACH_EDGES = Object.freeze([
  [[-72, 136], [-40, 136]],
  [[-40, 136], [-40, 272]],
  [[-40, 272], [92, 272]],
  [[92, 272], [92, 192]],
]);
// Where the plateau meets the sea: { from, to, seaward } with seaward the way the sea lies ([x, z], unit).
export const SEAWALLS = Object.freeze([
  { from: [-72, GROUND.minZ], to: [-72, 136], seaward: [-1, 0] },
  { from: [92, 192], to: [184, 192], seaward: [0, 1] },
  { from: [184, 192], to: [184, GROUND.maxZ], seaward: [-1, 0] },
]);
// The paved ground, all flat at 0, as rectangles with a kind: the apron (pale concrete slabs) by the terminal and
// round the first corner, the taxiway's tarmac in front of its hangars and the link from it to the runway, the
// runway's own slab (30 wide, over the tunnel, on east past where the road turns onto it), and the hangar's floor
// under the banked ring.
export const PAVED = Object.freeze([
  { kind: 'apron', fromX: -64, toX: 272, fromZ: -140, toZ: 0 },
  { kind: 'apron', fromX: 100, toX: 272, fromZ: 0, toZ: 48 },
  { kind: 'tarmac', fromX: 204, toX: 300, fromZ: 48, toZ: 116 },
  { kind: 'tarmac', fromX: 248, toX: 272, fromZ: 116, toZ: 224 },
  { kind: 'runway', fromX: 184, toX: 560, fromZ: 224, toZ: 256 },
  { kind: 'hangar', fromX: 324, toX: 440, fromZ: 332, toZ: 424 },
]);
// The runway's middle line and ends, for its paint.
export const RUNWAY = Object.freeze({ fromX: 184, toX: 560, z: 240, halfWidth: 16 });

// Beside the road the ground eases from the road's edge to the land over this many units (an embankment where the
// road climbs or falls), at these distances out from the edge.
export const RIBBON_WIDTH = 12;
export const RIBBON_STEPS = Object.freeze([0, 1, 2.5, 4.5, 7, 9.5, 12]);
// The cutting under the runway: its stations (between these distances, wherever the road is below the land) have
// retaining walls this far out from the road's edge (behind the barriers' ledge), this thick, standing this far
// above the land on top.
const CUTTING_S = Object.freeze({ from: 440, to: 620 });
export const RETAINING_WALL = Object.freeze({ out: 0.97, thickness: 0.6, coping: 0.3 });
// The tunnel where the runway crosses the cutting: the runway's road and the ground beside it make its roof, so it
// runs as far as that ground reaches each side of the runway. Its ceiling hangs this high, and the headwalls over
// its portals a little lower.
export const TUNNEL = Object.freeze({ x: 345, z: RUNWAY.z, halfLength: 10 + RIBBON_WIDTH, ceiling: -1.5, lintel: -1.8 });
// The land is cut away over the cutting (the tunnel's roof is the runway's paving and the ribbons beside it).
export const CUTTING_HOLE = Object.freeze({ fromX: 336, toX: 356, fromZ: 160, toZ: 316 });

export function inRect(rect, x, z) {
  return x >= rect.fromX && x < rect.toX && z >= rect.fromZ && z < rect.toZ;
}

export function inSea(x, z) {
  return SEA_RECTS.some((rect) => inRect(rect, x, z));
}

// The paved kind at (x, z), or null.
export function pavedKindAt(x, z) {
  return PAVED.find((rect) => inRect(rect, x, z))?.kind ?? null;
}

// The land's height at (x, z), as if there were no sea: 0 on the plateau, BEACH_LEVEL in the lowland, eased
// between over the slope, sinking toward SEA_BED round the grid's edges.
export function landHeightAt(x, z) {
  const fromLowland = Math.hypot(Math.max(0, x - LOWLAND.maxX), Math.max(0, LOWLAND.minZ - z));
  const low = 1 - smoothstep(Math.min(fromLowland / LOWLAND.slope, 1));
  const toEdge = Math.min(x - GROUND.minX, GROUND.maxX - x, z - GROUND.minZ, GROUND.maxZ - z);
  const sunk = smoothstep(Math.max(0, 1 - toEdge / BORDER));
  return BEACH_LEVEL * low * (1 - sunk) + SEA_BED * sunk;
}

// The sea bed's height at (x, z): the beach's level at a beach's edge, falling to SEA_BED over SHELF units
// (straight down to it at a seawall).
export function seaBedAt(x, z) {
  return BEACH_LEVEL + (SEA_BED - BEACH_LEVEL) * smoothstep(Math.min(distanceToBeach(x, z) / SHELF, 1));
}

// How far (x, z) is from the nearest beach's edge.
export function distanceToBeach(x, z) {
  return Math.min(...BEACH_EDGES.map(([from, to]) => distanceToLine(x, z, from, to)));
}

export function groundHeightAt(x, z) {
  return inSea(x, z) ? seaBedAt(x, z) : landHeightAt(x, z);
}

// How sandy the land is at (x, z), 0 (grass) to 1 (sand), from its height: the lowland and the beaches are sand,
// the slope up from them turns to grass, along a wavy line so it reads as dunes rather than a contour.
export function sandinessAt(x, z, height) {
  const wave = 0.9 * Math.sin(x * 0.09) * Math.sin(z * 0.07 + 1);
  return Math.min(Math.max((-3.6 + wave - height) / 0.8, 0), 1);
}

// True where the station's road lies in the cutting, below the land.
export function inCutting(station) {
  return station.s >= CUTTING_S.from && station.s < CUTTING_S.to && station.point.y < landHeightAt(station.point.x, station.point.z) - 0.02;
}

// True where (x, z) lies under the tunnel's roof.
export function underTunnel(x, z) {
  return Math.abs(z - TUNNEL.z) < TUNNEL.halfLength && Math.abs(x - TUNNEL.x) < CUTTING_HOLE.toX - TUNNEL.x;
}

// Whether the ground beside the road has its ribbon (kit/terrain.js) along the segment from `station` to `next`:
// not over gaps or in the anti-gravity ring (the hangar's floor runs under it), not where either end is over the
// sea, and not along the cutting where it runs under the tunnel (the runway's own is the roof there).
export function hasRibbon(station, next) {
  const onLand = (point) => !inSea(point.x, point.z);
  const roofed = inCutting(station) && underTunnel(station.point.x, station.point.z) && underTunnel(next.point.x, next.point.z);
  return !station.gap && !station.antiGravity && onLand(station.point) && onLand(next.point) && !roofed;
}

// How far out beyond the road's edge (the road plus its grass) a station's ribbon starts: at the edge, or along
// the cutting at the retaining wall's face, whose top the ribbon covers (its coping stands on it).
export function ribbonStart(station) {
  return inCutting(station) ? RETAINING_WALL.out : 0;
}

// The point `out` beyond the road's edge on `side` (-1 left, 1 right) of `station`, level with the road's middle
// ({ x, y, z }; the road is not rolled where ribbons run, so its frame's right is level).
export function besideRoad(station, side, out) {
  const lateral = side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft) + out);
  return { x: station.point.x + station.right.x * lateral, y: station.point.y, z: station.point.z + station.right.z * lateral };
}

// The ribbon's height `out` beyond the road's edge: the road's own height at the edge (along the cutting, the
// land's, at the wall's top), easing to the ground's over RIBBON_WIDTH.
export function ribbonHeight(station, side, out) {
  const start = ribbonStart(station);
  const point = besideRoad(station, side, out);
  const ground = groundHeightAt(point.x, point.z);
  const edge = start > 0 ? groundHeightAt(besideRoad(station, side, start).x, besideRoad(station, side, start).z) : station.point.y;
  return edge + (ground - edge) * smoothstep(Math.min(Math.max((out - start) / RIBBON_WIDTH, 0), 1));
}

// The track's distance range where its road runs under the tunnel's roof: { fromS, toS }.
export function tunnelSpan(track) {
  const under = track.stations.filter((station) => inCutting(station) && underTunnel(station.point.x, station.point.z));
  return { fromS: under[0].s, toS: under.at(-1).s + under.at(-1).segmentLength };
}

// Distance from (x, z) to the line from `from` to `to` ([x, z] each).
function distanceToLine(x, z, from, to) {
  const [dx, dz] = [to[0] - from[0], to[1] - from[1]];
  const share = Math.min(Math.max(((x - from[0]) * dx + (z - from[1]) * dz) / (dx * dx + dz * dz), 0), 1);
  return Math.hypot(x - from[0] - dx * share, z - from[1] - dz * share);
}

export function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
