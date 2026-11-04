// How the magnet looks (M8c): while a kart's magnet runs, a red horseshoe magnet with silver tips floats and bobs
// over it, rings pulse inward on the road at the magnet's reach, and curving lines of light flow from each kart
// the magnet pulls (fieldTargets, field-forces.js) to the magnet (field-line-look.js). The horseshoe grows in at
// the start and shrinks away at the end. Only drawing, read from the race's plain data; a frame allocates nothing
// once the pools have grown to what is shown. Used by item-drawing.js.

import * as THREE from 'three';
import { KART_ITEMS } from '../../../../shared/protocol.js';
import { tuning } from '../tuning.js';
import { fieldTargets } from './field-forces.js';
import { createRingPool } from './field-ring-look.js';
import { createLinePool } from './field-line-look.js';

// The horseshoe: the arch's radius and thickness, the straight legs below it, the silver tips at their ends.
const ARCH_RADIUS = 0.55;
const TUBE = 0.2;
const LEG_LENGTH = 0.45;
const TIP_LENGTH = 0.28;
const RED_HEX = 0xd8262c;
const SILVER_HEX = 0xdfe3ea;
// Its middle floats this far over the kart's base, bobbing and swaying a little.
const HOVER = 3.1;
const MAGNET_SCALE = 1.4;
const BOB = 0.15;
const BOB_RATE = 3;
const SWAY = 0.45;
const SWAY_RATE = 1.6;
// Grow-in and shrink-out times (seconds).
const GROW_SECONDS = 0.25;
const SHRINK_SECONDS = 0.3;
// Three rings run inward from the reach, one cycle every RING_SECONDS.
const RING_COUNT = 3;
const RING_SECONDS = 1.2;
const RING_HEX = 0xff6a5c;
const RING_OPACITY = 0.7;
// The lines end this far over the kart they pull.
const TARGET_HEIGHT = 0.5;

// The horseshoe's shared geometries and materials, and `make()`, a Group of meshes using them: the arch and legs
// red, the tips silver, standing with the arch up and the tips down, its face toward +z.
export function createHorseshoeSet() {
  const arch = new THREE.TorusGeometry(ARCH_RADIUS, TUBE, 14, 28, Math.PI);
  const leg = new THREE.CylinderGeometry(TUBE, TUBE, LEG_LENGTH, 14);
  const tip = new THREE.CylinderGeometry(TUBE * 1.04, TUBE * 1.04, TIP_LENGTH, 14);
  const red = new THREE.MeshStandardMaterial({ color: RED_HEX, roughness: 0.3, metalness: 0.2 });
  const silver = new THREE.MeshStandardMaterial({ color: SILVER_HEX, roughness: 0.2, metalness: 0.9 });

  function make() {
    const group = new THREE.Group();
    group.add(new THREE.Mesh(arch, red));
    for (const side of [-1, 1]) {
      const legMesh = new THREE.Mesh(leg, red);
      legMesh.position.set(side * ARCH_RADIUS, -LEG_LENGTH / 2, 0);
      const tipMesh = new THREE.Mesh(tip, silver);
      tipMesh.position.set(side * ARCH_RADIUS, -LEG_LENGTH - TIP_LENGTH / 2, 0);
      group.add(legMesh, tipMesh);
    }
    group.children.forEach((part) => (part.castShadow = true));
    return group;
  }

  function dispose() {
    [arch, leg, tip, red, silver].forEach((shared) => shared.dispose());
  }

  return { make, dispose };
}

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape).
export function createMagnetDrawing(scene) {
  const set = createHorseshoeSet();
  const rings = createRingPool(scene, RING_HEX);
  const lines = createLinePool(scene);
  // One horseshoe is made now, visible but too small to see, so the renderer builds the shaders while the game
  // starts (renderer.js compiles every visible thing) instead of stalling on the first magnet; a race adds one
  // for each of its karts as it first shows (before any frame of play).
  const horseshoes = [];
  addHorseshoe().scale.setScalar(0.001);
  let shownRace = null;
  let time = 0;
  const frame = { right: new THREE.Vector3(), up: new THREE.Vector3(), forward: new THREE.Vector3(), matrix: new THREE.Matrix4() };
  const sway = new THREE.Quaternion();
  const swayAxis = new THREE.Vector3(0, 1, 0);
  const from = new THREE.Vector3();
  const to = new THREE.Vector3();

  function update(race, track, poses, dt) {
    time += dt;
    rings.begin();
    lines.begin(time);
    for (let index = 0; index < horseshoes.length; index += 1) {
      horseshoes[index].visible = false;
    }
    if (race) {
      showRace(race, track, poses);
    }
    rings.end();
    lines.end();
  }

  function showRace(race, track, poses) {
    if (race !== shownRace) {
      shownRace = race;
      while (horseshoes.length < race.karts.length) {
        addHorseshoe().visible = false;
      }
    }
    for (let index = 0; index < race.karts.length; index += 1) {
      const kart = race.karts[index];
      const effect = kart.item?.effect;
      if (effect?.item !== KART_ITEMS.MAGNET || kart.respawnIn !== null) {
        continue;
      }
      const elapsed = tuning.itemEffectSeconds - effect.left;
      const appear = Math.max(Math.min(elapsed / GROW_SECONDS, effect.left / SHRINK_SECONDS, 1), 0);
      placeHorseshoe(horseshoes[index], poses[index], Math.max(appear, 0.001));
      for (let ring = 0; ring < RING_COUNT; ring += 1) {
        const phase = (elapsed / RING_SECONDS + ring / RING_COUNT) % 1;
        rings.place(poses[index], kart, track, tuning.magnetReach * (1 - phase), RING_OPACITY * Math.sin(Math.PI * phase) * appear);
      }
      placeFieldLines(race, kart, poses, poses[index]);
    }
  }

  function addHorseshoe() {
    const horseshoe = set.make();
    scene.add(horseshoe);
    horseshoes.push(horseshoe);
    return horseshoe;
  }

  // Over the pose's kart: its face toward the kart's heading (so a chase camera sees it full on), swaying about
  // up, bobbing.
  function placeHorseshoe(horseshoe, pose, appear) {
    const { right, up, forward, matrix } = frame;
    up.set(pose.up.x, pose.up.y, pose.up.z);
    forward.set(pose.forward.x, pose.forward.y, pose.forward.z);
    right.crossVectors(up, forward);
    matrix.makeBasis(right, up, forward);
    horseshoe.visible = true;
    horseshoe.quaternion.setFromRotationMatrix(matrix);
    horseshoe.quaternion.multiply(sway.setFromAxisAngle(swayAxis, SWAY * Math.sin(time * SWAY_RATE)));
    const height = HOVER + BOB * Math.sin(time * BOB_RATE);
    horseshoe.position.set(pose.position.x + up.x * height, pose.position.y + up.y * height, pose.position.z + up.z * height);
    horseshoe.scale.setScalar(MAGNET_SCALE * appear);
  }

  // A bundle of lines from every kart this magnet pulls to the horseshoe's tips.
  function placeFieldLines(race, kart, poses, pole) {
    const targets = fieldTargets(race, kart);
    const poleHeight = HOVER - MAGNET_SCALE * (LEG_LENGTH + TIP_LENGTH);
    to.set(pole.position.x, pole.position.y, pole.position.z).addScaledVector(pole.up, poleHeight);
    for (let index = 0; index < targets.length; index += 1) {
      const pose = poses[race.karts.indexOf(targets[index])];
      from.set(pose.position.x, pose.position.y, pose.position.z).addScaledVector(pose.up, TARGET_HEIGHT);
      lines.place(from, to, pole.up);
    }
  }

  function dispose() {
    horseshoes.forEach((horseshoe) => scene.remove(horseshoe));
    set.dispose();
    lines.dispose();
    rings.dispose();
  }

  return { update, dispose };
}
