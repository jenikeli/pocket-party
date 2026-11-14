// The padded sponsor wall with its detail in textures (M7d4b2): every board
// framed, a raised light rim round it with a bolt in each corner, drawn over a copy of the sponsor atlas twice as
// sharp (kit/sponsors.js); and the pad's own maps, one board long: a seam where boards meet, the cushion
// bulging softly between seams, two rows of stitching along it and KARTWHEEL printed on its front slope tone on
// tone, as on the reference stadium course's (docs/kart-reference.md). Used by kit/sponsor-wall.js.

import * as THREE from 'three';
import { drawSponsorAtlas } from './sponsors.js';
import { createSurface, hexToRgb, grey } from './surface-maps.js';
import { createCanvas, drawnOnce } from '../canvas-texture.js';

// The atlas copy's pixels per atlas pixel.
const ATLAS_SCALE = 2;
const FRAME_COLOR = 0xdcdcd6;
const BOLT_COLOR = 0x7c828c;
// The rim's width at the boards' ends and along their top and bottom, and the bolts' heights, as shares of a
// board's length and height (a board is about 4 units long and 1 high).
const RIM_ACROSS = 0.02;
const RIM_UP = 0.05;
const BOLT_UP = [0.14, 0.85];
const PAD_PIXELS_PER_UNIT = 128;
// The pad's paint is this share of white, so its print can be lighter: the pad's colour comes from its vertices,
// made brighter by as much (padColor) so the pad keeps M7d4a's colour.
const PAD_SHADE = 0.86;

// `board` is { length, padLength, padRidge, padColor }: how long one board is along the road, how far it is round
// the pad's cross-section, how far round it the pad's ridge is (its front slope runs up to there), and the pad's
// colour (a hex). `keep(thing)` registers what must be disposed. Returns { boardMaterial, padMaterial, padColor }:
// padColor is the colour to give the pad's vertices.
export function createSponsorWallDetail(keep, board) {
  const boardMaps = drawnOnce('sponsor-board', drawBoardMaps);
  const padMaps = drawnOnce(`sponsor-pad:${board.length}:${board.padLength}:${board.padRidge}`, () => drawPadMaps(board));
  [...Object.values(boardMaps), ...Object.values(padMaps)].forEach(keep);
  // The paint's grey as Three.js multiplies it, in linear light.
  const paintShare = new THREE.Color().setRGB(PAD_SHADE, PAD_SHADE, PAD_SHADE, THREE.SRGBColorSpace).r;
  return {
    boardMaterial: keep(new THREE.MeshStandardMaterial({ ...boardMaps, roughness: 1 })),
    padMaterial: keep(new THREE.MeshStandardMaterial({ ...padMaps, vertexColors: true, roughness: 1 })),
    padColor: new THREE.Color(board.padColor).multiplyScalar(1 / paintShare).getHex(),
  };
}

// The atlas, every brand's board in a raised rim with four bolts, drawn in pixels of the copy (one unit a pixel).
function drawBoardMaps() {
  const atlas = drawSponsorAtlas(ATLAS_SCALE);
  const { width, height } = atlas.canvas;
  const printed = atlas.context.getImageData(0, 0, width, height).data;
  const surface = createSurface(width, height, 1, { color: [255, 255, 255], roughness: 0.38, base: 110 });
  surface.colors.fill((x, y) => {
    const offset = (y * width + x) * 4;
    return [printed[offset], printed[offset + 1], printed[offset + 2]];
  });
  const rimPaint = { color: hexToRgb(FRAME_COLOR), roughness: 0.5 };
  for (const cell of atlas.cells) {
    const bottom = height - cell.top - cell.height;
    const [across, up] = [Math.max(2, cell.width * RIM_ACROSS), Math.max(2, cell.height * RIM_UP)];
    const rims = [
      { left: cell.left, bottom, width: across, height: cell.height },
      { left: cell.left + cell.width - across, bottom, width: across, height: cell.height },
      { left: cell.left, bottom, width: cell.width, height: up },
      { left: cell.left, bottom: bottom + cell.height - up, width: cell.width, height: up },
    ];
    rims.forEach((rect) => surface.panel(rect, { lift: 70, bevel: 2, paint: rimPaint }));
    for (const share of BOLT_UP) {
      for (const x of [cell.left + across / 2, cell.left + cell.width - across / 2]) {
        surface.bolt(x, bottom + cell.height * share, { radius: across * 0.55, lift: 60, color: hexToRgb(BOLT_COLOR), roughness: 0.3 });
      }
    }
  }
  return surface.toMaps({ depth: 3, shade: { reach: 3, strength: 2 }, repeat: false });
}

// One board's length of pad (x along the road) by once round its cross-section (y, from its foot at the boards
// over the ridge to its back).
function drawPadMaps({ length, padLength, padRidge }) {
  const surface = createSurface(length, padLength, PAD_PIXELS_PER_UNIT, { color: grey(PAD_SHADE), roughness: 0.45, base: 150 });
  const { width, height } = surface;
  // The cushion bulges a little between the seams at its ends.
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      surface.setHeight(column, row, surface.heightAt(column, row) + 40 * Math.sin((Math.PI * column) / width));
    }
  }
  printTone(surface, 'KARTWHEEL', padRidge - 0.17, 0.17);
  // At the tile's edge, so it wraps round to show at both ends.
  surface.groove([0, 0], [0, padLength], { size: 0.04, depth: 90, color: [80, 80, 80], amount: 0.5, roughness: 0.7 });
  const stitch = { size: 0.014, depth: 30, color: [150, 150, 150], amount: 0.35, roughness: 0.6 };
  for (const y of [0.07, padRidge - 0.04]) {
    for (let x = 0.05; x + 0.06 < length; x += 0.1) {
      surface.groove([x, y], [x + 0.06, y], stitch);
    }
  }
  return surface.toMaps({ depth: 2, shade: { reach: 0.04, strength: 1.5 }, repeat: true });
}

// `text` printed lighter than the paint along the pad, centred `middle` units round it and `size` units tall,
// written to read from the road (the pad's texture runs up its front slope toward the ridge).
function printTone(surface, text, middle, size) {
  const { width, height } = surface;
  const { context } = createCanvas(width, height);
  const pixels = size * PAD_PIXELS_PER_UNIT;
  context.font = `italic 900 ${pixels}px "Arial Black", "Helvetica Neue", Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#ffffff';
  context.fillText(text, width / 2, surface.pixelsAt(0, middle)[1], width * 0.6);
  const ink = context.getImageData(0, 0, width, height).data;
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const share = ink[(row * width + column) * 4 + 3] / 255;
      if (share > 0) {
        surface.colors.mix(column, row, [255, 255, 255], share);
        surface.roughnesses.mix(column, row, grey(0.32), share);
      }
    }
  }
}
