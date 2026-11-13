// The striped rail with its detail in textures (M7d4b2): the rails shaped to the study's second look at
// Toad Harbor's (docs/mk8dx-reference.md: padded bars about 0.4 tall and 0.2 deep with a flat face and well
// rounded top and bottom, nearly filling the height, a thin dark rod in the narrow gap between them), painted in
// slanted orange bands with worn edges and a soft dimpled padding drawn in their maps; and the post blocks as
// plain rounded boxes with their bolts, their grime and the dark creases round the rails drawn in maps
// (kit/surface-maps.js) instead of built. Used by kit/striped-rail.js.

import * as THREE from 'three';
import { roundProfile, tubeProfile, profileLength } from './extrude.js';
import { roundedBox, at, wrapUv } from '../shape-utils.js';
import { createSurface, hexToRgb } from './surface-maps.js';
import { createRandom } from '../random.js';
import { drawnOnce } from '../canvas-texture.js';

// Each rail's middle above the road, and its half depth (across the road) and half height.
const RAIL_LIFTS = [0.59, 1.03];
const RAIL_HALF_DEPTH = 0.1;
const RAIL_HALF_HEIGHT = 0.19;
const ROD = { lift: 0.81, radius: 0.025, color: 0x34363c };
// One orange and one white band per this many units along a rail.
const STRIPE_LENGTH = 1.1;
// The post block: its size across the road, up and along it, standing on the kerb (0.3 up).
const BLOCK = { across: 0.42, height: 1.0, along: 0.32, bottom: 0.3 };
const WHITE = [244, 240, 230];
const ORANGE = [255, 122, 26];

// `out` is how far out from the edge of the ground the rails' middle is; `keep(thing)` registers what must be
// disposed. Returns { railProfiles, rodProfile, railUv(around, s), railMaterial, rodColor, blockGeometry,
// blockMaterial }.
export function createStripedRailDetail(out, keep) {
  const railProfiles = RAIL_LIFTS.map((lift) => railProfile(out, lift));
  const perimeter = profileLength(railProfiles[0]);
  const blockHeight = BLOCK.height;
  const blockGeometry = wrapUv(at(roundedBox(BLOCK.across, blockHeight, BLOCK.along, 0.07), 0, BLOCK.bottom + blockHeight / 2, 0), BLOCK.bottom, blockHeight);
  const railMaps = drawnOnce(`striped-rail:${perimeter}`, () => drawRailMaps(perimeter));
  const blockMaps = drawnOnce('striped-rail-block', drawBlockMaps);
  [...Object.values(railMaps), ...Object.values(blockMaps)].forEach(keep);
  return {
    railProfiles,
    rodProfile: tubeProfile(out, ROD.lift, ROD.radius, 6),
    rodColor: ROD.color,
    railUv: (around, s) => [around / perimeter, s / STRIPE_LENGTH],
    railMaterial: keep(new THREE.MeshStandardMaterial({ ...railMaps, roughness: 1 })),
    blockGeometry: keep(blockGeometry),
    blockMaterial: keep(new THREE.MeshStandardMaterial({ ...blockMaps, roughness: 1 })),
  };
}

// A rail's cross-section round (out, lift), a rounded bar, listed like tubeProfile's (up its face toward the road
// first), so it closes and its faces point out.
function railProfile(out, lift) {
  const [inner, outer, bottom, top] = [out - RAIL_HALF_DEPTH, out + RAIL_HALF_DEPTH, lift - RAIL_HALF_HEIGHT, lift + RAIL_HALF_HEIGHT];
  return roundProfile([[inner, bottom], [inner, top], [outer, top], [outer, bottom], [inner, bottom]], 0.08, 3);
}

// One stripe's length along the rail (x) by once round it (y): an orange band slanting across white, its edges
// worn so the white shows through in chips, the paint a little rougher there; and the padding's soft dimples in
// rows, each a shallow hollow.
function drawRailMaps(perimeter) {
  const random = createRandom(73);
  const surface = createSurface(STRIPE_LENGTH, perimeter, 230, { color: WHITE, roughness: 0.45, base: 170 });
  const { width, height } = surface;
  surface.colors.fill((x, y) => {
    // The band's middle line runs diagonally; how far a pixel is from it, across the band, in pixels.
    const across = ((((x - (y * width) / height) % width) + width) % width) - width / 2;
    const edge = Math.abs(across) - width / 4;
    const chip = random() < 0.35 && Math.abs(edge) < 3;
    if (edge < 0 && !chip) {
      return ORANGE.map((channel) => channel * (0.94 + 0.06 * random()));
    }
    return WHITE.map((channel) => channel * (0.97 + 0.03 * random()));
  });
  for (let index = 0; index < 120; index += 1) {
    const [x, y] = [random() * width, random() * height];
    surface.roughnesses.dot(x, y, 2 + random() * 3, [170, 170, 170]);
  }
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const x = ((column + (row % 2) / 2) / 6) * STRIPE_LENGTH;
      const y = ((row + 0.5) / 6) * perimeter;
      dimple(surface, x, y, 0.06);
    }
  }
  return surface.toMaps({ depth: 3, shade: { reach: 0.05, strength: 1.2 }, repeat: true });
}

// A shallow round hollow pressed into the padding at (x, y) (units).
function dimple(surface, x, y, radius) {
  const [column, row] = surface.pixelsAt(x, y);
  const pixels = radius * 230;
  for (let dy = -Math.ceil(pixels); dy <= Math.ceil(pixels); dy += 1) {
    for (let dx = -Math.ceil(pixels); dx <= Math.ceil(pixels); dx += 1) {
      const share = Math.hypot(dx, dy) / pixels;
      if (share < 1) {
        const depth = 22 * (1 + Math.cos(share * Math.PI)) * 0.5;
        surface.setHeight(column + dx, row + dy, surface.heightAt(column + dx, row + dy) - depth);
      }
    }
  }
}

// The block's four faces side by side as wrapUv lays them (its +z face along the road first, then +x across
// it, -z and -x): white paint darkening toward its foot, a dark crease round each rail where it goes into the
// block on the faces along the road, and a bolt head beside each rail on the faces across it.
function drawBlockMaps() {
  const { across, along, height, bottom } = BLOCK;
  const surface = createSurface(2 * (across + along), height, 200, { color: hexToRgb(0xf2f0ea), roughness: 0.4, base: 120 });
  const faces = [
    { start: 0, width: across, railFace: true },
    { start: across, width: along, railFace: false },
    { start: across + along, width: across, railFace: true },
    { start: 2 * across + along, width: along, railFace: false },
  ];
  for (const face of faces) {
    const middle = face.start + face.width / 2;
    for (const lift of RAIL_LIFTS) {
      const y = lift - bottom;
      if (face.railFace) {
        crease(surface, middle, y);
      } else {
        surface.bolt(middle, y, { radius: 0.035, lift: 90, color: hexToRgb(0x55585e), roughness: 0.3 });
      }
    }
  }
  const { width: columns, height: rows } = surface;
  for (let row = 0; row < rows; row += 1) {
    const up = 1 - row / rows;
    const dirt = Math.max(0, 1 - up / 0.3);
    for (let column = 0; column < columns; column += 1) {
      surface.colors.mix(column, row, [150, 140, 125], 0.35 * dirt * dirt);
      surface.roughnesses.mix(column, row, [175, 175, 175], 0.6 * dirt);
    }
  }
  return surface.toMaps({ depth: 5, shade: { reach: 0.06, strength: 2 }, repeat: false });
}

// The dark crease round a rail's end where it goes into the block's face at (x, y): the rail's outline a little
// wider, sunk and darkened, fading outward.
function crease(surface, x, y) {
  const [column, row] = surface.pixelsAt(x, y);
  const [halfWidth, halfHeight] = [(RAIL_HALF_DEPTH + 0.025) * 200, (RAIL_HALF_HEIGHT + 0.025) * 200];
  for (let dy = -Math.ceil(halfHeight); dy <= Math.ceil(halfHeight); dy += 1) {
    for (let dx = -Math.ceil(halfWidth); dx <= Math.ceil(halfWidth); dx += 1) {
      const outside = Math.max(Math.abs(dx) - (halfWidth - 6), Math.abs(dy) - (halfHeight - 6), 0) / 6;
      if (outside <= 1) {
        const share = 1 - outside;
        surface.colors.mix(column + dx, row + dy, [90, 88, 84], 0.5 * share);
        surface.setHeight(column + dx, row + dy, surface.heightAt(column + dx, row + dy) - 40 * share);
      }
    }
  }
}
