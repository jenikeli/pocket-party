// The big hangar's plan (M9): how big it is and where it stands, worked out from the stations of the road it
// covers (Palm Bay Airport's anti-gravity ring), so it clears the road wherever the road goes. Plain maths on the
// track's stations, unit tested. Used by kit/hangar-big.js and test/unit/kart-3d-airport-hangars.test.js.
//
// The hangar's own frame: its doors face +x (the front, the side the road comes in and goes out by), the arch
// spans z, y is up from the floor. `spot` places it ({ x, y, z, heading }: rotation.y = heading, as the seaside's
// landmarks turn), so a point (x, y, z) of the hangar is at world toWorld(...) and back with toLocal(...).

// The columns stand this far out from the road's farthest edge, and the doors this far past the road's ends.
const SIDE_MARGIN = 7;
const END_MARGIN = 7;
// A kart and its wall reach this far off the road along the road's normal, and the roof's lowest steel (the
// ribs' inner chords) stays this much higher still.
const RIDE_HEIGHT = 3;
const HEAD_ROOM = 3;
// The ribs are this deep, and the arch rises this share of its span above the eaves.
export const RIB_DEPTH = 1.8;
const RISE_SHARE = 0.12;
// Ribs about this far apart along the hangar.
const BAY = 9;
// Road whose middle is this high over the floor or more stands on posts.
const RAISED = 2;
// The floor markings stay this far inside the ring's inner edge.
const INFIELD_INSET = 1.2;

// The stations of `track` from fromS to toS. Returns { spot, length, width, eave, rise, ribXs, infield,
// raisedStations, toLocal, toWorld, archY }:
//   length, width  the hangar's size along x and z; eave the height of the column tops; rise the arch's above it
//   ribXs          each rib's x, end to end
//   infield        the floor inside the ring, as [x, z] corners in the hangar's frame (the inner edge, then back)
//   raisedStations the stations whose road stands clear of the floor (the posts under it stand there)
//   archY(z)       the roof's height over z
export function planBigHangar(track, { fromS, toS }) {
  const stations = track.stations.filter((station) => station.s >= fromS && station.s <= toS);
  const front = frontDirection(stations);
  const heading = Math.atan2(-front.z, front.x);
  const [cos, sin] = [Math.cos(heading), Math.sin(heading)];
  const floorY = Math.min(stations[0].point.y, stations[stations.length - 1].point.y);
  const turnLocal = (x, z) => [x * cos - z * sin, x * sin + z * cos];
  const edges = stations.flatMap((station) => [-1, 1].map((side) => liftedEdge(station, side)));
  const flat = edges.map((point) => turnLocal(point.x, point.z));
  const [minX, maxX] = [Math.min(...flat.map(([x]) => x)), Math.max(...flat.map(([x]) => x))];
  const [minZ, maxZ] = [Math.min(...flat.map(([, z]) => z)), Math.max(...flat.map(([, z]) => z))];
  const [middleX, middleZ] = [(minX + maxX) / 2, (minZ + maxZ) / 2];
  // The middle back in world x, z: the inverse turn of (middleX, middleZ).
  const spot = { x: middleX * cos + middleZ * sin, y: floorY, z: -middleX * sin + middleZ * cos, heading };
  const length = maxX - minX + 2 * END_MARGIN;
  const width = maxZ - minZ + 2 * SIDE_MARGIN;
  const highest = Math.max(...edges.map((point) => point.y)) - floorY;
  const eave = highest + HEAD_ROOM + RIB_DEPTH;
  const rise = width * RISE_SHARE;

  const toLocal = ({ x, y, z }) => {
    const [localX, localZ] = turnLocal(x - spot.x, z - spot.z);
    return { x: localX, y: y - floorY, z: localZ };
  };
  const toWorld = ({ x, y, z }) => ({ x: x * cos + z * sin + spot.x, y: y + floorY, z: -x * sin + z * cos + spot.z });
  const bays = Math.max(1, Math.round(length / BAY));
  const ribXs = Array.from({ length: bays + 1 }, (unused, index) => -length / 2 + (index * length) / bays);
  const infield = infieldOutline(stations, toLocal);
  const raisedStations = stations.filter((station) => station.point.y - floorY > RAISED);
  return { spot, length, width, eave, rise, ribXs, infield, raisedStations, toLocal, toWorld, archY: archShape(width, eave, rise) };
}

// The roof's height over z (-width/2 to width/2): a circular arc through the eaves at both sides, `rise` higher
// in the middle.
export function archShape(width, eave, rise) {
  const half = width / 2;
  const radius = (half * half + rise * rise) / (2 * rise);
  return (z) => eave + Math.sqrt(Math.max(radius * radius - z * z, 0)) - (radius - rise);
}

// The way the doors face, flat: out along the road where it leaves the hangar and back along it where it comes in.
function frontDirection(stations) {
  const [first, last] = [stations[0].tangent, stations[stations.length - 1].tangent];
  const x = last.x - first.x;
  const z = last.z - first.z;
  const size = Math.hypot(x, z);
  return { x: x / size, z: z / size };
}

// The edge of the road on `side` (-1 left, 1 right), its shoulder included, lifted `lift` along the road's normal.
function liftedEdge(station, side, lift = RIDE_HEIGHT) {
  const lateral = side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft));
  const { point, right, normal } = station;
  return {
    x: point.x + right.x * lateral + normal.x * lift,
    y: point.y + right.y * lateral + normal.y * lift,
    z: point.z + right.z * lateral + normal.z * lift,
  };
}

// The floor inside the ring: its inner edge (the side nearer the ring's middle), INFIELD_INSET further in, in the
// hangar's frame. The outline closes back across the front, between the road's way in and way out.
function infieldOutline(stations, toLocal) {
  const middle = stations.reduce((sum, { point }) => ({ x: sum.x + point.x / stations.length, z: sum.z + point.z / stations.length }), { x: 0, z: 0 });
  const distanceFromMiddle = (side) =>
    stations.reduce((sum, station) => sum + Math.hypot(station.point.x + station.right.x * side - middle.x, station.point.z + station.right.z * side - middle.z), 0);
  const inner = distanceFromMiddle(-1) < distanceFromMiddle(1) ? -1 : 1;
  return stations.map((station) => {
    const lateral = inner * (station.halfWidth + (inner > 0 ? station.shoulderRight : station.shoulderLeft) + INFIELD_INSET);
    const { x, z } = toLocal({ x: station.point.x + station.right.x * lateral, y: 0, z: station.point.z + station.right.z * lateral });
    return [x, z];
  });
}
