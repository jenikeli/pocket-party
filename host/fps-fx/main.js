// Preview of the Saltline effects: ground, fog, a box, a free camera (drag to look, WASD to move), and buttons that
// feed synthetic events into createEffects. Dev tool only; window.fx exposes the pieces for the Browser pane.

import * as THREE from 'three';
import { createEffects } from '../games/fps/effects.js';
import { createRain } from '../games/fps/rain.js';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a3038);
scene.fog = new THREE.Fog(0x2a3038, 8, 60);
scene.add(new THREE.HemisphereLight(0x8899aa, 0x222222, 1.2));
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ color: 0x3a3d40 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const box = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0x8a3a2a }));
box.position.set(0, 1.3, -8);
scene.add(box);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.05, 200);
camera.position.set(0, 1.6, 4);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.append(renderer.domElement);

const effects = createEffects(scene);
effects.setPointScale(innerHeight / (2 * Math.tan((70 / 2) * Math.PI / 180)));
const rain = createRain(scene);
const world = { grenades: [] };
const pending = [];
window.fx = { effects, rain, world, camera, pending, scene };

const at = { x: 0, y: 0, z: -2 };
const tests = {
  shot: () => pending.push({ type: 'shot', x: 0.3, y: 1.4, z: 3.5, ex: 0, ey: 1.3, ez: -6.6 }),
  ...Object.fromEntries(['container', 'concrete', 'steel', 'metal', 'wood', 'flesh'].map((mat) => [`impact ${mat}`,
    () => pending.push({ type: 'impact', x: (Math.random() - 0.5) * 2, y: 1 + Math.random(), z: -6.52, nx: 0, ny: 0, nz: 1, mat })])),
  explode: () => pending.push({ type: 'explode', ...at, radius: 5 }),
  flash: () => pending.push({ type: 'flash', x: 0, y: 1.2, z: -2 }),
  smoke: () => pending.push({ type: 'smoke', x: 0, y: 0, z: -3, radius: 4, seconds: 15 }),
  kill: () => pending.push({ type: 'kill', x: 0, y: 0, z: -2 }),
  grenades: () => { world.grenades = [{ id: 1, kind: 'frag', body: { x: -0.5, y: 1, z: 0 } }, { id: 2, kind: 'smoke', body: { x: 0, y: 1, z: 0 } }, { id: 3, kind: 'flash', body: { x: 0.5, y: 1, z: 0 } }]; },
};
for (const [name, run] of Object.entries(tests)) {
  const button = document.createElement('button');
  button.textContent = name;
  button.onclick = run;
  document.getElementById('bar').append(button);
}

let yaw = 0, pitch = 0;
const keys = new Set();
addEventListener('keydown', (e) => keys.add(e.key.toLowerCase()));
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
renderer.domElement.addEventListener('pointermove', (e) => { if (e.buttons) { yaw -= e.movementX * 0.005; pitch -= e.movementY * 0.005; } });

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  camera.rotation.set(pitch, yaw, 0, 'YXZ');
  const step = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 1 : 0), side = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
  camera.position.x += (-Math.sin(yaw) * step + Math.cos(yaw) * side) * dt * 5;
  camera.position.z += (-Math.cos(yaw) * step - Math.sin(yaw) * side) * dt * 5;
  effects.handle(pending);
  pending.length = 0;
  effects.sync(world);
  effects.update(dt);
  rain.update(dt);
  rain.follow(camera.position);
  renderer.render(scene, camera);
  document.getElementById('stat').textContent = `${(dt * 1000).toFixed(1)} ms  draws ${renderer.info.render.calls}`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
