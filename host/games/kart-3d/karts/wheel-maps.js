// The tyres' maps (M7d5), drawn once while the race starts and shared by every wheel: black rubber with POCKET
// PARTY raised in white round the outer sidewall, a gold hub with five round holes, a groove round its brighter
// centre cap, gold
// rims, and where those rims glow in anti-gravity. u runs round the wheel and v along its outline (wheels.js's
// WHEEL_OUTLINE), so each band of v is one part of the wheel. Used by kart-materials.js.

import { createPixelImage } from '../kit/pixel-image.js';
import { createCanvas } from '../canvas-texture.js';
import { hexToRgb, grey } from '../kit/surface-maps.js';
import { WHEEL_OUTLINE } from './wheels.js';

const WIDTH = 512;
const HEIGHT = 256;
// Each part's band of v (from, to), as WHEEL_OUTLINE lays them out.
const BANDS = [
  { part: 'cap', to: 0.095, color: 0xf6c94a, roughness: 0.25, metal: 1, height: 170 },
  { part: 'hub', to: 0.305, color: 0xe0a821, roughness: 0.3, metal: 1, height: 120 },
  { part: 'rim', to: 0.38, color: 0xeab232, roughness: 0.22, metal: 1, height: 150, glows: true },
  { part: 'side', to: 0.6, color: 0x26262b, roughness: 0.85, metal: 0, height: 128 },
  { part: 'tread', to: 0.835, color: 0x222226, roughness: 0.9, metal: 0, height: 128 },
  { part: 'side', to: 0.905, color: 0x26262b, roughness: 0.85, metal: 0, height: 128 },
  { part: 'rim', to: 0.955, color: 0xc89620, roughness: 0.3, metal: 1, height: 150, glows: true },
  { part: 'hub', to: 1.01, color: 0x8a6a1c, roughness: 0.5, metal: 1, height: 120 },
];
// The hub's five round holes (radius shares of the tyre) and the groove round its cap.
const HOLE = { color: 0x17140f, roughness: 0.7, depth: 90, count: 5, reach: 0.41, radius: 0.075 };
const GROOVE = { reach: 0.27, halfWidth: 0.012, depth: 40 };
const LETTERING = { text: 'POCKET PARTY', color: 0xf2f2f2, roughness: 0.6, lift: 70, middleV: 0.48, size: 28 };
// The sidewall's pixels are about twice as far apart round the wheel as along its outline, so the letters are
// drawn this much narrower than they stand, to look their own shape on the tyre.
const LETTER_SQUEEZE = 0.55;

// Returns { map, normalMap, surfaceMap, emissiveMap }: surfaceMap is both the roughness map (green) and the
// metalness map (blue), as Three.js reads them.
export function createWheelMaps() {
  const colors = createPixelImage(WIDTH, HEIGHT);
  const surface = createPixelImage(WIDTH, HEIGHT);
  const heights = createPixelImage(WIDTH, HEIGHT);
  const glow = createPixelImage(WIDTH, HEIGHT);
  for (let row = 0; row < HEIGHT; row += 1) {
    // The canvas's rows run down, v up.
    const v = 1 - (row + 0.5) / HEIGHT;
    const band = BANDS.find((each) => v < each.to);
    for (let column = 0; column < WIDTH; column += 1) {
      const look = band.part === 'hub' && v < 0.5 ? hubLook((column + 0.5) / WIDTH, v, band) : band;
      colors.mix(column, row, hexToRgb(look.color));
      surface.mix(column, row, [0, look.roughness * 255, look.metal * 255]);
      heights.mix(column, row, grey(look.height / 255));
      glow.mix(column, row, grey(band.glows ? 1 : 0));
    }
  }
  drawLettering(colors, surface, heights);
  return {
    map: colors.toTexture({ repeat: false }),
    normalMap: heights.toReliefTexture({ depth: 3, repeat: false }),
    surfaceMap: surface.toDataTexture({ repeat: false }),
    emissiveMap: glow.toTexture({ repeat: false }),
  };
}

// How the hub's face looks at (u, v): in one of its five round holes, in the groove round its cap, or plain gold
// (`band`). Worked out in the face's own plane, from how far out along the outline v is.
function hubLook(u, v, band) {
  const reach = radiusShareAt(v);
  const angle = u * Math.PI * 2;
  const [x, y] = [Math.cos(angle) * reach, Math.sin(angle) * reach];
  const inHole = Array.from({ length: HOLE.count }, (unused, hole) => (hole * Math.PI * 2) / HOLE.count).some(
    (holeAngle) => Math.hypot(x - Math.cos(holeAngle) * HOLE.reach, y - Math.sin(holeAngle) * HOLE.reach) < HOLE.radius,
  );
  if (inHole) {
    return { ...HOLE, metal: 0, height: band.height - HOLE.depth };
  }
  if (Math.abs(reach - GROOVE.reach) < GROOVE.halfWidth) {
    return { ...band, color: 0x9a6f12, height: band.height - GROOVE.depth };
  }
  return band;
}

// How far out from the axle (a share of the radius) the outline is at v, between its points.
function radiusShareAt(v) {
  const next = WHEEL_OUTLINE.findIndex((point) => point[2] >= v);
  if (next <= 0) {
    return WHEEL_OUTLINE[Math.max(next, 0)][0];
  }
  const [before, after] = [WHEEL_OUTLINE[next - 1], WHEEL_OUTLINE[next]];
  return before[0] + ((after[0] - before[0]) * (v - before[2])) / (after[2] - before[2]);
}

// POCKET PARTY twice round the outer sidewall, raised: drawn with the canvas's own text on a scratch canvas, then
// read back once and laid onto the maps.
function drawLettering(colors, surface, heights) {
  const { context } = createCanvas(WIDTH, HEIGHT);
  context.fillStyle = '#ffffff';
  context.font = `italic bold ${LETTERING.size}px Arial, Helvetica, sans-serif`;
  context.textBaseline = 'middle';
  const row = (1 - LETTERING.middleV) * HEIGHT;
  [0.06, 0.56].forEach((start) => {
    context.save();
    context.translate(start * WIDTH, row);
    context.scale(LETTER_SQUEEZE, 1);
    context.fillText(LETTERING.text, 0, 0);
    context.restore();
  });
  const alpha = context.getImageData(0, 0, WIDTH, HEIGHT).data;
  for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
    const amount = alpha[index * 4 + 3] / 255;
    if (amount > 0) {
      const [column, pixelRow] = [index % WIDTH, Math.floor(index / WIDTH)];
      colors.mix(column, pixelRow, hexToRgb(LETTERING.color), amount);
      surface.mix(column, pixelRow, [0, LETTERING.roughness * 255, 0], amount);
      heights.mix(column, pixelRow, grey(Math.min(255, 128 + LETTERING.lift) / 255), amount);
    }
  }
}
