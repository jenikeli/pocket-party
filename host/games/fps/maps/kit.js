// The building kit for Breakwater maps: plain functions that return lists of axis-aligned boxes
// { x0, y0, z0, x1, y1, z1, mat, color }. A map is a list of these plus spawns; the same boxes are the collision and
// (batched by material) the drawing. No DOM, unit tested through the map tests. Used by maps/harbor.js.

export const CONTAINER = { length: 12.2, width: 2.45, height: 2.6 };

export function box(x0, y0, z0, x1, y1, z1, mat, color) {
  return { x0: Math.min(x0, x1), y0: Math.min(y0, y1), z0: Math.min(z0, z1), x1: Math.max(x0, x1), y1: Math.max(y1, y0), z1: Math.max(z0, z1), mat, color };
}

// A shipping container centred at (x, z) along 'x' or 'z', stacked `level` high (0 is on the ground).
export function container(x, z, axis, level, color) {
  const halfLong = CONTAINER.length / 2;
  const halfWide = CONTAINER.width / 2;
  const y0 = level * CONTAINER.height;
  const sx = axis === 'x' ? halfLong : halfWide;
  const sz = axis === 'x' ? halfWide : halfLong;
  return box(x - sx, y0, z - sz, x + sx, y0 + CONTAINER.height, z + sz, 'container', color);
}

// A stack of containers `levels` high.
export function stack(x, z, axis, levels, color) {
  return Array.from({ length: levels }, (unused, level) => container(x, z, axis, level, color));
}

export function crate(x, z, size, level = 0, color = 0x8a6a3c) {
  return box(x - size / 2, level * size, z - size / 2, x + size / 2, (level + 1) * size, z + size / 2, 'wood', color);
}

export function barrier(x, z, axis) {
  return axis === 'x' ? box(x - 1.5, 0, z - 0.3, x + 1.5, 0.95, z + 0.3, 'concrete', 0x8d9298) : box(x - 0.3, 0, z - 1.5, x + 0.3, 0.95, z + 1.5, 'concrete', 0x8d9298);
}

// Steps climbing from (x, z) toward `dir` ('+x', '-x', '+z' or '-z') up to `height`, each 0.4 high and 0.55 deep, so a
// walker steps up without jumping.
export function stairs(x, z, dir, height, width = 2) {
  const rise = 0.4;
  const run = 0.55;
  const count = Math.round(height / rise);
  const boxes = [];
  for (let index = 0; index < count; index += 1) {
    const offset = index * run;
    const top = (index + 1) * rise;
    const along = { '+x': [x + offset, z - width / 2, x + offset + run, z + width / 2], '-x': [x - offset - run, z - width / 2, x - offset, z + width / 2], '+z': [x - width / 2, z + offset, x + width / 2, z + offset + run], '-z': [x - width / 2, z - offset - run, x + width / 2, z - offset] }[dir];
    boxes.push(box(along[0], 0, along[1], along[2], top, along[3], 'steel', 0x5f6b73));
  }
  return boxes;
}

// A walkable steel deck (and optionally a low rail around it) at height y.
export function deck(x0, z0, x1, z1, y, rails = true) {
  const boxes = [box(x0, y - 0.2, z0, x1, y, z1, 'steel', 0x6b767d)];
  if (rails) {
    boxes.push(box(x0, y, z0, x1, y + 1.0, z0 + 0.1, 'metal', 0x56626a), box(x0, y, z1 - 0.1, x1, y + 1.0, z1, 'metal', 0x56626a));
    boxes.push(box(x0, y, z0, x0 + 0.1, y + 1.0, z1, 'metal', 0x56626a), box(x1 - 0.1, y, z0, x1, y + 1.0, z1, 'metal', 0x56626a));
  }
  return boxes;
}

export function column(x, z, height, size = 0.6) {
  return box(x - size / 2, 0, z - size / 2, x + size / 2, height, z + size / 2, 'steel', 0x4f5b63);
}

// The same box turned half a turn about the map's centre: gives a map two-fold symmetry, so both teams play the same map.
export function rotated(boxes) {
  return boxes.map((item) => ({ ...item, x0: -item.x1, x1: -item.x0, z0: -item.z1, z1: -item.z0 }));
}
