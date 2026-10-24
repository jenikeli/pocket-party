// The M6a spike's particles: drift sparks from each kart's back wheels (blue, orange or purple, like MK8DX's
// mini-turbo levels) and a boost flame from its exhaust. One point cloud for all karts, so it is one draw call
// per view; the cost being measured is the overdraw of many small glowing points. Used by spike-renderer.js.

import * as THREE from 'three';
import { MAX_KARTS } from './kart-paths.js';

const PER_KART = 80;
const SPARK_COLORS = [new THREE.Color(0x4fa8ff), new THREE.Color(0xff9a2e), new THREE.Color(0xc04dff)];
const FLAME_COLOR = new THREE.Color(0xffd34a);
const GRAVITY = 9.8;

// Returns { points, update(dt, poses, kartCount), dispose() }. Add `points` to the scene.
export function createParticles() {
  const count = MAX_KARTS * PER_KART;
  // Far below the ground until each particle's first respawn.
  const positions = new Float32Array(count * 3).fill(-1000);
  const colors = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  // Every particle starts with a different age, so they do not all respawn in the same frame.
  const ages = Float32Array.from({ length: count }, (_, index) => (index % PER_KART) / PER_KART);
  const lifetimes = new Float32Array(count).fill(0.5);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const texture = createGlowTexture();
  const material = new THREE.PointsMaterial({
    size: 0.5,
    map: texture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  // The points move every frame, so the bounding sphere Three.js would cull with is always stale.
  points.frustumCulled = false;

  for (let index = 0; index < count; index += 1) {
    const kartIndex = Math.floor(index / PER_KART);
    const color = index % 2 === 0 ? SPARK_COLORS[kartIndex % SPARK_COLORS.length] : FLAME_COLOR;
    color.toArray(colors, index * 3);
  }

  // `poses` is one { position, forward } per kart (from kart-paths.js); only the first `kartCount` karts show.
  function update(dt, poses, kartCount) {
    geometry.setDrawRange(0, kartCount * PER_KART);
    for (let index = 0; index < kartCount * PER_KART; index += 1) {
      ages[index] += dt;
      if (ages[index] >= lifetimes[index]) {
        respawn(index, poses[Math.floor(index / PER_KART)]);
        continue;
      }
      const at = index * 3;
      if (index % 2 === 0) {
        velocities[at + 1] -= GRAVITY * dt;
      }
      positions[at] += velocities[at] * dt;
      positions[at + 1] += velocities[at + 1] * dt;
      positions[at + 2] += velocities[at + 2] * dt;
    }
    geometry.getAttribute('position').needsUpdate = true;
  }

  // Sparks fly out sideways and up from a back wheel and fall; flames shoot straight back from the exhaust.
  function respawn(index, pose) {
    const { position, forward } = pose;
    const flatLength = Math.hypot(forward.x, forward.z);
    const side = { x: -forward.z / flatLength, z: forward.x / flatLength };
    const isSpark = index % 2 === 0;
    const wheelSide = index % 4 === 0 ? 1 : -1;
    const sideways = isSpark ? wheelSide * 0.68 : 0;
    const back = isSpark ? -0.75 : -1.4;
    const at = index * 3;
    positions[at] = position.x + side.x * sideways + forward.x * back;
    positions[at + 1] = position.y + (isSpark ? 0.15 : 0.55);
    positions[at + 2] = position.z + side.z * sideways + forward.z * back;
    const backSpeed = isSpark ? 1 + Math.random() * 3 : 3 + Math.random() * 3;
    const outSpeed = isSpark ? wheelSide * (1 + Math.random() * 2) : 0;
    velocities[at] = -forward.x * backSpeed + side.x * outSpeed;
    velocities[at + 1] = isSpark ? 1 + Math.random() * 2 : Math.random();
    velocities[at + 2] = -forward.z * backSpeed + side.z * outSpeed;
    ages[index] = 0;
    lifetimes[index] = 0.25 + Math.random() * 0.25;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }

  return { points, update, dispose };
}

// A soft round dot, white in the middle fading to clear, drawn once on a small canvas.
function createGlowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}
