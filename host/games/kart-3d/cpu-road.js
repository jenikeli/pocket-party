// What a CPU driver reads off the road and its racing line (M7e): where the line runs at a distance along the
// road, how sharply it bends a little ahead, how far it turns over a stretch ahead, where the jumps' lips and the
// spin posts are, and which way a kart points against the road and against the line. Every question is a handful
// of lookups, cheap enough for 11 karts every step. Plain maths, unit tested in Node through cpu-driver.js. Used by
// cpu-driver.js, cpu-aim.js, cpu-drift.js and cpu-recovery.js.

import { cross, dot } from './vector.js';
import { stationIndexAt, wrapDistance, wrapIndex, progressBetween } from './track.js';
import { racingLineFor } from './racing-line.js';
import { jumps } from './racing-line-pins.js';

// lineTurnAhead samples a stretch at this many points.
const TURN_SAMPLES = 8;
// The line's slope across the road is measured over this far either side.
const SLOPE_SPAN = 1;

// What the driver needs of each track besides the line itself, worked out once per track object (in a WeakMap
// for the same reasons as racing-line.js's): headings[i] is how far the line has turned from station 0 to
// station i (radians, right positive), so the turn between any two stations is one subtraction; lipS lists
// where each jump's ramp ends; spacing is the stations' average spacing, to step ahead by index.
const roadsByTrack = new WeakMap();

function roadFor(track) {
  let road = roadsByTrack.get(track);
  if (!road) {
    const line = racingLineFor(track);
    const headings = new Float64Array(track.stations.length + 1);
    track.stations.forEach((station, index) => {
      headings[index + 1] = headings[index] + line.curvature[index] * station.segmentLength;
    });
    road = { line, headings, lipS: jumps(track).map((jump) => jump.lipS), spacing: track.length / track.stations.length };
    roadsByTrack.set(track, road);
  }
  return road;
}

// The racing line's lateral at distance `s` along the road, blended between stations.
export function lineLateralAt(track, s) {
  const { line } = roadFor(track);
  const wrapped = wrapDistance(track, s);
  const index = stationIndexAt(track, wrapped);
  const station = track.stations[index];
  const share = (wrapped - station.s) / station.segmentLength;
  return line.lateral[index] + (line.lateral[wrapIndex(track, index + 1)] - line.lateral[index]) * share;
}

// The index of the station about `ahead` units on from the kart's (stations are about a unit apart, so this
// steps by index instead of searching).
function indexAhead(track, kart, ahead) {
  return wrapIndex(track, kart.trackIndex + Math.round(ahead / roadFor(track).spacing));
}

// The station about `ahead` units on from the kart's.
export function stationAhead(track, kart, ahead) {
  return track.stations[indexAhead(track, kart, ahead)];
}

// The line's signed curvature about `ahead` units on from the kart's station.
export function lineCurvatureAhead(track, kart, ahead) {
  return roadFor(track).line.curvature[indexAhead(track, kart, ahead)];
}

// How far the line turns toward `side` (1 right, -1 left) over the `distance` after `from` units on from the
// kart's station, in radians: the most it reaches at any sampled point, so a bend that then turns back (a
// chicane) counts only its first part.
export function lineTurnAhead(track, kart, from, distance, side) {
  const road = roadFor(track);
  const count = track.stations.length;
  const start = kart.trackIndex + Math.round(from / road.spacing);
  const startHeading = headingAtIndex(road, count, start);
  let most = 0;
  for (let sample = 1; sample <= TURN_SAMPLES; sample += 1) {
    const index = start + Math.round((distance * sample) / TURN_SAMPLES / road.spacing);
    most = Math.max(most, (headingAtIndex(road, count, index) - startHeading) * side);
  }
  return most;
}

// The line's heading at station `index`, counting on round the lap past the last station (so headings ahead of
// a start near the end of the lap keep growing instead of jumping back).
function headingAtIndex(road, count, index) {
  const laps = Math.floor(index / count);
  return road.headings[index - laps * count] + laps * road.headings[count];
}

// True if a jump's lip is between `s` and `distance` further on.
export function lipAhead(track, s, distance) {
  return roadFor(track).lipS.some((lipS) => isAhead(track, s, lipS, distance));
}

// True if a spin post (spin-posts.js) stands between `s` and `distance` further on.
export function postAhead(track, s, distance) {
  return track.spinPosts.some((post) => isAhead(track, s, post.s, distance));
}

function isAhead(track, s, targetS, distance) {
  const gap = progressBetween(track, s, targetS);
  return gap >= 0 && gap <= distance;
}

// The angle from the road's direction at the kart to its nose, about the road's normal, in radians: positive
// when it points to the right of the road, near +-pi when it faces back down it.
export function headingToRoad(track, kart) {
  const station = track.stations[kart.trackIndex];
  return -Math.atan2(dot(cross(station.tangent, kart.forward), station.normal), dot(station.tangent, kart.forward));
}

// The same, measured from the racing line's direction where the kart is: the line crosses the road at an angle
// on its way from the outside of a corner to the inside, so a kart following it points across the road too.
export function headingToLine(track, kart) {
  const slope = (lineLateralAt(track, kart.s + SLOPE_SPAN) - lineLateralAt(track, kart.s - SLOPE_SPAN)) / (2 * SLOPE_SPAN);
  return headingToRoad(track, kart) - Math.atan(slope);
}
