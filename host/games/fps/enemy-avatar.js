// The Gull and Hound models used for Relay Recovery enemies. Built from small procedural meshes for the shared scene.

import * as THREE from 'three';

const GEO = {
  body: new THREE.CapsuleGeometry(0.32, 0.55, 4, 8),
  head: new THREE.SphereGeometry(0.22, 12, 8),
  wing: new THREE.BoxGeometry(0.75, 0.07, 0.28),
  leg: new THREE.BoxGeometry(0.13, 0.42, 0.14),
  foot: new THREE.BoxGeometry(0.18, 0.1, 0.28),
  eye: new THREE.SphereGeometry(0.07, 8, 6),
};
const MAT = {
  shell: new THREE.MeshStandardMaterial({ color: 0x43545a, metalness: 0.72, roughness: 0.35 }),
  armor: new THREE.MeshStandardMaterial({ color: 0x777d78, metalness: 0.45, roughness: 0.6 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x20272a, metalness: 0.4, roughness: 0.6 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xff5a40 }),
};

function part(parent, geometry, material, x, y, z) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function makeGull(root) {
  const body = part(root, GEO.body, MAT.shell, 0, 0, 0);
  body.rotation.x = Math.PI / 2;
  part(root, GEO.head, MAT.dark, 0, 0.08, -0.42);
  part(root, GEO.eye, MAT.eye, 0, 0.1, -0.61);
  for (const side of [-1, 1]) {
    const wing = part(root, GEO.wing, MAT.armor, side * 0.48, 0, 0.02);
    wing.rotation.z = side * -0.08;
    const rotor = part(root, GEO.leg, MAT.dark, side * 0.78, -0.08, 0.02);
    rotor.scale.set(0.4, 0.08, 2.2);
  }
}

function makeHound(root) {
  const body = part(root, GEO.body, MAT.dark, 0, 0.48, 0.05);
  body.rotation.x = Math.PI / 2;
  part(root, GEO.head, MAT.shell, 0, 0.58, -0.55);
  part(root, GEO.eye, MAT.eye, 0, 0.62, -0.76);
  part(root, GEO.head, MAT.armor, 0, 0.38, -0.75).scale.set(0.65, 0.42, 0.75);
  for (const x of [-0.2, 0.2]) {
    for (const z of [-0.38, 0.42]) {
      part(root, GEO.leg, MAT.shell, x, 0.2, z);
      part(root, GEO.foot, MAT.dark, x, -0.02, z - 0.03);
    }
  }
}

export function createEnemyAvatar(type) {
  const root = new THREE.Group();
  type === 'gull' ? makeGull(root) : makeHound(root);
  function update(player, dt) {
    if (type === 'gull') {
      root.rotation.z = Math.sin(player.x + player.z) * 0.04;
    } else {
      root.position.y = Math.abs(Math.sin(player.x * 2 + player.z * 2)) * 0.08;
    }
  }
  function setLayer(layer) {
    root.traverse((object) => object.layers.set(layer));
  }
  return { root, update, setLayer };
}
