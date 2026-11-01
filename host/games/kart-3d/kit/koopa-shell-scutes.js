// The Koopa shell's scutes (M7d4d, after Koopa Cape's in docs/mk8dx-reference.md): where they lie seen from above,
// the dome's relief at any point (for the shape and for the maps) and the picture drawn with kit/surface-maps.js,
// so its colour, relief, shade and roughness maps agree. Used by kit/koopa-shell.js.

import { createSurface } from './surface-maps.js';

// The picture covers x and z from -1 to 1 (a 512 pixel square); its corners, past the shell, are plain white.
export const SCUTE_PIXELS = 512;
const BASE = 110;
const GROOVE_GREEN = [12, 58, 22];
const FACE_GREEN = [44, 148, 46];
const CENTRE_GREEN = [104, 214, 74];

// The scutes' middles, seen from above in shares of the radius: one in the middle, six round it, twelve at the rim.
const MIDDLES = [
  [0, 0],
  ...Array.from({ length: 6 }, (_, index) => [0.5 * Math.cos((index * Math.PI) / 3), 0.5 * Math.sin((index * Math.PI) / 3)]),
  ...Array.from({ length: 12 }, (_, index) => [0.95 * Math.cos(((index + 0.5) * Math.PI) / 6), 0.95 * Math.sin(((index + 0.5) * Math.PI) / 6)]),
];

// At (x, z) seen from above: { face, centre }. Each point belongs to its nearest scute; `face` is 0 in the groove
// where it meets the next one and 1 on the scute's raised face (a rounded edge between), `centre` 1 at its middle
// and 0 from about a third of the radius out.
export function scuteAt(x, z) {
  const distances = MIDDLES.map(([middleX, middleZ]) => Math.hypot(x - middleX, z - middleZ)).sort((a, b) => a - b);
  const seam = distances[1] - distances[0];
  const share = Math.min(Math.max((seam - 0.02) / 0.07, 0), 1);
  return { face: share * share * (3 - 2 * share), centre: Math.max(0, 1 - distances[0] / 0.33) };
}

// The drawn surface: grooves cut between raised, domed scutes, lighter toward each one's middle.
export function drawScuteSurface() {
  const surface = createSurface(2, 2, SCUTE_PIXELS / 2, { color: [255, 255, 255], roughness: 0.4, base: BASE });
  for (let row = 0; row < SCUTE_PIXELS; row += 1) {
    for (let column = 0; column < SCUTE_PIXELS; column += 1) {
      const [x, z] = [((column + 0.5) / SCUTE_PIXELS) * 2 - 1, 1 - ((row + 0.5) / SCUTE_PIXELS) * 2];
      if (Math.hypot(x, z) > 1.04) {
        continue;
      }
      const { face, centre } = scuteAt(x, z);
      surface.setHeight(column, row, BASE + 80 * face + 30 * centre * face);
      surface.colors.mix(column, row, GROOVE_GREEN);
      surface.colors.mix(column, row, FACE_GREEN, face);
      surface.colors.mix(column, row, CENTRE_GREEN, centre * face * 0.8);
      surface.roughnesses.mix(column, row, [235, 235, 235], 1 - face);
    }
  }
  return surface;
}

// The maps for the shell's material: { map, normalMap, aoMap, roughnessMap }, stretched once over the dome.
export function drawScuteMaps() {
  return drawScuteSurface().toMaps({ depth: 6, shade: { reach: 0.06, strength: 2.5 }, repeat: false });
}
