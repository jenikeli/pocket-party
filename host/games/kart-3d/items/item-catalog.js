// The 3D race's built items (M8): for each id (KART_ITEMS), its role, which the odds by place read
// (item-odds.js), and what using it does. Adding an item is its entry here. Used by item-rules.js, item-odds.js
// and item-settings.js.

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { startEffect } from './kart-effect.js';

// The roles, MK8DX's idea: karts further back get more catch-up items, leaders more defend items.
export const ITEM_ROLES = Object.freeze({ CATCH_UP: 'catch-up', DEFEND: 'defend', EVEN: 'even' });

// { [id]: { role, use(race, track, kart) } }: `use` does what the item does when `kart` uses it.
export const ITEM_CATALOG = Object.freeze({
  [KART_ITEMS.BOUNCY]: { role: ITEM_ROLES.DEFEND, use: (race, track, kart) => startEffect(kart, KART_ITEMS.BOUNCY) },
  [KART_ITEMS.BIG]: { role: ITEM_ROLES.EVEN, use: (race, track, kart) => startEffect(kart, KART_ITEMS.BIG) },
  [KART_ITEMS.SMALL]: { role: ITEM_ROLES.EVEN, use: (race, track, kart) => startEffect(kart, KART_ITEMS.SMALL) },
});

export const BUILT_ITEMS = Object.freeze(Object.keys(ITEM_CATALOG));
