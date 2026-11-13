// The start gate's posts with their detail in textures (M7d4b2): where M7d4a built each post's three panels, the
// core showing in the seams between them and 48 bolt heads as shapes, here one rounded shaft carries them all as
// maps wrapped round it (kit/surface-maps.js): the panels raised with rounded edges, the seams sunk and shaded, a
// fine line cut round each panel, the bolts domed and shiny, and a little grime toward each panel's foot. The
// plinth, the band and the capital stay shapes, as they change the post's outline. Used by kit/start-gate.js.

import * as THREE from 'three';
import { roundedBox, at, wrapUv, mergeShapes } from '../shape-utils.js';
import { createSurface, hexToRgb } from './surface-maps.js';
import { drawnOnce } from '../canvas-texture.js';

const PIXELS_PER_UNIT = 96;
// The heights (0 to 255) of the core in the seams and of the panels on it, and how far the bolts stand on them.
const CORE_HEIGHT = 50;
const PANEL_LIFT = 150;
const BOLT_LIFT = 70;
const BOLT_RADIUS = 0.06;
// Bolts this far in from a panel's corners; the fine line this far in from its edges.
const BOLT_INSET = 0.2;
const LINE_INSET = 0.11;
const GRIME = [120, 112, 100];

// `post` is { xs, width, bottom, top, panels, boltColor }: where the shafts stand across the road, how wide
// they are (square), the heights they run between and the panels' [bottom, top] heights on them, as
// kit/start-gate.js lays them out; `color` the post's colour (a hex). `keep(thing)` registers what must be
// disposed. Returns the mesh of both shafts, in the gate's own frame.
export function buildDetailedShafts(keep, post, color) {
  const height = post.top - post.bottom;
  const shafts = post.xs.map((x) => wrapUv(at(roundedBox(post.width, height, post.width, 0.1), x, (post.bottom + post.top) / 2, 0), post.bottom, height));
  const key = `gate-post:${JSON.stringify([post.width, post.bottom, height, post.panels, post.boltColor, color])}`;
  const maps = drawnOnce(key, () => drawPostMaps(post, height, color));
  Object.values(maps).forEach(keep);
  const material = keep(new THREE.MeshStandardMaterial({ ...maps, roughness: 1 }));
  return new THREE.Mesh(keep(mergeShapes(shafts)), material);
}

// The maps of the four faces side by side, as wrapUv lays them round the shaft: each face the same. The core is
// the post's colour darkened as M7d4a's was (in linear light, as Three.js mixes colours).
function drawPostMaps(post, height, color) {
  const rgb = hexToRgb(color);
  const core = hexToRgb(new THREE.Color(color).multiplyScalar(0.55).getHex());
  const boltColor = hexToRgb(post.boltColor);
  const surface = createSurface(4 * post.width, height, PIXELS_PER_UNIT, { color: core, roughness: 0.75, base: CORE_HEIGHT });
  for (let face = 0; face < 4; face += 1) {
    const left = face * post.width;
    for (const [panelBottom, panelTop] of post.panels) {
      const rect = { left, bottom: panelBottom - post.bottom, width: post.width, height: panelTop - panelBottom };
      surface.panel(rect, { lift: PANEL_LIFT, bevel: 0.05, paint: { color: rgb, roughness: 0.35 } });
      addGrime(surface, rect);
      addPanelLine(surface, rect, rgb);
      for (const y of [rect.bottom + BOLT_INSET, rect.bottom + rect.height - BOLT_INSET]) {
        for (const x of [left + BOLT_INSET, left + post.width - BOLT_INSET]) {
          surface.bolt(x, y, { radius: BOLT_RADIUS, lift: BOLT_LIFT, color: boltColor, roughness: 0.25 });
        }
      }
    }
  }
  return surface.toMaps({ depth: 6, shade: { reach: 0.08, strength: 2.5 }, repeat: false });
}

// A fine line cut round the panel's face, a little in from its edges: the second, smaller scale of parts MK8DX's
// panels have.
function addPanelLine(surface, { left, bottom, width, height }, rgb) {
  const [x1, x2, y1, y2] = [left + LINE_INSET, left + width - LINE_INSET, bottom + LINE_INSET, bottom + height - LINE_INSET];
  const line = { size: 0.025, depth: 30, color: rgb.map((channel) => channel * 0.75), amount: 0.6, roughness: 0.6 };
  for (const [from, to] of [[[x1, y1], [x2, y1]], [[x2, y1], [x2, y2]], [[x2, y2], [x1, y2]], [[x1, y2], [x1, y1]]]) {
    surface.groove(from, to, line);
  }
}

// Dirt settled toward the panel's foot: fading out over its lowest 0.5 units, with a little mottling.
function addGrime(surface, { left, bottom, width }) {
  const [columnStart, rowEnd] = surface.pixelsAt(left, bottom);
  const [columnEnd, rowStart] = surface.pixelsAt(left + width, bottom + 0.5);
  for (let row = Math.round(rowStart); row < Math.round(rowEnd); row += 1) {
    const share = (row - rowStart) / (rowEnd - rowStart);
    for (let column = Math.round(columnStart); column < Math.round(columnEnd); column += 1) {
      const mottle = 0.6 + 0.4 * Math.sin(column * 0.7) * Math.sin(row * 0.45 + column * 0.13);
      surface.colors.mix(column, row, GRIME, 0.22 * share * share * mottle);
      surface.roughnesses.mix(column, row, [150, 150, 150], 0.5 * share);
    }
  }
}
