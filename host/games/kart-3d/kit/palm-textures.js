// The kit's palm textures (M7d4c2), drawn with kit/surface-maps.js so each has colour, relief, shade and
// roughness maps: the bark (fibres and cracks, orange-brown) and a frond (a pale midrib with thin blades in
// two greens, cut out by an alpha map). Used by kit/palm.js and kit/palm-trunk.js.

import { createSurface } from './surface-maps.js';
import { createPixelImage } from './pixel-image.js';
import { createRandom, between } from '../random.js';

// The bark picture holds the ring's bark above and, at the bottom, a plain white strip that the crown's balls
// point at, so their vertex colour alone tints them. Texture heights (v) of the strip's middle and of the bark's
// foot.
export const PLAIN_V = 0.07;
export const BARK_V_FROM = 0.15;

const BARK = [176, 118, 62];
const BARK_DARK = [96, 56, 28];
const BARK_UNITS = { width: 2.5, height: 1 };
const BARK_PIXELS_PER_UNIT = 80;
const BARK_BASE = 150;

// Returns { map, normalMap, aoMap, roughnessMap } for the trunk: stretched once over each ring, not repeating.
export function drawBark() {
  const random = createRandom(97);
  const surface = createSurface(BARK_UNITS.width, BARK_UNITS.height, BARK_PIXELS_PER_UNIT, { color: BARK, roughness: 0.9, base: BARK_BASE });
  streakColours(surface, random);
  for (let fibre = 0; fibre < 60; fibre += 1) {
    const x = between(random, 0, BARK_UNITS.width);
    const from = [x, between(random, BARK_V_FROM, 0.5)];
    const to = [x + between(random, -0.04, 0.04), between(random, 0.6, 1)];
    surface.groove(from, to, { size: between(random, 0.018, 0.035), depth: between(random, 30, 70), color: BARK_DARK, amount: 0.55, roughness: 1 });
  }
  for (let crack = 0; crack < 18; crack += 1) {
    const x = between(random, 0, BARK_UNITS.width);
    const y = between(random, BARK_V_FROM + 0.1, 0.9);
    const to = [x + between(random, -0.05, 0.05), y + between(random, 0.12, 0.25)];
    surface.groove([x, y], to, { size: 0.03, depth: 80, color: BARK_DARK, amount: 0.8, roughness: 1 });
  }
  whitenStrip(surface);
  return surface.toMaps({ depth: 5, shade: { reach: 0.05, strength: 2 }, repeat: false });
}

// Each column a little lighter or darker than the bark's colour, so the fibres run in streaks.
function streakColours(surface, random) {
  let streak = 0;
  for (let column = 0; column < surface.width; column += 1) {
    if (column % 3 === 0) {
      streak = between(random, -0.18, 0.18);
    }
    const target = streak > 0 ? [255, 190, 110] : [60, 30, 10];
    for (let row = 0; row < surface.height; row += 1) {
      surface.colors.mix(column, row, target, Math.abs(streak));
    }
  }
}

// The plain strip at the picture's foot: flat and white, whatever was drawn over it.
function whitenStrip(surface) {
  const rows = Math.round(BARK_V_FROM * 0.9 * surface.height);
  for (let row = surface.height - rows; row < surface.height; row += 1) {
    for (let column = 0; column < surface.width; column += 1) {
      surface.colors.mix(column, row, [255, 255, 255]);
      surface.setHeight(column, row, BARK_BASE);
    }
  }
}

const FROND_UNITS = { width: 1, height: 2 };
const FROND_PIXELS_PER_UNIT = 128;
const FROND_BASE = 90;
const BLADE_SPACING = 6;
const GREENS = [[63, 154, 46], [98, 190, 58]];
const MIDRIB = [196, 208, 112];

// Returns { map, normalMap, aoMap, roughnessMap, alphaMap } for a frond: the blades are opaque in the alpha map,
// the gaps between them are cut out.
export function drawFrond() {
  const random = createRandom(89);
  const surface = createSurface(FROND_UNITS.width, FROND_UNITS.height, FROND_PIXELS_PER_UNIT, { color: GREENS[0], roughness: 0.7, base: FROND_BASE });
  const alpha = createPixelImage(surface.width, surface.height);
  alpha.fill(() => [0, 0, 0]);
  const middle = surface.width / 2;
  let blade = 0;
  for (let y = surface.height - 8; y > 6; y -= BLADE_SPACING) {
    const share = 1 - y / surface.height;
    const reach = (middle - 5) * Math.sin(Math.PI * Math.min(1, share * 1.2 + 0.08)) ** 0.6;
    for (const side of [-1, 1]) {
      drawBlade(surface, alpha, { middle, y: y + between(random, -1, 1), side, reach, green: GREENS[blade % 2] });
      blade += 1;
    }
  }
  drawMidrib(surface, alpha, middle);
  return { ...surface.toMaps({ depth: 4, shade: { reach: 0.04, strength: 1.5 }, repeat: false }), alphaMap: alpha.toDataTexture({ repeat: false }) };
}

// One blade from the midrib out and toward the tip (up the picture), a rounded strip that thins to its point,
// lighter toward the midrib.
function drawBlade(surface, alpha, { middle, y, side, reach, green }) {
  const length = Math.ceil(reach * 1.15);
  for (let step = 0; step <= length; step += 1) {
    const share = step / length;
    const radius = 2.1 * (1 - 0.7 * share ** 2);
    const color = [green[0] + 30 * (1 - share), green[1] + 25 * (1 - share), green[2] + 10 * (1 - share)];
    paintDot(surface, alpha, { x: middle + side * reach * share, y: y - reach * 0.55 * share, radius, color, lift: 70 });
  }
}

function drawMidrib(surface, alpha, middle) {
  for (let y = 0; y < surface.height; y += 1) {
    paintDot(surface, alpha, { x: middle, y, radius: 2.4, color: MIDRIB, lift: 110 });
  }
}

// A round dot in the colour, alpha and height maps at once, the height a dome `lift` high.
function paintDot(surface, alpha, { x, y, radius, color, lift }) {
  const reach = Math.ceil(radius);
  for (let dy = -reach; dy <= reach; dy += 1) {
    for (let dx = -reach; dx <= reach; dx += 1) {
      const [column, row] = [Math.round(x) + dx, Math.round(y) + dy];
      const share = Math.hypot(column - x, row - y) / radius;
      if (share < 1) {
        surface.colors.mix(column, row, color);
        alpha.mix(column, row, [255, 255, 255]);
        surface.setHeight(column, row, Math.max(surface.heightAt(column, row), FROND_BASE + lift * Math.sqrt(1 - share * share)));
      }
    }
  }
}
