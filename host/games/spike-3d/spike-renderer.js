// Draws the M6a spike with Three.js: builds the scene, applies the panel's settings (each cost of the MK8DX
// look on or off), and draws 1, 2 or 4 views per frame. Loaded by the spike's load() with a dynamic import(),
// so Three.js is fetched only when the spike starts and its download can be timed.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { kartPose } from './kart-paths.js';
import { createMaterials } from './materials.js';
import { buildWorld, ROAD_LIFT } from './world.js';
import { createKartModels } from './kart-models.js';
import { createParticles } from './particles.js';
import { createViews } from './views.js';

export const THREE_REVISION = THREE.REVISION;

// `karts` is the scripted kart state from kart-paths.js, which the game steps. Returns { apply(settings),
// draw(alpha, dt), waitForGpu(), frameInfo(), describeGpu(), destroy() }.
export function createSpikeRenderer(container, karts) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  // Three.js redraws the shadow map on every render() call, which would be once per view. Off, and asked for
  // once per frame in draw(), every view shares one shadow map.
  renderer.shadowMap.autoUpdate = false;
  // Counted over the whole frame (every view), not per render() call.
  renderer.info.autoReset = false;
  container.append(renderer.domElement);
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', () => (contextLost = true));

  const scene = new THREE.Scene();
  const materials = createMaterials(renderer);
  const sun = buildWorld(scene, materials);
  const kartModels = createKartModels(materials);
  scene.add(...kartModels.karts);
  const particles = createParticles();
  scene.add(particles.points);
  const views = createViews();
  let settings = {};

  // Bloom needs the views drawn into a buffer first. Multisampled, so edges stay smooth as on the canvas.
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 }));
  const viewsPass = new Pass();
  viewsPass.needsSwap = false;
  viewsPass.render = (passRenderer, writeBuffer, readBuffer) => views.draw(passRenderer, scene, settings.views, readBuffer);
  composer.addPass(viewsPass);
  // Only what is brighter than white glows (highlights, sparks): threshold 1 in the linear, not yet tone-mapped
  // colours.
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.4, 0.2, 1));
  composer.addPass(new OutputPass());

  function resize() {
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);

  // Only what changed, because switching shadows or materials makes Three.js rebuild shaders.
  function apply(next) {
    if (next.shadows !== settings.shadows) {
      renderer.shadowMap.enabled = next.shadows;
      sun.castShadow = next.shadows;
      materials.refresh();
    }
    if (next.glossy !== settings.glossy) {
      materials.setGlossy(scene, next.glossy);
    }
    if (next.detailedKarts !== settings.detailedKarts) {
      kartModels.setDetailed(next.detailedKarts);
    }
    if (next.fullResolution !== settings.fullResolution) {
      const ratio = next.fullResolution ? window.devicePixelRatio : 1;
      renderer.setPixelRatio(ratio);
      composer.setPixelRatio(ratio);
      resize();
    }
    particles.points.visible = next.particles;
    kartModels.karts.forEach((kart, index) => (kart.visible = index < next.karts));
    settings = { ...next };
  }

  // `alpha` is from the game runner (between the last two steps); `dt` is the real time since the last drawn
  // frame in seconds, for the camera lag and particles.
  function draw(alpha, dt) {
    if (contextLost) {
      throw new Error('The WebGL context was lost (the browser took the graphics memory back)');
    }
    const poses = karts.map((kart) => kartPose(kart, alpha));
    poses.forEach((pose, index) => placeKart(kartModels.karts[index], pose));
    for (let index = 0; index < settings.views; index += 1) {
      views.follow(index, poses[index % settings.karts], dt);
    }
    if (settings.particles) {
      particles.update(dt, poses, settings.karts);
    }
    renderer.info.reset();
    renderer.shadowMap.needsUpdate = true;
    if (settings.bloom) {
      composer.render(dt);
    } else {
      views.draw(renderer, scene, settings.views, null);
    }
  }

  const lookTarget = new THREE.Vector3();
  function placeKart(kart, { position, forward }) {
    kart.position.set(position.x, position.y + ROAD_LIFT, position.z);
    // lookAt turns a model's +z (the kart's front) toward the point, so the kart also tilts up the hill.
    kart.lookAt(lookTarget.set(position.x + forward.x, position.y + ROAD_LIFT + forward.y, position.z + forward.z));
  }

  // Reading back one pixel makes the browser wait until the GPU has finished the frame, so the time around it
  // is the frame's whole cost, CPU and GPU. Only the benchmark's "busy" phase uses it; it stalls the pipeline.
  const pixel = new Uint8Array(4);
  function waitForGpu() {
    const gl = renderer.getContext();
    renderer.setRenderTarget(null);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  }

  function frameInfo() {
    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());
    return {
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      bufferWidth: buffer.x,
      bufferHeight: buffer.y,
      pixelRatio: renderer.getPixelRatio(),
      kartTriangles: kartModels.triangles(settings.detailedKarts),
    };
  }

  // The GPU's name, for the benchmark table. Browsers may hide it (Safari says "Apple GPU").
  function describeGpu() {
    const gl = renderer.getContext();
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(debugInfo ? debugInfo.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  }

  // forceContextLoss frees the WebGL context now rather than whenever the browser collects the canvas: iOS
  // allows a page only a few contexts.
  function destroy() {
    resizeObserver.disconnect();
    composer.dispose();
    particles.dispose();
    kartModels.dispose();
    materials.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }

  return { apply, draw, waitForGpu, frameInfo, describeGpu, destroy };
}
