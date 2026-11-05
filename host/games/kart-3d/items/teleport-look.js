// How the teleport looks (M8c), read from race.items.teleport (teleport.js). In the warning every kart still racing
// flickers (a glitch between its size and a thin tall one) over cyan glow rings on the road that close in on it;
// at the hop a burst of sparkles leaves each old spot and arrives at each new one, and every kart pops in from
// small with a little overshoot. teleportKartScale is a plain function of the state (kart-effect-looks.js
// multiplies it into the kart's size); createTeleportDrawing draws the rings and sparkles (item-drawing.js).

import * as THREE from 'three';
import { createPixelImage } from '../kit/pixel-image.js';
import { TELEPORT_WARNING_SECONDS, TELEPORT_AFTER_SECONDS } from './teleport.js';

// The glitch: flickers a second at this rate, between the kart's size and a thin, tall one.
const FLICKER_RATE = 14;
const GLITCH = Object.freeze({ x: 0.55, y: 1.2, z: 1 });
const ONE = Object.freeze({ x: 1, y: 1, z: 1 });
// The pop: size 1 - e^(-POP_DAMPING t) cos(POP_WOBBLE t), from nothing, overshooting by about a tenth once; gone
// from the size by POP_SECONDS. A kart is never drawn smaller than POP_LEAST, so it does not vanish outright.
const POP_DAMPING = 10;
const POP_WOBBLE = 14;
const POP_SECONDS = 0.5;
const POP_LEAST = 0.05;
// Sparkles at each end of a hop: how many at each of the heights (over the road), and how fast they fly.
const HOP_SPARKLES = { count: 22, speed: 5, heights: [0.3, 1.1, 1.9] };
// After the hop a flash ring spreads from each end for FLASH_SECONDS, up to about FLASH_RADIUS.
const FLASH_SECONDS = 0.4;
const FLASH_RADIUS = 3;
const FLAT_UP = Object.freeze({ x: 0, y: 1, z: 0 });
const FLAT_AHEAD = Object.freeze({ x: 0, y: 0, z: 1 });
// The rings: two to a kart, the outer one closing in from OUTER_RADIUS to the inner's radius over the warning.
const RINGS_PER_KART = 2;
const INNER_RADIUS = 1.5;
const OUTER_RADIUS = 2.6;
// The outer ring stops just outside the inner one, so the two never sit on each other and add up bright.
const OUTER_END = 1.85;
const RING_HEIGHT = 0.06;
// Bloom starts at luma 1 (tuning.bloomThreshold) and rings are not tone mapped: one ring peaks at about 0.45 luma
// (the colour's luma is 0.73 at full level), two overlapping stay under 0.9.
const RING_RGB = [0.25, 0.85, 1];
const RING_PEAK = 0.6;
const SIZE = 128;

// Reused for every kart's pop, so a frame allocates nothing: callers use the result at once (kart-effect-looks.js).
const popScale = { x: 1, y: 1, z: 1 };

// The kart's size multiplier this frame, { x, y, z }, or null when the teleport does not touch it (none running,
// or the kart is not racing). Karts that failed to find a spot pop too: the hop list has no kart ids.
export function teleportKartScale(race, kart) {
  const teleport = race?.items?.teleport;
  if (!teleport || kart.finishTime !== null || kart.respawnIn !== null) {
    return null;
  }
  if (teleport.warningLeft > 0) {
    return Math.floor(teleport.warningLeft * FLICKER_RATE) % 2 === 1 ? GLITCH : ONE;
  }
  const elapsed = TELEPORT_AFTER_SECONDS - teleport.afterLeft;
  if (teleport.hops.length === 0 || elapsed > POP_SECONDS) {
    return null;
  }
  const size = Math.max(1 - Math.exp(-POP_DAMPING * elapsed) * Math.cos(POP_WOBBLE * elapsed), POP_LEAST);
  popScale.x = size;
  popScale.y = size;
  popScale.z = size;
  return popScale;
}

// A ring of light, drawn once as a grey picture to be tinted: a thin bright band at the edge, a faint glow inside.
function createRingTexture() {
  const image = createPixelImage(SIZE, SIZE);
  image.fill((x, y) => {
    const radius = Math.hypot(x - SIZE / 2, y - SIZE / 2) / (SIZE / 2);
    const band = Math.exp(-(((radius - 0.88) / 0.07) ** 2));
    const glow = radius < 0.88 ? 0.12 * radius : 0;
    const value = Math.min(band + glow, 1) * 255;
    return [value, value, value];
  });
  return image.toTexture({ repeat: false });
}

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape); `bursts` is burst-look.js's.
export function createTeleportDrawing(scene, bursts) {
  const texture = createRingTexture();
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const material = new THREE.MeshBasicMaterial({
    map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
  let rings = null;
  // The teleport (its object) whose hop already set off sparkles; a new teleport is a new object.
  let sparkledFor = null;
  const matrix = new THREE.Matrix4();
  const across = new THREE.Vector3();
  const up = new THREE.Vector3();
  const along = new THREE.Vector3();
  const size = new THREE.Vector3();
  const color = new THREE.Color();
  const sparkleAt = new THREE.Vector3();

  function update(race, track, poses) {
    const teleport = race?.items?.teleport ?? null;
    showRings(race, teleport, poses);
    if (teleport && teleport.hops.length > 0 && sparkledFor !== teleport) {
      sparkledFor = teleport;
      for (const { from, to } of teleport.hops) {
        sparkle(from);
        sparkle(to);
      }
    }
  }

  // A column of sparkles at `position`: the same number at each of a few heights, so it reads from far off.
  function sparkle(position) {
    for (const height of HOP_SPARKLES.heights) {
      sparkleAt.set(position.x, position.y + height, position.z);
      bursts.sparkles(sparkleAt, HOP_SPARKLES.count, HOP_SPARKLES.speed);
    }
  }

  // The rings: two under each racing kart in the warning, closing in; after the hop one flash ring spreading
  // from each end of every hop; none otherwise.
  function showRings(race, teleport, poses) {
    const karts = race?.karts ?? [];
    if (!rings || rings.instanceMatrix.count < karts.length * RINGS_PER_KART) {
      makeRings(Math.max(karts.length, 1) * RINGS_PER_KART);
    }
    let shown = 0;
    if (teleport && teleport.warningLeft > 0) {
      const progress = 1 - teleport.warningLeft / TELEPORT_WARNING_SECONDS;
      for (let index = 0; index < karts.length; index += 1) {
        const { finishTime, respawnIn } = karts[index];
        if (finishTime === null && respawnIn === null) {
          const { position, forward, up: normal } = poses[index];
          placeRing(shown, position, normal, forward, INNER_RADIUS, 0.35 + 0.65 * progress);
          placeRing(shown + 1, position, normal, forward, OUTER_RADIUS + (OUTER_END - OUTER_RADIUS) * progress, progress);
          shown += RINGS_PER_KART;
        }
      }
    } else if (teleport && teleport.hops.length > 0) {
      const flash = (TELEPORT_AFTER_SECONDS - teleport.afterLeft) / FLASH_SECONDS;
      for (let index = 0; flash < 1 && index < teleport.hops.length; index += 1) {
        const { from, to } = teleport.hops[index];
        placeRing(shown, from, FLAT_UP, FLAT_AHEAD, FLASH_RADIUS * (0.3 + flash), 1 - flash);
        placeRing(shown + 1, to, FLAT_UP, FLAT_AHEAD, FLASH_RADIUS * (0.3 + flash), 1 - flash);
        shown += RINGS_PER_KART;
      }
    }
    rings.count = shown;
    rings.visible = shown > 0;
    rings.instanceMatrix.needsUpdate = true;
    if (rings.instanceColor) {
      rings.instanceColor.needsUpdate = true;
    }
  }

  // Ring `index`, flat on the road at `position` (road frame `normal`, `forward`), `radius` units out, `strength`
  // bright (0..1). The colour is scaled so one ring peaks at about RING_PEAK luma, two overlapping under bloom.
  function placeRing(index, position, normal, forward, radius, strength) {
    up.set(normal.x, normal.y, normal.z);
    along.set(forward.x, forward.y, forward.z);
    // The plane's x is the road's left (a right-handed frame with y up, z forward), as road-object-drawing.js.
    across.crossVectors(up, along);
    matrix.makeBasis(across, up, along).scale(size.setScalar(radius * 2));
    matrix.setPosition(position.x + up.x * RING_HEIGHT, position.y + up.y * RING_HEIGHT, position.z + up.z * RING_HEIGHT);
    rings.setMatrixAt(index, matrix);
    const level = strength * RING_PEAK;
    rings.setColorAt(index, color.setRGB(RING_RGB[0] * level, RING_RGB[1] * level, RING_RGB[2] * level));
  }

  // The colour is set from the start, so the shader never changes; the rings are not lit and cast no shadow.
  function makeRings(capacity) {
    if (rings) {
      scene.remove(rings);
      rings.dispose();
    }
    rings = new THREE.InstancedMesh(flat, material, capacity);
    rings.setColorAt(0, color.setRGB(0, 0, 0));
    rings.count = 0;
    rings.visible = false;
    rings.frustumCulled = false;
    scene.add(rings);
  }

  function dispose() {
    scene.remove(rings);
    rings?.dispose();
    flat.dispose();
    material.dispose();
    texture.dispose();
  }

  return { update, dispose };
}
