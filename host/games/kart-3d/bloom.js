// The 3D race's bloom: every view is drawn into one multisampled half-float buffer, then UnrealBloomPass makes
// whatever is brighter than white glow, once over the whole frame (not per view, as measured in M6a), and
// OutputPass tone-maps the result onto the canvas. Half-float keeps colours above 1 (sparks, glowing panels,
// highlights) apart from plain white, which is what lets only them glow. Used by host/games/kart-3d/renderer.js
// on the High quality setting; the other settings draw the views straight to the canvas.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { tuning } from './tuning.js';

// Returns { render(drawViews), setSize(width, height), setPixelRatio(ratio), dispose() }. render calls
// drawViews(target) once, which must draw the frame's views into `target` (a render target), then blooms it
// onto the canvas.
export function createBloom(renderer) {
  // Multisampled, so edges stay as smooth as on the antialiased canvas.
  const buffer = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, buffer);
  let drawViews = null;
  // A pass of our own that draws the views into the composer's buffer; the next passes read it from there.
  const viewsPass = new Pass();
  viewsPass.needsSwap = false;
  viewsPass.render = (passRenderer, writeBuffer, readBuffer) => drawViews(readBuffer);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), tuning.bloomStrength, tuning.bloomRadius, tuning.bloomThreshold);
  const outputPass = new OutputPass();
  composer.addPass(viewsPass);
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  // The sliders are read every frame, so they change the look at once.
  function render(drawFrameViews) {
    drawViews = drawFrameViews;
    bloomPass.strength = tuning.bloomStrength;
    bloomPass.radius = tuning.bloomRadius;
    bloomPass.threshold = tuning.bloomThreshold;
    composer.render();
    drawViews = null;
  }

  return {
    render,
    setSize: (width, height) => composer.setSize(width, height),
    setPixelRatio: (ratio) => composer.setPixelRatio(ratio),
    dispose: () => {
      bloomPass.dispose();
      outputPass.dispose();
      composer.dispose();
    },
  };
}
