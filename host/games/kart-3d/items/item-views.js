// What the items show (M8): a kart's held item, its roulette and its running effects, for the host's view of
// that kart (view-hud.js, every frame) and for its player's phone (sent with the race view). Plain functions,
// unit tested in Node. Used by race-views.js.

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { tuning } from '../tuning.js';

// For the host's view of `kart`: null when items are off, else { held, rolling, effects }, held the item id
// ready to use or null, rolling true during the roulette, effects [{ item, share }] with share the effect's
// time left, 1 at its start to 0 at its end: the kart's own effect, then the sticky walls (M8c), which every
// kart sees while they last.
export function itemHud(race, kart) {
  if (race.items.allowed.length === 0) {
    return null;
  }
  return itemView(race, kart, (effect) => ({ item: effect.item, share: Math.min(Math.max(effect.left / tuning.itemEffectSeconds, 0), 1) }));
}

// For `kart`'s phone: as itemHud, but effects [{ item, secondsLeft }], the seconds rounded up, so the view
// changes once a second and the host sends it rarely (the phone eases its rings between).
export function itemPhoneView(race, kart) {
  if (race.items.allowed.length === 0) {
    return null;
  }
  return itemView(race, kart, (effect) => ({ item: effect.item, secondsLeft: Math.ceil(effect.left) }));
}

// The race-wide sticky walls are described as one more effect, { item, left } as a kart's own.
function itemView(race, kart, describeEffect) {
  const { held, rollLeft, effect } = kart.item;
  const effects = effect === null ? [] : [effect];
  if (race.items.stickyLeft > 0) {
    effects.push({ item: KART_ITEMS.STICKY, left: race.items.stickyLeft });
  }
  return { held, rolling: rollLeft > 0, effects: effects.map(describeEffect) };
}
