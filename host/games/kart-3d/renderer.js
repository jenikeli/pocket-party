// Draws the 3D race with Three.js: builds the world (the course's scenery and road, which another course can
// replace, and the karts), then each frame places the karts between their last two steps, moves the particles
// (sparks, flames, smoke, dust) and the scenery (waves, boats), and draws one view per player with its HUD, or,
// on the setup screen, a slow flight round the course; with bloom on the High quality setting (quality.js).
// Loaded by the game's load() with a dynamic import(), so Three.js is fetched only when the game starts. Used by
// host/games/kart-3d/index.js.

import * as THREE from 'three';
import { PLAYER_COLORS, displayName, colorText } from '/host/roster.js';
import { buildScenery, createSkyEnvironment } from './scenery.js';
import { buildTrackMesh } from './track-mesh.js';
import { createKartModels } from './kart-models.js';
import { createViews } from './views.js';
import { createEffects, describeEffects } from './effects.js';
import { createBloom } from './bloom.js';
import { QUALITY_LEVELS } from './quality.js';
import { tuning } from './tuning.js';
import { kartPose, viewTargets, viewHud } from './race-views.js';
import { FIELD_SIZE } from './race.js';

// CPU karts are drawn in greys so the players' colours stand out.
const CPU_COLORS = [0xd0d4dc, 0x9aa1ad, 0x6c7380];
// The setup screen's overview camera circles the course once a minute, outside it and looking down, at these
// shares of how far the course reaches from its middle.
const ORBIT_SECONDS = 60;
const ORBIT_REACH = 1.6;
const ORBIT_HEIGHT = 0.8;

// `track` is the course to draw first, `qualityLevel` a key of QUALITY_LEVELS. Returns { draw(race, players,
// alpha, dt), showTrack(track), setQuality(level), destroy() }.
export function createRenderer(container, track, qualityLevel) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
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
  const environment = createSkyEnvironment(renderer);
  scene.environment = environment.texture;
  // The reflections mostly add shine to the karts: the sun and the hemisphere light light the scene already.
  scene.environmentIntensity = 0.4;
  // The course's road and scenery, and where its middle is and how far it reaches (for the overview camera).
  let world = buildWorld(scene, track);
  const kartModels = createKartModels(FIELD_SIZE);
  scene.add(...kartModels.karts);
  const effects = createEffects(scene);
  const views = createViews(container);
  const bloom = createBloom(renderer);
  let quality = QUALITY_LEVELS[qualityLevel];
  const overviewCamera = new THREE.PerspectiveCamera(50, 16 / 9, 1, 1500);
  let orbitTime = 0;

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    bloom.setSize(container.clientWidth, container.clientHeight);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  setQuality(qualityLevel);
  // Builds every shader now, while the game starts, not in the middle of the first frames (M6a saw a 1.8 s
  // stall the first time a new kind of material was drawn): the scene's materials (the karts too, which are
  // still visible here), then one frame through bloom, which builds the shadow and bloom shaders, so even
  // switching to High later does not stall.
  renderer.compile(scene, overviewCamera);
  overviewCamera.position.set(world.centre.x, world.reach, world.centre.z + world.reach);
  overviewCamera.lookAt(world.centre);
  renderer.shadowMap.needsUpdate = true;
  bloom.render((target) => views.drawOne(renderer, scene, overviewCamera, target));

  // `race` is the race state, or null on the setup screen. `alpha` is from the game runner (between the last
  // two steps); `dt` the real time since the last drawn frame in seconds, for the cameras.
  function draw(race, players, alpha, dt) {
    if (contextLost) {
      throw new Error('The WebGL context was lost (the browser took the graphics memory back)');
    }
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMappingExposure = tuning.exposure;
    world.update(dt);
    if (!race) {
      for (let index = 0; index < FIELD_SIZE; index += 1) {
        kartModels.hide(index);
      }
      orbitTime += dt;
      const angle = (2 * Math.PI * orbitTime) / ORBIT_SECONDS;
      const radius = world.reach * ORBIT_REACH;
      const height = world.reach * ORBIT_HEIGHT;
      overviewCamera.position.set(world.centre.x + Math.cos(angle) * radius, height, world.centre.z + Math.sin(angle) * radius);
      overviewCamera.lookAt(world.centre);
      effects.update([], dt);
      drawFrame((target) => views.drawOne(renderer, scene, overviewCamera, target), 1);
      return;
    }
    const poses = race.karts.map((kart) => kartPose(kart, alpha));
    placeKarts(race, players, poses, dt);
    effects.update(race.karts.map((kart, index) => describeEffects(kart, poses[index])), dt);
    const targets = viewTargets(race, players).map(({ kart, player }) => ({
      pose: poses[race.karts.indexOf(kart)],
      name: player ? displayName(player) : 'CPU',
      color: player ? colorText(player) : '#ffffff',
      boosting: kart.boost !== null,
      hud: viewHud(race, kart),
    }));
    drawFrame((target) => views.draw(renderer, scene, targets, dt, target), targets.length);
  }

  // `drawViews(target)` draws the frame's views into `target`: through bloom on High (then the gaps between the
  // views are cleared of its glow), or straight onto the canvas (target null).
  function drawFrame(drawViews, viewCount) {
    if (quality.bloom) {
      bloom.render(drawViews);
      views.clearGaps(renderer, viewCount);
    } else {
      drawViews(null);
    }
  }

  // `poses` are the karts' poses as drawn this frame, in the order of race.karts.
  function placeKarts(race, players, poses, dt) {
    kartModels.karts.forEach((model, index) => {
      const kart = race.karts[index];
      if (!kart) {
        kartModels.hide(index);
        return;
      }
      const player = kart.playerId === null ? null : players.get(kart.playerId);
      const hex = player ? PLAYER_COLORS[player.colorIndex] : CPU_COLORS[index % CPU_COLORS.length];
      kartModels.show(index, kart, poses[index], hex, dt);
    });
  }

  // Another level chosen on the setup screen. The drawing buffer's size follows the pixel ratio; bloom's
  // shaders were built at the start, so turning it on does not stall.
  function setQuality(level) {
    quality = QUALITY_LEVELS[level];
    renderer.setPixelRatio(quality.pixelRatio);
    bloom.setPixelRatio(quality.pixelRatio);
    resize();
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
    bloom.dispose();
    effects.dispose();
    kartModels.dispose();
    world.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { draw, showTrack, setQuality, destroy };
}

// Adds the course's road and scenery to `scene`. Returns { centre, reach, update(dt), dispose() }: the course's
// middle seen from above and how far it reaches from there, moving the scenery on, and taking it all out of the
// scene again.
function buildWorld(scene, track) {
  const scenery = buildScenery(scene, track);
  const trackMesh = buildTrackMesh(track);
  scene.add(trackMesh.road, trackMesh.walls, trackMesh.glow);
  function dispose() {
    scene.remove(trackMesh.road, trackMesh.walls, trackMesh.glow);
    trackMesh.dispose();
    scenery.dispose();
  }
  return { ...extentOf(track), update: scenery.update, dispose };
}

// The middle of the course seen from above, and how far it reaches from there (half its longer side).
function extentOf(track) {
  const xs = track.stations.map((station) => station.point.x);
  const zs = track.stations.map((station) => station.point.z);
  const centre = new THREE.Vector3((Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2);
  const reach = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;
  return { centre, reach };
}
