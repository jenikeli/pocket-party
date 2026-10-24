// 3D vector maths on plain { x, y, z } objects, for the 3D race's track and kart rules. Every function returns
// a new object, so game state stays plain data. Used by the DOM-free modules in host/games/kart-3d/.

export function vec(x, y, z) {
  return { x, y, z };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function subtract(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a, factor) {
  return { x: a.x * factor, y: a.y * factor, z: a.z * factor };
}

// a + b * factor, the most common step: "move along b".
export function addScaled(a, b, factor) {
  return { x: a.x + b.x * factor, y: a.y + b.y * factor, z: a.z + b.z * factor };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a, b) {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
}

export function length(a) {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize(a) {
  const size = length(a);
  return { x: a.x / size, y: a.y / size, z: a.z / size };
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}

// `a` with its part along the unit vector `axis` removed: a flattened onto the plane square to axis.
export function flatten(a, axis) {
  return addScaled(a, axis, -dot(a, axis));
}

// `a` turned by `angle` radians about the unit vector `axis`, right-handed (Rodrigues' formula).
export function rotate(a, axis, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const turned = addScaled(scale(a, cos), cross(axis, a), sin);
  return addScaled(turned, axis, dot(axis, a) * (1 - cos));
}
