// The 3D race's particles: drift sparks from the rear wheels in the spark level's colour, flames from the
// exhaust while a kart boosts, and smoke from the wheels of a stalled start. One Three.js point cloud for the
// whole field (one draw call per view, as measured in M6a), moved on the CPU every drawn frame. Particles are
// only drawing: they live here, not in the game state. Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';

const MAX_PARTICLES = 1500;
const SPARK_HEX = { blue: 0x4fb3ff, orange: 0xff9a1f, purple: 0xd04dff };
const FLAME_HEXES = [0xff7a1a, 0xffc94a];
const SMOKE_HEX = 0x6a6a6a;
// Where particles start on a kart's body: x left, y up, z forward (the model's own axes, kart-models.js).
const REAR_WHEELS = [[0.68, 0.1, -0.75], [-0.68, 0.1, -0.75]];
const EXHAUST = [0, 0.55, -1.25];
// Particles a second from each source, and how long each lives (seconds).
const SPARKS_PER_SECOND = 90;
const SPARK_LIFE = 0.22;
const FLAMES_PER_SECOND = 160;
const FLAME_LIFE = 0.16;
const SMOKE_PER_SECOND = 40;
const SMOKE_LIFE = 0.6;

// Returns { update(sources, dt), dispose() }; the point cloud is added to `scene`.
export function createEffects(scene) {
  const positions = new Float32Array(MAX_PARTICLES * 3);
  const colors = new Float32Array(MAX_PARTICLES * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  const texture = createDotTexture();
  // Added light, so a particle fades out by fading to black, and the order they are drawn in does not matter.
  const material = new THREE.PointsMaterial({
    size: 0.45,
    map: texture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const cloud = new THREE.Points(geometry, material);
  // The particles move every frame, so the bounding sphere Three.js culls with would always be stale.
  cloud.frustumCulled = false;
  scene.add(cloud);
  // Each particle: { position, velocity, life, maxLife, color (THREE.Color) }.
  let particles = [];

  // `sources` lists, for each kart to draw: { pose, velocity, spark, boosting, stalled } where pose has the
  // body's position, bodyForward and bodyUp (race-views.js kartPose), velocity is the kart's (so particles
  // keep up with it), and spark is a SPARK_COLORS name or null. `dt` is the real time since the last frame.
  function update(sources, dt) {
    for (const source of sources) {
      if (source.spark) {
        REAR_WHEELS.forEach((spot) => emit(source, spot, SPARKS_PER_SECOND * dt, SPARK_LIFE, SPARK_HEX[source.spark], sparkSpeed));
      }
      if (source.boosting) {
        emit(source, EXHAUST, FLAMES_PER_SECOND * dt, FLAME_LIFE, FLAME_HEXES, flameSpeed);
      }
      if (source.stalled) {
        REAR_WHEELS.forEach((spot) => emit(source, spot, SMOKE_PER_SECOND * dt, SMOKE_LIFE, SMOKE_HEX, smokeSpeed));
      }
    }
    particles = particles.filter((particle) => (particle.life -= dt) > 0);
    particles.forEach((particle, index) => {
      particle.position.addScaledVector(particle.velocity, dt);
      particle.position.toArray(positions, index * 3);
      const fade = particle.life / particle.maxLife;
      colors.set([particle.color.r * fade, particle.color.g * fade, particle.color.b * fade], index * 3);
    });
    geometry.setDrawRange(0, particles.length);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }

  // `count` is fractional: its fraction is a chance of one more, so a slow frame rate emits the same per second.
  function emit(source, spot, count, life, hex, speedFor) {
    const whole = Math.floor(count) + (Math.random() < count % 1 ? 1 : 0);
    const { position, bodyForward, bodyUp } = source.pose;
    const forward = new THREE.Vector3(bodyForward.x, bodyForward.y, bodyForward.z);
    const up = new THREE.Vector3(bodyUp.x, bodyUp.y, bodyUp.z);
    const left = new THREE.Vector3().crossVectors(up, forward);
    for (let index = 0; index < whole && particles.length < MAX_PARTICLES; index += 1) {
      const start = new THREE.Vector3(position.x, position.y, position.z)
        .addScaledVector(left, spot[0])
        .addScaledVector(up, spot[1])
        .addScaledVector(forward, spot[2]);
      const velocity = new THREE.Vector3(source.velocity.x, source.velocity.y, source.velocity.z).add(speedFor(forward, up, left, spot));
      const color = new THREE.Color(Array.isArray(hex) ? hex[Math.floor(Math.random() * hex.length)] : hex);
      particles.push({ position: start, velocity, life: life * (0.6 + 0.4 * Math.random()), maxLife: life, color });
    }
  }

  function dispose() {
    scene.remove(cloud);
    geometry.dispose();
    material.dispose();
    texture.dispose();
  }

  return { update, dispose };
}

// Sparks fly back, outward from their wheel and up; flames shoot straight back; smoke rises slowly. Each is the
// particle's speed relative to its kart.
function sparkSpeed(forward, up, left, spot) {
  return new THREE.Vector3()
    .addScaledVector(forward, -2 - 2 * Math.random())
    .addScaledVector(left, Math.sign(spot[0]) * 2 * Math.random())
    .addScaledVector(up, 1 + 2 * Math.random());
}

function flameSpeed(forward, up, left) {
  return new THREE.Vector3()
    .addScaledVector(forward, -6 - 3 * Math.random())
    .addScaledVector(left, Math.random() - 0.5)
    .addScaledVector(up, Math.random() - 0.5);
}

function smokeSpeed(forward, up, left) {
  return new THREE.Vector3()
    .addScaledVector(forward, -1 - Math.random())
    .addScaledVector(left, Math.random() - 0.5)
    .addScaledVector(up, 1 + Math.random());
}

// A soft round dot, drawn once on a small canvas, so particles are glowing circles instead of squares.
function createDotTexture() {
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
