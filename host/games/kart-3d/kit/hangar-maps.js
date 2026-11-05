// The hangars' drawn maps (M9): corrugated metal sheet (its colour comes from the vertex colours, so one map
// serves the blue roof, the white doors and every airline's walls), the glazing's framed see-through panes, the
// signs (a name, and on the big hangar our own emblem: a sun over a palm) and the big hangar's floor markings.
// Used by kit/hangar-parts.js, kit/hangar.js and kit/hangar-big-skin.js.

import { createCanvas, canvasTexture, repeatingTexture } from '../canvas-texture.js';
import { createSurface } from './surface-maps.js';

const FONT = '"Arial Black", "Helvetica Neue", Arial, sans-serif';
// Our airport's colours, as the terminal's (kit/terminal-maps.js).
export const CORAL = 0xf0532d;
export const SUN_YELLOW = 0xffc531;
export const NAVY = 0x1e3566;
const PALM_GREEN = '#2f9e58';
const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

// Corrugated sheet in a tile 2 units square (256 pixels): ribs every 0.25 units running up the tile, rounded
// as real sheet is, its valleys a little darker, and a lap where one sheet overlaps the next at the tile's foot.
export function createCorrugatedMaps() {
  const pixelsPerUnit = 128;
  const surface = createSurface(2, 2, pixelsPerUnit, { color: [236, 238, 240], roughness: 0.45, base: 128 });
  for (let row = 0; row < surface.height; row += 1) {
    for (let column = 0; column < surface.width; column += 1) {
      const wave = Math.cos((2 * Math.PI * column) / (0.25 * pixelsPerUnit));
      surface.setHeight(column, row, 128 + 70 * wave);
      surface.colors.mix(column, row, [150, 156, 166], 0.18 * (1 - wave) / 2);
    }
  }
  surface.groove([0, 0.02], [2, 0.02], { size: 0.05, depth: 60, color: [70, 74, 84], amount: 0.4, roughness: 0.7 });
  return surface.toMaps({ depth: 2.5, shade: { reach: 0.06, strength: 0.8 }, repeat: true });
}

// Glazing in a tile 4 units wide and 3 tall (256 by 192 pixels): white frames round pale blue panes that let
// most light through.
export function createGlazingMaps() {
  const { canvas, context } = createCanvas(256, 192);
  context.fillStyle = 'rgba(245, 247, 250, 1)';
  context.fillRect(0, 0, 256, 192);
  context.clearRect(6, 6, 116, 180);
  context.clearRect(134, 6, 116, 180);
  context.fillStyle = 'rgba(150, 200, 235, 0.32)';
  context.fillRect(6, 6, 116, 180);
  context.fillRect(134, 6, 116, 180);
  // A glint across each pane, as glass catches the sky.
  context.fillStyle = 'rgba(255, 255, 255, 0.22)';
  for (const left of [6, 134]) {
    context.beginPath();
    context.moveTo(left + 20, 186);
    context.lineTo(left + 60, 6);
    context.lineTo(left + 84, 6);
    context.lineTo(left + 44, 186);
    context.fill();
  }
  return repeatingTexture(canvas);
}

// A sign board `width` by `height` pixels: `text` in `ink` on `board`, a stripe of `stripe` along its foot, and
// with `emblem` our sun over a palm to the left of the text.
export function createSignTexture({ text, board, ink, stripe, emblem = false, width = 1024, height = 256 }) {
  const { canvas, context } = createCanvas(width, height);
  context.fillStyle = css(board);
  context.fillRect(0, 0, width, height);
  context.fillStyle = css(stripe);
  context.fillRect(0, height * 0.82, width, height * 0.18);
  const textLeft = emblem ? height * 1.1 : 0;
  if (emblem) {
    drawEmblem(context, height * 0.55, height * 0.42, height * 0.36);
  }
  context.font = `italic 900 ${Math.round(height * 0.5)}px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = css(ink);
  context.fillText(text, textLeft + (width - textLeft) / 2, height * 0.42, (width - textLeft) * 0.9);
  return canvasTexture(canvas);
}

// Our airport's emblem round (x, y), `radius` big: a yellow sun with rays behind a green palm.
function drawEmblem(context, x, y, radius) {
  context.fillStyle = css(SUN_YELLOW);
  context.beginPath();
  context.arc(x, y, radius * 0.62, 0, 2 * Math.PI);
  context.fill();
  context.lineWidth = radius * 0.1;
  context.strokeStyle = css(SUN_YELLOW);
  for (let ray = 0; ray < 12; ray += 1) {
    const angle = (ray / 12) * 2 * Math.PI;
    context.beginPath();
    context.moveTo(x + Math.cos(angle) * radius * 0.75, y + Math.sin(angle) * radius * 0.75);
    context.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    context.stroke();
  }
  context.strokeStyle = '#7a4a26';
  context.lineWidth = radius * 0.14;
  context.beginPath();
  context.moveTo(x + radius * 0.1, y + radius * 0.95);
  context.quadraticCurveTo(x + radius * 0.2, y, x - radius * 0.05, y - radius * 0.35);
  context.stroke();
  context.fillStyle = PALM_GREEN;
  for (const angle of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
    context.beginPath();
    context.ellipse(x - radius * 0.05 + Math.cos(angle) * radius * 0.42, y - radius * 0.35 + Math.sin(angle) * radius * 0.3,
      radius * 0.48, radius * 0.13, angle, 0, 2 * Math.PI);
    context.fill();
  }
}

// The big hangar's floor markings over the ring's infield (`outline`, [x, z] corners in the hangar's frame;
// `bounds` { minX, maxX, minZ, maxZ } round it), drawn at `pixelsPerUnit`, see-through where unpainted: a
// yellow safety line round the edge, a stand for a plane (a lead-in line from the doors, a stop bar and a box
// with H1), and red-and-white hatched boxes by the doors. Canvas x runs along the hangar's z, y down its x.
export function createFloorMarkings(outline, bounds, pixelsPerUnit) {
  const width = Math.ceil((bounds.maxZ - bounds.minZ) * pixelsPerUnit);
  const height = Math.ceil((bounds.maxX - bounds.minX) * pixelsPerUnit);
  const { canvas, context } = createCanvas(width, height);
  const toPixel = ([x, z]) => [(z - bounds.minZ) * pixelsPerUnit, (bounds.maxX - x) * pixelsPerUnit];
  const unit = pixelsPerUnit;
  context.lineJoin = 'round';
  // The edge line: a wide yellow stroke of the outline with its outer part cleared, 0.35 wide and 0.6 in.
  traceOutline(context, outline.map(toPixel));
  context.strokeStyle = css(SUN_YELLOW);
  context.lineWidth = 2 * 0.95 * unit;
  context.stroke();
  context.globalCompositeOperation = 'destination-out';
  context.lineWidth = 2 * 0.6 * unit;
  context.stroke();
  context.globalCompositeOperation = 'source-over';
  const middleZ = (bounds.minZ + bounds.maxZ) / 2;
  const [standX, standY] = toPixel([bounds.minX + (bounds.maxX - bounds.minX) * 0.45, middleZ]);
  const [, doorY] = toPixel([bounds.maxX, middleZ]);
  context.strokeStyle = css(SUN_YELLOW);
  context.lineWidth = 0.35 * unit;
  context.beginPath();
  context.moveTo(standX, doorY);
  context.lineTo(standX, standY);
  context.moveTo(standX - 4 * unit, standY);
  context.lineTo(standX + 4 * unit, standY);
  context.stroke();
  context.strokeRect(standX - 9 * unit, standY + 4 * unit, 18 * unit, 9 * unit);
  context.fillStyle = css(SUN_YELLOW);
  context.font = `900 ${Math.round(5 * unit)}px ${FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('H1', standX, standY + 8.5 * unit);
  for (const side of [-1, 1]) {
    hatchedBox(context, standX + side * 13 * unit - 3 * unit, doorY + 1.5 * unit, 6 * unit, 6 * unit, unit);
  }
  return canvasTexture(canvas);
}

function traceOutline(context, points) {
  context.beginPath();
  points.forEach(([x, y], index) => (index === 0 ? context.moveTo(x, y) : context.lineTo(x, y)));
  context.closePath();
}

// A box of red and white diagonal stripes with a red border: keep clear.
function hatchedBox(context, left, top, width, height, unit) {
  context.save();
  context.beginPath();
  context.rect(left, top, width, height);
  context.clip();
  context.fillStyle = 'rgba(245, 245, 240, 0.9)';
  context.fillRect(left, top, width, height);
  context.fillStyle = css(CORAL);
  for (let offset = -height; offset < width; offset += unit) {
    context.beginPath();
    context.moveTo(left + offset, top + height);
    context.lineTo(left + offset + height, top);
    context.lineTo(left + offset + height + unit / 2, top);
    context.lineTo(left + offset + unit / 2, top + height);
    context.fill();
  }
  context.restore();
  context.strokeStyle = css(CORAL);
  context.lineWidth = 0.3 * unit;
  context.strokeRect(left, top, width, height);
}

