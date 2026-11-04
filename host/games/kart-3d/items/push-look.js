// How the push looks (M8c): while a kart's push runs, a translucent bubble with a bright rim wraps the kart and a
// shockwave ring spreads out along the road from it every half second, out to the push's reach. The bubble pulses
// gently, pops in at the start and shrinks away at the end. Only drawing, read from the race's plain data; a frame
// allocates nothing. Used by item-drawing.js.

import * as THREE from 'three';
import { KART_ITEMS } from '../../../../shared/protocol.js';
import { tuning } from '../tuning.js';
import { createRingPool } from './field-ring-look.js';

// The bubble: its radius round the kart's middle, how high that middle is over the road, and its pulse (a share of
// the radius, cycles a second).
const BUBBLE_RADIUS = 1.9;
const BUBBLE_HEIGHT = 0.6;
const PULSE = 0.05;
const PULSE_RATE = 2.2;
const GROW_SECONDS = 0.2;
const SHRINK_SECONDS = 0.3;
const BUBBLE_HEX = 0x8fe6ff;
// How see-through the bubble's middle is, and how bright its rim.
const BUBBLE_CLEAR = 0.07;
const BUBBLE_RIM = 0.6;
// A shockwave starts every WAVE_SECONDS and lives two of them, so two are always out, a half second apart.
const WAVE_SECONDS = 0.5;
const WAVES = 2;
const WAVE_HEX = 0xbff4ff;
const WAVE_START_RADIUS = 1.2;
const WAVE_OPACITY = 0.85;

// Seen from the side the bubble is clear and its edge bright: the alpha grows as the surface turns edge-on.
const BUBBLE_VERTEX = `
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-viewPosition.xyz);
    gl_Position = projectionMatrix * viewPosition;
  }`;
const BUBBLE_FRAGMENT = `
  uniform vec3 color;
  uniform float clear;
  uniform float rim;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float edge = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 2.5);
    gl_FragColor = vec4(color, clear + rim * edge);
  }`;

// The bubble's material, shared by every kart's.
function createBubbleMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(BUBBLE_HEX) },
      clear: { value: BUBBLE_CLEAR },
      rim: { value: BUBBLE_RIM },
    },
    vertexShader: BUBBLE_VERTEX,
    fragmentShader: BUBBLE_FRAGMENT,
    transparent: true,
    depthWrite: false,
  });
}

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape).
export function createPushDrawing(scene) {
  const material = createBubbleMaterial();
  const geometry = new THREE.SphereGeometry(1, 32, 20);
  const rings = createRingPool(scene, WAVE_HEX);
  // One bubble is made now, visible but too small to see, so the renderer builds its shader while the game starts
  // (renderer.js compiles every visible thing) instead of stalling on the first push.
  const bubbles = [];
  addBubble().scale.setScalar(0.001);
  let shownRace = null;
  let time = 0;

  function update(race, track, poses, dt) {
    time += dt;
    rings.begin();
    for (let index = 0; index < bubbles.length; index += 1) {
      bubbles[index].visible = false;
    }
    if (race) {
      showRace(race, track, poses);
    }
    rings.end();
  }

  // A race first shown gets a bubble for each of its karts (before any frame of play).
  function showRace(race, track, poses) {
    if (race !== shownRace) {
      shownRace = race;
      while (bubbles.length < race.karts.length) {
        addBubble().visible = false;
      }
    }
    for (let index = 0; index < race.karts.length; index += 1) {
      const kart = race.karts[index];
      const effect = kart.item?.effect;
      if (effect?.item !== KART_ITEMS.PUSH || kart.respawnIn !== null) {
        continue;
      }
      const elapsed = tuning.itemEffectSeconds - effect.left;
      const appear = Math.max(Math.min(elapsed / GROW_SECONDS, effect.left / SHRINK_SECONDS, 1), 0);
      placeBubble(bubbles[index], poses[index], appear);
      placeWaves(poses[index], kart, track, elapsed, appear);
    }
  }

  function placeBubble(bubble, pose, appear) {
    const { position, up } = pose;
    bubble.visible = appear > 0;
    bubble.position.set(position.x + up.x * BUBBLE_HEIGHT, position.y + up.y * BUBBLE_HEIGHT, position.z + up.z * BUBBLE_HEIGHT);
    bubble.scale.setScalar(Math.max(BUBBLE_RADIUS * (1 + PULSE * Math.sin(time * PULSE_RATE * 2 * Math.PI)) * appear, 0.001));
  }

  // Rings spreading out, quickly at first and slowing, fading as they go.
  function placeWaves(pose, kart, track, elapsed, appear) {
    for (let wave = 0; wave < WAVES; wave += 1) {
      const phase = (elapsed / (WAVE_SECONDS * WAVES) + wave / WAVES) % 1;
      const spread = 1 - (1 - phase) * (1 - phase);
      const radius = WAVE_START_RADIUS + (tuning.pushReach - WAVE_START_RADIUS) * spread;
      rings.place(pose, kart, track, radius, WAVE_OPACITY * (1 - phase) * appear);
    }
  }

  function addBubble() {
    const bubble = new THREE.Mesh(geometry, material);
    bubble.frustumCulled = false;
    bubble.renderOrder = 3;
    scene.add(bubble);
    bubbles.push(bubble);
    return bubble;
  }

  function dispose() {
    bubbles.forEach((bubble) => scene.remove(bubble));
    geometry.dispose();
    material.dispose();
    rings.dispose();
  }

  return { update, dispose };
}
