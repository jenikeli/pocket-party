// A kart's own running effect (M8: big, small, bouncy; later magnet and push): starting one and counting it
// down. A kart has one running effect at a time, kart.item.effect = { item, left }, or null. Plain functions,
// unit tested in Node. Used by the items in item-catalog.js (through item-rules.js, which exports startEffect)
// and by item-rules.js's step.

import { tuning } from '../tuning.js';

// `kart`'s effect `item` starts, for the tuned effect time, replacing any running one.
export function startEffect(kart, item) {
  kart.item.effect = { item, left: tuning.itemEffectSeconds };
}

// The running effect counts down `dt` seconds and ends at 0.
export function countDownEffect(kart, dt) {
  const effect = kart.item.effect;
  if (effect === null) {
    return;
  }
  effect.left -= dt;
  if (effect.left <= 0) {
    kart.item.effect = null;
  }
}
