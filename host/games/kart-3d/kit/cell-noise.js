// Cell noise for drawn textures (M7d4d): which of a grid of random points a spot is nearest (a Voronoi cell) and how
// near the border with the next one it is, so a texture can draw stones or slabs with joints between them. The
// points wrap round the tile, so it tiles. Used by kit/stone-texture.js (the lighthouse) and kit/rock-maps.js.

// `points` holds one [x, y] per cell of a `columns` by `rows` grid, each inside its cell (0 to 1), row by row.
// Returns, for (u, v) in tiles: `cell`, the index of the nearest point; `edge`, how far (in cells) the spot is from
// the border with the next cell; `below`, how far below its point it lies (in cells, negative above it; v runs down
// the picture). Points are one per grid cell, so the nearest and second nearest are within the 3 by 3 grid cells
// round the spot's own.
export function nearestCell(points, columns, rows, u, v) {
  const [cellX, cellY] = [Math.floor(u * columns), Math.floor(v * rows)];
  let nearest = { distance: Infinity, cell: 0, below: 0 };
  let second = Infinity;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const cell = wrap(cellY + dy, rows) * columns + wrap(cellX + dx, columns);
      const [pointX, pointY] = [cellX + dx + points[cell][0], cellY + dy + points[cell][1]];
      const distance = Math.hypot(pointX - u * columns, pointY - v * rows);
      if (distance < nearest.distance) {
        second = nearest.distance;
        nearest = { distance, cell, below: v * rows - pointY };
      } else if (distance < second) {
        second = distance;
      }
    }
  }
  return { cell: nearest.cell, edge: (second - nearest.distance) / 2, below: nearest.below };
}

function wrap(value, count) {
  return ((value % count) + count) % count;
}
