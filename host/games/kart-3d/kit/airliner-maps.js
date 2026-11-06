// The planes' metal skin drawn as maps (M9, kit/surface-maps.js): the fuselage's panel seams and rivet lines, as
// relief and roughness under its livery's picture, and the wings' grey panels. Each is a tile 4 units square,
// repeated over the skin. Used by kit/airliner.js and kit/prop-plane.js.

import { createSurface, hexToRgb } from './surface-maps.js';

// A tile covers this many units of skin each way.
export const SKIN_TILE = 4;
const PIXELS_PER_UNIT = 32;

// Seams across the tile at its left edge and halfway, one along it at its bottom, rivets beside each.
function drawSeams(surface, color) {
  const seam = { size: 0.05, depth: 50, color, amount: 0.3, roughness: 0.6 };
  for (const x of [0, 2]) {
    surface.groove([x, 0], [x, SKIN_TILE], seam);
  }
  surface.groove([0, 0], [SKIN_TILE, 0], seam);
  for (let along = 0.25; along < SKIN_TILE; along += 0.5) {
    for (const x of [0.12, 2.12]) {
      surface.bolt(x, along, { radius: 0.035, lift: 15, color, roughness: 0.5 });
    }
    surface.bolt(along, 0.12, { radius: 0.035, lift: 15, color, roughness: 0.5 });
  }
}

// The fuselage's relief and roughness: { normalMap, roughnessMap }, repeating (the livery gives its colour).
export function createSkinMaps() {
  const surface = createSurface(SKIN_TILE, SKIN_TILE, PIXELS_PER_UNIT, { color: [255, 255, 255], roughness: 0.32, base: 120 });
  drawSeams(surface, [200, 204, 210]);
  const { map, normalMap, aoMap, roughnessMap } = surface.toMaps({ depth: 2, shade: { reach: 0.05, strength: 1 }, repeat: true });
  map.dispose();
  aoMap.dispose();
  return { normalMap, roughnessMap };
}

// The wings' and tail planes' skin: two shades of grey panel with seams and rivets, all four maps.
export function createWingMaps() {
  const surface = createSurface(SKIN_TILE, SKIN_TILE, PIXELS_PER_UNIT, { color: hexToRgb(0xd9dde2), roughness: 0.4, base: 120 });
  surface.panel({ left: 2, bottom: 0, width: 2, height: SKIN_TILE }, { lift: 6, bevel: 0.05, paint: { color: hexToRgb(0xcfd4da), roughness: 0.45 } });
  drawSeams(surface, [150, 156, 164]);
  return surface.toMaps({ depth: 2, shade: { reach: 0.06, strength: 1 }, repeat: true });
}
