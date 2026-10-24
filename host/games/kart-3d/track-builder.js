// Builds the 3D race's track from a list of pieces (straights and turns, each with its height, roll, walls and
// so on) into "stations": points on the centre line about one unit apart, each with its road frame. Every
// question about the road (track.js) and the road's mesh (track-mesh.js) is answered from the stations.
// Plain maths, no Three.js or DOM, unit tested in Node. Used by host/games/kart-3d/index.js.

import { vec, subtract, normalize, cross, rotate, length } from './vector.js';

// Roughly how far apart stations are. Small enough that the straight segments between them follow the curves
// closely (a 20-unit radius turns about 3 degrees per station).
const STATION_SPACING = 1;
const UP = vec(0, 1, 0);
// The loop must end where it starts; a bigger miss is a mistake in the track's pieces.
const CLOSING_TOLERANCE = 0.01;

// `definition` is { halfWidth, startLine, pieces }. The track starts at the origin heading along +x, at
// height 0 with no roll. Each piece is a straight ({ straight: length }) or a turn ({ turn: degrees, radius },
// + turns right, - left), and may also have:
//   height    the height at its end; it changes smoothly (flat at both ends) from the previous piece's
//   linear    true: the height changes at a steady slope instead (a ramp, whose lip must still slope)
//   roll      the roll at its end in degrees (+ lowers the right edge, banking into a right turn), smoothly
//   shoulder  width of off-road ground beyond each road edge (0 if not given)
//   walls     'both' (the default), 'left', 'right' or 'none': which outer edges have a wall
//   gap       true: no road at all (a jump)
//   antiGravity true: gravity pulls karts toward the road, so they can drive up walls
// Returns the track: { stations, length, halfWidth, startLine }. Station i describes the road from itself to
// station i + 1 (the last one joins the first): { point, tangent, right, normal, s, segmentLength, shoulder,
// wallLeft, wallRight, gap, antiGravity }, where s is the distance along the centre line from the start.
export function buildTrack(definition) {
  const samples = samplePieces(definition.pieces);
  const stations = samples.map((sample, index) => {
    const before = samples[(index - 1 + samples.length) % samples.length].point;
    const after = samples[(index + 1) % samples.length].point;
    // The tangent at a station is the average of the segments on either side of it, so the cross-sections
    // that track.js uses to find a kart sit square to the road.
    const tangent = normalize(subtract(after, before));
    // Right of the direction of travel with +y up is forward x up; the roll then turns it about the tangent.
    const right = rotate(normalize(cross(tangent, UP)), tangent, sample.roll);
    return { ...sample.flags, point: sample.point, tangent, right, normal: cross(right, tangent) };
  });
  let s = 0;
  stations.forEach((station, index) => {
    station.s = s;
    station.segmentLength = length(subtract(stations[(index + 1) % stations.length].point, station.point));
    s += station.segmentLength;
  });
  return { stations, length: s, halfWidth: definition.halfWidth, startLine: definition.startLine };
}

// One sample per station: { point, roll (radians), flags }, walking the pieces from the origin.
function samplePieces(pieces) {
  const samples = [];
  let x = 0;
  let z = 0;
  let heading = 0; // radians in the ground plane: 0 is +x, and turning right (toward +z) adds
  let height = 0;
  let roll = 0;
  for (const piece of pieces) {
    const turn = ((piece.turn ?? 0) * Math.PI) / 180;
    const pieceLength = piece.turn === undefined ? piece.straight : Math.abs(turn) * piece.radius;
    const endHeight = piece.height ?? height;
    const endRoll = piece.roll === undefined ? roll : (piece.roll * Math.PI) / 180;
    const count = Math.max(1, Math.round(pieceLength / STATION_SPACING));
    const flags = pieceFlags(piece);
    for (let index = 0; index < count; index += 1) {
      const share = index / count;
      const ease = piece.linear ? share : smoothstep(share);
      const at = planPoint(x, z, heading, turn, pieceLength, share);
      samples.push({
        point: vec(at.x, height + (endHeight - height) * ease, at.z),
        roll: roll + (endRoll - roll) * smoothstep(share),
        flags,
      });
    }
    const end = planPoint(x, z, heading, turn, pieceLength, 1);
    ({ x, z } = end);
    heading += turn;
    height = endHeight;
    roll = endRoll;
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

function pieceFlags(piece) {
  const walls = piece.walls ?? 'both';
  return {
    shoulder: piece.shoulder ?? 0,
    wallLeft: !piece.gap && (walls === 'both' || walls === 'left'),
    wallRight: !piece.gap && (walls === 'both' || walls === 'right'),
    gap: piece.gap === true,
    antiGravity: piece.antiGravity === true,
  };
}

// 0..1 -> 0..1, flat at both ends, so heights and rolls change without a kink where pieces meet.
function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
