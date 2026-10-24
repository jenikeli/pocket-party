// Draws the 3D test drive with Three.js: builds the world (scenery, road, karts) once, then each frame places
// the karts between their last two steps, moves the particles (sparks, flames, smoke) and draws one view per
// player, or, on the setup screen, a slow flight round the track. Loaded by the game's load() with a dynamic import(), so Three.js is fetched only when the
// game starts. Used by host/games/kart-3d/index.js.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { PLAYER_COLORS, displayName, colorText } from '/host/roster.js';
import { buildScenery } from './scenery.js';
import { buildTrackMesh } from './track-mesh.js';
import { createKartModels } from './kart-models.js';
import { createViews } from './views.js';
import { createEffects } from './effects.js';
import { kartPose, viewTargets } from './drive-views.js';
import { sparkLevel, SPARK_COLORS } from './kart-techniques.js';
import { FIELD_SIZE } from './drive.js';

// Dummies are drawn in greys so the players' colours stand out.
const DUMMY_COLORS = [0xd0d4dc, 0x9aa1ad, 0x6c7380];
// The setup screen's overview camera circles the track once a minute.
const ORBIT_SECONDS = 60;
const ORBIT_RADIUS = 180;
const ORBIT_HEIGHT = 90;

// Returns { draw(drive, players, alpha, dt), destroy() }.
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
  const scenery = buildScenery(scene, track);
  const trackMesh = buildTrackMesh(track);
  scene.add(trackMesh.road, trackMesh.walls);
  const kartModels = createKartModels(FIELD_SIZE);
  scene.add(...kartModels.karts);
  const effects = createEffects(scene);
  const views = createViews(container);
  const overviewCamera = new THREE.PerspectiveCamera(50, 16 / 9, 1, 1500);
  const trackCentre = centreOf(track);
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

  // `drive` is the drive state, or null on the setup screen. `alpha` is from the game runner (between the last
  // two steps); `dt` the real time since the last drawn frame in seconds, for the cameras.
  function draw(drive, players, alpha, dt) {
    if (contextLost) {
      throw new Error('The WebGL context was lost (the browser took the graphics memory back)');
    }
    renderer.shadowMap.needsUpdate = true;
    if (!drive) {
      kartModels.karts.forEach((model) => (model.visible = false));
      orbitTime += dt;
      const angle = (2 * Math.PI * orbitTime) / ORBIT_SECONDS;
      overviewCamera.position.set(trackCentre.x + Math.cos(angle) * ORBIT_RADIUS, ORBIT_HEIGHT, trackCentre.z + Math.sin(angle) * ORBIT_RADIUS);
      overviewCamera.lookAt(trackCentre);
      effects.update([], dt);
      views.drawOne(renderer, scene, overviewCamera);
      return;
    }
    const poses = drive.karts.map((kart) => kartPose(kart, alpha));
    placeKarts(drive, players, poses);
    effects.update(drive.karts.map((kart, index) => describeEffects(kart, poses[index])), dt);
    const targets = viewTargets(drive, players).map(({ kart, player }) => ({
      pose: poses[drive.karts.indexOf(kart)],
      name: player ? displayName(player) : 'CPU',
      color: player ? colorText(player) : '#ffffff',
      boosting: kart.boost !== null,
    }));
    views.draw(renderer, scene, targets, dt);
  }

  const xAxis = new THREE.Vector3();
  const yAxis = new THREE.Vector3();
  const zAxis = new THREE.Vector3();
  // `poses` are the karts' poses as drawn this frame, in the order of drive.karts.
  function placeKarts(drive, players, poses) {
    kartModels.karts.forEach((model, index) => {
      const kart = drive.karts[index];
      model.visible = Boolean(kart);
      if (!kart) {
        return;
      }
      const player = kart.playerId === null ? null : players.get(kart.playerId);
      kartModels.paint(index, player ? PLAYER_COLORS[player.colorIndex] : DUMMY_COLORS[index % DUMMY_COLORS.length]);
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

  // forceContextLoss frees the WebGL context now rather than whenever the browser collects the canvas: iOS
  // allows a page only a few contexts.
  function destroy() {
    resizeObserver.disconnect();
    views.destroy();
    effects.dispose();
    kartModels.dispose();
    trackMesh.dispose();
    scenery.dispose();
    scene.environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { draw, destroy };
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

function centreOf(track) {
  const xs = track.stations.map((station) => station.point.x);
  const zs = track.stations.map((station) => station.point.z);
  return new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
}
