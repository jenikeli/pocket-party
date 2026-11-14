// One leaf scale (M7d4c5): a curved plate with a rounded tip, as the reference game's round trees are made of (and the
// planter's leaves), with texture coordinates into kit/garden-textures.js's leaf (u across, v up to the tip) and
// vertex colours that run from dark at the base, where the scale tucks under the tier above, to light at the tip.
// Used by kit/round-tree.js and kit/planter.js.

import * as THREE from 'three';

// Rows from the base to the tip (a share of the length) and points across (-1 to 1, left to right).
const ROWS = [0, 0.45, 0.8, 1];
const ACROSS = [-1, -0.35, 0.35, 1];

// A scale `length` long and up to `width` wide, standing at `position` ([x, y, z]) with its tip pointing away
// from the middle at `turn` radians (round y), tipped up by `pitch` radians (down when negative). The plate is
// cupped across (its edges droop by `droop`) and sags toward its tip. `base` and `tip` are hex colours.
export function buildLeafScale({ length, width, pitch, droop, turn, position, base, tip }) {
  const positions = [];
  const colors = [];
  const uvs = [];
  const baseColor = new THREE.Color(base);
  const tipColor = new THREE.Color(tip);
  for (const share of ROWS) {
    const halfWidth = halfWidthAt(share) * width / 2;
    const color = baseColor.clone().lerp(tipColor, Math.min(share * 1.4, 1));
    for (const across of ACROSS) {
      positions.push(across * halfWidth, -droop * across * across * halfWidth - 0.15 * length * share * share, share * length);
      colors.push(color.r, color.g, color.b);
      uvs.push((across + 1) / 2, share);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(plateIndices());
  geometry.computeVertexNormals();
  geometry.rotateX(-pitch).rotateY(turn).translate(...position);
  return geometry;
}

// How wide the plate is at `share` along it, 0 to 1: narrow at the base, widest a little past the middle, then
// an ellipse round the tip.
function halfWidthAt(share) {
  if (share < 0.6) {
    return 0.45 + 0.55 * Math.sin((share / 0.6) * (Math.PI / 2));
  }
  return Math.sqrt(Math.max(1 - ((share - 0.6) / 0.4) ** 2, 0.04));
}

// Two triangles to a cell, wound so the top faces up (+y) before the scale is turned. The tip row has no width,
// so its cells are single triangles to the eye.
function plateIndices() {
  const indices = [];
  const columns = ACROSS.length;
  for (let row = 0; row < ROWS.length - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const corner = row * columns + column;
      indices.push(corner, corner + columns, corner + 1, corner + 1, corner + columns, corner + columns + 1);
    }
  }
  return indices;
}
