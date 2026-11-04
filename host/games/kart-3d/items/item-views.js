// What the items show (M8): a kart's held item, its roulette and its running effects, for the host's view of
// that kart (view-hud.js, every frame) and for its player's phone (sent with the race view). Plain functions,
// unit tested in Node. Used by race-views.js.

import { tuning } from '../tuning.js';

// For the host's view of `kart`: null when items are off, else { held, rolling, effects }, held the item id
// ready to use or null, rolling true during the roulette, effects [{ item, share }] with share the effect's
// time left, 1 at its start to 0 at its end.
export function itemHud(race, kart) {
  if (race.items.allowed.length === 0) {
    return null;
  }
  return itemView(kart, (effect) => ({ item: effect.item, share: Math.min(Math.max(effect.left / tuning.itemEffectSeconds, 0), 1) }));
}

// For `kart`'s phone: as itemHud, but effects [{ item, secondsLeft }], the seconds rounded up, so the view
// changes once a second and the host sends it rarely (the phone eases its rings between).
export function itemPhoneView(race, kart) {
  if (race.items.allowed.length === 0) {
    return null;
  }
  return itemView(kart, (effect) => ({ item: effect.item, secondsLeft: Math.ceil(effect.left) }));
}

function itemView(kart, describeEffect) {
  const { held, rollLeft, effect } = kart.item;
  return { held, rolling: rollLeft > 0, effects: effect === null ? [] : [describeEffect(effect)] };
}
