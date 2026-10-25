// Lays a rectangle flat on the road (a painted mark, a panel, a plate), given in road coordinates as
// kit/road-marks.js gives them: { fromS, toS, fromLateral, toLateral }. It is cut where it crosses a station, so
// it follows the road's slope, bends and roll exactly as the road's own mesh does. Used by kit/road-paint.js,
// kit/led-panels.js and kit/ramp-plate.js.

import { pointAt, wrapDistance, stationIndexAt } from '../track.js';
import { addScaled } from '../vector.js';
import { worldUv } from '../strip-builder.js';

// Adds `rect` to `builder` (a strip builder), `lift` above the road along its normal, in colour `hex`.
// uvOf(s, lateral) gives each corner's texture coordinates; by default the texture is laid over the world like
// the road's (worldUv). Returns nothing.
export function addRoadRect(builder, track, rect, lift, hex, uvOf = (s, lateral) => worldUv(s, lateral, 0)) {
  let s = rect.fromS;
  while (s < rect.toS - 1e-6) {
    const next = Math.min(s + toSegmentEnd(track, s), rect.toS);
    // Both ends of a piece lie on one segment of the road, which is flat, so the piece takes that segment's
    // normal (worked out in its middle) at all four corners.
    const { normal } = pointAt(track, (s + next) / 2);
    const corners = [
      [s, rect.fromLateral],
      [s, rect.toLateral],
      [next, rect.fromLateral],
      [next, rect.toLateral],
    ].map(([cornerS, lateral]) => ({
      point: addScaled(pointAt(track, cornerS, lateral).position, normal, lift),
      normal,
      uv: uvOf(cornerS, lateral),
    }));
    builder.quad(corners, hex);
    s = next;
  }
}

// How far from distance `s` to the end of the station segment it is on (at least a little, so a point that
// lies on a station's cross-section moves on).
function toSegmentEnd(track, s) {
  const wrapped = wrapDistance(track, s);
  const station = track.stations[stationIndexAt(track, wrapped)];
  return Math.max(station.s + station.segmentLength - wrapped, 1e-3);
}

// Texture coordinates that stretch a texture once over `rect`: 0 to 1 across it (left to right) and along it.
export function stretchedOver(rect) {
  return (s, lateral) => [(lateral - rect.fromLateral) / (rect.toLateral - rect.fromLateral), (s - rect.fromS) / (rect.toS - rect.fromS)];
}
