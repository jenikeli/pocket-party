// Rain for Saltline: about 1200 falling streaks in a box around the camera. The streaks fall inside the vertex shader
// from a time uniform, so update(dt) only advances that uniform and follow() only moves the group.

import * as THREE from 'three';

const WIDTH = 30, HEIGHT = 16, COUNT = 1200;

const VERTEX = `
  attribute float aSeed;
  attribute float aTail;
  uniform float uTime;
  uniform vec3 uBox;
  uniform vec2 uWind;
  varying float vAlpha;
  void main() {
    float speed = 11.0 + aSeed * 3.0;
    vec3 p = position;
    p.y = mod(p.y - uTime * speed, uBox.y);
    p.x = mod(p.x + uTime * uWind.x, uBox.x);
    p.z = mod(p.z + uTime * uWind.y, uBox.z);
    // the tail is up-wind of the head, along the fall direction
    vec3 fall = normalize(vec3(uWind.x, -speed, uWind.y));
    vec3 q = p - uBox * 0.5 - fall * aTail * (0.35 + aSeed * 0.25);
    float edge = smoothstep(0.0, 2.0, p.y) * smoothstep(uBox.y, uBox.y - 2.0, p.y);
    vAlpha = edge * (1.0 - length(q.xz) / (uBox.x * 0.5)) * (1.0 - aTail * 0.8);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(q, 1.0);
  }`;
const FRAGMENT = `
  varying float vAlpha;
  void main() { gl_FragColor = vec4(0.72, 0.78, 0.85, clamp(vAlpha, 0.0, 1.0) * 0.5); }`;

export function createRain(scene) {
  const positions = new Float32Array(COUNT * 6);
  const seeds = new Float32Array(COUNT * 2);
  const tails = new Float32Array(COUNT * 2);
  for (let i = 0; i < COUNT; i++) {
    const x = Math.random() * WIDTH, y = Math.random() * HEIGHT, z = Math.random() * WIDTH, seed = Math.random();
    for (let end = 0; end < 2; end++) {
      positions.set([x, y, z], (i * 2 + end) * 3);
      seeds[i * 2 + end] = seed;
      tails[i * 2 + end] = end;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geometry.setAttribute('aTail', new THREE.BufferAttribute(tails, 1));
  const uniforms = { uTime: { value: 0 }, uBox: { value: new THREE.Vector3(WIDTH, HEIGHT, WIDTH) }, uWind: { value: new THREE.Vector2(1.5, 0.5) } };
  const material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms, transparent: true, depthWrite: false });
  const rain = new THREE.LineSegments(geometry, material);
  rain.frustumCulled = false; // the shader moves every vertex, so the stored bounds mean nothing
  const group = new THREE.Group();
  group.add(rain);
  scene.add(group);
  return {
    follow(position) { group.position.copy(position); },
    update(dt) { uniforms.uTime.value += dt; },
  };
}
