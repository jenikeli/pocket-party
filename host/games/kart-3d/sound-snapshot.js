// The parts of the 3D race its sounds are read from, taken once per step: the countdown, the race-wide items,
// and for each player kart (and each stand-in of a watched race) what it is doing and what just touched it.
// Plain functions, unit tested in Node. Used by host/games/kart-3d/race-sounds.js, whose cues
// (host/games/kart-3d/sound-cues.js) compare two of these.

import { KART_ITEMS } from '../../../shared/protocol.js';
import { RACE_PHASES } from './race-phases.js';
import { countdownNumber } from './rocket-start.js';
import { sparkLevel } from './kart-techniques.js';
import { kartTopSpeed } from './kart-driving.js';
import { KART_RADIUS } from './kart-walls.js';
import { BLOCKER_SIZE, objectFrame } from './items/road-objects.js';
import { pushTargets } from './items/field-forces.js';
import { runningEffect } from './items/effect-rules.js';
import { subtract, length } from './vector.js';

// Two karts are pushed exactly apart by a bump, so one this close to another has just bumped it; the margin
// covers the rounding and the step's own movement.
const TOUCH_MARGIN = 0.25;
// A blocker hit pushes the kart to its edge; the margin also covers the kart's height above the road.
const BLOCKER_MARGIN = 0.5;

// { race, results, countdown, teleportWarning, stickyLeft, karts }. `race` is kept so a new race (Restart) is
// told from the next step of the same one; results is whether the results show; countdown the number shown (3,
// 2, 1, 0 for GO, null otherwise); teleportWarning the teleport's warning seconds left (null when none runs);
// karts maps each player kart's playerId to kartSnapshot's fields. `track` is the course raced, for where the
// blockers stand; `playerKarts` the race's karts that have a playerId; `previous` the snapshot of the step before
// (null for none), to tell when a kart's grip was loosened. Runs at the physics rate, so it reads the race only
// and keeps what it makes small.
export function soundSnapshot(race, track, playerKarts, previous) {
  const before = previous?.race === race ? previous.karts : null;
  const karts = new Map();
  for (const kart of playerKarts) {
    karts.set(kart.playerId, kartSnapshot(race, track, kart, before?.get(kart.playerId)));
  }
  const results = race.phase === RACE_PHASES.RESULTS;
  return {
    race,
    results,
    countdown: results ? null : countdownNumber(race.time),
    teleportWarning: race.items.teleport?.warningLeft ?? null,
    stickyLeft: race.items.stickyLeft,
    karts,
  };
}

// `was` is the kart's snapshot a step ago, or undefined. What touched it (knockedBy) is only worked out on a
// step its grip was loosened (slideLeft rose), the only time a hit cue reads it; null otherwise.
function kartSnapshot(race, track, kart, was) {
  return {
    lap: kart.lap,
    onFinalLap: race.laps > 1 && kart.lap === race.laps,
    finished: kart.finishTime !== null,
    first: kart.place === 1,
    startOutcome: kart.startResult?.outcome ?? null,
    drifting: kart.driftDirection !== 0,
    sparkLevel: sparkLevel(kart),
    boostKind: kart.boost?.kind ?? null,
    boostLeft: kart.boost?.timeLeft ?? 0,
    hopping: kart.hopping,
    tricking: kart.tricking,
    gliding: kart.gliding,
    grounded: kart.grounded,
    falling: kart.respawnIn !== null,
    rollLeft: kart.item.rollLeft,
    held: kart.item.held,
    stuck: kart.item.stuckLeft > 0,
    slideLeft: kart.slideLeft,
    speedShare: Math.min(length(kart.velocity) / kartTopSpeed(kart), 1),
    spinTime: kart.spinTime,
    postCooldown: kart.postCooldown,
    knockedBy: was && kart.slideLeft > was.slideLeft ? knockedBy(race, track, kart) : null,
  };
}

// What would have loosened the kart's grip if it was loosened this step: 'push' (another kart's push item is on
// it), 'kart' (it touches another kart), 'blocker' (it touches a standing blocker), else 'wall'. Only asked
// on a step the grip was loosened (kartSnapshot).
export function knockedBy(race, track, kart) {
  const others = race.karts.filter((other) => other !== kart);
  if (others.some((other) => runningEffect(other) === KART_ITEMS.PUSH && pushTargets(race, other).includes(kart))) {
    return 'push';
  }
  const touching = KART_RADIUS * 2 + TOUCH_MARGIN;
  if (others.some((other) => other.respawnIn === null && length(subtract(other.position, kart.position)) <= touching)) {
    return 'kart';
  }
  const blockerReach = BLOCKER_SIZE.radius + KART_RADIUS + BLOCKER_MARGIN;
  const blockers = race.items.objects.filter((object) => object.item === KART_ITEMS.BLOCKER && object.left > 0);
  if (blockers.some((object) => length(subtract(objectFrame(track, object).position, kart.position)) <= blockerReach)) {
    return 'blocker';
  }
  return 'wall';
}
