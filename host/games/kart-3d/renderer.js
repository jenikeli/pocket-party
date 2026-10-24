// Draws the 3D race with Three.js: builds the world (the course's scenery and road, which another course can
// replace, and the karts), then each frame places the karts between their last two steps, moves the particles
// (sparks, flames, smoke) and draws one view per player with its HUD, or, on the setup screen, a slow flight
// round the course. Loaded by the game's load() with a dynamic import(), so Three.js is fetched only when the
// game starts. Used by host/games/kart-3d/index.js.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLAYER_COLORS, displayName, colorText } from '/host/roster.js';
import { buildScenery } from './scenery.js';
import { buildTrackMesh } from './track-mesh.js';
import { createKartModels } from './kart-models.js';
import { createViews } from './views.js';
import { createEffects } from './effects.js';
import { kartPose, viewTargets, viewHud } from './race-views.js';
import { sparkLevel, SPARK_COLORS } from './kart-techniques.js';
import { FIELD_SIZE } from './race.js';

// CPU karts are drawn in greys so the players' colours stand out.
const CPU_COLORS = [0xd0d4dc, 0x9aa1ad, 0x6c7380];
// The setup screen's overview camera circles the course once a minute, outside it and looking down, at these
// shares of how far the course reaches from its middle.
const ORBIT_SECONDS = 60;
const ORBIT_REACH = 1.6;
const ORBIT_HEIGHT = 0.8;

// `track` is the course to draw first. Returns { draw(race, players, alpha, dt), showTrack(track), destroy() }.
export function createRenderer(container, track) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // M6a: pixels are what costs on the iPad, and at ratio 1 it drew the full look with 4 views in under 10 ms.
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Three.js redraws the shadow map on every render() call, which would be once per view. Off, and asked for
  // once per frame in draw(), every view shares one shadow map.
  renderer.shadowMap.autoUpdate = false;
  container.append(renderer.domElement);
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', () => (contextLost = true));

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  // The reflections only add shine to the karts: the sun and sky light the scene already.
  scene.environmentIntensity = 0.35;
  // The course's road and scenery, and where its middle is and how far it reaches (for the overview camera).
  let world = buildWorld(scene, track);
  const kartModels = createKartModels(FIELD_SIZE);
  scene.add(...kartModels.karts);
  const effects = createEffects(scene);
  const views = createViews(container);
  const overviewCamera = new THREE.PerspectiveCamera(50, 16 / 9, 1, 1500);
  let orbitTime = 0;

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();
  // Builds every shader now, while the game starts, not in the middle of the first frames (M6a saw a 1.8 s
  // stall the first time a new kind of material was drawn).
  renderer.compile(scene, overviewCamera);

  // `race` is the race state, or null on the setup screen. `alpha` is from the game runner (between the last
  // two steps); `dt` the real time since the last drawn frame in seconds, for the cameras.
  function draw(race, players, alpha, dt) {
    if (contextLost) {
      throw new Error('The WebGL context was lost (the browser took the graphics memory back)');
    }
    renderer.shadowMap.needsUpdate = true;
    if (!race) {
      kartModels.karts.forEach((model) => (model.visible = false));
      orbitTime += dt;
      const angle = (2 * Math.PI * orbitTime) / ORBIT_SECONDS;
      const radius = world.reach * ORBIT_REACH;
      const height = world.reach * ORBIT_HEIGHT;
      overviewCamera.position.set(world.centre.x + Math.cos(angle) * radius, height, world.centre.z + Math.sin(angle) * radius);
      overviewCamera.lookAt(world.centre);
      effects.update([], dt);
      views.drawOne(renderer, scene, overviewCamera);
      return;
    }
    const poses = race.karts.map((kart) => kartPose(kart, alpha));
    placeKarts(race, players, poses);
    effects.update(race.karts.map((kart, index) => describeEffects(kart, poses[index])), dt);
    const targets = viewTargets(race, players).map(({ kart, player }) => ({
      pose: poses[race.karts.indexOf(kart)],
      name: player ? displayName(player) : 'CPU',
      color: player ? colorText(player) : '#ffffff',
      boosting: kart.boost !== null,
      hud: viewHud(race, kart),
    }));
    views.draw(renderer, scene, targets, dt);
  }

  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  // `poses` are the karts' poses as drawn this frame, in the order of race.karts.
  function placeKarts(race, players, poses) {
    kartModels.karts.forEach((model, index) => {
      const kart = race.karts[index];
      model.visible = Boolean(kart);
      if (!kart) {
        return;
      }
      const player = kart.playerId === null ? null : players.get(kart.playerId);
      kartModels.paint(index, player ? PLAYER_COLORS[player.colorIndex] : CPU_COLORS[index % CPU_COLORS.length]);
      const { position, bodyForward, bodyUp } = poses[index];
      // The model faces +z with +y up, so its axes are: x = up x forward (the kart's left), y = up, z = forward
      // made square to up.
      yAxis.set(bodyUp.x, bodyUp.y, bodyUp.z);
      xAxis.set(bodyForward.x, bodyForward.y, bodyForward.z).cross(yAxis).negate().normalize();
      zAxis.crossVectors(xAxis, yAxis);
      model.matrix.makeBasis(xAxis, yAxis, zAxis).setPosition(position.x, position.y, position.z);
      model.matrixWorldNeedsUpdate = true;
    });
  }

  // Another course chosen on the setup screen: its road and scenery replace the old ones in the same scene and
  // WebGL context (a new context per course would run into iOS's limit). Compiling again is quick: the shaders
  // are the same, and Three.js keeps them.
  function showTrack(newTrack) {
    world.dispose();
    world = buildWorld(scene, newTrack);
    renderer.compile(scene, overviewCamera);
  }

  // forceContextLoss frees the WebGL context now rather than whenever the browser collects the canvas: iOS
  // allows a page only a few contexts.
  function destroy() {
    resizeObserver.disconnect();
    views.destroy();
    effects.dispose();
    kartModels.dispose();
    world.dispose();
    scene.environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { draw, showTrack, destroy };
}

// Adds the course's road and scenery to `scene`. Returns { centre, reach, dispose() }: the course's middle seen
// from above and how far it reaches from there, and taking it all out of the scene again.
function buildWorld(scene, track) {
  const scenery = buildScenery(scene, track);
  const trackMesh = buildTrackMesh(track);
  scene.add(trackMesh.road, trackMesh.walls);
  function dispose() {
    scene.remove(trackMesh.road, trackMesh.walls);
    trackMesh.dispose();
    scenery.dispose();
  }
  return { ...extentOf(track), dispose };
}

// What effects.js draws for one kart: sparks while it drifts, flames while it boosts, smoke while it stalls.
function describeEffects(kart, pose) {
  return {
    pose,
    velocity: kart.velocity,
    spark: kart.grounded ? SPARK_COLORS[sparkLevel(kart)] : null,
    boosting: kart.boost !== null,
    stalled: kart.stallLeft > 0,
  };
}

// The middle of the course seen from above, and how far it reaches from there (half its longer side).
function extentOf(track) {
  const xs = track.stations.map((station) => station.point.x);
  const zs = track.stations.map((station) => station.point.z);
  const centre = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
  const reach = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
  return { centre, reach };
}
