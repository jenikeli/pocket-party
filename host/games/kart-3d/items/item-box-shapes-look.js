// The item box's shapes and maps (M8), our own after MK8DX's: a rounded cube of
// clear glass dotted with rings of circles, its edges bright, a rainbow running over it, and inside a blocky "?"
// with a white face and a blue bevelled rim. Built once when the race's drawing is made. Used by
// item-box-look.js.

import * as THREE from 'three';
import { roundedBox, mergeShapes, coloured } from '../shape-utils.js';
import { createPixelImage } from '../kit/pixel-image.js';
import { grey } from '../kit/surface-maps.js';

// The cube's side and how round its edges are (units); a kart is about 2 long and its driver's head 1.4 high.
export const BOX_SIZE = 1.4;
const BOX_ROUNDING = 0.16;
// The "?" stands this tall inside the box, this thick.
const MARK_HEIGHT = 0.95;
const MARK_DEPTH = 0.18;
const MARK_BEVEL = 0.045;
const MARK_FACE_HEX = 0xf2f7ff;
const MARK_RIM_HEX = 0x2a62f0;
// The "?" drawn on a grid 10 wide and 14 tall, y up: its hook as one outline (open at the bottom left, as a
// question mark is) and its dot, both blocky with cut corners like MK8DX's.
const HOOK = [
  [0, 9], [0, 11.5], [2.5, 14], [7.5, 14], [10, 11.5], [10, 9.5], [6.6, 7], [6.6, 5], [3.4, 5], [3.4, 8],
  [6.8, 10.2], [6.8, 11], [6.1, 11.6], [3.9, 11.6], [3.2, 11], [3.2, 9],
];
const DOT = [[3.4, 0.6], [6.6, 0.6], [6.6, 3.6], [3.4, 3.6]];
const GRID_HEIGHT = 14;
// The face picture's size (pixels), how wide its bright rim is and the circles' size and spacing (shares of a face).
const FACE_PIXELS = 128;
const RIM_WIDTH = 0.1;
const CIRCLE_RADIUS = 0.075;
const CIRCLE_SPACING = 0.2;
const RAINBOW_PIXELS = 64;
// The rainbow over the box, after the reference's: pink, violet, sky blue, mint, and round again.
const RAINBOW = [[255, 90, 215], [150, 100, 255], [70, 195, 255], [80, 255, 190]];

// The cube round its middle, each face's picture fitted to it (boxUv).
export function buildShell() {
  return boxUv(roundedBox(BOX_SIZE, BOX_SIZE, BOX_SIZE, BOX_ROUNDING));
}

// The "?" round its middle, facing +z and -z, coloured per vertex: its faces white, its sides and bevels blue.
export function buildQuestionMark() {
  const scale = MARK_HEIGHT / GRID_HEIGHT;
  const extrude = (points) => {
    const outline = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2((x - 5) * scale, (y - GRID_HEIGHT / 2) * scale)));
    const shape = new THREE.ExtrudeGeometry(outline, {
      depth: MARK_DEPTH - 2 * MARK_BEVEL, bevelEnabled: true, bevelSize: MARK_BEVEL, bevelThickness: MARK_BEVEL, bevelSegments: 2,
    });
    shape.translate(0, 0, -(MARK_DEPTH - 2 * MARK_BEVEL) / 2);
    return colourByGroup(shape);
  };
  return mergeShapes([extrude(HOOK), extrude(DOT)]);
}

// An extruded shape's two groups coloured: its caps (group 0) the face's white, its sides and bevels (group 1)
// the rim's blue. Extruded shapes have no index, so each group is a run of vertices.
function colourByGroup(shape) {
  coloured(shape, MARK_FACE_HEX);
  const rim = new THREE.Color(MARK_RIM_HEX);
  const { color } = shape.attributes;
  shape.groups.filter((group) => group.materialIndex === 1).forEach(({ start, count }) => {
    for (let index = start; index < start + count; index += 1) {
      color.setXYZ(index, rim.r, rim.g, rim.b);
    }
  });
  shape.clearGroups();
  return shape;
}

// Texture coordinates for a box round its middle: each vertex takes the face its normal points most toward, and
// that face's picture is stretched once over it, so every face shows the whole picture and a rounded edge shows
// the picture's rim.
function boxUv(geometry) {
  const { position, normal, uv } = geometry.attributes;
  const half = BOX_SIZE / 2;
  for (let index = 0; index < position.count; index += 1) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const [nx, ny, nz] = [Math.abs(normal.getX(index)), Math.abs(normal.getY(index)), Math.abs(normal.getZ(index))];
    const [u, v] = nx >= ny && nx >= nz ? [z, y] : ny >= nz ? [x, z] : [x, y];
    uv.setXY(index, (u + half) / BOX_SIZE, (v + half) / BOX_SIZE);
  }
  return geometry;
}

// The face's colour and see-through maps and the rainbow: { map, alphaMap, rainbow }. The glass is clear in the
// middle, a little cloudier where its circles are, and nearly solid white at its rim, so the box's outline reads
// from far away; the rainbow is a tile that repeats both ways, so it can slide over the faces (its offset).
export function createBoxMaps() {
  const colors = createPixelImage(FACE_PIXELS, FACE_PIXELS);
  const alphas = createPixelImage(FACE_PIXELS, FACE_PIXELS);
  colors.fill((x, y) => faceAt((x + 0.5) / FACE_PIXELS, (y + 0.5) / FACE_PIXELS).color);
  alphas.fill((x, y) => grey(faceAt((x + 0.5) / FACE_PIXELS, (y + 0.5) / FACE_PIXELS).alpha));
  const rainbow = createPixelImage(RAINBOW_PIXELS, RAINBOW_PIXELS);
  rainbow.fill((x, y) => rainbowAt((x + y) / RAINBOW_PIXELS));
  return {
    map: colors.toTexture({ repeat: false }),
    alphaMap: alphas.toDataTexture({ repeat: false }),
    rainbow: rainbow.toTexture({ repeat: true }),
  };
}

// One point of a face, u and v from 0 to 1: { color ([r, g, b]), alpha (0 to 1) }.
export function faceAt(u, v) {
  const toEdge = Math.min(u, v, 1 - u, 1 - v);
  const rim = smoothstep(1 - Math.min(toEdge / RIM_WIDTH, 1));
  // Circles in staggered rows, as the reference's.
  const row = Math.round(v / CIRCLE_SPACING);
  const shift = row % 2 === 0 ? 0 : CIRCLE_SPACING / 2;
  const column = Math.round((u - shift) / CIRCLE_SPACING);
  const fromCircle = Math.hypot(u - shift - column * CIRCLE_SPACING, v - row * CIRCLE_SPACING);
  const circle = Math.min(Math.max((CIRCLE_RADIUS - fromCircle) * FACE_PIXELS + 0.5, 0), 1);
  const alpha = 0.3 + 0.18 * circle + (0.95 - 0.3) * rim;
  const white = 235 + 20 * Math.max(circle, rim);
  return { color: [white, white, 255], alpha: Math.min(alpha, 1) };
}

// The rainbow's colour a share `along` of the way round (it repeats every 1), blended smoothly between its stops.
function rainbowAt(along) {
  const place = (((along % 1) + 1) % 1) * RAINBOW.length;
  const from = RAINBOW[Math.floor(place)];
  const to = RAINBOW[(Math.floor(place) + 1) % RAINBOW.length];
  const share = smoothstep(place % 1);
  return from.map((channel, index) => channel + (to[index] - channel) * share);
}

function smoothstep(share) {
  return share * share * (3 - 2 * share);
}
