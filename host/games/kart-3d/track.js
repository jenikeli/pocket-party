// Questions about the 3D race's road, answered from the stations that track-builder.js made: where a point is
// on the road, the road's surface and normal there, its edges, walls and gaps, lap progress, how much the road
// turns ahead and where the start line is. Plain maths, unit tested in Node. Used by the kart rules, the CPU
// driver, the renderer and the kit (kit/).
//
// Finding a kart walks from the station it was at last step, never searching the whole track: a bridge over
// another part of the road, or the far side of a hairpin, may be closer in a straight line, but it is not
// where the kart is.

import { lerp, subtract, normalize, flatten, cross, dot, addScaled } from './vector.js';

// A kart moves well under a unit per step, so a walk of more than a few stations only happens after it was
// moved (respawned) without its station; this just keeps a lost kart from walking forever.
const MAX_WALK = 64;
// turnAhead looks this many stations ahead.
const TURN_LOOK = 10;

export const SURFACES = Object.freeze({ ROAD: 'road', OFF_ROAD: 'offRoad' });

// Where `position` is on the road, starting the walk at station `fromIndex` (the kart's station last step).
// Returns the contact: { index, s, lateral, height, centre, forward, right, normal, halfWidth, station }. The
// point is between the cross-sections of stations index and index + 1; s is the distance along the centre line,
// lateral how far right of it (negative is left) across the road, height how far above the road's surface along
// its normal (negative is below). forward, right and normal are the road's frame there (unit vectors), halfWidth
// the road's half width there, shoulderLeft and shoulderRight its grass there, and station the station whose
// segment it is (its walls, gap and anti-gravity).
export function locate(track, position, fromIndex) {
  const { stations } = track;
  let index = wrapIndex(track, fromIndex);
  let aheadOfStart = along(stations[index], position);
  let aheadOfEnd = along(stations[wrapIndex(track, index + 1)], position);
  for (let step = 0; step < MAX_WALK; step += 1) {
    if (aheadOfStart < 0) {
      index = wrapIndex(track, index - 1);
      aheadOfEnd = aheadOfStart;
      aheadOfStart = along(stations[index], position);
    } else if (aheadOfEnd >= 0) {
      index = wrapIndex(track, index + 1);
      aheadOfStart = aheadOfEnd;
      aheadOfEnd = along(stations[wrapIndex(track, index + 1)], position);
    } else {
      break;
    }
  }
  const fraction = Math.min(Math.max(aheadOfStart / (aheadOfStart - aheadOfEnd), 0), 1);
  return contactAt(track, index, fraction, position);
}

// How far `position` is past a station's cross-section, along the road.
function along(station, position) {
  return dot(subtract(position, station.point), station.tangent);
}

// The road's frame a `fraction` of the way from station `index` to the next. Forward is the straight segment
// between the two stations, so the surface is flat along each segment and a ramp's lip keeps its full slope. The
// width and the shoulders are blended between the two stations, as the road's mesh draws them.
function contactAt(track, index, fraction, position) {
  const station = track.stations[index];
  const nextStation = track.stations[wrapIndex(track, index + 1)];
  const centre = lerp(station.point, nextStation.point, fraction);
  const forward = normalize(subtract(nextStation.point, station.point));
  const right = normalize(flatten(lerp(station.right, nextStation.right, fraction), forward));
  const normal = cross(right, forward);
  const offset = subtract(position, centre);
  return {
    index,
    s: station.s + fraction * station.segmentLength,
    lateral: dot(offset, right),
    height: dot(offset, normal),
    centre,
    forward,
    right,
    normal,
    halfWidth: station.halfWidth + (nextStation.halfWidth - station.halfWidth) * fraction,
    shoulderLeft: station.shoulderLeft + (nextStation.shoulderLeft - station.shoulderLeft) * fraction,
    shoulderRight: station.shoulderRight + (nextStation.shoulderRight - station.shoulderRight) * fraction,
    station,
  };
}

// What a contact is on: SURFACES.ROAD, SURFACES.OFF_ROAD (the shoulders), or null past the edge or over a gap.
export function surfaceAt(contact) {
  const across = Math.abs(contact.lateral);
  if (contact.station.gap || across > outerEdge(contact)) {
    return null;
  }
  return across <= contact.halfWidth ? SURFACES.ROAD : SURFACES.OFF_ROAD;
}

// How far from the centre line the ground ends on the contact's side (right if lateral > 0): the road's edge plus
// that side's shoulder, where a wall stands, if there is one.
export function outerEdge(contact) {
  const shoulder = contact.lateral > 0 ? contact.shoulderRight : contact.shoulderLeft;
  return contact.halfWidth + shoulder;
}

// True if the edge on the contact's side (right if lateral > 0) has a wall.
export function wallOnSide(contact) {
  return contact.lateral > 0 ? contact.station.wallRight : contact.station.wallLeft;
}

// The point `lateral` right of the centre line at distance `s` along it (any s: it wraps), with the road's
// frame there: { position, forward, right, normal, index }. For placing karts and aiming the CPU driver.
export function pointAt(track, s, lateral = 0) {
  const wrapped = wrapDistance(track, s);
  const index = stationIndexAt(track, wrapped);
  const station = track.stations[index];
  const contact = contactAt(track, index, (wrapped - station.s) / station.segmentLength, station.point);
  return {
    position: addScaled(contact.centre, contact.right, lateral),
    forward: contact.forward,
    right: contact.right,
    normal: contact.normal,
    index,
  };
}

// The station whose segment holds distance `s` (0 <= s < length), by halving the range: s grows with index.
export function stationIndexAt(track, s) {
  let low = 0;
  let high = track.stations.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (track.stations[middle].s <= s) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

// Any distance into 0..length.
export function wrapDistance(track, s) {
  return ((s % track.length) + track.length) % track.length;
}

// How far along the road a kart went from distance `fromS` to `toS`, the short way round the loop: crossing
// the start line forward is a small positive step, not almost a whole lap back.
export function progressBetween(track, fromS, toS) {
  const step = wrapDistance(track, toS - fromS);
  return step > track.length / 2 ? step - track.length : step;
}

export function wrapIndex(track, index) {
  const count = track.stations.length;
  return ((index % count) + count) % count;
}

// How far the road turns over the next TURN_LOOK stations from station `index`, in radians: positive to the
// right, negative to the left.
export function turnAhead(track, index) {
  const here = track.stations[index];
  const ahead = track.stations[(index + TURN_LOOK) % track.stations.length];
  // Turning right is clockwise seen from above the road: the tangents' cross product points down the normal.
  return -Math.atan2(dot(cross(here.tangent, ahead.tangent), here.normal), dot(here.tangent, ahead.tangent));
}

// The station whose segment holds the start line.
export function startLineIndex(track) {
  return track.stations.findIndex((station) => station.s + station.segmentLength > track.startLine);
}
