// Distances in Spirefall's world: edge to edge between units, towers (boxes) and plain points. Pure functions used
// by the targeting, movement, combat and spell code.

function radiusOf(entity) {
  return entity.def?.radius ?? 0;
}

function distanceToBox(point, tower) {
  const dx = Math.max(Math.abs(point.x - tower.x) - tower.w / 2, 0);
  const dy = Math.max(Math.abs(point.y - tower.y) - tower.h / 2, 0);
  return Math.hypot(dx, dy);
}

// The gap between the edges of two things (negative when they overlap). Either may be a tower or a point { x, y }.
export function gap(a, b) {
  if (b.isTower) {
    return distanceToBox(a, b) - radiusOf(a);
  }
  if (a.isTower) {
    return distanceToBox(b, a) - radiusOf(b);
  }
  return Math.hypot(a.x - b.x, a.y - b.y) - radiusOf(a) - radiusOf(b);
}

export function nearestOf(from, list) {
  let best = null;
  for (const entity of list) {
    if (best === null || gap(from, entity) < gap(from, best)) {
      best = entity;
    }
  }
  return best;
}
