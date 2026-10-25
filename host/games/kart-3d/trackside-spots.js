// Where the trackside dressing goes on a course (M7c), worked out from the track's stations: arrow boards on the
// wall round the outside of each corner, pointing the way it turns; flag poles on the walls along the
// straights; and the start gate over the start line. None in gaps, on anti-gravity sections or banked road, or
// where there is no wall to stand on. Plain maths, no Three.js, unit tested in Node. Used by
// host/games/kart-3d/trackside.js.

import { cross, dot } from './vector.js';

// A corner is where the road turns more than CORNER_DEGREES over the next CORNER_LOOK stations (a radius under
// about 70 units).
const CORNER_LOOK = 10;
const CORNER_DEGREES = 8;
const BOARD_SPACING = 8;
const POLE_SPACING = 24;
// No poles this close to the start line, where the gate stands.
const GATE_CLEARANCE = 15;
// Road leaning more than about 18 degrees (a bank, an anti-gravity wall) gets no boards or poles.
const LEVEL_NORMAL = 0.95;

// How far the road turns over the next CORNER_LOOK stations from station `index`, in radians: positive to the
// right, negative to the left.
export function turnAhead(track, index) {
  const here = track.stations[index];
  const ahead = track.stations[(index + CORNER_LOOK) % track.stations.length];
  // Turning right is clockwise seen from above the road: the tangents' cross product points down the normal.
  return -Math.atan2(dot(cross(here.tangent, ahead.tangent), here.normal), dot(here.tangent, ahead.tangent));
}

function isCorner(track, index) {
  return Math.abs(turnAhead(track, index)) > (CORNER_DEGREES * Math.PI) / 180;
}

// The station at the start line, as track-mesh.js draws it.
export function startGateIndex(track) {
  return track.stations.findIndex((station) => station.s + station.segmentLength > track.startLine);
}

// Arrow boards: [{ index, side, lateral, turnsRight }], side -1 (left) or 1 (right) of the road, lateral where
// its wall stands.
export function boardSpots(track) {
  const spots = [];
  for (let index = 0; index < track.stations.length; index += BOARD_SPACING) {
    if (!isCorner(track, index)) {
      continue;
    }
    const turnsRight = turnAhead(track, index) > 0;
    // On the outside of the corner, facing the karts coming into it.
    const side = turnsRight ? -1 : 1;
    if (standsOnWall(track.stations[index], side)) {
      spots.push({ index, side, lateral: wallLateral(track.stations[index], side), turnsRight });
    }
  }
  return spots;
}

// Flag poles: [{ index, side, lateral }] on both walls along the straights.
export function poleSpots(track) {
  const spots = [];
  for (let index = 0; index < track.stations.length; index += POLE_SPACING) {
    const station = track.stations[index];
    if (isCorner(track, index) || Math.abs(station.s - track.startLine) < GATE_CLEARANCE) {
      continue;
    }
    for (const side of [-1, 1]) {
      if (standsOnWall(station, side)) {
        spots.push({ index, side, lateral: wallLateral(station, side) });
      }
    }
  }
  return spots;
}

function standsOnWall(station, side) {
  const hasWall = side > 0 ? station.wallRight : station.wallLeft;
  return hasWall && !station.gap && !station.antiGravity && station.normal.y > LEVEL_NORMAL;
}

// The wall stands at the outer edge of the ground: the road plus that side's grass.
function wallLateral(station, side) {
  return side * (station.halfWidth + (side > 0 ? station.shoulderRight : station.shoulderLeft));
}
