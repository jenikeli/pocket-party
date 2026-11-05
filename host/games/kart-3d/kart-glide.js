// Gliding off a glide ramp (M9), as in MK8DX: crossing a glide ramp's lip opens the kart's glider, and until it
// lands it floats down under a gentler gravity at the glider's air speed, steered and banked with the stick, and
// dives (sooner, a little faster) while Brake is held. Plain functions on plain kart objects, unit tested in
// Node. Used by kart-physics.js (the flight, the corridor), kart-techniques.js (opening and landing) and
// kart-body.js (the bank). Its numbers are tuning.js's Gliding group.
//
// Over a glide gap the kart is kept inside a corridor: an air wall at the gap's edges, and a floor along the
// gap's straight line (from the ramp's lip down to where the road starts again). Coming down toward that line it
// flares, sinking more slowly the closer it gets, and then rides the line to the landing, as an airliner comes in
// on its glide path: a dive does so soon after the lip, a float near the end or not at all, landing further on.
// So neither ever drops into the sea, whatever the engine class.

import { vec, scale, addScaled, cross, dot, normalize, flatten, rotate } from './vector.js';
import { locate, outerEdge } from './track.js';
import { nextSpeed, turnAngle, kartTopSpeed } from './kart-driving.js';
import { KART_RADIUS } from './kart-walls.js';
import { tuning } from './tuning.js';

const UP = vec(0, 1, 0);
const DEGREES = Math.PI / 180;
// Holding Brake dives, and the glider's air speed rises by this share (a guess: "a little faster").
const DIVE_SPEED_SHARE = 1.08;
// The nose follows the flight path, but tips at most this far up or down.
const MAX_PITCH = 30 * DEGREES;
// The glider turns at most this far either way from the road's way (MK8DX's glides only steer within the course).
const MAX_HEADING = 60 * DEGREES;
// The glider holds its air speed whatever the pedals: Go does nothing in the air.
const AIR_PEDALS = Object.freeze({ accelerate: true, brake: false });
// Over a glide gap the kart sinks toward the gap's line at most this many times its height above it, per second,
// so it closes in on the line smoothly (its height falling away exponentially, by a fifteenth a step at most)
// instead of stopping dead on it, and a step never carries it through.
const FLARE_RATE = 4;

// The glide fields of a fresh kart (also after it is put back on the road): gliding true from crossing a glide
// ramp's lip until it lands (or falls); glideTime the seconds since the glider opened, null when not gliding.
// The look (karts/glider.js) eases its own open share from `gliding`.
export function freshGlide() {
  return { gliding: false, glideTime: null };
}

// The glider opens (kart-techniques.js, as the kart crosses a glide ramp's lip). A drift ends without its
// mini-turbo: the drift's counter only charges on the road, and the body would stay turned through the glide.
export function openGlider(kart) {
  kart.gliding = true;
  kart.glideTime = 0;
  kart.driftDirection = 0;
}

// The glider folds (on landing or falling).
export function endGlide(kart) {
  kart.gliding = false;
  kart.glideTime = null;
}

// One step of the flight, before the kart moves. The speed across the ground eases to the air speed (or a
// boost's share of it: a trick off the glide ramp boosts at once), the sink grows under the glide's gravity, the
// stick turns the heading at a share of the ground steering (never further than MAX_HEADING from the road's way),
// and the nose points along the flight path. `controls` is { steer, brake }: steer -1 (left) to 1 (right), brake
// held to dive.
export function glide(track, kart, controls, dt) {
  kart.glideTime += dt;
  const diving = controls.brake === true;
  const heading = normalize(flatten(kart.forward, UP));
  const speed = dot(kart.velocity, heading);
  // A right turn turns the heading clockwise seen from above: a negative angle about up (as in kart-physics.js).
  const turnedBy = -turnAngle(controls.steer, speed, dt) * tuning.glideTurnShare;
  const turned = headingWithin(track.stations[kart.trackIndex], rotate(heading, UP, turnedBy));
  const airSpeed = kartTopSpeed(kart) * tuning.glideSpeedShare * (diving ? DIVE_SPEED_SHARE : 1);
  const nextAirSpeed = nextSpeed(speed, AIR_PEDALS, false, dt, kart.boost, airSpeed);
  const sink = kart.velocity.y - glideGravity(kart, diving) * dt;
  kart.velocity = addScaled(scale(turned, nextAirSpeed), UP, sink);
  const pitch = Math.min(Math.max(Math.atan2(sink, nextAirSpeed), -MAX_PITCH), MAX_PITCH);
  kart.forward = addScaled(scale(turned, Math.cos(pitch)), UP, Math.sin(pitch));
  kart.up = cross(cross(turned, UP), kart.forward);
}

// `heading` (flat), turned back to MAX_HEADING from the road's way at `station` if it is further round: a glider
// held in a turn would otherwise come round and glide back up the gap, held up by its floor.
function headingWithin(station, heading) {
  const roadWay = normalize(flatten(station.tangent, UP));
  const angle = Math.atan2(dot(cross(roadWay, heading), UP), dot(roadWay, heading));
  return Math.abs(angle) <= MAX_HEADING ? normalize(heading) : rotate(roadWay, UP, Math.sign(angle) * MAX_HEADING);
}

// The pull down while gliding: the tuned gravity is 150cc's, and other engine classes' scale with their top speed
// squared, as a glide's length grows with the speed squared: so every class comes down about where 150cc does,
// and the course's landing road fits them all (at 200cc a glide would otherwise carry on well into the next turn).
function glideGravity(kart, diving) {
  const classShare = kartTopSpeed(kart) / tuning.topSpeed;
  return (diving ? tuning.glideDiveGravity : tuning.glideGravity) * classShare * classShare;
}

// After the move, while gliding: an air wall at the edge of the ground below (over a glide gap, its half width)
// pushes the kart back inside with no bounce, its nose turned along the wall (so the glide's next step keeps its
// speed along the nose; only the speed into the wall is lost), and over a glide gap it flares above the gap's
// straight line (and is put back on it, should it be below). Returns the contact (track.js locate), found again
// if the kart was moved.
export function keepInCorridor(track, kart, contact) {
  let moved = false;
  const limit = outerEdge(contact) - KART_RADIUS;
  if (Math.abs(contact.lateral) > limit) {
    const outward = scale(contact.right, Math.sign(contact.lateral));
    kart.position = addScaled(kart.position, outward, limit - Math.abs(contact.lateral));
    kart.velocity = addScaled(kart.velocity, outward, -Math.max(dot(kart.velocity, outward), 0));
    kart.forward = normalize(flatten(kart.forward, outward));
    moved = true;
  }
  if (contact.station.glide) {
    if (contact.height < 0) {
      kart.position = addScaled(kart.position, contact.normal, -contact.height);
      moved = true;
    }
    const slowestSink = -Math.max(contact.height, 0) * FLARE_RATE;
    const towardLine = dot(kart.velocity, contact.normal);
    kart.velocity = addScaled(kart.velocity, contact.normal, Math.max(slowestSink - towardLine, 0));
  }
  return moved ? locate(track, kart.position, contact.index) : contact;
}

// The body's roll for the glider's bank, in radians (kart-body.js adds it to a trick's roll): into the turn as
// far as the front wheels are turned, which follow the stick with a short ease, so a flick does not snap it.
export function glideBank(kart) {
  return kart.gliding ? kart.wheelTurn * tuning.glideBankDegrees * DEGREES : 0;
}
