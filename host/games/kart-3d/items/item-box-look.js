// The item boxes on the road (M8): each floats over its spot, bobbing and turning slowly with its "?" swaying
// inside, a rainbow sliding over its glass. When a kart breaks one (its returnLeft goes above 0) it bursts into
// shards and sparkles and is gone, and in the last half second before it is back it grows in with a small pop.
// All the boxes are two instanced meshes (the glass and the "?"), placed again every frame without allocating.
// Used by item-drawing.js.

import * as THREE from 'three';
import { pointAt } from '../track.js';
import { BOX_SIZE, buildShell, buildQuestionMark, createBoxMaps } from './item-box-shapes-look.js';

// The box's middle floats this high over the road, bobbing this far up and down.
const FLOAT_HEIGHT = 1.35;
const BOB_HEIGHT = 0.12;
const BOB_RATE = 2.2;
// The box turns slowly (radians a second), leaning this far off upright so a corner leads, as the reference game's does. The
// "?" sways from side to side (this far either way, at this rate) facing the karts coming, so they never see it
// from behind, back to front.
const BOX_TURN_RATE = 0.9;
const BOX_LEAN = 0.42;
const MARK_SWAY = 0.6;
const MARK_SWAY_RATE = 1.7;
// How fast the rainbow slides over the glass (picture widths a second) and the "?" pulses (radians a second).
const SHIMMER_RATE = 0.22;
const PULSE_RATE = 4;
const MARK_GLOW = 0.4;
const MARK_PULSE = 0.12;
// A box grows back over its last seconds before it returns, overshooting a little (back-out easing's constant).
const POP_SECONDS = 0.5;
const POP_OVERSHOOT = 2.2;
const SHARDS = 9;
const SPARKLES = 28;
const SPARKLE_SPEED = 5;
// Boxes the meshes hold at first (two rows of a few on a course); a race with more makes them again, bigger.
const FIRST_CAPACITY = 16;

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape). `bursts` is burst-look.js's.
export function createBoxDrawing(scene, bursts) {
  const shellShape = buildShell();
  const markShape = buildQuestionMark();
  const maps = createBoxMaps();
  // Clear glass with a thin film's rainbow (iridescence) that changes as the box turns, and a drawn rainbow
  // glowing faintly, so the box still shimmers in the shade. Both sides are drawn (Three.js draws a see-through
  // double-sided material back faces first), so the far faces show through the near ones as glass does.
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    map: maps.map, alphaMap: maps.alphaMap, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    roughness: 0.08, iridescence: 1, iridescenceIOR: 1.3, iridescenceThicknessRange: [200, 700],
    emissive: 0xffffff, emissiveMap: maps.rainbow, emissiveIntensity: 0.8,
  });
  const markMaterial = createMarkMaterial();
  // Made now, visible but with no box to draw, so the renderer builds their shaders while the game starts
  // (renderer.js compiles every visible thing) instead of stalling on the race's first frame.
  let shells = null;
  let marks = null;
  makeMeshes(FIRST_CAPACITY);
  // The race whose boxes are placed, each box's frame on the road, and its returnLeft last frame (a burst is
  // when it goes from 0 to above).
  let shownRace = null;
  let frames = [];
  let lastReturnLeft = new Float32Array(0);
  let time = 0;
  const local = new THREE.Matrix4();
  const matrix = new THREE.Matrix4();
  // Leaned first, then turned about the road's normal.
  const boxTurn = new THREE.Euler(BOX_LEAN, 0, 0, 'YXZ');
  const markTurn = new THREE.Euler();
  const quaternion = new THREE.Quaternion();
  const lift = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const middle = new THREE.Vector3();

  // `race` null (the setup screen) or a race without boxes (items off) hides them; bursts already flying go on.
  function update(race, track, poses, dt) {
    const boxes = race?.items?.boxes ?? [];
    if (boxes.length === 0) {
      shells.visible = marks.visible = false;
      return;
    }
    if (race !== shownRace) {
      placeBoxes(race, track);
    }
    shells.visible = marks.visible = true;
    time += dt;
    maps.rainbow.offset.x = (time * SHIMMER_RATE) % 1;
    markMaterial.emissiveIntensity = MARK_GLOW + MARK_PULSE * Math.sin(time * PULSE_RATE);
    boxes.forEach((box, index) => {
      const size = boxScale(box.returnLeft);
      const bob = BOB_HEIGHT * Math.sin(time * BOB_RATE + index * 0.8);
      lift.set(0, FLOAT_HEIGHT + bob, 0);
      scale.setScalar(size);
      boxTurn.y = time * BOX_TURN_RATE;
      place(shells, index, boxTurn);
      // The "?"'s readable face is its +z one, turned round to face the karts coming (from the frame's -z).
      markTurn.y = Math.PI + MARK_SWAY * Math.sin(time * MARK_SWAY_RATE + index * 0.8);
      place(marks, index, markTurn);
      if (lastReturnLeft[index] === 0 && box.returnLeft > 0) {
        burst(index);
      }
      lastReturnLeft[index] = box.returnLeft;
    });
    shells.instanceMatrix.needsUpdate = true;
    marks.instanceMatrix.needsUpdate = true;
  }

  // Instance `index` of `mesh` at its box's frame, lifted by `lift`, turned by `turn` and scaled by `scale`.
  function place(mesh, index, turn) {
    local.compose(lift, quaternion.setFromEuler(turn), scale);
    mesh.setMatrixAt(index, matrix.multiplyMatrices(frames[index], local));
  }

  // A new race: a frame on the road for each box (it stands up along the road's normal, facing along it), the
  // meshes made again if there are more boxes than they hold, and no bursts for boxes already broken.
  function placeBoxes(race, track) {
    shownRace = race;
    const { boxes } = race.items;
    frames = boxes.map(({ s, lateral }) => {
      const { position, forward, right, normal } = pointAt(track, s, lateral);
      const left = new THREE.Vector3(-right.x, -right.y, -right.z);
      return new THREE.Matrix4()
        .makeBasis(left, new THREE.Vector3(normal.x, normal.y, normal.z), new THREE.Vector3(forward.x, forward.y, forward.z))
        .setPosition(position.x, position.y, position.z);
    });
    lastReturnLeft = Float32Array.from(boxes, (box) => box.returnLeft);
    if (shells.instanceMatrix.count < boxes.length) {
      removeMeshes();
      makeMeshes(boxes.length);
    }
    shells.count = marks.count = boxes.length;
  }

  // The glass and the "?" for up to `capacity` boxes, drawing none yet.
  function makeMeshes(capacity) {
    shells = new THREE.InstancedMesh(shellShape, shellMaterial, capacity);
    marks = new THREE.InstancedMesh(markShape, markMaterial, capacity);
    shells.count = marks.count = 0;
    // The "?" is solid and drawn before the glass, so it shows through it; see-through glass casts no shadow.
    marks.castShadow = true;
    // They move every frame, so a bounding sphere to cull by would always be stale.
    shells.frustumCulled = marks.frustumCulled = false;
    scene.add(marks, shells);
  }

  // Box `index` breaks: shards and sparkles from its middle.
  function burst(index) {
    middle.set(0, FLOAT_HEIGHT, 0).applyMatrix4(frames[index]);
    bursts.shards(middle, SHARDS, BOX_SIZE * 0.22);
    bursts.sparkles(middle, SPARKLES, SPARKLE_SPEED);
  }

  function removeMeshes() {
    [shells, marks].forEach((mesh) => {
      scene.remove(mesh);
      mesh.dispose();
    });
  }

  function dispose() {
    removeMeshes();
    [shellShape, markShape, shellMaterial, markMaterial, ...Object.values(maps)].forEach((thing) => thing.dispose());
  }

  return { update, dispose };
}

// The "?" glows in its own colours, pulsing, so its face stays white and its rim blue on the side away from the
// sun. Three.js glows one colour for the whole material, so it is white here and the shader multiplies it by each
// vertex's colour, as the karts' skin does (karts/kart-materials.js).
function createMarkMaterial() {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, emissive: 0xffffff, emissiveIntensity: MARK_GLOW });
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance *= vColor.rgb;',
    );
  };
  return material;
}

// A box's size, 0 to 1, from its returnLeft (item-rules.js): 1 while it stands, 0 while it is broken, and over
// its last POP_SECONDS growing back from 0 past 1 and settling (back-out easing).
export function boxScale(returnLeft) {
  if (returnLeft <= 0) {
    return 1;
  }
  if (returnLeft >= POP_SECONDS) {
    return 0;
  }
  // How far the pop is from its end: -1 as it starts, 0 when the box is back.
  const toGo = -returnLeft / POP_SECONDS;
  return 1 + (POP_OVERSHOOT + 1) * toGo ** 3 + POP_OVERSHOOT * toGo ** 2;
}
