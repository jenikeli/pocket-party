// Extrudes a barrier's cross-section along the road, one station segment at a time, at the outer edge of the
// ground on one side (the road plus that side's grass, where the kart rules' wall is): the way the kit's walls,
// rails, kerbs and decks follow the road through its bends, slopes and roll. Used by the kit's barriers and
// kit/platform.js.

import { addScaled } from '../vector.js';

// The texture coordinates a corner gets unless the caller says otherwise: across, the distance round the
// profile; along, the distance along the road; both in repeats of 8 units, like the road's.
const defaultUv = (around, s) => [around / 8, s / 8];

// Adds the profile between the segment's two stations to `builder` (a strip builder), in colour `hex`.
// `segment` is { station, next }; `side` -1 (left) or 1 (right). `profile` lists [outward, lift] points: how far
// out from the edge and how high above the road. It is an open line; to close a shape, repeat its first point
// at the end. Listed for the right side as a line with the shape on its right (for a wall: up its inner face,
// across its top, down its outer face), so its faces point out of the shape; the left side is mirrored.
// uvOf(around, s) gives a corner's texture coordinates from its distance round the profile and along the road.
export function extrudeSegment(builder, segment, side, profile, hex, uvOf = defaultUv) {
  const { station, next } = segment;
  // The segment's own grass at both ends, as the road draws it.
  const shoulder = side > 0 ? station.shoulderRight : station.shoulderLeft;
  const ends = [
    { at: station, s: station.s },
    { at: next, s: station.s + station.segmentLength },
  ];
  let around = 0;
  for (let index = 0; index + 1 < profile.length; index += 1) {
    const [fromOut, fromLift] = profile[index];
    const [toOut, toLift] = profile[index + 1];
    const length = Math.hypot(toOut - fromOut, toLift - fromLift);
    // The face's normal across the road, square to it in the profile: out of the shape.
    const normalOut = -(toLift - fromLift) / length;
    const normalLift = (toOut - fromOut) / length;
    const corner = ({ at, s }, out, lift, distance) => {
      const lateral = side * (at.halfWidth + shoulder + out);
      return {
        point: addScaled(addScaled(at.point, at.right, lateral), at.normal, lift),
        normal: addScaled(addScaled({ x: 0, y: 0, z: 0 }, at.right, side * normalOut), at.normal, normalLift),
        uv: uvOf(distance, s),
      };
    };
    const first = (end) => corner(end, fromOut, fromLift, around);
    const second = (end) => corner(end, toOut, toLift, around + length);
    // Mirrored on the left, so the face's two edges swap to keep it facing out.
    const [from, to] = side > 0 ? [first, second] : [second, first];
    builder.quad([from(ends[0]), to(ends[0]), from(ends[1]), to(ends[1])], hex);
    around += length;
  }
}
