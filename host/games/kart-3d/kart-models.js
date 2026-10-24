// The 3D race's kart models, built from simple shapes: a glossy painted body, nose and engine, a dark seat,
// four tyres and a driver in a painted helmet. One model per kart in the field; each has its own paint, so it
// can take its player's roster colour, which the chase camera sees on the engine and helmet from behind.
// Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';

// Where the wheels sit (x, z): front and back, left and right. Karts face +z with their bottom at y = 0.
const WHEEL_SPOTS = [[-0.65, 0.7], [0.65, 0.7], [-0.68, -0.75], [0.68, -0.75]];
const WHEEL_RADIUS = 0.32;

// Returns { karts, paint(index, hex), dispose() }: `count` groups ready to add to the scene. Their matrices are
// set by hand each frame (matrixAutoUpdate is off), since a kart's pose is a full frame, not an angle.
export function createKartModels(count) {
  const shapes = {
    body: new THREE.BoxGeometry(1.3, 0.35, 2).translate(0, 0.45, 0),
    nose: new THREE.BoxGeometry(1, 0.25, 0.45).translate(0, 0.4, 1.1),
    seat: new THREE.BoxGeometry(0.7, 0.5, 0.4).translate(0, 0.8, -0.5),
    engine: new THREE.BoxGeometry(0.8, 0.4, 0.4).translate(0, 0.55, -1),
    tyre: new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.3, 14).rotateZ(Math.PI / 2),
    helmet: new THREE.SphereGeometry(0.3, 16, 12).translate(0, 1.32, -0.32),
    face: new THREE.SphereGeometry(0.22, 12, 8).translate(0, 1.27, -0.18),
  };
  const shared = {
    trim: new THREE.MeshStandardMaterial({ color: 0x22252c, roughness: 0.4, metalness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.85 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xf2c49b, roughness: 0.6 }),
  };
  const paints = [];
  const karts = [];
  for (let index = 0; index < count; index += 1) {
    const paint = new THREE.MeshPhysicalMaterial({ roughness: 0.3, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 });
    paints.push(paint);
    const kart = new THREE.Group();
    kart.matrixAutoUpdate = false;
    kart.add(new THREE.Mesh(shapes.body, paint), new THREE.Mesh(shapes.nose, paint), new THREE.Mesh(shapes.engine, paint));
    kart.add(new THREE.Mesh(shapes.seat, shared.trim), new THREE.Mesh(shapes.helmet, paint), new THREE.Mesh(shapes.face, shared.skin));
    for (const [x, z] of WHEEL_SPOTS) {
      const tyre = new THREE.Mesh(shapes.tyre, shared.tyre);
      tyre.position.set(x, WHEEL_RADIUS, z);
      kart.add(tyre);
    }
    kart.traverse((part) => (part.castShadow = true));
    karts.push(kart);
  }

  // Three.js converts the colour each time it is set, so it is only set when it changes.
  function paint(index, hex) {
    if (paints[index].userData.hex !== hex) {
      paints[index].userData.hex = hex;
      paints[index].color.setHex(hex);
    }
  }

  function dispose() {
    Object.values(shapes).forEach((shape) => shape.dispose());
    Object.values(shared).forEach((material) => material.dispose());
    paints.forEach((material) => material.dispose());
  }

  return { karts, paint, dispose };
}
