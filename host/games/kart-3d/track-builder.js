// Builds the 3D race's track from a list of pieces (straights and turns, each with its height, roll, walls and
// so on) into "stations": points on the centre line about one unit apart, each with its road frame. Every
// question about the road (track.js) and the road's mesh (kit/road.js) is answered from the stations.
// Plain maths, no Three.js or DOM, unit tested in Node. Used by host/games/kart-3d/index.js.

import { vec, subtract, normalize, cross, rotate, length } from './vector.js';

// Roughly how far apart stations are. Small enough that the straight segments between them follow the curves
// closely (a 20-unit radius turns about 3 degrees per station).
const STATION_SPACING = 1;
const UP = vec(0, 1, 0);
// The loop must end where it starts; a bigger miss is a mistake in the track's pieces.
const CLOSING_TOLERANCE = 0.01;
// A change in a shoulder's width eases over this many units (or the whole piece, if shorter): at most 10 units
// across (Seaside Skyway's last corner), a gentle S for a kart at speed.
const SHOULDER_EASE = 16;

// `definition` is { halfWidth, startLine, pieces, dashPanels, spinPosts, itemBoxRows, scenery }. The track starts at the
// origin heading along +x, at height 0 with no roll, its road halfWidth either side of the centre line. Each
// piece is a straight ({ straight: length }) or a turn ({ turn: degrees, radius }, + turns right, - left), and
// may also have:
//   height    the height at its end; it changes smoothly (flat at both ends) from the previous piece's
//   linear    true: the height changes at a steady slope instead (a ramp, whose lip must still slope)
//   roll      the roll at its end in degrees (+ lowers the right edge, banking into a right turn), smoothly
//   halfWidth the road's half width at its end, changing smoothly like the height
//   shoulderLeft, shoulderRight  width of off-road ground beyond that road edge (0 if not given); where it
//             changes from the previous piece's, it eases over this piece's first SHOULDER_EASE units in an S
//             curve, so the ground's edge and its wall never step sideways
//   walls     'both' (the default), 'left', 'right' or 'none': which outer edges have a wall
//   gap       true: no road at all (a jump)
//   glide     true (only with gap): the gap is crossed in the air with the glider open (M9, kart-glide.js)
//   antiGravity true: gravity pulls karts toward the road, so they can drive up walls
// dashPanels (optional) lists { s, lateral }: where each dash panel's centre is (kart-boosts.js has their size).
// spinPosts (optional) lists { s, lateral }: where each spin-boost post stands on the road (spin-posts.js).
// itemBoxRows (optional) lists distances along the lap where a row of item boxes stands across the road
// (items/item-boxes.js spreads each row's boxes).
// scenery names the course's look (scenery.js): its road and the dressing round it. Every course in courses.js
// has one; a track built without one (as the rules' unit tests do) can be driven but not drawn.
// Returns the track: { stations, length, startLine, dashPanels, spinPosts, itemBoxRows, scenery }. Station i describes the
// road from itself to station i + 1 (the last one joins the first): { point, tangent, right, normal, s,
// segmentLength, halfWidth, shoulderLeft, shoulderRight, wallLeft, wallRight, gap, glide, antiGravity }, where s is the
// distance along the centre line from the start.
export function buildTrack(definition) {
  const samples = samplePieces(definition.pieces, definition.halfWidth);
  const stations = samples.map((sample, index) => {
    const before = samples[(index - 1 + samples.length) % samples.length].point;
    const after = samples[(index + 1) % samples.length].point;
    // The tangent at a station is the average of the segments on either side of it, so the cross-sections
    // that track.js uses to find a kart sit square to the road.
    const tangent = normalize(subtract(after, before));
    // Right of the direction of travel with +y up is forward x up; the roll then turns it about the tangent.
    const right = rotate(normalize(cross(tangent, UP)), tangent, sample.roll);
    const { point, halfWidth, shoulderLeft, shoulderRight } = sample;
    return { ...sample.flags, point, halfWidth, shoulderLeft, shoulderRight, tangent, right, normal: cross(right, tangent) };
  });
  let s = 0;
  stations.forEach((station, index) => {
    station.s = s;
    station.segmentLength = length(subtract(stations[(index + 1) % stations.length].point, station.point));
    s += station.segmentLength;
  });
  return {
    stations,
    length: s,
    startLine: definition.startLine,
    dashPanels: definition.dashPanels ?? [],
    spinPosts: definition.spinPosts ?? [],
    itemBoxRows: definition.itemBoxRows ?? [],
    scenery: definition.scenery ?? null,
  };
}

// One sample per station: { point, roll (radians), halfWidth, shoulderLeft, shoulderRight, flags }, walking the
// pieces from the origin.
function samplePieces(pieces, startHalfWidth) {
  const samples = [];
  let x = 0;
  let z = 0;
  let heading = 0; // radians in the ground plane: 0 is +x, and turning right (toward +z) adds
  let height = 0;
  let roll = 0;
  let halfWidth = startHalfWidth;
  // The loop closes, so the first piece eases from the last piece's shoulders.
  let shoulders = shouldersOf(pieces.at(-1));
  for (const piece of pieces) {
    const turn = ((piece.turn ?? 0) * Math.PI) / 180;
    const pieceLength = piece.turn === undefined ? piece.straight : Math.abs(turn) * piece.radius;
    const endHeight = piece.height ?? height;
    const endRoll = piece.roll === undefined ? roll : (piece.roll * Math.PI) / 180;
    const endHalfWidth = piece.halfWidth ?? halfWidth;
    const count = Math.max(1, Math.round(pieceLength / STATION_SPACING));
    const flags = pieceFlags(piece);
    const endShoulders = shouldersOf(piece);
    const shoulderEase = Math.min(SHOULDER_EASE, pieceLength);
    for (let index = 0; index < count; index += 1) {
      const share = index / count;
      const ease = piece.linear ? share : smoothstep(share);
      const at = planPoint(x, z, heading, turn, pieceLength, share);
      samples.push({
        point: vec(at.x, height + (endHeight - height) * ease, at.z),
        roll: roll + (endRoll - roll) * smoothstep(share),
        halfWidth: halfWidth + (endHalfWidth - halfWidth) * smoothstep(share),
        ...easedShoulders(shoulders, endShoulders, smoothstep(Math.min(1, (share * pieceLength) / shoulderEase))),
        flags,
      });
    }
    const end = planPoint(x, z, heading, turn, pieceLength, 1);
    ({ x, z } = end);
    heading += turn;
    height = endHeight;
    roll = endRoll;
    halfWidth = endHalfWidth;
    shoulders = endShoulders;
  }
  if (Math.hypot(x, z, height) > CLOSING_TOLERANCE) {
    throw new Error(`The track's pieces end at (${x.toFixed(2)}, ${height.toFixed(2)}, ${z.toFixed(2)}), not back at the start`);
  }
  return samples;
}

// Where a piece starting at (x, z) with `heading` is, a `share` (0..1) of the way along it, seen from above.
// A turn is an arc: its centre is `radius` to the right (or left) of the start.
function planPoint(x, z, heading, turn, pieceLength, share) {
  if (turn === 0) {
    return { x: x + Math.cos(heading) * pieceLength * share, z: z + Math.sin(heading) * pieceLength * share };
  }
  const radius = pieceLength / Math.abs(turn);
  const side = Math.sign(turn);
  const centreX = x - Math.sin(heading) * radius * side;
  const centreZ = z + Math.cos(heading) * radius * side;
  const angle = heading + turn * share;
  return { x: centreX + Math.sin(angle) * radius * side, z: centreZ - Math.cos(angle) * radius * side };
}

function shouldersOf(piece) {
  return { shoulderLeft: piece.shoulderLeft ?? 0, shoulderRight: piece.shoulderRight ?? 0 };
}

// `ease` (0..1) of the way from shoulders `from` to `to`.
function easedShoulders(from, to, ease) {
  return {
    shoulderLeft: from.shoulderLeft + (to.shoulderLeft - from.shoulderLeft) * ease,
    shoulderRight: from.shoulderRight + (to.shoulderRight - from.shoulderRight) * ease,
  };
}

function pieceFlags(piece) {
  const walls = piece.walls ?? 'both';
  return {
    wallLeft: !piece.gap && (walls === 'both' || walls === 'left'),
    wallRight: !piece.gap && (walls === 'both' || walls === 'right'),
    gap: piece.gap === true,
    glide: piece.gap === true && piece.glide === true,
    antiGravity: piece.antiGravity === true,
  };
}

// 0..1 -> 0..1, flat at both ends, so heights and rolls change without a kink where pieces meet.
function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
