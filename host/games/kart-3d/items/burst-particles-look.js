// The particle pools and point clouds the items' bursts are made of (burst-look.js): particles kept in flat
// arrays and reused round and round, drawn as soft dots. Used by burst-look.js.

import * as THREE from 'three';

// `capacity` particles' positions, velocities and lives in flat arrays. Returns { positions, emit(at, velocity,
// life) (the index used), step(dt, lift, drag), share(index) (life left, 1 to 0; 0 once gone),
// positionOf(index, vector) }.
export function createPool(capacity) {
  const positions = new Float32Array(capacity * 3);
  const velocities = new Float32Array(capacity * 3);
  const lives = new Float32Array(capacity);
  const maxLives = new Float32Array(capacity).fill(1);
  let next = 0;

  function emit(at, speed, life) {
    const index = next;
    next = (next + 1) % capacity;
    positions[index * 3] = at.x;
    positions[index * 3 + 1] = at.y;
    positions[index * 3 + 2] = at.z;
    velocities[index * 3] = speed.x;
    velocities[index * 3 + 1] = speed.y;
    velocities[index * 3 + 2] = speed.z;
    lives[index] = life;
    maxLives[index] = life;
    return index;
  }

  // Moves every living particle: `lift` adds to its upward speed (negative falls), `drag` slows it. Returns how
  // many still live.
  function step(dt, lift, drag) {
    const kept = Math.exp(-drag * dt);
    let alive = 0;
    for (let index = 0; index < capacity; index += 1) {
      if (lives[index] <= 0) {
        continue;
      }
      lives[index] -= dt;
      alive += 1;
      velocities[index * 3 + 1] += lift * dt;
      for (let axis = 0; axis < 3; axis += 1) {
        velocities[index * 3 + axis] *= kept;
        positions[index * 3 + axis] += velocities[index * 3 + axis] * dt;
      }
    }
    return alive;
  }

  const share = (index) => Math.max(lives[index], 0) / maxLives[index];
  const positionOf = (index, vector) => vector.fromArray(positions, index * 3);
  return { positions, emit, step, share, positionOf };
}

// One point cloud of `capacity` soft dots, coloured per point with `channels` (3, or 4 with alpha). Returns
// { points, write(pool, colorAt), dispose() }: write copies the pool's positions and lets colorAt(index, fade,
// colors) set each point's colour from its life left (fade, 1 to 0).
export function createCloud(capacity, channels, texture, { size, blending }) {
  const geometry = new THREE.BufferGeometry();
  const positions = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3).setUsage(THREE.DynamicDrawUsage);
  const colors = new THREE.BufferAttribute(new Float32Array(capacity * channels), channels).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', positions);
  geometry.setAttribute('color', colors);
  const material = new THREE.PointsMaterial({ size, map: texture, vertexColors: true, transparent: true, depthWrite: false, blending });
  const points = new THREE.Points(geometry, material);
  // The points move every frame, so a bounding sphere to cull by would always be stale.
  points.frustumCulled = false;

  function write(pool, colorAt) {
    positions.array.set(pool.positions);
    for (let index = 0; index < capacity; index += 1) {
      colorAt(index, pool.share(index), colors.array);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { points, write, dispose };
}
