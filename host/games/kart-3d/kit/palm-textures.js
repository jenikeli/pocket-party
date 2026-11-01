// The kit's palm textures (M7d4c2; redrawn in M7d4c4 after the Blender palm's baked maps), drawn with
// kit/surface-maps.js so each has colour, relief, shade and roughness maps: the bark of one trunk scale (fibres
// and a rounded rim along its lip, orange-brown) and a frond (broad pointed blades in two greens angled toward
// the tip, a pale midrib, cut out by an alpha map). Used by kit/palm.js and kit/palm-trunk.js.

import { createSurface } from './surface-maps.js';
import { createPixelImage } from './pixel-image.js';
import { createRandom, between } from '../random.js';
import { BLADE_ANGLE, CARD_HALF_WIDTH, FROND_LENGTH, bladeReach } from './palm-frond.js';

// The bark picture, from its foot up: a plain white strip that the crown's balls point at (so their vertex colour
// alone tints them), the underside of a lip, then one scale from its lip to its tucked top. Texture heights (v)
// of the strip's middle, the underside's, and the scale's lip and top.
export const PLAIN_V = 0.04;
export const BARK_UNDER_V = 0.12;
export const BARK_LIP_V = 0.2;
export const BARK_TOP_V = 0.97;

const BARK = [212, 135, 58];
const BARK_DARK = [116, 64, 28];
// Once round the trunk (8 teeth, one unit each) by one scale, at 64 pixels a unit: 512 x 256.
const BARK_UNITS = { width: 8, height: 4 };
const BARK_PIXELS_PER_UNIT = 64;
const BARK_BASE = 120;

// Returns { map, normalMap, aoMap, roughnessMap } for the trunk, repeating round it.
export function drawBark() {
  const random = createRandom(97);
  const surface = createSurface(BARK_UNITS.width, BARK_UNITS.height, BARK_PIXELS_PER_UNIT, { color: BARK, roughness: 0.85, base: BARK_BASE });
  const [lip, top] = [BARK_LIP_V * BARK_UNITS.height, BARK_TOP_V * BARK_UNITS.height];
  streakColours(surface, random);
  for (let fibre = 0; fibre < 160; fibre += 1) {
    const x = between(random, 0, BARK_UNITS.width);
    const from = [x, between(random, lip + 0.1, lip + 1.5)];
    const to = [x + between(random, -0.08, 0.08), between(random, lip + 1.6, top)];
    surface.groove(from, to, { size: between(random, 0.025, 0.05), depth: between(random, 20, 45), color: BARK_DARK, amount: 0.25, roughness: 1 });
  }
  roundRim(surface, lip);
  plainStrip(surface);
  return surface.toMaps({ depth: 5, shade: { reach: 0.08, strength: 2 }, repeat: true });
}

// Each column a little lighter or darker than the bark's colour, so the fibres run in long streaks.
function streakColours(surface, random) {
  let streak = 0;
  for (let column = 0; column < surface.width; column += 1) {
    if (column % 4 === 0) {
      streak = between(random, -0.15, 0.15);
    }
    const target = streak > 0 ? [255, 190, 110] : [70, 34, 12];
    for (let row = 0; row < surface.height; row += 1) {
      surface.colors.mix(column, row, target, Math.abs(streak));
    }
  }
}

// The lip's edge rolled over like a thick shell's: the bark rises from the very edge to a rounded rim and eases
// back to the scale's face, so the rim catches the light and the edge under it falls away, lighter on the rim.
function roundRim(surface, lip) {
  const [, lipRow] = surface.pixelsAt(0, lip);
  const rimPixels = 0.4 * BARK_PIXELS_PER_UNIT;
  for (let step = 0; step < rimPixels; step += 1) {
    const share = step / rimPixels;
    const rise = Math.sin(Math.PI * share);
    for (let column = 0; column < surface.width; column += 1) {
      const row = lipRow - step;
      surface.setHeight(column, row, surface.heightAt(column, row) + 70 * rise - 40 * (1 - share) ** 6);
      surface.colors.mix(column, row, [240, 165, 80], 0.35 * rise);
    }
  }
}

// The plain strip and the underside below the lip: flat, the strip white, the underside dark bark.
function plainStrip(surface) {
  const [, lipRow] = surface.pixelsAt(0, BARK_LIP_V * BARK_UNITS.height);
  const [, stripRow] = surface.pixelsAt(0, 2 * PLAIN_V * BARK_UNITS.height);
  for (let row = Math.round(lipRow) + 1; row < surface.height; row += 1) {
    for (let column = 0; column < surface.width; column += 1) {
      surface.colors.mix(column, row, row >= stripRow ? [255, 255, 255] : BARK_DARK);
      surface.setHeight(column, row, BARK_BASE);
    }
  }
}

// The frond picture: u across the widest card (palm-frond.js's CARD_HALF_WIDTH either side of the midrib), v
// along it to the tip; 256 x 512.
const FROND_PIXELS = { width: 256, height: 512 };
const FROND_BASE = 90;
const BLADES = 26;
const GREENS = [[47, 143, 44], [86, 184, 60]];
const MIDRIB = [176, 196, 92];
// Metres across and along that one pixel covers, for the blades' soft edges.
const PIXEL_METRES = (2 * CARD_HALF_WIDTH) / FROND_PIXELS.width;

// Returns { map, normalMap, aoMap, roughnessMap, alphaMap } for a frond: the blades and midrib are opaque in the
// alpha map, the gaps between them cut out. The gaps keep the darker green, so blades' edges never fade to black.
export function drawFrond() {
  const random = createRandom(83);
  const surface = createSurface(1, 2, FROND_PIXELS.width, { color: GREENS[0], roughness: 0.7, base: FROND_BASE });
  const alpha = createPixelImage(surface.width, surface.height);
  alpha.fill(() => [0, 0, 0]);
  for (const side of [-1, 1]) {
    for (let blade = 0; blade < BLADES; blade += 1) {
      const root = 0.04 + (0.9 * (blade + between(random, -0.25, 0.25))) / BLADES;
      const reach = bladeReach(root) * between(random, 0.85, 1);
      drawBlade(surface, alpha, { root, side, reach, green: GREENS[Math.floor(random() * 2)] });
    }
  }
  drawMidrib(surface, alpha);
  return { ...surface.toMaps({ depth: 4, shade: { reach: 0.02, strength: 1.5 }, repeat: false }), alphaMap: alpha.toDataTexture({ repeat: false }) };
}

// A picture pixel's place on the frond in metres: [along from its foot, out from the midrib].
function frondMetresAt(column, row) {
  return [(1 - (row + 0.5) / FROND_PIXELS.height) * FROND_LENGTH, ((column + 0.5) / FROND_PIXELS.width - 0.5) * 2 * CARD_HALF_WIDTH];
}

// The pixel [column, row] at a place on the frond, in metres.
function frondPixelAt(along, out) {
  return [(out / (2 * CARD_HALF_WIDTH) + 0.5) * FROND_PIXELS.width, (1 - along / FROND_LENGTH) * FROND_PIXELS.height];
}

// One blade from the midrib at `root` (a share of the frond) out to `reach` on `side`, angled toward the tip:
// pointed, widest a little past its foot, a ridge down its middle, bending down toward its tip, darker at its
// foot.
function drawBlade(surface, alpha, { root, side, reach, green }) {
  const start = [root * FROND_LENGTH, side * 0.03];
  const end = [start[0] + reach / Math.tan(BLADE_ANGLE), side * reach];
  const axis = [end[0] - start[0], end[1] - start[1]];
  const length = Math.hypot(...axis);
  const corners = [frondPixelAt(...start), frondPixelAt(...end)];
  const margin = 0.07 / PIXEL_METRES;
  for (let row = Math.floor(Math.min(corners[0][1], corners[1][1]) - margin); row <= Math.max(corners[0][1], corners[1][1]) + margin; row += 1) {
    for (let column = Math.floor(Math.min(corners[0][0], corners[1][0]) - margin); column <= Math.max(corners[0][0], corners[1][0]) + margin; column += 1) {
      const [along, out] = frondMetresAt(column, row);
      const t = ((along - start[0]) * axis[0] + (out - start[1]) * axis[1]) / (length * length);
      if (t < 0 || t > 1 || row < 0 || row >= surface.height) {
        continue;
      }
      const away = Math.abs((along - start[0]) * axis[1] - (out - start[1]) * axis[0]) / length;
      const halfWidth = Math.max(0.003, 0.058 * Math.sin(Math.PI * (0.12 + 0.88 * t)) ** 0.7);
      const cover = Math.min(Math.max((halfWidth - away) / PIXEL_METRES + 0.5, 0), 1);
      if (cover > 0) {
        const shade = 0.66 + 0.3 * t;
        surface.colors.mix(column, row, green.map((channel) => channel * shade), cover);
        alpha.mix(column, row, [255, 255, 255], cover);
        const ridge = 50 * (1 - Math.min(away / halfWidth, 1));
        surface.setHeight(column, row, Math.max(surface.heightAt(column, row), FROND_BASE + 60 + ridge - 45 * t * t));
      }
    }
  }
}

// The midrib along the frond's middle, tapering from its foot to the tip, raised and pale.
function drawMidrib(surface, alpha) {
  for (let row = 0; row < surface.height; row += 1) {
    const [along] = frondMetresAt(0, row);
    const radius = (0.04 - (0.028 * along) / FROND_LENGTH) / PIXEL_METRES;
    const [middle] = frondPixelAt(along, 0);
    for (let column = Math.floor(middle - radius - 1); column <= middle + radius + 1; column += 1) {
      const away = Math.abs(column + 0.5 - middle);
      const cover = Math.min(Math.max(radius - away + 0.5, 0), 1);
      if (cover > 0) {
        surface.colors.mix(column, row, MIDRIB, cover);
        alpha.mix(column, row, [255, 255, 255], cover);
        const dome = Math.sqrt(Math.max(0, 1 - (away / radius) ** 2));
        surface.setHeight(column, row, Math.max(surface.heightAt(column, row), FROND_BASE + 90 + 40 * dome));
      }
    }
  }
}
