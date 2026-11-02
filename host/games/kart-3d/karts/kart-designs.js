// The kart-and-driver designs (M7d5), one for each racer, in slot order: every kart is our go-kart in its
// design's three colours with its driver. Used by kart-models.js (and kart-roster.js's assignDesigns through the
// renderer) and the kit-shots pieces (host/kit-shots/kart-pieces.js).
//
// A design is { id, name, slot, palette, drawEmblem, buildDriver }:
//   id           unique, lower case ('blaze'); the kit-shots pieces are named after it (kart-blaze, ...)
//   name         the character's name, for people
//   slot         the lobby colour slot whose player drives it (kart-roster.js): 0 Blaze, 1 Pip, 2 Fern, 3 Bolt,
//                4 Grimble, 5 Rusty, 6 Inky, 7 Mochi, 8 Sprout; 9 Bruno, 10 Rhino, 11 Wisp (CPU only)
//   palette      { main, second, third }, the kart's colours as hex numbers: main paints the nose, the pods'
//                tops, the fairing's rim and the engine cover; second the nose's band, the fairing and the pods'
//                notched stripe; third the pods' lower half and the bumper
//   drawEmblem(context, size)   draws the emblem on a `size` by `size` canvas (a CanvasRenderingContext2D),
//                filling the square: only the disc inside it shows, on the kart's nose and on every decal the
//                driver wears (so draw the white disc's background over the whole square)
//   buildDriver(seat)   returns the driver as a part list (karts/part-shapes.js's partList): geometries in the
//                kart's axes (+z forward, +y up, +x the kart's left, kart-layout.js), sorted by material kind:
//                glossy, matte, cloth and metal ones coloured per vertex (part-shapes.js's painted, ball, limb),
//                decal ones from emblemDisc. `seat` is kart-layout.js's SEAT: { hip, hands: [left, right], feet:
//                [left, right] }. Built from the shared parts in karts/driver-parts.js and
//                karts/driver-face.js
//
// Adding a design: one file karts/drivers/<id>.js exporting it, and one entry below, in slot order.

import { BLAZE } from './drivers/blaze.js';
import { PIP } from './drivers/pip.js';
import { FERN } from './drivers/fern.js';
import { BOLT } from './drivers/bolt.js';
import { GRIMBLE } from './drivers/grimble.js';
import { RUSTY } from './drivers/rusty.js';
import { MOCHI } from './drivers/mochi.js';
import { SPROUT } from './drivers/sprout.js';

export const KART_DESIGNS = Object.freeze([BLAZE, PIP, FERN, BOLT, GRIMBLE, RUSTY, MOCHI, SPROUT]);
