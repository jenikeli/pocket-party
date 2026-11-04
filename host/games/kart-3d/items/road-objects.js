// The things items leave on the road (M8b): the blocker (a sandcastle karts bump off) and the ramp (a kicker
// that launches a kart driving onto it). Where they are placed, how long they last, bumping off a blocker,
// launching off a ramp, and the standing blockers the CPU drivers steer round. Plain functions on the race's
// plain data (race.items.objects), unit tested in Node. Used by item-rules.js (every step), item-catalog.js
// (using the items) and item-drawing.js's road object drawing (it reads race.items.objects).
//
// An object is { id, item, s, lateral, left }: its middle's distance along the road and how far right of the
// centre line, solid while left > 0. It is kept until left <= -OBJECT_VANISH_SECONDS, so the drawing can play
// its vanishing (the sandcastle slumping, the kicker folding down) while the rules have long ignored it.

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { pointAt, stationIndexAt, wrapDistance, progressBetween } from '../track.js';
import { subtract, scale, addScaled, dot, length, normalize, vec } from '../vector.js';
import { forwardSpeed } from '../kart-physics.js';
import { KART_RADIUS, HIT_SPEED, bounceOff } from '../kart-walls.js';
import { endBoost, BOOST_KINDS } from '../kart-boosts.js';
import { crossLip } from '../kart-techniques.js';
import { effectSize } from './effect-rules.js';
import { tuning } from '../tuning.js';

// How long a vanished object stays in the list for the drawing to play its ending.
export const OBJECT_VANISH_SECONDS = 0.6;
// The blocker is a round sandcastle (radius, height above the road); a kart flying above the height passes over.
export const BLOCKER_SIZE = Object.freeze({ radius: 1.4, height: 1.6 });
// The ramp's footprint on the road (length along it, width across it) and how high its far end stands.
export const RAMP_SIZE = Object.freeze({ length: 6, width: 6, height: 1 });
// The blocker is dropped this far behind the kart's middle (further for a big kart, clear of its own blocker),
// the ramp this far ahead of it.
const BLOCKER_BEHIND = 3;
const BLOCKER_CLEARANCE = 0.3;
const RAMP_AHEAD = 15;
// An object that would stand on a gap is moved back along the road, by this much each try, at most this far.
const GAP_SEARCH_STEP = 1;
const GAP_SEARCH_MAX = 30;

// The object's middle on the road and the road's frame there: { position, forward, up, right }. For the
// drawing and the rules alike.
export function objectFrame(track, object) {
  const spot = pointAt(track, object.s, object.lateral);
  return { position: spot.position, forward: spot.forward, up: spot.normal, right: spot.right };
}

// The kart drops a blocker just behind it at its lane, kept on the road and off gaps.
export function dropBlocker(race, track, kart) {
  const clear = BLOCKER_SIZE.radius + KART_RADIUS * effectSize(kart) + BLOCKER_CLEARANCE;
  const behind = Math.max(BLOCKER_BEHIND, clear);
  addObject(race, track, KART_ITEMS.BLOCKER, kart.s - behind, kart.lateral, BLOCKER_SIZE.radius, 0);
}

// A ramp appears ahead of the kart at its lane, kept on the road and off gaps.
export function placeRamp(race, track, kart) {
  addObject(race, track, KART_ITEMS.RAMP, kart.s + RAMP_AHEAD, kart.lateral, RAMP_SIZE.width / 2, RAMP_SIZE.length / 2);
}

// Adds an object at `s`, its sideways reach `halfWidth` kept inside the road and its lengthways reach
// `halfLength` kept off gaps: a spot over a gap is tried further back. No object if the road is all gap.
function addObject(race, track, item, s, lateral, halfWidth, halfLength) {
  for (let back = 0; back <= GAP_SEARCH_MAX; back += GAP_SEARCH_STEP) {
    const spot = s - back;
    if (!isRoadAround(track, spot, halfLength)) {
      continue;
    }
    const limit = track.stations[pointAt(track, spot).index].halfWidth - halfWidth;
    const clamped = Math.min(Math.max(lateral, -limit), limit);
    const id = race.items.nextObjectId;
    race.items.nextObjectId += 1;
    race.items.objects.push({ id, item, s: wrapDistance(track, spot), lateral: clamped, left: tuning.itemEffectSeconds });
    return;
  }
}

// True when no gap lies within `halfLength` of distance `s`.
function isRoadAround(track, s, halfLength) {
  return [-halfLength, 0, halfLength].every((offset) => !track.stations[pointAt(track, s + offset).index].gap);
}

// One step: objects count down and the ended ones are dropped once their vanishing is played; a standing blocker
// bumps every kart that is low enough, a standing ramp launches every kart driving onto it.
export function stepObjects(race, track, dt) {
  const objects = race.items.objects;
  for (const object of objects) {
    object.left -= dt;
  }
  race.items.objects = objects.filter((object) => object.left > -OBJECT_VANISH_SECONDS);
  for (const object of race.items.objects.filter((each) => each.left > 0)) {
    for (const kart of race.karts) {
      if (kart.respawnIn !== null) {
        continue;
      }
      if (object.item === KART_ITEMS.BLOCKER) {
        bumpOffBlocker(track, object, kart);
      } else {
        launchOffRamp(track, object, kart);
      }
    }
  }
}

// The kart is pushed out of the blocker and bounces off it as off a wall, with the walls' tuned losses and
// bounce (tuning.js: wallGrazeLoss, wallHitLoss, wallBounce, wallBounceSpeed, wallScrape), so a blocker is
// no better a thing to rub along than a wall. kart-walls.js's own version only knows the road's edge.
function bumpOffBlocker(track, object, kart) {
  const reach = BLOCKER_SIZE.radius + KART_RADIUS * effectSize(kart);
  if (Math.abs(progressBetween(track, object.s, kart.s)) > reach) {
    return;
  }
  const frame = objectFrame(track, object);
  const offset = subtract(kart.position, frame.position);
  const height = dot(offset, frame.up);
  const flat = addScaled(offset, frame.up, -height);
  const distance = length(flat);
  if (height > BLOCKER_SIZE.height || distance >= reach) {
    return;
  }
  // Right on its middle there is no side to push to: back along the kart's own nose.
  const away = distance > 0 ? scale(flat, 1 / distance) : scale(kart.forward, -1);
  kart.position = addScaled(kart.position, away, reach - distance);
  const intoBlocker = -dot(kart.velocity, away);
  if (intoBlocker > HIT_SPEED) {
    // The wall's hit, with the blocker as the wall (kart-walls.js's outward points into it).
    bounceOff(kart, scale(away, -1), intoBlocker);
  } else if (intoBlocker > 0) {
    kart.velocity = addScaled(kart.velocity, away, intoBlocker);
  }
  endBoost(kart, BOOST_KINDS.SLIPSTREAM);
}

// A kart on the ground, driving forward over the ramp's footprint, is thrown up at tuning.rampLaunchSpeed
// (keeping its speed along the road, so it flies on as far as the course's jump gap) and counts as crossing a
// lip: it may trick with Drift for the boost on landing, as off the course's ramp. Once per ramp, so a slow
// kart landing back on the ramp is not thrown again.
function launchOffRamp(track, object, kart) {
  const onFootprint = Math.abs(progressBetween(track, object.s, kart.s)) <= RAMP_SIZE.length / 2 &&
    Math.abs(kart.lateral - object.lateral) <= RAMP_SIZE.width / 2;
  if (!kart.grounded || !onFootprint || forwardSpeed(kart) <= 0 || kart.item.lastRampId === object.id) {
    return;
  }
  kart.item.lastRampId = object.id;
  kart.velocity = addScaled(kart.velocity, kart.up, tuning.rampLaunchSpeed);
  kart.grounded = false;
  kart.surface = null;
  crossLip(kart);
}

// The standing blockers as stand-in karts for cpu-aim.js, which passes them as it passes a kart that is not
// moving: [{ s, lateral, trackIndex, respawnIn, velocity, forward, standing }].
export function standingBlockers(track, objects) {
  return objects
    .filter((object) => object.item === KART_ITEMS.BLOCKER && object.left > 0)
    .map((object) => ({
      s: object.s,
      lateral: object.lateral,
      trackIndex: stationIndexAt(track, object.s),
      respawnIn: null,
      velocity: vec(0, 0, 0),
      forward: normalize(vec(1, 0, 0)),
      standing: true,
    }));
}
