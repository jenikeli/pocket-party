// The spin-boost posts of the airport's anti-gravity ring (M9), drawn: a fat orange bollard on a bolted steel foot,
// a glowing cyan band (our anti-gravity colour) and a red dome light on top, after the reference game's. Each stands where
// track.spinPosts says, on the road's surface along its normal, as wide and tall as the rules' post (spin-posts.js).
// Every part is one geometry drawn once per post (instanced). A post flashes white for SPIN_POST_FLASH seconds
// when a kart touches it (race.spinPosts[i].sinceHit). The caller adds `object` to the world. Used by the
// airport's dressing (airport-scenery.js).

import * as THREE from 'three';
import { pointAt } from '../track.js';
import { SPIN_POST_HEIGHT, SPIN_POST_RADIUS } from '../spin-posts.js';
import { at, coloured, mergeShapes, shaded } from '../shape-utils.js';
import { lathe } from './circuit-shapes.js';

const SPIN_POST_FLASH = 0.3;
const COLUMNS = 20;
const BODY_ORANGE = 0xf59a22;
const FOOT_STEEL = 0x8c919b;
const BOLTS = 6;
const BODY_BOTTOM = 0.16;
const NECK_TOP = 1.4;
// How bright the band and dome glow (above 1: they reach the High quality's bloom), at rest and at the flash's start.
const REST_GLOW = 1.3;
const FLASH_GLOW = 4;
const BAND_COLOR = new THREE.Color(0.2, 0.85, 1);
const DOME_COLOR = new THREE.Color(1, 0.04, 0.02);
const FLASH_COLOR = new THREE.Color(1, 1, 1);

// Returns { object, update(dt, race) } (race is null on the setup screen: no post flashes).
export function buildSpinPosts(kit) {
  const spots = kit.track.spinPosts.map(({ s, lateral }) => pointAt(kit.track, s, lateral));
  const parts = [
    drawn(kit, footShape(), kit.materials.iron, spots, false),
    drawn(kit, bodyShape(), kit.materials.painted, spots, true),
    drawn(kit, bandShape(), new THREE.MeshBasicMaterial(), spots, false),
    drawn(kit, domeShape(), new THREE.MeshBasicMaterial(), spots, false),
  ];
  const [band, dome] = parts.slice(2);
  const object = new THREE.Group();
  object.add(...parts);
  const color = new THREE.Color();

  function update(dt, race) {
    for (let index = 0; index < spots.length; index += 1) {
      const sinceHit = race?.spinPosts[index].sinceHit ?? null;
      const flash = sinceHit === null ? 0 : Math.max(0, 1 - sinceHit / SPIN_POST_FLASH);
      const glow = REST_GLOW + (FLASH_GLOW - REST_GLOW) * flash;
      band.setColorAt(index, color.copy(BAND_COLOR).lerp(FLASH_COLOR, flash).multiplyScalar(glow));
      dome.setColorAt(index, color.copy(DOME_COLOR).lerp(FLASH_COLOR, flash).multiplyScalar(glow));
    }
    for (const mesh of [band, dome]) {
      mesh.instanceColor.needsUpdate = true;
    }
  }

  update(0, null);
  return { object, update };
}

// `geometry` drawn once at each of `spots` (pointAt results), standing on the road along its normal. The basis
// (forward, normal, right) is right-handed, so the shape is not mirrored.
function drawn(kit, geometry, material, spots, castsShadow) {
  const mesh = new THREE.InstancedMesh(kit.keep(geometry), kit.keep(material), spots.length);
  const matrix = new THREE.Matrix4();
  spots.forEach(({ position, forward, normal, right }, index) => {
    matrix.makeBasis(new THREE.Vector3(forward.x, forward.y, forward.z), new THREE.Vector3(normal.x, normal.y, normal.z), new THREE.Vector3(right.x, right.y, right.z));
    matrix.setPosition(position.x, position.y, position.z);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.castShadow = castsShadow;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

// The steel foot: a rounded flange a little wider than the post, with bolt heads round it.
function footShape() {
  const flange = lathe([[0, 0], [1.05, 0], [1.08, 0.04], [1.04, 0.12], [0.9, 0.17], [0.82, 0.17], [0, 0.17]], COLUMNS);
  const bolts = Array.from({ length: BOLTS }, (unused, index) => {
    const angle = (index / BOLTS) * 2 * Math.PI;
    return at(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 6), Math.cos(angle) * 0.95, 0.19, Math.sin(angle) * 0.95);
  });
  return mergeShapes([coloured(flange, FOOT_STEEL), ...bolts.map((bolt) => coloured(bolt, 0x555a63))]);
}

// The orange body: wide at its foot, easing in to a neck with a dark steel collar the dome sits on. Darker low
// down, where it meets the foot, as the reference game's creases are.
function bodyShape() {
  const profile = [
    [0.8, BODY_BOTTOM], [SPIN_POST_RADIUS, 0.3], [0.78, 0.7], [0.76, 1.1], [0.68, 1.3], [0.54, NECK_TOP], [0.46, NECK_TOP + 0.03], [0, NECK_TOP + 0.03],
  ];
  const body = coloured(lathe(profile, COLUMNS), BODY_ORANGE);
  return shaded(body, (x, y) => (y < 0.35 ? 0.7 + (y - BODY_BOTTOM) * 1.6 : 1));
}

// The glowing band round the body, a little proud of it (its inside sunk into the body, so nothing shows through).
function bandShape() {
  return lathe([[0.7, 0.58], [0.79, 0.58], [0.835, 0.63], [0.83, 0.8], [0.79, 0.86], [0.7, 0.86]], COLUMNS);
}

// The red dome light, a half sphere up to the post's full height.
function domeShape() {
  const radius = SPIN_POST_HEIGHT - (NECK_TOP + 0.03);
  const points = [[0.42, NECK_TOP + 0.03]];
  for (let step = 1; step <= 6; step += 1) {
    const angle = (step / 6) * (Math.PI / 2);
    points.push([Math.max(0.42 * Math.cos(angle), 0), NECK_TOP + 0.03 + radius * Math.sin(angle)]);
  }
  return lathe(points, COLUMNS);
}
