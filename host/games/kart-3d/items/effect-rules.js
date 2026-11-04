// What the kart's own item effects (big, small, bouncy) change in the rules, as shares of a normal kart's numbers
// (all 1 with no effect). Plain functions of the kart's `item.effect` ({ item, left }, set by items/item-rules.js)
// and the live tuning. Used by kart-driving.js (top speed), kart-physics.js (turning), kart-bumps.js (mass,
// size, bounce) and kart-walls.js (size). A kart with no `item` at all (the physics tests' karts) has no effect.

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { tuning } from '../tuning.js';

// The item of the kart's running effect, or null.
export function runningEffect(kart) {
  return kart.item?.effect?.item ?? null;
}

// Big is slower.
export function effectTopSpeedShare(kart) {
  return runningEffect(kart) === KART_ITEMS.BIG ? tuning.bigSpeedShare : 1;
}

// Small turns faster, in steering and in drifting.
export function effectTurnShare(kart) {
  return runningEffect(kart) === KART_ITEMS.SMALL ? tuning.smallTurnShare : 1;
}

// Big is much heavier, small lighter.
export function effectMassShare(kart) {
  const effect = runningEffect(kart);
  if (effect === KART_ITEMS.BIG) {
    return tuning.bigMassShare;
  }
  return effect === KART_ITEMS.SMALL ? tuning.smallMassShare : 1;
}

// How much faster than usual a kart bumping this one parts from it.
export function effectBounceShare(kart) {
  return runningEffect(kart) === KART_ITEMS.BOUNCY ? tuning.bouncyBounceShare : 1;
}

// The kart's size as a multiple of a normal kart's, for bumps and walls.
export function effectSize(kart) {
  const effect = runningEffect(kart);
  if (effect === KART_ITEMS.BIG) {
    return tuning.bigSize;
  }
  return effect === KART_ITEMS.SMALL ? tuning.smallSize : 1;
}
