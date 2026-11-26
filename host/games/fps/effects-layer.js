// Draws one particle pool as a single THREE.Points (one draw call) with per-particle size and alpha, plus the small
// canvas textures the effects use. Used by effects.js. Particles never write depth, so smoke and sparks blend freely.

import * as THREE from 'three';
import { createParticles } from './effects-pool.js';

function canvasTexture(draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  draw(canvas.getContext('2d'));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function radial(ctx, stops) {
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  for (const [at, color] of stops) gradient.addColorStop(at, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
}

export function makeTextures() {
  return {
    soft: canvasTexture((ctx) => radial(ctx, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']])),
    spark: canvasTexture((ctx) => radial(ctx, [[0, 'rgba(255,255,255,1)'], [0.15, 'rgba(255,255,255,0.9)'], [0.5, 'rgba(255,255,255,0.15)'], [1, 'rgba(255,255,255,0)']])),
    smoke: canvasTexture((ctx) => {
      for (let i = 0; i < 9; i++) {
        const x = 20 + Math.random() * 24, y = 20 + Math.random() * 24, r = 10 + Math.random() * 10;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
        gradient.addColorStop(0, 'rgba(255,255,255,0.35)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);
      }
    }),
    hole: canvasTexture((ctx) => radial(ctx, [[0, 'rgba(0,0,0,0.95)'], [0.45, 'rgba(10,8,6,0.85)'], [0.7, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']])),
  };
}

const VERTEX = `
  attribute vec4 aColor;
  attribute float aSize;
  uniform float uScale;
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uScale / max(0.1, -mv.z), 0.0, 400.0);
    gl_Position = projectionMatrix * mv;
  }`;
const FRAGMENT = `
  uniform sampler2D uMap;
  varying vec4 vColor;
  void main() {
    vec4 t = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor.rgb, vColor.a * t.a);
  }`;

// additive: true for sparks and fire, false for smoke and dust. pointScale = viewHeightPx / (2 * tan(fov / 2)).
export function createLayer(scene, texture, capacity, additive, pointScale) {
  const sim = createParticles(capacity);
  const geometry = new THREE.BufferGeometry();
  const position = new THREE.BufferAttribute(sim.pos, 3).setUsage(THREE.DynamicDrawUsage);
  const color = new THREE.BufferAttribute(sim.color, 4).setUsage(THREE.DynamicDrawUsage);
  const size = new THREE.BufferAttribute(sim.size, 1).setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', position);
  geometry.setAttribute('aColor', color);
  geometry.setAttribute('aSize', size);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    uniforms: { uMap: { value: texture }, uScale: { value: pointScale } },
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false; // positions move every frame; the bounding sphere would be stale
  scene.add(points);
  return {
    spawn: sim.spawn,
    material,
    update(dt) {
      sim.step(dt);
      position.needsUpdate = color.needsUpdate = size.needsUpdate = true;
    },
  };
}
