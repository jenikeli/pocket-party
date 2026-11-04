// Hand-written arcade physics for one 3D kart: driving on the road (any slope or roll), flying and landing,
// gravity toward the road in anti-gravity sections, walls, and falling off and being put back. Each step also
// runs the Drift button's techniques (kart-techniques.js), the boosts (kart-boosts.js) and the body's animation
// (kart-body.js). A kart held on a sticky wall (items/sticky-walls.js, M8c) stays still. Plain functions on
// plain kart objects, unit tested in Node. Used by host/games/kart-3d/race.js, stepped at the fixed 60 Hz.
//
// A kart on the road is stuck to it: every step it is moved along its velocity, then put back on the surface,
// its "up" set to the road's normal and its nose laid flat on the road. So hills, banks and walls rolled up to
// vertical all work the same way, and gravity only matters in the air. That is how MK8DX feels too: slopes
// barely change a kart's speed.

import { vec, add, scale, addScaled, cross, dot, normalize, flatten, rotate } from './vector.js';
import { locate, surfaceAt, pointAt, SURFACES } from './track.js';
import { hitWall } from './kart-walls.js';
import { nextSpeed, turnAngle, driftTurnAngle, kartTopSpeed } from './kart-driving.js';
import { freshTechniques, useDriftButton, afterMove, hopGravity } from './kart-techniques.js';
import { freshBoosts, stepBoosts } from './kart-boosts.js';
import { freshBody, moveBody } from './kart-body.js';
import { tuning } from './tuning.js';
import { effectTurnShare } from './items/effect-rules.js';
import { isHeldOnWall } from './items/sticky-walls.js';

// Units per second squared, a guess: stronger than real gravity at this scale, for short snappy jumps.
export const GRAVITY = 25;
// How far the road may drop away or rise under a kart in one step while it stays stuck to it. Big enough for
// the outer lane of a road rolling up to a wall; a ramp's lip is followed by a gap, so karts still take off.
const GROUND_SNAP = 0.5;
// A kart coming down lands if it is no deeper than this below the road (it crossed the surface this step).
const LANDING_DEPTH = 1.5;
// This far below the road (or below where the road would be), it has fallen off.
const FALL_DEPTH = 3;
// Seconds from falling past FALL_DEPTH (about half a second after leaving the road) to being put back.
export const RESPAWN_DELAY = 1;
// A kart that fell is put back this far before the last place it was on the road, so it has a run-up to
// jumps; MK8DX puts karts back about where they fell.
const RESPAWN_BACK = 30;
const DOWN = vec(0, -1, 0);
// How much of the steering works in the air.
const AIR_STEERING_SHARE = 0.5;

// A kart standing on the road at distance `s` along it and `lateral` right of the centre line, facing along
// the road. `weight` (about 1) decides bumps (kart-bumps.js); `engineClassShare` is its engine class's top speed
// as a share of 150cc's (kartTopSpeed); `paceShare` (1) is the CPU catch-up share on top of it (cpu-pace.js). The kart is plain data: { position, velocity, forward, up,
// previousPosition, previousForward, previousUp, previousBodyYaw, previousBodyRoll, grounded, surface,
// antiGravity, trackIndex, s, lateral, lastGroundIndex, respawnIn, slideLeft, weight, engineClassShare, paceShare,
// driftHeld, lipTiming }, plus the fields of freshTechniques(), freshBoosts() and freshBody(). forward and up are unit
// vectors (the nose, and the road's normal under it); previous* are one step ago, for smooth drawing; surface
// is a SURFACES value, or null in the air; respawnIn counts down while it falls after leaving the road, and is
// null otherwise; slideLeft is the seconds of loose grip left after a bump or a wall hit;
// driftHeld is the Drift button last step, and lipTiming the last trick timing (kart-techniques.js), both kept
// when the kart is put back on the road.
export function createKart(track, s, lateral, weight = 1, engineClassShare = 1) {
  const kart = { weight, engineClassShare, paceShare: 1, driftHeld: false, lipTiming: null };
  placeOnRoad(track, kart, s, lateral);
  return kart;
}

function placeOnRoad(track, kart, s, lateral) {
  const spot = pointAt(track, s, lateral);
  Object.assign(kart, {
    position: spot.position,
    velocity: vec(0, 0, 0),
    forward: spot.forward,
    up: spot.normal,
    previousPosition: spot.position,
    previousForward: spot.forward,
    previousUp: spot.normal,
    grounded: true,
    surface: SURFACES.ROAD,
    antiGravity: track.stations[spot.index].antiGravity,
    trackIndex: spot.index,
    s: track.stations[spot.index].s,
    lateral,
    lastGroundIndex: spot.index,
    respawnIn: null,
    slideLeft: 0,
    ...freshTechniques(),
    ...freshBoosts(),
    ...freshBody(),
  });
  kart.previousBodyYaw = 0;
  kart.previousBodyRoll = 0;
}

// The kart's speed along its nose, negative when reversing.
export function forwardSpeed(kart) {
  return dot(kart.velocity, kart.forward);
}

// Moves the kart for `dt` seconds. `controls` is { steer, accelerate, brake, drift }: steer -1 (left) to 1
// (right), drift the Drift button held.
export function stepKart(track, kart, controls, dt) {
  kart.previousPosition = kart.position;
  kart.previousForward = kart.forward;
  kart.previousUp = kart.up;
  kart.previousBodyYaw = kart.bodyYaw;
  kart.previousBodyRoll = kart.bodyRoll;
  if (kart.respawnIn !== null) {
    // Kept up to date while falling, so a button still held when the kart is put back does not hop it.
    kart.driftHeld = controls.drift === true;
    stepFalling(track, kart, dt);
    return;
  }
  if (isHeldOnWall(kart)) {
    holdOnWall(track, kart, controls, dt);
    return;
  }
  const fromIndex = kart.trackIndex;
  // A hop leaves the road here, so wasGrounded is read after it: a hop is not a landing's take-off.
  useDriftButton(kart, controls, dt);
  const wasGrounded = kart.grounded;
  if (kart.grounded) {
    drive(kart, controls, dt);
  } else {
    fly(kart, controls, dt);
  }
  kart.position = addScaled(kart.position, kart.velocity, dt);
  let contact = locate(track, kart.position, kart.trackIndex);
  if (hitWall(track, kart, contact, dt)) {
    contact = locate(track, kart.position, contact.index);
  }
  settle(track, kart, contact);
  afterMove(track, kart, controls, fromIndex, wasGrounded, dt);
  stepBoosts(track, kart, dt);
  moveBody(kart, controls, dt);
}

// On the road: the pedals (or a boost) change the speed along the nose, steering (or the drift) turns the nose
// about the road's normal, and grip takes away sideways sliding (left over from bumps and walls). Right after
// a bump or a wall hit the grip is loose, so the kart slides away visibly. A stalled start holds the kart still.
function drive(kart, controls, dt) {
  const side = cross(kart.forward, kart.up);
  const offRoad = kart.surface === SURFACES.OFF_ROAD;
  const speed = kart.stallLeft > 0 ? 0 : nextSpeed(forwardSpeed(kart), controls, offRoad, dt, kart.boost, kartTopSpeed(kart));
  const grip = kart.slideLeft > 0 ? tuning.slideGrip : tuning.grip;
  kart.slideLeft = Math.max(kart.slideLeft - dt, 0);
  const slide = dot(kart.velocity, side) * Math.exp(-grip * dt);
  const steered = kart.driftDirection === 0 ? turnAngle(controls.steer, speed, dt) : driftTurnAngle(kart.driftDirection, controls.steer, speed, dt);
  const turn = steered * effectTurnShare(kart);
  // A right turn turns the nose clockwise seen from above the road: a negative angle about up.
  kart.forward = normalize(rotate(kart.forward, kart.up, -turn));
  kart.velocity = addScaled(scale(kart.forward, speed), cross(kart.forward, kart.up), slide);
}

// In the air: gravity pulls (toward the road in anti-gravity sections, and with a hop's own pull during a hop),
// the pedals do nothing, and steering turns the kart and its flight a little.
function fly(kart, controls, dt) {
  const gravity = kart.antiGravity ? scale(kart.up, -1) : DOWN;
  kart.velocity = addScaled(kart.velocity, gravity, (kart.hopping ? hopGravity() : GRAVITY) * dt);
  const angle = -turnAngle(controls.steer, forwardSpeed(kart), dt) * AIR_STEERING_SHARE * effectTurnShare(kart);
  kart.forward = normalize(rotate(kart.forward, kart.up, angle));
  kart.velocity = rotate(kart.velocity, kart.up, angle);
}

// After the move: stuck to the road, taking off, landing, or falling off.
function settle(track, kart, contact) {
  const surface = surfaceAt(contact);
  kart.trackIndex = contact.index;
  kart.s = contact.s;
  kart.lateral = contact.lateral;
  kart.antiGravity = contact.station.antiGravity;
  const nearSurface = contact.height > -GROUND_SNAP && contact.height < GROUND_SNAP;
  const landing = !kart.grounded && contact.height <= 0 && contact.height > -LANDING_DEPTH;
  if (surface && ((kart.grounded && nearSurface) || landing)) {
    stickToRoad(kart, contact, surface);
  } else {
    kart.grounded = false;
    kart.surface = null;
    if (contact.height < -FALL_DEPTH) {
      kart.respawnIn = RESPAWN_DELAY;
    }
  }
}

// Puts the kart on the surface with its up along the road's normal and its nose flat on the road. A kart that
// was already on the road keeps its speed along the nose over a change of slope (so a ramp does not slow it);
// one landing keeps only the part of its velocity along the road.
function stickToRoad(kart, contact, surface) {
  const oldSide = cross(kart.forward, kart.up);
  const forward = normalize(flatten(kart.forward, contact.normal));
  const side = cross(forward, contact.normal);
  const speed = dot(kart.velocity, kart.grounded ? kart.forward : forward);
  const slide = dot(kart.velocity, kart.grounded ? oldSide : side);
  kart.position = addScaled(kart.position, contact.normal, -contact.height);
  kart.up = contact.normal;
  kart.forward = forward;
  kart.velocity = addScaled(scale(forward, speed), side, slide);
  kart.grounded = true;
  kart.surface = surface;
  kart.lastGroundIndex = contact.index;
}

// Held on a sticky wall (items/sticky-walls.js, which lets it go): it stays where it is, whatever the controls.
// The Drift button is still watched, so one held down is not a fresh press once the kart is let go, and the
// boost and stall timers and the body's lean run on as usual.
function holdOnWall(track, kart, controls, dt) {
  kart.driftHeld = controls.drift === true;
  kart.velocity = vec(0, 0, 0);
  stepBoosts(track, kart, dt);
  moveBody(kart, controls, dt);
}

// Off the road and falling: no control, until it is put back.
function stepFalling(track, kart, dt) {
  const gravity = kart.antiGravity ? scale(kart.up, -1) : DOWN;
  kart.velocity = addScaled(kart.velocity, gravity, GRAVITY * dt);
  kart.position = add(kart.position, scale(kart.velocity, dt));
  kart.respawnIn -= dt;
  if (kart.respawnIn <= 0) {
    respawn(track, kart);
  }
}

// Back on the middle of the road, standing still, RESPAWN_BACK before where it was last on the road, and not
// over a gap.
function respawn(track, kart) {
  let index = pointAt(track, track.stations[kart.lastGroundIndex].s - RESPAWN_BACK).index;
  while (track.stations[index].gap) {
    index = (index - 1 + track.stations.length) % track.stations.length;
  }
  placeOnRoad(track, kart, track.stations[index].s, 0);
}
