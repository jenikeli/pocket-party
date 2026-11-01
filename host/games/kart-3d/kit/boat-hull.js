// A boat's hull lofted from stations along its length (M7d4d): half-ellipse cross-sections whose width narrows to a
// stem at the bow and whose deck follows a sheer line (low amidships, rising to the bow). Built in coloured bands
// of height, so a hull is white above a stripe at the waterline, and with a deck and a flat transom. Used by
// sailboat.js and motor-yacht.js. The boat faces +z, its waterline at y = 0, its middle at z = 0.

import * as THREE from 'three';
import { coloured, mergeShapes } from '../shape-utils.js';

const STATIONS = 22;
const ROWS_PER_BAND = 3;

// `spec` is { length, beam, keel, deck, bowRise, sternRise }: the half-width at the widest, the (negative) depth of
// the keel, the deck's height amidships, and how much higher the deck is at the bow and at the stern.

// How far along the hull a point is, 0 at the stern to 1 at the bow.
const alongOf = (spec, z) => z / spec.length + 0.5;

// The half-width of the hull at height `y` where it is `t` along: full amidships and aft (the transom is flat),
// closing to a point at the stem, and round below the deck like a half-ellipse.
export function hullHalfWidth(spec, t, y) {
  const toBow = Math.max(0, (t - 0.45) / 0.55);
  const width = spec.beam * Math.pow(1 - toBow * toBow, 0.6);
  const deck = deckHeightAt(spec, t);
  const down = (y - deck) / (deck - spec.keel);
  return width * Math.sqrt(Math.max(0, 1 - down * down));
}

// The deck's height `t` along the hull: the sheer line, rising to the bow (curving up) and a little to the stern.
export function deckHeightAt(spec, t) {
  const toBow = Math.max(0, (t - 0.4) / 0.6);
  const toStern = Math.max(0, (0.25 - t) / 0.25);
  return spec.deck + spec.bowRise * toBow * toBow + spec.sternRise * toStern * toStern;
}

// The deck's height at world z.
export function deckHeight(spec, z) {
  return deckHeightAt(spec, alongOf(spec, z));
}

// The half-width of the hull at world z and height y.
export function hullWidthAt(spec, z, y) {
  return hullHalfWidth(spec, alongOf(spec, z), y);
}

// An indexed grid of `rows` by `columns` quads from `pointAt(row, column)` (each 0 to its count), with uv and
// normals like Three.js's shapes so it merges with them. `flip` turns the faces over.
function grid(rows, columns, pointAt, flip) {
  const positions = [];
  const uvs = [];
  for (let row = 0; row <= rows; row += 1) {
    for (let column = 0; column <= columns; column += 1) {
      positions.push(...pointAt(row, column));
      uvs.push(row / rows, column / columns);
    }
  }
  const index = [];
  const vertex = (row, column) => row * (columns + 1) + column;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = vertex(row, column);
      const b = vertex(row + 1, column);
      const c = vertex(row, column + 1);
      const d = vertex(row + 1, column + 1);
      index.push(...(flip ? [a, c, b, b, c, d] : [a, b, c, c, b, d]));
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

// Both sides of the hull between heights `low` and `high` (the deck cuts it off where it is lower), in `hex`.
export function hullBand(spec, low, high, hex) {
  const sides = [1, -1].map((side) => grid(STATIONS, ROWS_PER_BAND, (station, row) => {
    const t = station / STATIONS;
    const y = low + (Math.min(high, deckHeightAt(spec, t)) - low) * (row / ROWS_PER_BAND);
    return [side * hullHalfWidth(spec, t, y), y, (t - 0.5) * spec.length];
  }, side > 0));
  return coloured(mergeShapes(sides), hex);
}

// The deck: a strip across the hull at each station, at the sheer line's height, in `hex`.
export function hullDeck(spec, hex) {
  const deck = grid(STATIONS, 2, (station, column) => {
    const t = station / STATIONS;
    const y = deckHeightAt(spec, t);
    return [(column - 1) * hullHalfWidth(spec, t, y), y, (t - 0.5) * spec.length];
  }, false);
  return coloured(deck, hex);
}

// The flat transom at the stern, from the keel up to the deck, in `hex`.
export function hullTransom(spec, hex) {
  const transom = grid(ROWS_PER_BAND * 2, 1, (row, column) => {
    const y = spec.keel + (deckHeightAt(spec, 0) - spec.keel) * (row / (ROWS_PER_BAND * 2));
    return [(column * 2 - 1) * hullHalfWidth(spec, 0, y), y, -spec.length / 2];
  }, false);
  return coloured(transom, hex);
}
