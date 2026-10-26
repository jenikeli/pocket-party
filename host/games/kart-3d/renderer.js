// Draws the 3D race with Three.js: builds the world (the course's scenery and road, which another course can
// replace, and the karts), then each frame places the karts between their last two steps, moves the particles
// (sparks, flames, smoke, dust) and the scenery (waves, boats, panels, start lights), and draws one view per
// player with its HUD, or, on the setup screen, a slow flight round the course; with bloom on the High quality
// setting (quality.js). Since M7d4b each view in a race gets its own shadow map fitted round it (sun.js), and the
// Measure tool (measure-run.js) can set any look, wait for the GPU to finish a frame and read how much was drawn;
// since M7d4b2 the course is built with the tuning panel's Drawing switches (the trials of detail in textures
// and light), and rebuilt when one changes.
// Loaded by the game's load() with a dynamic import(), so Three.js is fetched only when the game starts. Used by
// host/games/kart-3d/index.js.

import * as THREE from 'three';
import { PLAYER_COLORS, displayName, colorText } from '/host/roster.js';
import { buildScenery, createSkyEnvironment } from './scenery.js';
import { createKartModels } from './kart-models.js';
import { createViews } from './views.js';
import { createEffects, describeEffects } from './effects.js';
import { createBloom } from './bloom.js';
import { QUALITY_LEVELS } from './quality.js';
import { tuning, drawingSwitches } from './tuning.js';
import { kartPose, viewTargets, viewHud } from './race-views.js';
import { FIELD_SIZE } from './race.js';
import { createOverviewCamera } from './overview-camera.js';
import { waitForGpu, frameStats, describeGpu } from './gpu-probe.js';
import { createCourseLight } from './course-light.js';
import { bakeShade } from './baked-shade.js';

// CPU karts are drawn in greys so the players' colours stand out.
const CPU_COLORS = [0xd0d4dc, 0x9aa1ad, 0x6c7380];
// Without the course's light, the sky's reflections mostly add shine to the karts, as up to M7d4a: the sun and
// the sky light light the scene already.
const SKY_REFLECTIONS = 0.4;

// `track` is the course to draw first, `qualityLevel` a key of QUALITY_LEVELS, `photoAsphalt` the photo-scanned
// asphalt's textures (photo-asphalt.js; freed here at the end). Returns { draw(race, players, alpha, dt),
// showTrack(track), setQuality(level), setLook(look), waitForGpu(), frameStats(), describeGpu(), destroy() }.
export function createRenderer(container, track, qualityLevel, photoAsphalt) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Counted over a whole frame (every view and the shadow passes) for frameStats(), not per render() call.
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Three.js redraws the shadow map on every render() call, which would be once per view. Off, it is asked for
  // in draw(): before each view in a race (each has its own map), once a frame for the setup screen's overview.
  renderer.shadowMap.autoUpdate = false;
  container.append(renderer.domElement);
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', () => (contextLost = true));

  const scene = new THREE.Scene();
  const environment = createSkyEnvironment(renderer);
  const kartModels = createKartModels(FIELD_SIZE);
  // In one group, so a look can hide them all (setLook).
  const kartGroup = new THREE.Group();
  kartGroup.add(...kartModels.karts);
  scene.add(kartGroup);
  const effects = createEffects(scene);
  // The course's road and scenery (scenery.js's world), and, with the Drawing switch on, the light taken from it.
  let shownTrack = track;
  let world = null;
  let courseLight = null;
  buildWorld(track);
  const views = createViews(container);
  const bloom = createBloom(renderer);
  // What is drawn: { bloom, pixelRatio, shadows, hidden } (see setLook).
  let look = null;
  const overview = createOverviewCamera(track);

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
  renderer.compile(scene, overview.camera);
  renderer.shadowMap.needsUpdate = true;
  bloom.render((target) => views.drawOne(renderer, scene, overview.camera, target));

  // `race` is the race state, or null on the setup screen. `alpha` is from the game runner (between the last
  // two steps); `dt` the real time since the last drawn frame in seconds, for the cameras.
  function draw(race, players, alpha, dt) {
    if (contextLost) {
      throw new Error('The WebGL context was lost (the browser took the graphics memory back)');
    }
    const drawing = drawingSwitches();
    if (Object.keys(drawing).some((key) => drawing[key] !== world.drawing[key])) {
      showTrack(shownTrack);
    }
    renderer.info.reset();
    // In a race each view's shadow pass is asked for in fitShadow; the overview takes the whole course's.
    world.sun.usePerView(race !== null);
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMappingExposure = tuning.exposure;
    if (courseLight) {
      scene.environmentIntensity = tuning.courseLightStrength;
    }
    world.update(dt, race);
    if (!race) {
      for (let index = 0; index < FIELD_SIZE; index += 1) {
        kartModels.hide(index);
      }
      overview.fly(dt);
      effects.update([], dt);
      drawFrame((target) => views.drawOne(renderer, scene, overview.camera, target), 1);
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
    drawFrame((target) => views.draw(renderer, scene, targets, dt, target, fitShadow), targets.length);
  }

  // Called with each view's camera just before that view is drawn.
  function fitShadow(camera) {
    world.sun.fitView(camera);
    renderer.shadowMap.needsUpdate = true;
  }

  // `drawViews(target)` draws the frame's views into `target`: through bloom on High (then the gaps between the
  // views are cleared of its glow), or straight onto the canvas (target null).
  function drawFrame(drawViews, viewCount) {
    if (look.bloom) {
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

  // Another level chosen on the setup screen: its bloom and pixel ratio, with everything shown.
  function setQuality(level) {
    const { bloom: withBloom, pixelRatio } = QUALITY_LEVELS[level];
    setLook({ bloom: withBloom, pixelRatio, shadows: true, hidden: [] });
  }

  // `newLook` is { bloom, pixelRatio, shadows, hidden }: bloom on or off, the drawing buffer's pixels per CSS
  // pixel, the sun's shadows on or off, and the parts not drawn ('karts', or a part of the course: see
  // scenery.js's showParts). A quality level is one look; the Measure tool tries others. Bloom's shaders were
  // built at the start, so turning it on does not stall; turning shadows off or on rebuilds the materials'
  // shaders once.
  function setLook(newLook) {
    if (look?.pixelRatio !== newLook.pixelRatio) {
      renderer.setPixelRatio(newLook.pixelRatio);
      bloom.setPixelRatio(newLook.pixelRatio);
      resize();
    }
    look = newLook;
    applyLook();
  }

  // The look's shadows and hidden parts, again after a new course is built.
  function applyLook() {
    world.sun.setShadows(look.shadows);
    world.showParts(look.hidden);
    kartGroup.visible = !look.hidden.includes('karts');
  }

  // Builds the course's road and scenery into the scene with the Drawing switches as they are now; with their
  // trials on, bakes the shade on its start stretch and takes its light, the karts hidden meanwhile (they are not
  // part of the course; the caller shows them again with the look). The course's light is taken with the course
  // lit by the sky's reflections in full, as the sky would light it. The sea keeps the sky's reflections as up to
  // M7d4a: at the course light's strength it mirrors so much pale horizon that it turns whitish.
  function buildWorld(newTrack) {
    shownTrack = newTrack;
    world = buildScenery(scene, newTrack, { drawing: drawingSwitches(), photoAsphalt });
    kartGroup.visible = false;
    scene.environment = environment.texture;
    scene.environmentIntensity = 1;
    if (world.drawing.bakedShade === 1) {
      bakeShade(renderer, world.group, newTrack);
    }
    courseLight = world.drawing.courseLight === 1 ? createCourseLight(renderer, scene, newTrack, world.sun) : null;
    if (courseLight) {
      world.sea.material.envMap = environment.texture;
      world.sea.material.envMapIntensity = SKY_REFLECTIONS;
    }
    scene.environment = courseLight ? courseLight.texture : environment.texture;
    scene.environmentIntensity = courseLight ? tuning.courseLightStrength : SKY_REFLECTIONS;
  }

  // Another course chosen on the setup screen: its road and scenery replace the old ones in the same scene and
  // WebGL context (a new context per course would run into iOS's limit). Compiling again is quick: the shaders
  // are the same, and Three.js keeps them.
  function showTrack(newTrack) {
    world.dispose();
    courseLight?.dispose();
    buildWorld(newTrack);
    overview.showCourse(newTrack);
    applyLook();
    renderer.compile(scene, overview.camera);
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
    courseLight?.dispose();
    environment.dispose();
    Object.values(photoAsphalt).forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    draw,
    showTrack,
    setQuality,
    setLook,
    waitForGpu: () => waitForGpu(renderer),
    frameStats: () => frameStats(renderer),
    describeGpu: () => describeGpu(renderer),
    destroy,
  };
}

