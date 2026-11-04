// The magnet and the push (M8c): for its effect's time a kart's magnet pulls the karts ahead of it back toward
// it, and its push shoves the karts round it away. Both are an acceleration on the other karts' velocities,
// strongest close to the kart and fading to nothing at the reach's edge, less the heavier the kart acted on;
// the karts' own driving then pulls their speed back up (kart-driving.js), so a pull slows a kart by as much as
// it beats its acceleration. Plain functions on the race's plain data, unit tested in Node. Used by
// item-rules.js (every step), cpu-items.js (when a CPU kart uses them) and the magnet and push looks
// (fieldTargets, for the lines).

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { subtract, length, scale, addScaled, flatten, cross } from '../vector.js';
import { runningEffect, effectMassShare } from './effect-rules.js';
import { tuning } from '../tuning.js';

// The karts `kart`'s running magnet or push acts on this step: [] with neither running.
export function fieldTargets(race, kart) {
  const effect = runningEffect(kart);
  if (kart.respawnIn !== null || (effect !== KART_ITEMS.MAGNET && effect !== KART_ITEMS.PUSH)) {
    return [];
  }
  return effect === KART_ITEMS.MAGNET ? magnetTargets(race, kart) : pushTargets(race, kart);
}

// The karts a magnet on `kart` would pull: those ahead of it in the race (by distance, so a kart a lap behind
// is not pulled) and within tuning.magnetReach, along the race and in a straight line, so a kart round a
// hairpin, near in a straight line but far along the road, is left alone. Karts behind are never pulled: a
// pull would speed them up.
export function magnetTargets(race, kart) {
  const reach = tuning.magnetReach;
  return actedOn(race, kart).filter((other) => {
    const ahead = other.distance - kart.distance;
    return ahead > 0 && ahead <= reach && straightDistance(kart, other) <= reach;
  });
}

// The karts a push on `kart` would push: those within tuning.pushReach, any way round it.
export function pushTargets(race, kart) {
  const reach = tuning.pushReach;
  return actedOn(race, kart).filter(
    (other) => Math.abs(other.distance - kart.distance) <= reach && straightDistance(kart, other) <= reach,
  );
}

// Every running magnet and push acts on its targets for `dt` seconds.
export function applyFieldForces(race, dt) {
  for (const kart of race.karts) {
    const effect = runningEffect(kart);
    for (const other of fieldTargets(race, kart)) {
      if (effect === KART_ITEMS.MAGNET) {
        accelerate(other, kart.position, tuning.magnetPull * nearness(kart, other, tuning.magnetReach), dt);
      } else {
        accelerate(other, kart.position, -tuning.pushStrength * nearness(kart, other, tuning.pushReach), dt);
        // Loose grip, as after a bump, so the push slides the kart aside instead of grip taking it away.
        other.slideLeft = Math.max(other.slideLeft, tuning.slideSeconds);
      }
    }
  }
}

// Only karts on the road: a kart in the air (over the jump's gap) is left to land, and a falling one is out.
function actedOn(race, kart) {
  return race.karts.filter((other) => other !== kart && other.respawnIn === null && other.grounded);
}

function straightDistance(kart, other) {
  return length(subtract(other.position, kart.position));
}

// 1 at the kart, falling in a straight line to 0 at the reach's edge.
function nearness(kart, other, reach) {
  return Math.max(1 - straightDistance(kart, other) / reach, 0);
}

// `other` is accelerated toward `point` (away from it for a negative `amount`) by `amount` units per second
// squared, over its weight: along its road, never into it or off it. Right on the point there is no way
// toward it, so it goes along its side.
function accelerate(other, point, amount, dt) {
  const toward = flatten(subtract(point, other.position), other.up);
  const distance = length(toward);
  const direction = distance > 0 ? scale(toward, 1 / distance) : cross(other.forward, other.up);
  const mass = other.weight * effectMassShare(other);
  other.velocity = addScaled(other.velocity, direction, (amount / mass) * dt);
}
