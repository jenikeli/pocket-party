// The airfield's ground right beside the road (M9, Palm Bay Airport): a ribbon each side, from the road's edge
// out RIBBON_WIDTH units, its inner edge on the road's own edge (so the two meet with no gap and no step) and its
// height easing from the road's to the land's: flat where the road is at ground, an embankment where it climbs or
// falls. Where a ribbon stops above the ground (a ramp's lip, the glide ramp over the seawall) a concrete face
// closes it. Also the corridor: how low the road and its ribbons lie at any point, so the grid's land can be let
// down under them (kit/terrain.js). Used by kit/terrain.js.

import { createStripBuilder } from '../strip-builder.js';
import { hasRibbon, ribbonStart, ribbonHeight, besideRoad, groundHeightAt, sandinessAt, pavedKindAt, RIBBON_STEPS, RIBBON_WIDTH } from '../airport-ground.js';
import { landShade } from './terrain-maps.js';

// The corridor's stations are found through square buckets this many units across: more than a ribbon reaches.
const BUCKET = 40;
// A closing face is only needed where the ribbon stands this far above the ground.
const CAP_MINIMUM = 0.3;
const CAP_COLOR = 0xd8d4cc;

// Adds both sides' ribbons to `data` (kit/terrain.js's createMeshData). Returns a strip builder holding the
// closing faces.
export function buildRibbons(track, data) {
  const { stations } = track;
  const count = stations.length;
  const ribbonFrom = (index) => hasRibbon(stations[index], stations[(index + 1) % count]);
  const vertexAt = (index, side, step) => {
    const station = stations[index];
    const out = ribbonStart(station) + RIBBON_STEPS[step];
    const point = besideRoad(station, side, out);
    const y = ribbonHeight(station, side, out);
    const id = data.vertex(`${side},${index},${step}`, () => ({ x: point.x, y, z: point.z, color: landShade(y), sandy: sandinessAt(point.x, point.z, y) }));
    return { id, x: point.x, y, z: point.z };
  };
  for (const side of [-1, 1]) {
    for (let index = 0; index < count; index += 1) {
      if (!ribbonFrom(index)) {
        continue;
      }
      const here = RIBBON_STEPS.map((unused, step) => vertexAt(index, side, step));
      const next = RIBBON_STEPS.map((unused, step) => vertexAt((index + 1) % count, side, step));
      for (let step = 0; step + 1 < RIBBON_STEPS.length; step += 1) {
        const corners = [here[step], here[step + 1], next[step], next[step + 1]];
        if (!onPaving(corners)) {
          // Out to the right the corners run the other way round, so the face is flipped to face up.
          data.quad(...corners.map((corner) => corner.id), side > 0);
        }
      }
    }
  }
  const caps = createStripBuilder();
  stations.forEach((station, index) => {
    const before = ribbonFrom((index - 1 + count) % count);
    if (before !== ribbonFrom(index)) {
      addCap(caps, station, before ? 1 : -1);
    }
  });
  return caps;
}

// A ribbon's quad lying flat on paving is left out: the paving (kit/terrain.js) shows there instead.
function onPaving(corners) {
  const middle = corners.reduce((sum, corner) => ({ x: sum.x + corner.x / 4, z: sum.z + corner.z / 4 }), { x: 0, z: 0 });
  return pavedKindAt(middle.x, middle.z) !== null && corners.every((corner) => Math.abs(corner.y) < 0.05);
}

// The face down from the ribbons and the road at `station` to the ground under them, facing along the road
// (`facing` 1) or back (-1), where it stands high enough to need one.
function addCap(caps, station, facing) {
  const start = ribbonStart(station);
  const across = [];
  for (const side of [-1, 1]) {
    const steps = RIBBON_STEPS.map((step) => {
      const point = besideRoad(station, side, start + step);
      return { point, top: ribbonHeight(station, side, start + step) };
    });
    const edge = { point: besideRoad(station, side, 0), top: station.point.y };
    across.push(...(side < 0 ? [...steps.reverse(), edge] : [edge, ...steps]));
  }
  const withBottoms = across.map(({ point, top }) => ({ point, top, bottom: groundHeightAt(point.x, point.z) }));
  if (withBottoms.every(({ top, bottom }) => top - bottom < CAP_MINIMUM)) {
    return;
  }
  const normal = { x: station.tangent.x * facing, y: 0, z: station.tangent.z * facing };
  const corner = ({ point }, y, along) => ({ point: { x: point.x, y, z: point.z }, normal, uv: [along / 8, y / 8] });
  let along = 0;
  for (let index = 0; index + 1 < withBottoms.length; index += 1) {
    const [first, second] = [withBottoms[index], withBottoms[index + 1]];
    const width = Math.hypot(second.point.x - first.point.x, second.point.z - first.point.z);
    caps.quad([corner(first, first.top, along), corner(second, second.top, along + width), corner(first, first.bottom, along), corner(second, second.bottom, along + width)], CAP_COLOR);
    along += width;
  }
}

// How low the road and its ribbons lie round any point: { lowestAt(x, z) }, the lowest height of the road or a
// ribbon over (x, z), or null where neither reaches.
export function createCorridor(track) {
  const { stations } = track;
  const buckets = new Map();
  const keyOf = (x, z) => `${Math.floor(x / BUCKET)},${Math.floor(z / BUCKET)}`;
  stations.forEach((station, index) => {
    if (hasRibbon(station, stations[(index + 1) % stations.length])) {
      const key = keyOf(station.point.x, station.point.z);
      buckets.set(key, [...(buckets.get(key) ?? []), station]);
    }
  });
  function lowestAt(x, z) {
    let lowest = null;
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        for (const station of buckets.get(keyOf(x + dx * BUCKET, z + dz * BUCKET)) ?? []) {
          const height = heightOver(station, x, z);
          if (height !== null && (lowest === null || height < lowest)) {
            lowest = height;
          }
        }
      }
    }
    return lowest;
  }
  return { lowestAt };
}

// The height of the station's segment of road or ribbon over (x, z), or null if (x, z) is not beside or on it.
function heightOver(station, x, z) {
  const [offsetX, offsetZ] = [x - station.point.x, z - station.point.z];
  const along = offsetX * station.tangent.x + offsetZ * station.tangent.z;
  if (along < -0.5 || along > station.segmentLength + 0.5) {
    return null;
  }
  const lateral = offsetX * station.right.x + offsetZ * station.right.z;
  const side = lateral > 0 ? 1 : -1;
  const out = Math.abs(lateral) - station.halfWidth - (side > 0 ? station.shoulderRight : station.shoulderLeft);
  const start = ribbonStart(station);
  if (out > start + RIBBON_WIDTH) {
    return null;
  }
  return out < start ? station.point.y : ribbonHeight(station, side, out);
}
