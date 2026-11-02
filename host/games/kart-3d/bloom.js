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
  guardBloomInput(bloomPass);
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

// The brightest a pixel may be as bloom reads it. Before M7d5's karts nothing in a frame went above about 10
// (measured on the dev box, Watch 4 on High); a sharp highlight on a tiny glossy part (a kart's eye, a lens) can be
// hundreds for one frame, a "firefly" that bloom would spread into a flash.
const BLOOM_INPUT_MAX = 16;

// Bloom halves the frame again and again down to a few pixels and blurs every level back over it, so one pixel
// that is infinite or not a number (NaN), which the iPad's GPU made now and then in M7d5's karts (its half
// precision overflowing on a highlight or a near-zero normal), filled the whole frame with cyan or green. Its
// first step, the bright-pass filter, now clamps every pixel to 0 to BLOOM_INPUT_MAX: max() drops a NaN on GPUs
// (they return the other number) and min() caps infinity. The picture itself keeps the pixel: one dot at most.
function guardBloomInput(bloomPass) {
  const material = bloomPass.materialHighPassFilter;
  const read = 'vec4 texel = texture2D( tDiffuse, vUv );';
  if (!material.fragmentShader.includes(read)) {
    throw new Error('UnrealBloomPass changed: its bright-pass filter no longer reads tDiffuse as expected');
  }
  material.fragmentShader = material.fragmentShader.replace(
    read,
    `${read}\n\t\t\ttexel.rgb = min( max( texel.rgb, vec3( 0.0 ) ), vec3( ${BLOOM_INPUT_MAX.toFixed(1)} ) );`,
  );
  material.needsUpdate = true;
}

