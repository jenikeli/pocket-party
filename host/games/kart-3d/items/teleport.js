// Teleport (M8c): after a short warning, every kart still racing hops a random way along the road, forward or
// back, onto a random lane, so the pack is shaken up without wrecking the standings. Never onto a gap or into
// another kart. Plain functions on the race's plain data, unit tested in Node. Used by item-catalog.js (using
// the item), item-rules.js (every step), race-views.js (the "Teleport!" banner) and the teleport's look.
//
// The race's state is race.items.teleport: null, or { warningLeft, afterLeft, hops }. warningLeft counts the
// warning down; at 0 the karts hop and hops lists them, [{ from, to }] (positions), while afterLeft counts down
// the sparkles' show, after which it is null again.

import { pointAt, wrapDistance, progressBetween, SURFACES } from '../track.js';
import { subtract, length, scale } from '../vector.js';
import { forwardSpeed } from '../kart-physics.js';
import { KART_RADIUS } from '../kart-walls.js';
import { tuning } from '../tuning.js';
import { RACE_PHASES } from '../race-phases.js';

export const TELEPORT_WARNING_SECONDS = 1;
export const TELEPORT_AFTER_SECONDS = 0.6;
// A kart lands at least this far from every other kart's middle.
const KART_SPACING = 3;
// Spots tried per kart before it stays where it is.
const HOP_TRIES = 10;
// A spot needs road this far either side of it along the road (a kart's half length), so no wheel is over a gap.
const ROAD_AROUND = 1;

// The warning starts (a second use starts it again).
export function startTeleport(race) {
  race.items.teleport = { warningLeft: TELEPORT_WARNING_SECONDS, afterLeft: TELEPORT_AFTER_SECONDS, hops: [] };
}

// One step: the warning counts down and at its end the karts hop; then the show counts down and the teleport
// ends. `random` gives the race's next random number, 0..1 (item-rules.js's drawRandom), so races repeat.
export function stepTeleport(race, track, dt, random) {
  const teleport = race.items.teleport;
  if (teleport === null) {
    return;
  }
  if (teleport.warningLeft > 0) {
    teleport.warningLeft = Math.max(teleport.warningLeft - dt, 0);
    if (teleport.warningLeft === 0) {
      teleport.hops = hopEveryKart(race, track, random);
    }
    return;
  }
  teleport.afterLeft = Math.max(teleport.afterLeft - dt, 0);
  if (teleport.afterLeft === 0) {
    race.items.teleport = null;
  }
}

// Every kart still racing and not falling hops, one after another, so each lands clear of those already moved.
// A kart that finds no free spot stays. Nobody hops at the results.
function hopEveryKart(race, track, random) {
  if (race.phase !== RACE_PHASES.RACING) {
    return [];
  }
  const hops = [];
  for (const kart of race.karts.filter((each) => each.finishTime === null && each.respawnIn === null)) {
    const spot = findSpot(race, track, kart, random);
    if (spot !== null) {
      const from = kart.position;
      hopTo(track, kart, spot);
      hops.push({ from, to: kart.position });
    }
  }
  return hops;
}

// A random spot { s, lateral } up to tuning.teleportReach along the road from `kart`, either way, on a random
// lane inside the road's edges; on road, not over a gap, and clear of every other kart. Null if every try failed.
function findSpot(race, track, kart, random) {
  for (let tries = 0; tries < HOP_TRIES; tries += 1) {
    const s = kart.s + (random() * 2 - 1) * tuning.teleportReach;
    const station = track.stations[pointAt(track, s).index];
    const limit = station.halfWidth - KART_RADIUS;
    const lateral = (random() * 2 - 1) * limit;
    const position = pointAt(track, s, lateral).position;
    const crowded = race.karts.some((other) => other !== kart && length(subtract(other.position, position)) < KART_SPACING);
    if (isRoadAround(track, s) && !crowded) {
      return { s, lateral };
    }
  }
  return null;
}

function isRoadAround(track, s) {
  return [-ROAD_AROUND, 0, ROAD_AROUND].every((offset) => !track.stations[pointAt(track, s + offset).index].gap);
}

// The kart is put on the road at the spot, facing along it, keeping its speed along its nose. Its previous pose
// is the new one too, so nothing is drawn sweeping across between the two; its race distance moves by the hop,
// so its laps stay right. A kart in the air lands there (no trick boost to come); one held on a sticky wall is
// let go; a CPU driver joins its line from the new spot (cpu-driver.js does so on its next step while started
// is false).
function hopTo(track, kart, { s, lateral }) {
  const spot = pointAt(track, s, lateral);
  const speed = forwardSpeed(kart);
  kart.distance += progressBetween(track, kart.s, s);
  Object.assign(kart, {
    position: spot.position,
    previousPosition: spot.position,
    forward: spot.forward,
    previousForward: spot.forward,
    up: spot.normal,
    previousUp: spot.normal,
    velocity: scale(spot.forward, speed),
    grounded: true,
    surface: SURFACES.ROAD,
    antiGravity: track.stations[spot.index].antiGravity,
    trackIndex: spot.index,
    lastGroundIndex: spot.index,
    s: wrapDistance(track, s),
    lateral,
    hopping: false,
    sinceLip: null,
    tricking: false,
  });
  kart.item.stuckLeft = 0;
  if (kart.cpu !== null) {
    kart.cpu.started = false;
  }
}
