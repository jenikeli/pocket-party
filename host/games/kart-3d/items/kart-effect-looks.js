// The kart model's size this frame (M8): all the item looks that change it, today the teleport's flicker and
// pop (teleport-look.js). A plain function of the race state. Used by renderer.js and the kit-shots kart pieces.

import { teleportKartScale } from './teleport-look.js';

const ONE = Object.freeze({ x: 1, y: 1, z: 1 });

// The kart model's scale this frame, { x across, y up, z along the kart }, all 1 when nothing changes it (and for
// a kart with no `item`: items off, or a kart made by createKart alone).
export function kartLookScale(race, kart) {
  return teleportKartScale(race, kart) ?? ONE;
}
