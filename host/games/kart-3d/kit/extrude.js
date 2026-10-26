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
// `endProfile` (as many points as `profile`) is the cross-section at the segment's second station, when it
// differs from the first's (a deck tapering).
export function extrudeSegment(builder, segment, side, profile, hex, uvOf = defaultUv, endProfile = profile) {
  const { station, next } = segment;
  const ends = [
    { at: station, s: station.s, points: profile },
    { at: next, s: station.s + station.segmentLength, points: endProfile },
  ];
  let around = 0;
  const faceLength = (points, index) => Math.hypot(points[index + 1][0] - points[index][0], points[index + 1][1] - points[index][1]);
  for (let index = 0; index + 1 < profile.length; index += 1) {
    // The face's direction from the end where it is wider: at a taper's tip it shrinks to nothing.
    const points = faceLength(endProfile, index) > faceLength(profile, index) ? endProfile : profile;
    const [fromOut, fromLift] = points[index];
    const [toOut, toLift] = points[index + 1];
    const length = faceLength(points, index);
    // The face's normal across the road, square to it in the profile: out of the shape.
    const normalOut = -(toLift - fromLift) / length;
    const normalLift = (toOut - fromOut) / length;
    const corner = ({ at, s, points }, point, distance) => {
      const [out, lift] = points[point];
      const lateral = side * (at.halfWidth + (side > 0 ? at.shoulderRight : at.shoulderLeft) + out);
      return {
        point: addScaled(addScaled(at.point, at.right, lateral), at.normal, lift),
        normal: addScaled(addScaled({ x: 0, y: 0, z: 0 }, at.right, side * normalOut), at.normal, normalLift),
        uv: uvOf(distance, s),
      };
    };
    const first = (end) => corner(end, index, around);
    const second = (end) => corner(end, index + 1, around + length);
    // Mirrored on the left, so the face's two edges swap to keep it facing out.
    const [from, to] = side > 0 ? [first, second] : [second, first];
    builder.quad([from(ends[0]), to(ends[0]), from(ends[1]), to(ends[1])], hex);
    around += length;
  }
}

// Closes a barrier's end at `station`: the cross-section `profile` (listed as for extrudeSegment, closed by the
// line from its last point back to its first, and every point in sight of its last: the walls' outer foot)
// filled as a flat face, in a fan from its last point, facing back along the road where the barrier starts
// (`facing` -1) or on where it ends (1). Each triangle of the fan is turned to face that way.
export function capProfile(builder, station, side, profile, hex, facing) {
  const normal = { x: station.tangent.x * facing, y: station.tangent.y * facing, z: station.tangent.z * facing };
  const lateral = (out) => side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft) + out);
  const corners = profile.map(([out, lift]) => ({ point: addScaled(addScaled(station.point, station.right, lateral(out)), station.normal, lift), normal, uv: [out / 8, lift / 8] }));
  const first = corners.at(-1);
  for (let index = 0; index + 2 < corners.length; index += 1) {
    const [second, third] = [corners[index], corners[index + 1]];
    const along = (a, b) => ({ x: b.point.x - a.point.x, y: b.point.y - a.point.y, z: b.point.z - a.point.z });
    const [u, v] = [along(first, second), along(first, third)];
    const faces = (u.y * v.z - u.z * v.y) * normal.x + (u.z * v.x - u.x * v.z) * normal.y + (u.x * v.y - u.y * v.x) * normal.z;
    // A quad with its last two corners the same is one triangle (the strip builder draws quads).
    const [b, c] = faces > 0 ? [second, third] : [third, second];
    builder.quad([first, b, c, c], hex);
  }
}
