// The temple run's characters as smooth 3D models built from capsules and spheres (no files): an explorer
// runner in a jacket, cap and backpack, and the chaser, a hulking demon monkey with glowing eyes, a spiked back
// and a lashing tail. Each is a hierarchy of joints (pivot groups) that poseFigure bends into a run cycle, a
// jump, a slide or a dazed heap. Used by renderer.js. Figures face -Z with feet at y = 0; the renderer turns them
// along the corridor. The camera sits behind, so the backpack and the monkey's spikes are what you see most.

import * as THREE from 'three';

const geometries = new Map();
const materials = new Map();

function geometry(key, make) {
  if (!geometries.has(key)) {
    geometries.set(key, make());
  }
  return geometries.get(key);
}

function material(color, extra = {}) {
  const key = `${color}:${JSON.stringify(extra)}`;
  if (!materials.has(key)) {
    const basic = extra.basic ? new THREE.MeshBasicMaterial({ color }) : new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...extra });
    materials.set(key, basic);
  }
  return materials.get(key);
}

export function disposePeople() {
  geometries.forEach((item) => item.dispose());
  materials.forEach((item) => item.dispose());
  geometries.clear();
  materials.clear();
}

function pivot(parent, x, y, z) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return group;
}

function mesh(parent, geo, mat, x, y, z, scale = [1, 1, 1]) {
  const item = new THREE.Mesh(geo, mat);
  item.position.set(x, y, z);
  item.scale.set(...scale);
  parent.add(item);
  return item;
}

const capsule = (parent, mat, radius, length, x, y, z, scale) =>
  mesh(parent, geometry(`cap${radius}:${length}`, () => new THREE.CapsuleGeometry(radius, length, 6, 14)), mat, x, y, z, scale);
const ball = (parent, mat, radius, x, y, z, scale) =>
  mesh(parent, geometry(`ball${radius}`, () => new THREE.SphereGeometry(radius, 18, 14)), mat, x, y, z, scale);
const cone = (parent, mat, radius, height, x, y, z) =>
  mesh(parent, geometry(`cone${radius}:${height}`, () => new THREE.ConeGeometry(radius, height, 8)), mat, x, y, z);

// The explorer, jacket in the player's colour. Returns { root, joints }.
function buildExplorer(color) {
  const root = new THREE.Group();
  const skin = material(0xe0ac86);
  const jacket = material(color);
  const trousers = material(0x5a4a38);
  const shoe = material(0x2e1f16);
  const hair = material(0x2a1a10);
  const hips = pivot(root, 0, 0.95, 0);
  ball(hips, trousers, 0.18, 0, 0, 0, [1, 0.75, 0.85]);
  const joints = { hips };
  for (const [side, x] of [['L', -0.1], ['R', 0.1]]) {
    const thigh = pivot(hips, x, 0, 0);
    capsule(thigh, trousers, 0.085, 0.3, 0, -0.2, 0);
    const shin = pivot(thigh, 0, -0.4, 0);
    capsule(shin, trousers, 0.065, 0.3, 0, -0.2, 0);
    ball(shin, shoe, 0.08, 0, -0.42, -0.05, [1, 0.7, 1.7]);
    joints[`thigh${side}`] = thigh;
    joints[`shin${side}`] = shin;
  }
  const spine = pivot(hips, 0, 0.08, 0);
  capsule(spine, jacket, 0.19, 0.28, 0, 0.27, 0, [1, 1, 0.75]);
  mesh(spine, geometry('pack', () => new THREE.BoxGeometry(0.28, 0.36, 0.15)), material(0x6b4a2b), 0, 0.3, 0.2);
  mesh(spine, geometry('roll', () => new THREE.CylinderGeometry(0.06, 0.06, 0.3, 10)), material(0xb89868), 0, 0.5, 0.22).rotation.z = Math.PI / 2;
  joints.spine = spine;
  for (const [side, x] of [['L', -0.27], ['R', 0.27]]) {
    const arm = pivot(spine, x, 0.5, 0);
    capsule(arm, jacket, 0.06, 0.22, 0, -0.15, 0);
    const fore = pivot(arm, 0, -0.3, 0);
    capsule(fore, skin, 0.05, 0.2, 0, -0.14, 0);
    ball(fore, skin, 0.055, 0, -0.29, 0);
    joints[`arm${side}`] = arm;
    joints[`fore${side}`] = fore;
  }
  const head = pivot(spine, 0, 0.62, 0);
  ball(head, skin, 0.125, 0, 0.15, 0, [1, 1.1, 1]);
  ball(head, hair, 0.13, 0, 0.19, 0.03, [1, 0.9, 1.05]);
  mesh(head, geometry('cap', () => new THREE.SphereGeometry(0.14, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2)), jacket, 0, 0.21, 0.01);
  capsule(head, hair, 0.035, 0.14, 0, 0.1, 0.15).rotation.x = -0.5;
  joints.head = head;
  const stars = pivot(root, 0, 0.5, 0);
  for (let star = 0; star < 3; star += 1) {
    ball(stars, material(0xffe14d, { basic: true }), 0.04, 0, 0, 0);
  }
  stars.visible = false;
  return { root, joints, kind: 'explorer', stars };
}

// The demon monkey. The player's colour is its collar.
function buildMonkey(color) {
  const root = new THREE.Group();
  const fur = material(0x2a1a15);
  const dark = material(0x160c09);
  const face = material(0x6b4a3a);
  const eye = material(0xff4a1a, { basic: true });
  const tooth = material(0xf0e8d6);
  const hips = pivot(root, 0, 0.85, 0);
  ball(hips, fur, 0.26, 0, 0, 0, [1, 0.8, 0.9]);
  const joints = { hips };
  for (const [side, x] of [['L', -0.16], ['R', 0.16]]) {
    const thigh = pivot(hips, x, 0, 0);
    capsule(thigh, fur, 0.12, 0.26, 0, -0.2, 0);
    const shin = pivot(thigh, 0, -0.38, 0);
    capsule(shin, fur, 0.09, 0.32, 0, -0.2, 0);
    ball(shin, dark, 0.1, 0, -0.42, -0.08, [1, 0.6, 1.8]);
    joints[`thigh${side}`] = thigh;
    joints[`shin${side}`] = shin;
  }
  const spine = pivot(hips, 0, 0.1, 0);
  capsule(spine, fur, 0.3, 0.3, 0, 0.3, 0, [1.15, 1, 0.9]);
  for (let spike = 0; spike < 5; spike += 1) {
    const spikeMesh = cone(spine, material(0xc9bda0), 0.06, 0.24, 0, 0.08 + spike * 0.14, 0.28 - Math.abs(spike - 2) * 0.03);
    spikeMesh.rotation.x = 0.9;
  }
  mesh(spine, geometry('collar', () => new THREE.TorusGeometry(0.27, 0.045, 10, 24)), material(color), 0, 0.64, 0).rotation.x = Math.PI / 2;
  joints.spine = spine;
  for (const [side, x] of [['L', -0.44], ['R', 0.44]]) {
    const arm = pivot(spine, x, 0.52, 0);
    capsule(arm, fur, 0.1, 0.36, 0, -0.26, 0);
    const fore = pivot(arm, 0, -0.55, 0);
    capsule(fore, fur, 0.085, 0.36, 0, -0.22, 0);
    ball(fore, dark, 0.12, 0, -0.46, 0);
    for (const claw of [-1, 0, 1]) {
      cone(fore, tooth, 0.025, 0.12, claw * 0.06, -0.58, -0.02).rotation.x = Math.PI;
    }
    joints[`arm${side}`] = arm;
    joints[`fore${side}`] = fore;
  }
  const head = pivot(spine, 0, 0.74, 0);
  ball(head, fur, 0.2, 0, 0.1, -0.04);
  ball(head, fur, 0.24, 0, 0.1, 0.1, [1.1, 1, 0.9]);
  ball(head, face, 0.13, 0, 0.04, -0.22, [1, 0.85, 1.1]);
  for (const side of [-1, 1]) {
    ball(head, eye, 0.04, side * 0.09, 0.15, -0.2);
    cone(head, fur, 0.07, 0.2, side * 0.21, 0.24, 0.02).rotation.z = -side * 0.5;
    mesh(head, geometry('brow', () => new THREE.BoxGeometry(0.11, 0.025, 0.04)), dark, side * 0.09, 0.2, -0.22).rotation.z = side * 0.4;
  }
  const jaw = pivot(head, 0, -0.03, -0.2);
  ball(jaw, face, 0.1, 0, -0.03, -0.04, [1, 0.5, 1.1]);
  for (const tooth_x of [-0.06, -0.02, 0.02, 0.06]) {
    cone(jaw, tooth, 0.012, 0.05, tooth_x, 0.02, -0.1);
  }
  joints.head = head;
  joints.jaw = jaw;
  const tail = pivot(hips, 0, 0, 0.22);
  capsule(tail, fur, 0.05, 0.3, 0, 0, 0.18).rotation.x = Math.PI / 2;
  const tip = pivot(tail, 0, 0, 0.38);
  capsule(tip, dark, 0.035, 0.26, 0, 0, 0.14).rotation.x = Math.PI / 2;
  joints.tail = tail;
  joints.tip = tip;
  root.scale.setScalar(1.55);
  return { root, joints, kind: 'monkey' };
}

// Returns a figure { root, joints, kind, bubble }: the shield bubble is shown by the renderer when needed.
export function buildFigure(kind, color) {
  const figure = kind === 'monkey' ? buildMonkey(color) : buildExplorer(color);
  figure.bubble = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 20, 14),
    new THREE.MeshBasicMaterial({ color: 0x5ac8fa, transparent: true, opacity: 0.22, depthWrite: false }),
  );
  figure.bubble.position.y = 1;
  figure.bubble.visible = false;
  figure.root.add(figure.bubble);
  return figure;
}

export function disposeFigure(figure) {
  figure.bubble.geometry.dispose();
  figure.bubble.material.dispose();
}

// state: { phase (a run-cycle angle), lift (metres), crouch, down, eating, time }.
export function poseFigure(figure, state) {
  if (figure.kind === 'monkey') {
    poseMonkey(figure, state);
  } else {
    poseExplorer(figure, state);
  }
}

function resetJoints(joints) {
  for (const joint of Object.values(joints)) {
    joint.rotation.set(0, 0, 0);
  }
}

function poseExplorer(figure, { phase, lift, crouch, down, time }) {
  const j = figure.joints;
  resetJoints(j);
  figure.stars.visible = down;
  j.hips.position.y = 0.95;
  if (down) {
    j.hips.position.y = 0.2;
    j.hips.rotation.x = -Math.PI / 2;
    j.armL.rotation.x = 2.7;
    j.armR.rotation.x = 2.9;
    j.head.rotation.x = 0.4;
    figure.stars.children.forEach((star, index) => {
      const angle = time * 4 + (index * Math.PI * 2) / 3;
      star.position.set(Math.cos(angle) * 0.3, 0, Math.sin(angle) * 0.3);
    });
    return;
  }
  if (crouch) {
    j.hips.position.y = 0.42;
    j.hips.rotation.x = 1.25;
    j.armL.rotation.x = 1.2;
    j.armR.rotation.x = 1.2;
    j.head.rotation.x = -1.1;
    return;
  }
  const swing = Math.sin(phase);
  if (lift > 0) {
    j.thighL.rotation.x = 0.9;
    j.thighR.rotation.x = -0.3;
    j.shinL.rotation.x = -1.1;
    j.shinR.rotation.x = -0.6;
    j.armL.rotation.x = 2.4;
    j.armR.rotation.x = 2.4;
    j.spine.rotation.x = -0.1;
    return;
  }
  j.hips.position.y = 0.95 + 0.05 * Math.abs(Math.sin(phase));
  j.spine.rotation.x = -0.2;
  j.head.rotation.x = 0.15;
  j.thighL.rotation.x = swing * 0.9;
  j.thighR.rotation.x = -swing * 0.9;
  j.shinL.rotation.x = -(0.1 + 0.8 * Math.max(0, Math.cos(phase)));
  j.shinR.rotation.x = -(0.1 + 0.8 * Math.max(0, -Math.cos(phase)));
  j.armL.rotation.x = -swing * 0.9;
  j.armR.rotation.x = swing * 0.9;
  j.foreL.rotation.x = 0.9;
  j.foreR.rotation.x = 0.9;
}

function poseMonkey(figure, { phase, lift, crouch, eating, time }) {
  const j = figure.joints;
  resetJoints(j);
  j.tail.rotation.y = Math.sin(time * 5) * 0.5;
  j.tail.rotation.x = -0.35 + Math.sin(time * 7) * 0.15;
  j.tip.rotation.x = -0.4;
  j.jaw.rotation.x = eating ? 0.6 + 0.1 * Math.sin(time * 40) : 0.12 + 0.06 * Math.sin(phase * 2);
  j.hips.position.y = 0.85;
  j.spine.rotation.x = -0.55;
  j.head.rotation.x = 0.4;
  if (crouch) {
    j.hips.position.y = 0.5;
    j.spine.rotation.x = -1;
    j.thighL.rotation.x = j.thighR.rotation.x = 1.2;
    j.shinL.rotation.x = j.shinR.rotation.x = -1.6;
    j.armL.rotation.x = j.armR.rotation.x = 0.6;
    return;
  }
  if (lift > 0) {
    j.thighL.rotation.x = j.thighR.rotation.x = 0.8;
    j.shinL.rotation.x = j.shinR.rotation.x = -1.2;
    j.armL.rotation.x = j.armR.rotation.x = 2.3;
    return;
  }
  const swing = Math.sin(phase);
  j.hips.position.y = 0.85 + 0.09 * Math.abs(Math.cos(phase));
  j.thighL.rotation.x = swing * 0.8;
  j.thighR.rotation.x = -swing * 0.8;
  j.shinL.rotation.x = -(0.2 + 0.8 * Math.max(0, Math.cos(phase)));
  j.shinR.rotation.x = -(0.2 + 0.8 * Math.max(0, -Math.cos(phase)));
  j.armL.rotation.x = 0.3 - swing * 1.1;
  j.armR.rotation.x = 0.3 + swing * 1.1;
  j.foreL.rotation.x = 0.5 + 0.4 * Math.max(0, swing);
  j.foreR.rotation.x = 0.5 + 0.4 * Math.max(0, -swing);
}
