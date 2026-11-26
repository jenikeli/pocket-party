// A first-person weapon and arms, built from boxes and cylinders and parented to that player's
// camera (camera space: forward is -Z, x right, y up). Bob, sprint pose, aim, reload, recoil and draw are animated here.
import * as THREE from 'three';
import { WEAPONS } from './tuning.js';
import { createFlashMaterial } from './avatar.js';

const lambert = (color, glow) => new THREE.MeshLambertMaterial({ color, emissive: color, emissiveIntensity: glow });
const MAT = {
  gun: lambert(0x2a2d32, 0.18), mag: lambert(0x1b1d20, 0.18), wood: lambert(0x6a4a2c, 0.2), blade: lambert(0xb4bbc0, 0.3),
  glass: lambert(0x203848, 0.4), sleeve: lambert(0x4a5340, 0.2), glove: lambert(0x1e1f20, 0.15),
};

// Parts along -Z, origin at the receiver. ['b', w, h, length, x, y, z, material] or ['c', radius, length, x, y, z, material].
// sight = height of the sights above the origin; hands = right (grip) and left (fore-end) glove positions.
const DEFS = {
  rifle: { sight: 0.085, hands: [[0, -0.1, 0.1], [0, -0.05, -0.3]], parts: [
    ['b', 0.07, 0.1, 0.36, 0, 0, 0, 'gun'], ['b', 0.062, 0.07, 0.24, 0, -0.01, -0.28, 'wood'], ['c', 0.013, 0.3, 0, 0.015, -0.5, 'gun'],
    ['b', 0.05, 0.11, 0.22, 0, -0.02, 0.28, 'wood'], ['b', 0.04, 0.09, 0.05, 0, -0.095, 0.1, 'gun'], ['b', 0.04, 0.15, 0.07, 0, -0.12, -0.04, 'mag'],
    ['b', 0.015, 0.03, 0.03, 0, 0.065, -0.45, 'gun'], ['b', 0.03, 0.025, 0.04, 0, 0.062, 0.08, 'gun']] },
  carbine: { sight: 0.085, hands: [[0, -0.1, 0.08], [0, -0.05, -0.22]], parts: [
    ['b', 0.07, 0.1, 0.3, 0, 0, 0, 'gun'], ['b', 0.058, 0.065, 0.16, 0, -0.01, -0.22, 'gun'], ['c', 0.012, 0.2, 0, 0.015, -0.4, 'gun'],
    ['b', 0.04, 0.08, 0.2, 0, -0.01, 0.24, 'gun'], ['b', 0.04, 0.09, 0.05, 0, -0.095, 0.08, 'gun'], ['b', 0.038, 0.14, 0.06, 0, -0.115, -0.03, 'mag'],
    ['b', 0.05, 0.05, 0.1, 0, 0.075, -0.02, 'glass'], ['b', 0.015, 0.03, 0.03, 0, 0.065, -0.36, 'gun']] },
  shotgun: { sight: 0.065, hands: [[0, -0.08, 0.14], [0, -0.04, -0.3]], parts: [
    ['b', 0.065, 0.09, 0.28, 0, 0, 0, 'gun'], ['c', 0.017, 0.55, 0, 0.02, -0.45, 'gun'], ['c', 0.015, 0.45, 0, -0.012, -0.4, 'mag'],
    ['b', 0.07, 0.06, 0.2, 0, -0.03, -0.3, 'wood'], ['b', 0.055, 0.11, 0.28, 0, -0.03, 0.3, 'wood'], ['b', 0.04, 0.09, 0.05, 0, -0.085, 0.12, 'wood'],
    ['b', 0.02, 0.025, 0.03, 0, 0.045, -0.7, 'gun']] },
  sniper: { sight: 0.12, hands: [[0, -0.09, 0.12], [0, -0.06, -0.28]], parts: [
    ['b', 0.06, 0.09, 0.34, 0, 0, 0, 'gun'], ['c', 0.012, 0.6, 0, 0.012, -0.55, 'gun'], ['b', 0.055, 0.07, 0.3, 0, -0.01, -0.2, 'wood'],
    ['b', 0.05, 0.12, 0.3, 0, -0.02, 0.32, 'wood'], ['b', 0.04, 0.09, 0.05, 0, -0.09, 0.1, 'gun'], ['b', 0.035, 0.1, 0.07, 0, -0.09, -0.04, 'mag'],
    ['c', 0.03, 0.26, 0, 0.09, -0.02, 'gun'], ['c', 0.036, 0.05, 0, 0.09, -0.17, 'glass'], ['c', 0.036, 0.05, 0, 0.09, 0.13, 'glass']] },
  pistol: { sight: 0.05, hands: [[0, -0.07, 0.04], [-0.035, -0.07, 0.05]], parts: [
    ['b', 0.04, 0.05, 0.2, 0, 0.005, -0.02, 'gun'], ['b', 0.035, 0.04, 0.17, 0, -0.01, -0.03, 'gun'], ['b', 0.038, 0.11, 0.06, 0, -0.065, 0.06, 'gun'],
    ['b', 0.034, 0.08, 0.05, 0, -0.1, 0.06, 'mag'], ['b', 0.01, 0.015, 0.015, 0, 0.035, -0.1, 'gun'], ['b', 0.015, 0.015, 0.015, 0, 0.035, 0.07, 'gun']] },
  knife: { sight: 0, hands: [[0, -0.02, 0.04], null], parts: [
    ['b', 0.012, 0.045, 0.24, 0, 0.005, -0.18, 'blade'], ['b', 0.014, 0.012, 0.22, 0, 0.026, -0.17, 'blade'],
    ['b', 0.028, 0.06, 0.02, 0, 0, -0.05, 'gun'], ['b', 0.034, 0.04, 0.11, 0, 0, 0.03, 'wood']] },
};
const HIP = new THREE.Vector3(0.2, -0.2, -0.4);
const SPRINT = { pos: new THREE.Vector3(0.1, -0.3, -0.34), yaw: 0.7, pitch: -0.35 };
const BOB = { stand: 0.15, silent: 0.35, run: 1, sprint: 1.7, crouch: 0.5 };

function addPart(group, spec, mags) {
  let mesh;
  if (spec[0] === 'b') {
    mesh = new THREE.Mesh(new THREE.BoxGeometry(spec[1], spec[2], spec[3]), MAT[spec[7]]);
    mesh.position.set(spec[4], spec[5], spec[6]);
    if (spec[7] === 'mag') { mesh.userData.baseY = spec[5]; mags.push(mesh); }
  } else {
    mesh = new THREE.Mesh(new THREE.CylinderGeometry(spec[1], spec[1], spec[2], 8), MAT[spec[6]]);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(spec[3], spec[4], spec[5]);
  }
  group.add(mesh);
}

// A glove at the hand position and a sleeve running from it toward the bottom edge of the view.
function addHand(group, hand, side) {
  const glove = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.09), MAT.glove);
  glove.position.set(...hand);
  const direction = new THREE.Vector3(0.12 * side, -0.3, 0.6).normalize();
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.6), MAT.sleeve);
  sleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
  sleeve.position.set(...hand).addScaledVector(direction, 0.34);
  group.add(glove, sleeve);
}

function makeWeapon(id) {
  const group = new THREE.Group();
  const mags = [];
  DEFS[id].parts.forEach((spec) => addPart(group, spec, mags));
  DEFS[id].hands.forEach((hand, i) => hand && addHand(group, hand, i === 0 ? 1 : -1));
  group.visible = false;
  return { group, mags, muzzleZ: DEFS[id].parts.reduce((far, spec) => Math.min(far, spec[0] === 'b' ? spec[6] - spec[3] / 2 : spec[5] - spec[2] / 2), 0) };
}

const approach = (value, target, rate, dt) => value + (target - value) * Math.min(1, rate * dt);

export function createViewmodel() {
  const group = new THREE.Group();
  const rig = new THREE.Group();
  group.add(rig);
  const weapons = {};
  for (const id of Object.keys(DEFS)) { weapons[id] = makeWeapon(id); rig.add(weapons[id].group); }
  const flash = new THREE.Sprite(createFlashMaterial());
  flash.scale.setScalar(0.22);
  flash.visible = false;
  rig.add(flash);
  const s = { id: null, phase: 0, aim: 0, sprint: 0, bob: 0, draw: 0, kick: 0, flashLeft: 0 };

  function selectWeapon(id) {
    if (s.id) weapons[s.id].group.visible = false;
    s.id = id;
    s.draw = 1;
    if (!id) return;
    weapons[id].group.visible = true;
    flash.position.set(0, 0.01, weapons[id].muzzleZ - 0.04);
  }

  function update(player, dt) {
    const gun = player.guns && player.guns[player.slot];
    const id = gun && weapons[gun.id] ? gun.id : null;
    group.visible = player.alive && id !== null && !(id === 'sniper' && player.zoom > 0);
    if (id !== s.id) selectWeapon(id);
    if (!id) return;
    if (player.firing) { s.kick = Math.min(1, 0.4 + WEAPONS[id].recoil * 12); s.flashLeft = 0.06; }
    s.draw = Math.max(0, s.draw - dt * 4);
    s.kick = Math.max(0, s.kick - dt * 12);
    s.flashLeft = Math.max(0, s.flashLeft - dt);
    flash.visible = s.flashLeft > 0;
    pose(player, id, dt);
    animateMagazine(player, id);
  }

  function pose(player, id, dt) {
    const speed = Math.hypot(player.vx, player.vz);
    s.phase += speed * dt * 1.7;
    s.bob = approach(s.bob, speed > 0.1 ? BOB[player.speedClass] ?? 1 : 0.1, 8, dt);
    s.aim = approach(s.aim, player.zoom > 0 && id !== 'knife' ? 1 : 0, 14, dt);
    s.sprint = approach(s.sprint, player.speedClass === 'sprint' && player.zoom === 0 ? 1 : 0, 9, dt);
    const reload = reloadDip(player, id);
    const hold = 1 - s.aim;
    const sway = Math.sin(s.phase) * 0.012 * s.bob * hold;
    const rise = Math.sin(s.phase * 2) * 0.009 * s.bob * hold + Math.sin(performance.now() / 900) * 0.002;
    rig.position.set(
      THREE.MathUtils.lerp(HIP.x, 0, s.aim) + (SPRINT.pos.x - HIP.x) * s.sprint + sway,
      THREE.MathUtils.lerp(HIP.y, -DEFS[id].sight - 0.01, s.aim) + (SPRINT.pos.y - HIP.y) * s.sprint + rise - reload * 0.12 - s.draw * 0.3,
      THREE.MathUtils.lerp(HIP.z, -0.34, s.aim) + (SPRINT.pos.z - HIP.z) * s.sprint + s.kick * 0.05 * (1 - s.aim * 0.5));
    rig.rotation.set(SPRINT.pitch * s.sprint + s.kick * 0.05 + reload * 0.5 + s.draw * 0.5, SPRINT.yaw * s.sprint, -sway * 3);
  }

  // 0 at rest, up to 1 mid-reload. A shotgun loads shell by shell, so it just holds a small dip.
  function reloadDip(player, id) {
    if (!(player.reloadLeft > 0)) return 0;
    const total = WEAPONS[id].reload;
    if (WEAPONS[id].perShell) return 0.5;
    return Math.sin(Math.PI * (1 - Math.min(1, player.reloadLeft / total)));
  }

  // The magazine slides down and out of the weapon in the first part of a reload, then back in.
  function animateMagazine(player, id) {
    const progress = player.reloadLeft > 0 ? 1 - Math.min(1, player.reloadLeft / WEAPONS[id].reload) : 0;
    const out = progress < 0.4 ? progress / 0.4 : progress > 0.6 ? (1 - progress) / 0.4 : 1;
    const offset = WEAPONS[id].perShell ? 0 : out * 0.18;
    weapons[id].mags.forEach((mag) => { mag.position.y = mag.userData.baseY - offset; });
  }

  function setLayer(n) {
    group.traverse((object) => object.layers.set(n));
  }

  function dispose() {
    group.traverse((object) => object.geometry && object.geometry.dispose());
    flash.material.dispose();
  }

  return { group, update, setLayer, dispose };
}
