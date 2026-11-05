// The 3D race's built items (M8): for each id (KART_ITEMS), what using it does. Adding an item is its entry
// here. Every allowed item is equally likely at every place (drawItem in item-rules.js). Used by item-rules.js
// and item-settings.js.

import { KART_ITEMS } from '../../../../shared/protocol.js';
import { startEffect } from './kart-effect.js';
import { dropBlocker } from './road-objects.js';
import { launchJump } from './jump.js';
import { startTeleport } from './teleport.js';
import { makeWallsSticky } from './sticky-walls.js';

// { [id]: { use(race, track, kart), needsGround } }: `use` does what the item does when `kart` uses it;
// a needsGround item waits in the slot while the kart is in the air.
export const ITEM_CATALOG = Object.freeze({
  [KART_ITEMS.BLOCKER]: { use: (race, track, kart) => dropBlocker(race, track, kart) },
  [KART_ITEMS.JUMP]: { use: (race, track, kart) => launchJump(race, kart), needsGround: true },
  // The field items (M8c): teleport and sticky walls act on everyone; magnet and push are the kart's own
  // effects, acting on the karts round it (field-forces.js).
  [KART_ITEMS.TELEPORT]: { use: (race) => startTeleport(race) },
  [KART_ITEMS.MAGNET]: { use: (race, track, kart) => startEffect(kart, KART_ITEMS.MAGNET) },
  [KART_ITEMS.PUSH]: { use: (race, track, kart) => startEffect(kart, KART_ITEMS.PUSH) },
  [KART_ITEMS.STICKY]: { use: (race) => makeWallsSticky(race) },
});

export const BUILT_ITEMS = Object.freeze(Object.keys(ITEM_CATALOG));
