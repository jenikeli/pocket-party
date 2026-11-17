// The drawn maps of the airport's terminal and control tower (M9): the coloured band over the terminal's glass (a
// coral stripe stepping up and down over sunny yellow, our own take on the reference airport course's zigzag),
// white metal cladding panels, the roof's standing-seam metal, the skylight's framed panes and the jet bridges'
// ribbed steel, each with its relief, shade and roughness (kit/surface-maps.js). Used by kit/terminal.js and
// kit/control-tower.js.

import { createSurface, hexToRgb } from './surface-maps.js';
import { drawnOnce } from '../canvas-texture.js';

export const CORAL = 0xf0532d;
export const SUN_YELLOW = 0xffc531;
const NAVY = 0x1e3566;
const BAND_WHITE = 0xf2efe8;

// The band's pattern repeats every BAND_PERIOD units along the terminal, and is BAND_HEIGHT tall.
export const BAND_PERIOD = 16;
export const BAND_HEIGHT = 2.5;
// The stripe runs at these two heights (its middle, in units up the band), climbing and dropping over SLANT units.
const LOW = 0.8;
const HIGH = 1.7;
const SLANT = 1.5;
const STRIPE = 0.5;
const RAISED_LENGTH = 6;

// Where the stripe's middle is `x` units along one period: up a slant, along the top, down a slant, along the
// bottom.
function stripeMiddle(x) {
  if (x < SLANT) {
    return LOW + ((HIGH - LOW) * x) / SLANT;
  }
  if (x < SLANT + RAISED_LENGTH) {
    return HIGH;
  }
  if (x < 2 * SLANT + RAISED_LENGTH) {
    return HIGH - ((HIGH - LOW) * (x - SLANT - RAISED_LENGTH)) / SLANT;
  }
  return LOW;
}

// What the band shows at (x, y) units: the navy foot line, the coral stripe, yellow under the stripe where it is
// raised, white elsewhere; and how high it stands (the stripe and the yellow stand proud of the white).
function bandPaint(x, y) {
  const middle = stripeMiddle(x);
  if (y < 0.18) {
    return { hex: NAVY, lift: 0, roughness: 0.5 };
  }
  if (Math.abs(y - middle) < STRIPE / 2) {
    return { hex: CORAL, lift: 50, roughness: 0.35 };
  }
  if (y < middle && middle > LOW + 0.05 && y > 0.32) {
    return { hex: SUN_YELLOW, lift: 30, roughness: 0.4 };
  }
  return { hex: BAND_WHITE, lift: 0, roughness: 0.55 };
}

// One period of the band, to repeat along it: 512 by 80 pixels.
export function createBandMaps() {
  return drawnOnce('terminal-band', drawBandMaps);
}

function drawBandMaps() {
  const pixelsPerUnit = 32;
  const surface = createSurface(BAND_PERIOD, BAND_HEIGHT, pixelsPerUnit, { color: hexToRgb(BAND_WHITE), roughness: 0.55, base: 100 });
  for (let row = 0; row < surface.height; row += 1) {
    for (let column = 0; column < surface.width; column += 1) {
      const paint = bandPaint(column / pixelsPerUnit, BAND_HEIGHT - row / pixelsPerUnit);
      surface.colors.mix(column, row, hexToRgb(paint.hex));
      surface.roughnesses.mix(column, row, [paint.roughness * 255, paint.roughness * 255, paint.roughness * 255]);
      surface.setHeight(column, row, 100 + paint.lift);
    }
  }
  // Panel joints across the band, every 4 units, as its cladding is hung.
  for (let x = 0; x < BAND_PERIOD; x += 4) {
    surface.groove([x, 0], [x, BAND_HEIGHT], { size: 0.06, depth: 40, color: [60, 60, 70], amount: 0.35, roughness: 0.7 });
  }
  return surface.toMaps({ depth: 3, shade: { reach: 0.1, strength: 1.5 }, repeat: true });
}

// White metal cladding: panels 2 wide and 1.5 tall with dark joints, in a tile 4 by 3 units (256 by 192 pixels).
// The tower's shaft and the terminal's walls wear it.
export function createCladdingMaps() {
  return drawnOnce('terminal-cladding', drawCladdingMaps);
}

function drawCladdingMaps() {
  const surface = createSurface(4, 3, 64, { color: [150, 152, 158], roughness: 0.6, base: 80 });
  for (let column = 0; column < 2; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      const paint = { color: hexToRgb((column + row) % 2 === 0 ? 0xf1eee8 : 0xe9e6df), roughness: 0.45 };
      surface.panel({ left: column * 2 + 0.02, bottom: row * 1.5 + 0.02, width: 1.96, height: 1.46 }, { lift: 60, bevel: 0.04, paint });
    }
  }
  return surface.toMaps({ depth: 4, shade: { reach: 0.08, strength: 1.2 }, repeat: true });
}

// A standing-seam metal roof: light grey sheets 1 unit wide, in a tile 4 by 4 units (256 pixels).
export function createRoofMaps() {
  return drawnOnce('terminal-roof', drawRoofMaps);
}

function drawRoofMaps() {
  const surface = createSurface(4, 4, 64, { color: [120, 126, 134], roughness: 0.6, base: 60 });
  for (let sheet = 0; sheet < 4; sheet += 1) {
    const paint = { color: hexToRgb(sheet % 2 === 0 ? 0xc3c9d0 : 0xbcc2ca), roughness: 0.4 };
    surface.panel({ left: sheet + 0.04, bottom: 0, width: 0.92, height: 4 }, { lift: 100, bevel: 0.12, paint });
  }
  return surface.toMaps({ depth: 3, shade: { reach: 0.1, strength: 1 }, repeat: true });
}

// The skylight's glazing: white frames round sky-blue panes 2 units square, in a tile 4 by 4 units (256 pixels).
export function createSkylightMaps() {
  return drawnOnce('terminal-skylight', drawSkylightMaps);
}

function drawSkylightMaps() {
  const surface = createSurface(4, 4, 64, { color: hexToRgb(0xf4f4f2), roughness: 0.35, base: 200 });
  for (let column = 0; column < 2; column += 1) {
    for (let row = 0; row < 2; row += 1) {
      const paint = { color: hexToRgb(0x7fb8e0), roughness: 0.05 };
      surface.panel({ left: column * 2 + 0.12, bottom: row * 2 + 0.12, width: 1.76, height: 1.76 }, { lift: -120, bevel: 0.04, paint });
    }
  }
  return surface.toMaps({ depth: 3, shade: { reach: 0.1, strength: 1.2 }, repeat: true });
}

// The jet bridges' ribbed steel: ribs 0.25 apart running up, with a seam every 2 units, in a tile 2 by 2 units
// (128 pixels).
export function createRibbedMaps() {
  return drawnOnce('terminal-ribbed', drawRibbedMaps);
}

function drawRibbedMaps() {
  const surface = createSurface(2, 2, 64, { color: hexToRgb(0xd8dce1), roughness: 0.4, base: 120 });
  for (let x = 0; x < 2; x += 0.25) {
    surface.groove([x, 0], [x, 2], { size: 0.05, depth: 60, color: [90, 96, 104], amount: 0.3, roughness: 0.6 });
  }
  surface.groove([0, 0], [0, 2], { size: 0.08, depth: 90, color: [60, 64, 70], amount: 0.5, roughness: 0.7 });
  return surface.toMaps({ depth: 3, shade: { reach: 0.06, strength: 1 }, repeat: true });
}
