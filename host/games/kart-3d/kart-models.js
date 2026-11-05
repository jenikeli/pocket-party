// The 3D race's kart models (M7d5): our go-kart and its driver for each design (karts/kart-designs.js), built
// once when the renderer is made, and one model per kart in the field, which draws whichever design it is
// given. Each frame a model is placed at its kart's pose, its wheels roll with the kart's speed, its front wheels
// turn with the steering, and in anti-gravity its wheels turn flat under it and their rims glow, eased in and out
// (karts/anti-gravity.js). Since M8 a model is drawn at the size items/kart-effect-looks.js gives it (the
// teleport's pop), standing on the road. Since M9 each model holds a glider (karts/glider.js) in its design's
// colours, which unfolds while its kart glides and folds away after it lands; it banks with the body, since the
// glide's bank is the body's roll (kart.bodyRoll). Used by host/games/kart-3d/renderer.js and the kit-shots kart
// and item pieces.

import * as THREE from 'three';
import { forwardSpeed } from './kart-physics.js';
import { KART_DESIGNS } from './karts/kart-designs.js';
import { buildKartParts, buildDesignShapes, disposeKartParts } from './karts/design-shapes.js';
import { buildWheel } from './karts/wheels.js';
import { createKartMaterials } from './karts/kart-materials.js';
import { WHEELS } from './karts/kart-layout.js';
import { MATERIAL_KINDS } from './karts/part-shapes.js';
import { nextAntiGravityShare, easedShare } from './karts/anti-gravity.js';
import { buildGliderCanopy, buildGliderFrame, nextGliderShare, placeGlider } from './karts/glider.js';
import { createGliderMaterials } from './karts/glider-maps.js';

// How far the front wheels turn at full steering.
const WHEEL_TURN_ANGLE = (25 * Math.PI) / 180;
// Flat, a wheel hovers this far off the road and is tucked this far in under the kart.
const FLAT_HOVER = 0.05;
const FLAT_TUCK = 0.06;
const SAME_SIZE = Object.freeze({ x: 1, y: 1, z: 1 });

// Returns { karts, show(index, kart, pose, designIndex, dt, scale), hide(index), dispose() }: `count`
// groups ready to add to the scene. Their matrices are set by hand each frame (matrixAutoUpdate is off), since a
// kart's pose is a full frame, not an angle.
export function createKartModels(count) {
  const kartParts = buildKartParts();
  const designShapes = KART_DESIGNS.map((design) => buildDesignShapes(design, kartParts));
  disposeKartParts(kartParts);
  const wheelShapes = WHEELS.map(buildWheel);
  const materials = createKartMaterials(KART_DESIGNS, count);
  // Every design's glider is the same canopy in its own picture, on a frame in its own colours.
  const canopyShape = buildGliderCanopy();
  const frameShapes = KART_DESIGNS.map((design) => buildGliderFrame(design.palette));
  const gliderMaterials = createGliderMaterials(KART_DESIGNS);
  const karts = [];
  // For each model: its meshes by material kind, its wheels, the design it shows, how far its wheels have rolled
  // along the road (units, from which each wheel's turn follows by its own size) and how far they have turned
  // flat (karts/anti-gravity.js, not yet eased), and its glider and how far that is open (karts/glider.js).
  const bodies = [];
  const wheelSets = [];
  const shownDesigns = [];
  const rolled = [];
  const flatShares = [];
  const gliders = [];
  const gliderShares = [];
  for (let index = 0; index < count; index += 1) {
    const kart = new THREE.Group();
    kart.matrixAutoUpdate = false;
    const body = Object.fromEntries(MATERIAL_KINDS.map((kind) => [kind, new THREE.Mesh(designShapes[0][kind], materialFor(kind, 0))]));
    const wheels = wheelShapes.map((shape) => {
      const wheel = new THREE.Mesh(shape, materials.wheels[index]);
      // Steered about up, then turned flat about forward, then rolled about its own axle.
      wheel.rotation.order = 'YZX';
      return wheel;
    });
    const glider = new THREE.Group();
    glider.add(new THREE.Mesh(canopyShape, gliderMaterials.canopies[0]), new THREE.Mesh(frameShapes[0], materials.byKind.glossy));
    // Open until the model is first shown (show folds it while its kart is not gliding): renderer.js builds every
    // shader while the game starts with renderer.compile, which skips hidden objects, and a shader first built
    // mid-race stalls the frame (M6a).
    placeGlider(glider, 1);
    kart.add(...Object.values(body), ...wheels, glider);
    kart.traverse((part) => (part.castShadow = true));
    karts.push(kart);
    bodies.push(body);
    wheelSets.push(wheels);
    shownDesigns.push(0);
    rolled.push(0);
    flatShares.push(0);
    gliders.push(glider);
    gliderShares.push(0);
  }

  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  // `pose` is the kart as drawn this frame (race-views.js kartPose), `designIndex` an index into KART_DESIGNS
  // (kart-roster.js's assignDesigns), `dt` the real time since the last drawn frame, `scale` the model's size
  // { x across, y up, z along } (kart-effect-looks.js's kartLookScale), about its base, so it stays standing on the
  // road.
  function show(index, kart, pose, designIndex, dt, scale = SAME_SIZE) {
    const model = karts[index];
    model.visible = true;
    useDesign(index, designIndex);
    const { position, bodyForward, bodyUp } = pose;
    // The model faces +z with +y up, so its axes are: x = up x forward (the kart's left), y = up, z = forward
    // made square to up.
    yAxis.set(bodyUp.x, bodyUp.y, bodyUp.z);
    xAxis.set(bodyForward.x, bodyForward.y, bodyForward.z).cross(yAxis).negate().normalize();
    zAxis.crossVectors(xAxis, yAxis);
    // The model's base is its origin (the wheels stand on y = 0), so scaling its axes scales it about its base.
    xAxis.multiplyScalar(scale.x);
    yAxis.multiplyScalar(scale.y);
    zAxis.multiplyScalar(scale.z);
    model.matrix.makeBasis(xAxis, yAxis, zAxis).setPosition(position.x, position.y, position.z);
    model.matrixWorldNeedsUpdate = true;
    // The wheels roll only on the ground; in the air they keep turning as they were (rolled stays).
    if (kart.grounded) {
      rolled[index] += forwardSpeed(kart) * dt;
    }
    flatShares[index] = nextAntiGravityShare(flatShares[index], kart.antiGravity === true, dt);
    const flat = easedShare(flatShares[index]);
    materials.setGlow(index, flat);
    wheelSets[index].forEach((wheel, wheelIndex) => placeWheel(wheel, WHEELS[wheelIndex], rolled[index], kart.wheelTurn, flat));
    gliderShares[index] = nextGliderShare(gliderShares[index], kart.gliding === true, dt);
    placeGlider(gliders[index], gliderShares[index]);
  }

  function hide(index) {
    karts[index].visible = false;
  }

  // Gives model `index` the shapes and emblem of design `designIndex`, if it does not show it already.
  function useDesign(index, designIndex) {
    if (shownDesigns[index] === designIndex) {
      return;
    }
    shownDesigns[index] = designIndex;
    MATERIAL_KINDS.forEach((kind) => {
      const mesh = bodies[index][kind];
      mesh.geometry = designShapes[designIndex][kind];
      mesh.material = materialFor(kind, designIndex);
    });
    const [canopy, frame] = gliders[index].children;
    canopy.material = gliderMaterials.canopies[designIndex];
    frame.geometry = frameShapes[designIndex];
  }

  // Every design shares the kinds' materials, except its decal (its own emblem).
  function materialFor(kind, designIndex) {
    return kind === 'decal' ? materials.decals[designIndex] : materials.byKind[kind];
  }

  function dispose() {
    designShapes.forEach((shapes) => Object.values(shapes).forEach((shape) => shape.dispose()));
    wheelShapes.forEach((shape) => shape.dispose());
    [canopyShape, ...frameShapes].forEach((shape) => shape.dispose());
    materials.dispose();
    gliderMaterials.dispose();
  }

  return { karts, show, hide, dispose };
}

// One wheel at `spot` (kart-layout.js's WHEELS) rolled `rolled` units, steered by `wheelTurn` (-1 to 1) if it is a
// front wheel, and turned `flat` of the way (0 to 1, eased) flat under the kart, its outer face up, hovering.
function placeWheel(wheel, spot, rolled, wheelTurn, flat) {
  wheel.position.set(spot.x - spot.side * FLAT_TUCK * flat, spot.radius + (spot.width / 2 + FLAT_HOVER - spot.radius) * flat, spot.z);
  wheel.rotation.x = rolled / spot.radius;
  // A right turn turns the wheels clockwise seen from above: a negative angle about up.
  wheel.rotation.y = spot.front ? -wheelTurn * WHEEL_TURN_ANGLE : 0;
  wheel.rotation.z = spot.side * flat * (Math.PI / 2);
}
