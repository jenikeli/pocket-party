// A Saltline soldier as seen from outside: a cheap box-built body in the team colour that stands, crouches, runs,
// aims and falls, holding a small model of the current weapon. Used by the renderer for every other player's body.
// Geometry and materials are shared between all avatars (module-level caches); only the groups are per avatar.
import * as THREE from 'three';

const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const sphere = (radius, width = 16, height = 12) => new THREE.SphereGeometry(radius, width, height);
const capsule = (radius, length, cap = 8) => new THREE.CapsuleGeometry(radius, length, cap, 12);
const GEO = {
  head: sphere(0.13, 18, 12), helmet: sphere(0.16, 18, 10), visor: box(0.22, 0.065, 0.025),
  torso: capsule(0.22, 0.22, 8), vest: box(0.46, 0.34, 0.28), pack: box(0.3, 0.34, 0.12),
  arm: capsule(0.065, 0.30, 6), thigh: capsule(0.09, 0.28, 6), shin: capsule(0.075, 0.28, 6), boot: box(0.19, 0.10, 0.29),
};
const baseMaterial = (color) => new THREE.MeshLambertMaterial({ color });
const MAT = {
  skin: baseMaterial(0xc89a78), helmet: baseMaterial(0x4a5340), visor: baseMaterial(0x14202c),
  cloth: baseMaterial(0x3b4237), pants: baseMaterial(0x30343a), boot: baseMaterial(0x1c1b1a),
  gun: baseMaterial(0x23262b), wood: baseMaterial(0x5a4128), blade: baseMaterial(0xaab0b5),
};
const teamMaterials = new Map();
function teamMaterial(color) {
  if (!teamMaterials.has(color)) teamMaterials.set(color, baseMaterial(color));
  return teamMaterials.get(color);
}

// Weapon parts: [width, height, length, x, y, z, material]. The weapon points along -Z; the muzzle is the last z.
const WEAPON_PARTS = {
  rifle: [[0.06, 0.1, 0.5, 0, 0, 0, 'gun'], [0.04, 0.04, 0.3, 0, 0.01, -0.4, 'gun'], [0.05, 0.14, 0.06, 0, -0.1, 0.05, 'gun']],
  carbine: [[0.06, 0.1, 0.4, 0, 0, 0, 'gun'], [0.04, 0.04, 0.2, 0, 0.01, -0.3, 'gun'], [0.05, 0.14, 0.06, 0, -0.1, 0.04, 'gun']],
  shotgun: [[0.07, 0.09, 0.4, 0, 0, 0.05, 'wood'], [0.05, 0.05, 0.45, 0, 0.02, -0.35, 'gun']],
  sniper: [[0.06, 0.1, 0.5, 0, 0, 0.05, 'wood'], [0.04, 0.04, 0.5, 0, 0.02, -0.5, 'gun'], [0.05, 0.06, 0.2, 0, 0.09, -0.1, 'gun']],
  pistol: [[0.05, 0.08, 0.2, 0, 0, 0, 'gun'], [0.05, 0.12, 0.06, 0, -0.08, 0.06, 'gun']],
  knife: [[0.02, 0.05, 0.22, 0, 0, -0.1, 'blade'], [0.04, 0.05, 0.1, 0, 0, 0.05, 'wood']],
};
const MUZZLE_Z = { rifle: -0.55, carbine: -0.42, shotgun: -0.6, sniper: -0.8, pistol: -0.12, knife: -0.2 };

let flashTexture = null;
function getFlashTexture() {
  if (flashTexture) return flashTexture;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const g = canvas.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,230,1)');
  grad.addColorStop(0.4, 'rgba(255,190,70,0.8)');
  grad.addColorStop(1, 'rgba(255,120,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  flashTexture = new THREE.CanvasTexture(canvas);
  return flashTexture;
}
// Also used by the first-person viewmodel for its muzzle flash.
export const createFlashMaterial = () => new THREE.SpriteMaterial({ map: getFlashTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });

function part(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// A leg pivots at the hip; the shin pivots at the knee, so crouching can bend it.
function makeLeg(x) {
  const hip = new THREE.Group();
  hip.position.set(x, 0, 0);
  part(hip, GEO.thigh, MAT.pants, 0, -0.23, 0);
  const knee = new THREE.Group();
  knee.position.y = -0.46;
  part(knee, GEO.shin, MAT.pants, 0, -0.22, 0);
  part(knee, GEO.boot, MAT.boot, 0, -0.44, -0.04);
  hip.add(knee);
  return { hip, knee };
}

function makeWeapons(aim) {
  const weapons = {};
  for (const id of Object.keys(WEAPON_PARTS)) {
    const group = new THREE.Group();
    for (const [w, h, d, x, y, z, mat] of WEAPON_PARTS[id]) part(group, box(w, h, d), MAT[mat], x, y, z);
    group.position.set(0.1, 0, -0.3);
    group.visible = false;
    aim.add(group);
    weapons[id] = group;
  }
  return weapons;
}

function makeUpperBody(teamColor, aim) {
  const upper = new THREE.Group();
  const team = teamMaterial(teamColor);
  part(upper, GEO.torso, MAT.cloth, 0, 0.27, 0);
  part(upper, GEO.vest, team, 0, 0.32, -0.01);
  part(upper, GEO.visor, MAT.visor, 0, 0.66, -0.145);
  part(upper, GEO.pack, MAT.cloth, 0, 0.3, 0.19);
  part(upper, GEO.head, MAT.skin, 0, 0.64, 0);
  part(upper, GEO.helmet, MAT.helmet, 0, 0.74, 0);
  for (const x of [-0.16, 0.16]) {
    const plate = part(upper, box(0.12, 0.09, 0.03), team, x, 0.34, -0.155);
    plate.rotation.z = x < 0 ? -0.12 : 0.12;
  }
  aim.position.set(0, 0.42, 0);
  part(aim, GEO.arm, team, 0.22, -0.02, -0.14);
  part(aim, GEO.arm, MAT.cloth, -0.08, -0.04, -0.3).rotation.y = -0.5;
  upper.add(aim);
  return upper;
}

export function createAvatar(teamColor) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const hips = new THREE.Group();
  const aim = new THREE.Group();
  const legs = [makeLeg(-0.11), makeLeg(0.11)];
  const upper = makeUpperBody(teamColor, aim);
  const weapons = makeWeapons(aim);
  const flash = new THREE.Sprite(createFlashMaterial());
  flash.scale.setScalar(0.35);
  flash.visible = false;
  aim.add(flash);
  hips.add(upper, legs[0].hip, legs[1].hip);
  body.add(hips);
  root.add(body);
  const state = { phase: 0, swing: 0, down: 0, shown: null };

  function update(player, dt) {
    const speed = Math.hypot(player.vx, player.vz);
    state.phase += speed * dt * 2.4;
    state.swing += (Math.min(speed / 4, 1) * 0.9 - state.swing) * Math.min(1, dt * 12);
    state.down += ((player.alive ? 0 : 1) - state.down) * Math.min(1, dt * 8);
    const crouch = player.crouch || 0;
    hips.position.y = 0.92 - 0.3 * crouch;
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? 1 : -1;
      legs[i].hip.rotation.x = Math.sin(state.phase) * state.swing * side - crouch * 0.9;
      legs[i].knee.rotation.x = crouch * 1.6 + Math.max(0, -Math.sin(state.phase) * side) * state.swing * 0.8;
    }
    upper.rotation.x = player.pitch * 0.3 + crouch * 0.15;
    aim.rotation.x = player.pitch * 0.7;
    aim.position.y = 0.42 + Math.abs(Math.sin(state.phase * 2)) * state.swing * 0.02;
    body.rotation.x = -state.down * (Math.PI / 2);
    body.position.y = state.down * 0.2;
    showWeapon(player);
    flash.visible = !!player.firing && player.alive;
  }

  function showWeapon(player) {
    const id = player.guns && player.guns[player.slot] ? player.guns[player.slot].id : null;
    if (id === state.shown) return;
    if (state.shown) weapons[state.shown].visible = false;
    if (id && weapons[id]) weapons[id].visible = true;
    state.shown = id;
    flash.position.set(0.1, 0, -0.3 + (MUZZLE_Z[id] ?? -0.4));
  }

  function setLayer(n) {
    root.traverse((object) => {
      object.layers.set(n);
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }

  function dispose() {
    flash.material.dispose();
    for (const group of Object.values(weapons)) group.children.forEach((mesh) => mesh.geometry.dispose());
  }

  return { root, update, setLayer, dispose };
}
