// The 3D race's kart models (shapes in kart-shapes.js): one per kart in the field, each with its own glossy paint
// so it can take its player's roster colour, which the chase camera sees on the wings, cowl and helmet from
// behind. Each frame a model is placed at its kart's pose, its wheels roll with the kart's speed and its front
// wheels turn with the steering. Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { buildKartShapes, WHEELS } from './kart-shapes.js';
import { forwardSpeed } from './kart-physics.js';

// How far the front wheels turn at full steering.
const WHEEL_TURN_ANGLE = (25 * Math.PI) / 180;

// Returns { karts, show(index, kart, pose, hex, dt), hide(index), dispose() }: `count` groups ready to add to
// the scene. Their matrices are set by hand each frame (matrixAutoUpdate is off), since a kart's pose is a full
// frame, not an angle.
export function createKartModels(count) {
  const shapes = buildKartShapes();
  const shared = {
    dark: new THREE.MeshStandardMaterial({ color: 0x23252d, roughness: 0.4, metalness: 0.2 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe8ebf0, roughness: 0.3, metalness: 1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.5 }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
  };
  const paints = [];
  const karts = [];
  // Each model's wheels, and how far its wheels have rolled along the road (units), from which each wheel's
  // turn follows by its own size.
  const wheelSets = [];
  const rolled = [];
  for (let index = 0; index < count; index += 1) {
    // The clear coat is not quite a mirror: a perfectly sharp one turns the low sun into a glare far brighter
    // than anything else, which bloom then spreads over the whole kart.
    const paint = new THREE.MeshPhysicalMaterial({ roughness: 0.35, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.25 });
    paints.push(paint);
    const kart = new THREE.Group();
    kart.matrixAutoUpdate = false;
    kart.add(new THREE.Mesh(shapes.paint, paint), new THREE.Mesh(shapes.dark, shared.dark));
    kart.add(new THREE.Mesh(shapes.chrome, shared.chrome), new THREE.Mesh(shapes.white, shared.white));
    const wheels = WHEELS.map((spot, wheelIndex) => {
      const wheel = new THREE.Mesh(shapes.wheels[wheelIndex], shared.wheel);
      wheel.position.set(spot.x, spot.radius, spot.z);
      // Turned for steering first, then rolled about its own axle.
      wheel.rotation.order = 'YXZ';
      return wheel;
    });
    kart.add(...wheels);
    kart.traverse((part) => (part.castShadow = true));
    karts.push(kart);
    wheelSets.push(wheels);
    rolled.push(0);
  }

  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  // `pose` is the kart as drawn this frame (race-views.js kartPose), `hex` its paint, `dt` the real time since
  // the last drawn frame.
  function show(index, kart, pose, hex, dt) {
    const model = karts[index];
    model.visible = true;
    setPaint(index, hex);
    const { position, bodyForward, bodyUp } = pose;
    // The model faces +z with +y up, so its axes are: x = up x forward (the kart's left), y = up, z = forward
    // made square to up.
    yAxis.set(bodyUp.x, bodyUp.y, bodyUp.z);
    xAxis.set(bodyForward.x, bodyForward.y, bodyForward.z).cross(yAxis).negate().normalize();
    zAxis.crossVectors(xAxis, yAxis);
    model.matrix.makeBasis(xAxis, yAxis, zAxis).setPosition(position.x, position.y, position.z);
    model.matrixWorldNeedsUpdate = true;
    // The wheels roll only on the ground; in the air they keep turning as they were (rolled stays).
    if (kart.grounded) {
      rolled[index] += forwardSpeed(kart) * dt;
    }
    wheelSets[index].forEach((wheel, wheelIndex) => {
      const spot = WHEELS[wheelIndex];
      wheel.rotation.x = rolled[index] / spot.radius;
      // A right turn turns the wheels clockwise seen from above: a negative angle about up.
      wheel.rotation.y = spot.front ? -kart.wheelTurn * WHEEL_TURN_ANGLE : 0;
    });
  }

  function hide(index) {
    karts[index].visible = false;
  }

  // Three.js converts the colour each time it is set, so it is only set when it changes.
  function setPaint(index, hex) {
    if (paints[index].userData.hex !== hex) {
      paints[index].userData.hex = hex;
      paints[index].color.setHex(hex);
    }
  }

  function dispose() {
    [shapes.paint, shapes.dark, shapes.chrome, shapes.white, ...shapes.wheels].forEach((shape) => shape.dispose());
    Object.values(shared).forEach((material) => material.dispose());
    paints.forEach((material) => material.dispose());
  }

  return { karts, show, hide, dispose };
}
