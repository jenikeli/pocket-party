// Box collision: a player is a box (half-width, height) moved one axis at a time against the map's
// boxes, with step-up onto low ledges and sliding along walls. No DOM, unit tested. Used by player.js and
// grenades.js.

import { TUNING } from './tuning.js';

const EPSILON = 0.0005;

// A map box is { x0, y0, z0, x1, y1, z1 }. The ground is y = 0 and is never a box.
function overlaps(box, body, height) {
  return body.x + body.r > box.x0 && body.x - body.r < box.x1
    && body.z + body.r > box.z0 && body.z - body.r < box.z1
    && body.y + height > box.y0 && body.y < box.y1;
}

// Whether the body (feet at y) fits at its position: it hits no box.
export function fits(boxes, body, height) {
  return !boxes.some((box) => overlaps(box, body, height));
}

// Moves the horizontal axis ('x' or 'z') by `delta`. A box in the way is stepped onto when its top is low enough
// and there is room above it; otherwise the body stops against its face.
function moveHorizontal(boxes, body, height, axis, delta) {
  body[axis] += delta;
  for (const box of boxes) {
    if (!overlaps(box, body, height)) {
      continue;
    }
    if (box.y1 - body.y <= TUNING.stepHeight && body.onGround) {
      const lifted = { ...body, y: box.y1 + EPSILON };
      if (fits(boxes, lifted, height)) {
        body.y = box.y1 + EPSILON;
        continue;
      }
    }
    const low = axis === 'x' ? box.x0 : box.z0;
    const high = axis === 'x' ? box.x1 : box.z1;
    body[axis] = delta > 0 ? low - body.r - EPSILON : high + body.r + EPSILON;
    body[axis === 'x' ? 'vx' : 'vz'] = 0;
  }
}

function moveVertical(boxes, body, height, delta) {
  body.y += delta;
  body.onGround = false;
  for (const box of boxes) {
    if (!overlaps(box, body, height)) {
      continue;
    }
    if (delta <= 0) {
      body.y = box.y1 + EPSILON;
      body.onGround = true;
    } else {
      body.y = box.y0 - height - EPSILON;
    }
    body.vy = 0;
  }
  if (body.y <= 0) {
    body.y = 0;
    body.onGround = true;
    body.vy = Math.max(body.vy, 0);
  }
}

// Moves `body` ({ x, y, z, r, vx, vy, vz, onGround }, y the feet) by (dx, dy, dz) and returns whether it landed this
// move. Horizontal moves are split into small steps so a fast body cannot jump through a thin wall.
export function moveBody(boxes, body, height, dx, dy, dz) {
  const wasInAir = !body.onGround;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.25));
  for (let step = 0; step < steps; step += 1) {
    moveHorizontal(boxes, body, height, 'x', dx / steps);
    moveHorizontal(boxes, body, height, 'z', dz / steps);
  }
  moveVertical(boxes, body, height, dy);
  return wasInAir && body.onGround;
}

// The nearest hit of a ray against the boxes: { t, box, normal } or null. `dir` is a unit vector.
export function rayBox(box, origin, dir, maxT) {
  let tMin = 0;
  let tMax = maxT;
  let normal = null;
  for (const axis of ['x', 'y', 'z']) {
    const low = box[`${axis}0`];
    const high = box[`${axis}1`];
    const o = origin[axis];
    const d = dir[axis];
    if (Math.abs(d) < 1e-9) {
      if (o < low || o > high) {
        return null;
      }
      continue;
    }
    let t1 = (low - o) / d;
    let t2 = (high - o) / d;
    let sign = -1;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      sign = 1;
    }
    if (t1 > tMin) {
      tMin = t1;
      normal = { x: 0, y: 0, z: 0, [axis]: sign };
    }
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) {
      return null;
    }
  }
  return { t: tMin, tExit: tMax, box, normal: normal ?? { x: 0, y: 1, z: 0 } };
}

// Whether the straight line from a to b is free of boxes (no penetration), as bots and grenades check sight.
export function lineClear(boxes, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dy, dz);
  if (length < 0.001) {
    return true;
  }
  const dir = { x: dx / length, y: dy / length, z: dz / length };
  return !boxes.some((box) => {
    const hit = rayBox(box, a, dir, length);
    return hit && hit.t < length - 0.01;
  });
}
