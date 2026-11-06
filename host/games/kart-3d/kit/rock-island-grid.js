// A grid of rings round a rocky island (M9): the grass caps and the beach (kit/rock-island-top.js) and the
// shallows and foam (kit/rock-island-water.js) are each rows of corners round the island, joined into faces.
// Used by those two files.

import * as THREE from 'three';

// A grid of `rowCount` rows by `segments` + 1 columns, its corners from cornerAt(row, column) -> { point, color,
// alpha }. Rows run outward (or down), columns turn from +x toward +z, so its faces point up and out. Colours
// carry `alpha` as a fourth value if `withAlpha`. Texture coordinates are laid flat over the island (a tile per 6
// units, as the kit's grass and sand). Returns an indexed geometry with smooth normals.
export function ringGrid(rowCount, segments, cornerAt, withAlpha = false) {
  const [positions, colors, uvs, indices] = [[], [], [], []];
  for (let row = 0; row < rowCount; row += 1) {
    for (let column = 0; column <= segments; column += 1) {
      const { point, color, alpha } = cornerAt(row, column);
      positions.push(...point);
      colors.push(color.r, color.g, color.b, ...(withAlpha ? [alpha] : []));
      uvs.push(point[0] / 6, point[2] / 6);
      if (row > 0 && column > 0) {
        const here = row * (segments + 1) + column;
        const inside = here - (segments + 1);
        indices.push(inside - 1, inside, here, inside - 1, here, here - 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, withAlpha ? 4 : 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
