// Pure particle simulation for the Saltline effects (no Three.js, unit tested): a fixed ring of particles held in
// typed arrays that effects-layer.js uploads to the GPU. Spawning reuses the oldest slot, so nothing is allocated.

// A "kind" is a preset made once: { life, size, grow, grav, drag, r, g, b, a, spread } (size and grow in metres).
export function createParticles(capacity) {
  const pos = new Float32Array(capacity * 3);
  const vel = new Float32Array(capacity * 3);
  const color = new Float32Array(capacity * 4); // r, g, b, current alpha
  const size = new Float32Array(capacity);
  const life = new Float32Array(capacity);
  const maxLife = new Float32Array(capacity).fill(1);
  const size0 = new Float32Array(capacity);
  const grow = new Float32Array(capacity);
  const grav = new Float32Array(capacity);
  const drag = new Float32Array(capacity);
  const peak = new Float32Array(capacity);
  let next = 0;

  // Start one particle. `spread` of the kind randomises the velocity; scale multiplies size and life.
  function spawn(kind, x, y, z, vx, vy, vz, sizeScale = 1, lifeScale = 1) {
    const i = next;
    next = (next + 1) % capacity;
    const s = kind.spread || 0;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    vel[i * 3] = vx + (Math.random() - 0.5) * s;
    vel[i * 3 + 1] = vy + (Math.random() - 0.5) * s;
    vel[i * 3 + 2] = vz + (Math.random() - 0.5) * s;
    life[i] = maxLife[i] = kind.life * lifeScale * (0.75 + Math.random() * 0.5);
    size0[i] = size[i] = kind.size * sizeScale * (0.8 + Math.random() * 0.4);
    grow[i] = (kind.grow || 0) * sizeScale;
    grav[i] = kind.grav || 0;
    drag[i] = kind.drag || 0;
    peak[i] = kind.a;
    color[i * 4] = kind.r; color[i * 4 + 1] = kind.g; color[i * 4 + 2] = kind.b; color[i * 4 + 3] = 0;
    return i;
  }

  function step(dt) {
    for (let i = 0; i < capacity; i++) {
      if (life[i] <= 0) continue;
      life[i] -= dt;
      if (life[i] <= 0) { size[i] = 0; color[i * 4 + 3] = 0; continue; }
      const keep = Math.max(0, 1 - drag[i] * dt);
      vel[i * 3] *= keep; vel[i * 3 + 1] = vel[i * 3 + 1] * keep - grav[i] * dt; vel[i * 3 + 2] *= keep;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const age = maxLife[i] - life[i];
      const f = age / maxLife[i];
      size[i] = size0[i] + grow[i] * age;
      // Quick fade in (no pop), fade out over the last quarter. Clamp at the kind's peak.
      const fadeIn = Math.max(0, Math.min(1, f * 8));
      const fadeOut = Math.max(0, Math.min(1, (1 - f) * 4));
      color[i * 4 + 3] = Math.max(0, Math.min(peak[i], peak[i] * fadeIn * fadeOut));
    }
  }

  return { capacity, pos, color, size, life, spawn, step };
}
