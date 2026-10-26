// Sorting things into square cells of the ground, seen from above (M7d4b): the maths behind cutting the course's
// big meshes into one mesh per cell, so Three.js can skip the cells a camera does not see. Plain functions, unit
// tested in Node. Used by host/games/kart-3d/split-meshes.js.

// The items 0..count-1 in groups, one group per cell of `cellSize` units that holds any: positionOf(index) gives
// an item's { x, z } (a triangle's middle, or an instance's place). Each group keeps its items in their order.
export function groupByCell(count, positionOf, cellSize) {
  const groups = new Map();
  for (let index = 0; index < count; index += 1) {
    const { x, z } = positionOf(index);
    const key = `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(index);
  }
  return [...groups.values()];
}

// The smallest sphere-ish bounds of the points pointAt(0..count-1) ({ x, y, z } each): { centre, radius }, the
// centre being the middle of their box. Three.js culls a mesh by such a sphere, so it must hold every point.
export function boundsOf(count, pointAt) {
  const low = { x: Infinity, y: Infinity, z: Infinity };
  const high = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (let index = 0; index < count; index += 1) {
    const point = pointAt(index);
    for (const axis of ['x', 'y', 'z']) {
      low[axis] = Math.min(low[axis], point[axis]);
      high[axis] = Math.max(high[axis], point[axis]);
    }
  }
  const centre = { x: (low.x + high.x) / 2, y: (low.y + high.y) / 2, z: (low.z + high.z) / 2 };
  let radius = 0;
  for (let index = 0; index < count; index += 1) {
    const point = pointAt(index);
    radius = Math.max(radius, Math.hypot(point.x - centre.x, point.y - centre.y, point.z - centre.z));
  }
  return { centre, radius };
}
