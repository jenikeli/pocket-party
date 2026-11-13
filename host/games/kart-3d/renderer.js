// Draws the 3D race with Three.js: holds the karts, and builds a course (course-world.js: its road, scenery and
// light, which another course can replace) when a race, Watch or Measure needs it, in stages a loading bar can
// follow (M10: nothing is built or drawn while the setup screen shows); then each frame places the karts between
// their last two steps, moves the particles (sparks, flames, smoke, dust) and the scenery (waves, boats, panels,
// start lights), and draws one view per player with its HUD; with bloom on the High quality setting
// (quality.js). Since M7d4b each view gets its own shadow map fitted round it (sun.js), and the Measure tool
// (measure-run.js) can set any look, wait for the GPU to finish a frame and read how much was drawn. Since M8 it
// draws the items (items/item-drawing.js: the item boxes, bursts and puffs) and the karts at the size their
// item's effect gives them, which the chase camera follows.
// Loaded by the game's load() with a dynamic import(), so Three.js is fetched only when the game starts. Used by
// host/games/kart-3d/index.js.

import * as THREE from 'three';
import { displayName, colorText } from '/host/roster.js';
import { createSkyEnvironment } from './scenery.js';
import { createKartModels } from './kart-models.js';
import { KART_DESIGNS } from './karts/kart-designs.js';
import { assignDesigns } from './karts/kart-roster.js';
import { createViews } from './views.js';
import { createEffects, describeEffects } from './effects.js';
import { createBloom } from './bloom.js';
import { QUALITY_LEVELS } from './quality.js';
import { tuning } from './tuning.js';
import { kartPose, viewTargets, viewHud } from './race-views.js';
import { FIELD_SIZE } from './race.js';
import { courseExtent } from './track.js';
import { runStages, nextDrawnFrame } from './staged-build.js';
import { waitForGpu, frameStats, describeGpu } from './gpu-probe.js';
import { createCourseWorld } from './course-world.js';
import { disposeKitMaps } from './canvas-texture.js';
import { createItemDrawing } from './items/item-drawing.js';
import { kartLookScale } from './items/kart-effect-looks.js';

// The last stage of a course's build, the shaders, fills this much of the loading bar beside the course's own
// stages (course-world.js's weights).
const SHADERS_WEIGHT = 1;

// `qualityLevel` is a key of QUALITY_LEVELS, `photoAsphalt` the photo-scanned asphalt's textures
// (photo-asphalt.js; freed here at the end), `plainCourse` true for the plain course (plain-course.js: no
// dressing, baked shade or course light). It starts with no course: buildCourse(track, onProgress) builds one
// before the first draw. Returns { buildCourse, draw(race, players, alpha, dt), clear(), setQuality(level),
// setLook(look), waitForGpu(), frameStats(), describeGpu(), destroy() }.
export function createRenderer(container, qualityLevel, photoAsphalt, plainCourse) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  // Counted over a whole frame (every view and the shadow passes) for frameStats(), not per render() call.
  renderer.info.autoReset = false;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Three.js redraws the shadow map on every render() call, which would be once per view. Off, it is asked for
  // in draw(), before each view (each has its own map).
  renderer.shadowMap.autoUpdate = false;
  container.append(renderer.domElement);
  let contextLost = false;
  let destroyed = false;
  renderer.domElement.addEventListener('webglcontextlost', () => (contextLost = true));

  const scene = new THREE.Scene();
  const environment = createSkyEnvironment(renderer);
  const kartModels = createKartModels(FIELD_SIZE);
  // The race whose karts' designs (indexes into KART_DESIGNS, one per kart) were last worked out.
  let designsRace = null;
  let kartDesigns = [];
  // In one group, so a look can hide them all (setLook).
  const kartGroup = new THREE.Group();
  kartGroup.add(...kartModels.karts);
  scene.add(kartGroup);
  const effects = createEffects(scene);
  const itemDrawing = createItemDrawing(scene);
  // The course's road, scenery and light; course.world() is null until the first build.
  const course = createCourseWorld(renderer, scene, environment, { photoAsphalt, plainCourse });
  const views = createViews(container);
  const bloom = createBloom(renderer);
  // What is drawn: { bloom, pixelRatio, shadows, hidden } (see setLook).
  let look = null;
  // Only for drawing one frame of a new course while it is built (see warmUpShaders), and for clear().
  const warmUpCamera = new THREE.PerspectiveCamera(50, 16 / 9, 1, 1500);

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    bloom.setSize(container.clientWidth, container.clientHeight);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  setQuality(qualityLevel);

  // `race` is the race state (draw only once a course is built); `alpha` is from the game runner (between the
  // last two steps); `dt` the real time since the last drawn frame in seconds, for the cameras.
  function draw(race, players, alpha, dt) {
    if (contextLost) {
      throw new Error('The WebGL context was lost (the browser took the graphics memory back)');
    }
    renderer.info.reset();
    // Each view's shadow pass is asked for in fitShadow, round that view. The course light's capture used the
    // whole course's map, so this switches back after a build.
    const world = course.world();
    world.sun.usePerView(true);
    renderer.shadowMap.needsUpdate = true;
    renderer.toneMappingExposure = tuning.exposure;
    scene.environmentIntensity = tuning.courseLightStrength;
    world.update(dt, race);
    const poses = race.karts.map((kart) => kartPose(kart, alpha));
    placeKarts(race, players, poses, dt);
    itemDrawing.update(race, course.track(), poses, dt);
    effects.update(race.karts.map((kart, index) => describeEffects(kart, poses[index])), dt);
    const targets = viewTargets(race, players).map(({ kart, player }) => ({
      pose: poses[race.karts.indexOf(kart)],
      name: player ? displayName(player) : 'CPU',
      color: player ? colorText(player) : '#ffffff',
      boosting: kart.boost !== null,
      gliding: kart.gliding,
      hud: viewHud(race, kart),
    }));
    drawFrame((target) => views.draw(renderer, scene, targets, dt, target, fitShadow), targets.length);
  }

  // Clears the canvas and hides every view's HUD, for the setup screen, which draws nothing in 3D. Called once
  // when the setup screen comes back: views.js hides the HUDs when it draws a single view without one, so one is
  // drawn, then wiped.
  function clear() {
    views.drawOne(renderer, scene, warmUpCamera);
    renderer.setRenderTarget(null);
    renderer.clear();
  }

  // Called with each view's camera just before that view is drawn.
  function fitShadow(camera) {
    course.world().sun.fitView(camera);
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

  // `poses` are the karts' poses as drawn this frame, in the order of race.karts. Which design each kart draws is
  // worked out once per race (kart-roster.js), so a kart keeps its look when its player leaves mid-race.
  function placeKarts(race, players, poses, dt) {
    if (designsRace !== race) {
      designsRace = race;
      kartDesigns = assignDesigns(race.karts, players, KART_DESIGNS);
    }
    kartModels.karts.forEach((model, index) => {
      const kart = race.karts[index];
      if (!kart) {
        kartModels.hide(index);
        return;
      }
      kartModels.show(index, kart, poses[index], kartDesigns[index], dt, kartLookScale(race, kart));
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
  // built with the course, so turning it on does not stall; turning shadows off or on rebuilds the materials'
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

  // The look's shadows and hidden parts, again after a new course is built (before the first, only the karts).
  function applyLook() {
    course.world()?.sun.setShadows(look.shadows);
    course.world()?.showParts(look.hidden);
    kartGroup.visible = !look.hidden.includes('karts');
  }

  // Builds `track`'s course in place of the one built before, in the same scene and WebGL context (a new context
  // per course would run into iOS's limit), one stage per drawn frame so a loading bar can move between them
  // (staged-build.js): the course's own stages (course-world.js), then the shaders. `onProgress(fraction, label)`
  // is told before each stage. Resolves true once the course can be drawn, or false, with nothing more done, if
  // the renderer is destroyed meanwhile (the game ended). Nothing may be drawn until it resolves. The karts are
  // hidden until the end, so the course's light is not taken with them in it.
  function buildCourse(track, onProgress) {
    kartGroup.visible = false;
    const shaders = { label: 'Preparing the shaders', weight: SHADERS_WEIGHT, run: () => warmUpShaders(track) };
    const stages = [...course.buildStages(track), shaders];
    return runStages(stages, { onProgress, nextFrame: nextDrawnFrame, isCancelled: () => destroyed });
  }

  // Builds every shader now, behind the loading bar, not in the middle of the first frames (M6a saw a 1.8 s stall
  // the first time a new kind of material was drawn): the scene's materials (the karts too, shown again with the
  // look), then one frame through bloom, which builds the shadow and bloom shaders, so even switching to High
  // later does not stall. Three.js keeps the shaders, so the next course is quicker. The camera looks down on the
  // course from outside it.
  function warmUpShaders(track) {
    course.lightScene();
    applyLook();
    const { centre, reach } = courseExtent(track);
    warmUpCamera.position.set(centre.x + reach * 1.6, reach * 0.8, centre.z);
    warmUpCamera.lookAt(centre.x, 0, centre.z);
    renderer.compile(scene, warmUpCamera);
    renderer.shadowMap.needsUpdate = true;
    bloom.render((target) => views.drawOne(renderer, scene, warmUpCamera, target));
  }

  // forceContextLoss frees the WebGL context now rather than whenever the browser collects the canvas: iOS
  // allows a page only a few contexts.
  function destroy() {
    destroyed = true;
    resizeObserver.disconnect();
    views.destroy();
    bloom.dispose();
    effects.dispose();
    itemDrawing.dispose();
    kartModels.dispose();
    course.dispose();
    // The kit's drawn maps outlive each course (canvas-texture.js), so they are freed here, when the game stops,
    // and while the renderer is still alive: disposing a texture is what tells it to free the GPU's copy.
    disposeKitMaps();
    environment.dispose();
    Object.values(photoAsphalt).forEach((texture) => texture.dispose());
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return {
    buildCourse,
    draw,
    clear,
    setQuality,
    setLook,
    waitForGpu: () => waitForGpu(renderer),
    frameStats: () => frameStats(renderer),
    describeGpu: () => describeGpu(renderer),
    destroy,
  };
}

