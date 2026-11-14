// Extrudes a barrier's cross-section along the road, one station segment at a time, at the outer edge of the
// ground on one side (the road plus that side's grass, where the kart rules' wall is): the way the kit's walls,
// rails, kerbs and decks follow the road through its bends, slopes and roll. Since M7d4 a profile's corners can
// be rounded (roundProfile) and shaded smooth, as the reference game's never show a sharp edge. Used by the kit's barriers and
// kit/platform.js.

import { addScaled } from '../vector.js';

// The texture coordinates a corner gets unless the caller says otherwise: across, the distance round the
// profile; along, the distance along the road; both in repeats of 8 units, like the road's.
const defaultUv = (around, s) => [around / 8, s / 8];
// With `smooth`, two faces that meet at less than this angle share their normal where they meet, so the corner
// shades round; a sharper corner stays sharp.
const SMOOTH_DEGREES = 50;

// Adds the profile between the segment's two stations to `builder` (a strip builder), in colour `hex`.
// `segment` is { station, next }; `side` -1 (left) or 1 (right). `profile` lists [outward, lift] points: how far
// out from the edge and how high above the road. It is an open line; to close a shape, repeat its first point
// at the end. Listed for the right side as a line with the shape on its right (for a wall: up its inner face,
// across its top, down its outer face), so its faces point out of the shape; the left side is mirrored.
// `options`: uvOf(around, s) gives a corner's texture coordinates from its distance round the profile and along
// the road; endProfile (as many points as `profile`) is the cross-section at the segment's second station, when
// it differs from the first's (a deck tapering); smooth (M7d4) shades gently turning corners round; span
// (M7d4) is [from, to], the shares of the segment to cover (all of it if not given), for a seam, a band or a
// plate shorter than a segment.
export function extrudeSegment(builder, segment, side, profile, hex, options = {}) {
  const { uvOf = defaultUv, endProfile = profile, smooth = false, span = [0, 1] } = options;
  const [first, last] = span.map((share) => stationBetween(segment, share));
  const ends = [
    { at: first, s: first.s, points: profile, normals: pointNormals(profile, smooth) },
    { at: last, s: first.s + (span[1] - span[0]) * segment.station.segmentLength, points: endProfile, normals: pointNormals(endProfile, smooth) },
  ];
  let around = 0;
  for (let index = 0; index + 1 < profile.length; index += 1) {
    // The face's direction from the end where it is wider: at a taper's tip it shrinks to nothing.
    const points = faceLength(endProfile, index) > faceLength(profile, index) ? endProfile : profile;
    const length = faceLength(points, index);
    const faceNormal = normalOf(points, index);
    const corner = ({ at, s, points, normals }, point, distance) => {
      const [out, lift] = points[point];
      // The normal the face shares with a smooth neighbour at this corner, else its own.
      const [normalOut, normalLift] = normals[point] ?? faceNormal;
      const lateral = side * (at.halfWidth + (side > 0 ? at.shoulderRight : at.shoulderLeft) + out);
      return {
        point: addScaled(addScaled(at.point, at.right, lateral), at.normal, lift),
        normal: addScaled(addScaled({ x: 0, y: 0, z: 0 }, at.right, side * normalOut), at.normal, normalLift),
        uv: uvOf(distance, s),
      };
    };
    const start = (end) => corner(end, index, around);
    const finish = (end) => corner(end, index + 1, around + length);
    // Mirrored on the left, so the face's two edges swap to keep it facing out.
    const [from, to] = side > 0 ? [start, finish] : [finish, start];
    builder.quad([from(ends[0]), to(ends[0]), from(ends[1]), to(ends[1])], hex);
    around += length;
  }
}

// A station `share` of the way along `segment` ({ station, next }): its point, frame, widths and s in between
// (M7d4), for whatever stands between two stations (a seam, a bolt, a post). At 0 and 1 the stations
// themselves.
export function stationBetween({ station, next }, share) {
  if (share === 0) {
    return station;
  }
  const blend = (a, b) => ({ x: a.x + (b.x - a.x) * share, y: a.y + (b.y - a.y) * share, z: a.z + (b.z - a.z) * share });
  const number = (key) => station[key] + (next[key] - station[key]) * share;
  return {
    ...(share === 1 ? next : station),
    point: blend(station.point, next.point),
    right: blend(station.right, next.right),
    normal: blend(station.normal, next.normal),
    tangent: blend(station.tangent, next.tangent),
    halfWidth: number('halfWidth'),
    shoulderLeft: number('shoulderLeft'),
    shoulderRight: number('shoulderRight'),
    s: station.s + share * station.segmentLength,
  };
}

// `profile` pushed out of its shape by `distance` (M7d4): each point along the average of its faces' normals,
// for a band or a plate that sits on a barrier's surface.
export function offsetProfile(profile, distance) {
  const faces = profile.length - 1;
  return profile.map(([out, lift], point) => {
    const normals = [point - 1, point].filter((face) => face >= 0 && face < faces).map((face) => normalOf(profile, face));
    const sum = normals.reduce((total, normal) => [total[0] + normal[0], total[1] + normal[1]], [0, 0]);
    const length = Math.hypot(sum[0], sum[1]) || 1;
    return [out + (sum[0] / length) * distance, lift + (sum[1] / length) * distance];
  });
}

// How far it is round `profile` from its first point to point `upTo` (its last unless given), the distance
// uvOf's `around` counts.
export function profileLength(profile, upTo = profile.length - 1) {
  let length = 0;
  for (let index = 0; index < upTo; index += 1) {
    length += faceLength(profile, index);
  }
  return length;
}

function faceLength(points, index) {
  return Math.hypot(points[index + 1][0] - points[index][0], points[index + 1][1] - points[index][1]);
}

// The normal of the face from point `index` to the next, square to it in the profile: out of the shape.
function normalOf(points, index) {
  const length = faceLength(points, index) || 1;
  return [-(points[index + 1][1] - points[index][1]) / length, (points[index + 1][0] - points[index][0]) / length];
}

// For a smooth profile, the normal both faces share at each point where they turn gently, or null where each
// keeps its own (an end, a sharp corner). A closed profile (its last point on its first) wraps round.
function pointNormals(points, smooth) {
  if (!smooth) {
    return [];
  }
  const faces = points.length - 1;
  const closed = Math.hypot(points[0][0] - points[faces][0], points[0][1] - points[faces][1]) < 1e-6;
  return points.map((_, point) => {
    const before = point > 0 ? point - 1 : closed ? faces - 1 : null;
    const after = point < faces ? point : closed ? 0 : null;
    if (before === null || after === null) {
      return null;
    }
    const [a, b] = [normalOf(points, before), normalOf(points, after)];
    if (a[0] * b[0] + a[1] * b[1] < Math.cos((SMOOTH_DEGREES * Math.PI) / 180)) {
      return null;
    }
    const length = Math.hypot(a[0] + b[0], a[1] + b[1]);
    return [(a[0] + b[0]) / length, (a[1] + b[1]) / length];
  });
}

// A tube's cross-section round (out, lift) (M7d4; the striped rail's since M7d2): a closed ring of `sides`
// points, `radius` across and `radiusLift` (the same unless given) up and down, listed so its faces point out
// of it. Extruded with `smooth`, it shades round.
export function tubeProfile(out, lift, radius, sides = 8, radiusLift = radius) {
  return Array.from({ length: sides + 1 }, (_, index) => {
    const angle = Math.PI - (index * 2 * Math.PI) / sides;
    return [out + Math.cos(angle) * radius, lift + Math.sin(angle) * radiusLift];
  });
}

// `profile` with each corner rounded off by about `radius` (M7d4), in `steps` short faces: so an extruded edge
// catches a line of light instead of meeting its neighbour at a sharp crease. An open profile keeps its two
// end points; a closed one (its last point on its first) has its first corner rounded too and stays closed.
// A corner never eats more than 45% of either face beside it.
export function roundProfile(profile, radius, steps = 3) {
  const last = profile.length - 1;
  const closed = Math.hypot(profile[0][0] - profile[last][0], profile[0][1] - profile[last][1]) < 1e-6;
  const points = closed ? profile.slice(0, -1) : profile;
  const rounded = points.flatMap((point, index) => {
    if (!closed && (index === 0 || index === points.length - 1)) {
      return [point];
    }
    const before = points[(index - 1 + points.length) % points.length];
    const after = points[(index + 1) % points.length];
    return roundCorner(before, point, after, radius, steps);
  });
  return closed ? [...rounded, rounded[0]] : rounded;
}

// The corner at `point`, between the faces from `before` and to `after`, as `steps` + 1 points on a curve from
// a little along the first face to a little along the second.
function roundCorner(before, point, after, radius, steps) {
  const toward = (target) => {
    const length = Math.hypot(target[0] - point[0], target[1] - point[1]);
    return { length, direction: [(target[0] - point[0]) / length, (target[1] - point[1]) / length] };
  };
  const [back, on] = [toward(before), toward(after)];
  const cosine = back.direction[0] * on.direction[0] + back.direction[1] * on.direction[1];
  const halfAngle = Math.acos(Math.max(-1, Math.min(1, cosine))) / 2;
  if (halfAngle > Math.PI / 2 - 0.01) {
    return [point];
  }
  const cut = Math.min(radius / Math.tan(halfAngle), 0.45 * back.length, 0.45 * on.length);
  const start = [point[0] + back.direction[0] * cut, point[1] + back.direction[1] * cut];
  const end = [point[0] + on.direction[0] * cut, point[1] + on.direction[1] * cut];
  // A quadratic curve with the corner as its control point: tangent to both faces where it leaves them.
  return Array.from({ length: steps + 1 }, (_, step) => {
    const share = step / steps;
    const [a, b, c] = [(1 - share) ** 2, 2 * (1 - share) * share, share ** 2];
    return [a * start[0] + b * point[0] + c * end[0], a * start[1] + b * point[1] + c * end[1]];
  });
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
