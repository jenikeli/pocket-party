// The 3D race's split-screen views: a chase camera for each (chase-camera.js), every view drawn into its own
// rectangle of one canvas (WebGL scissor viewports, as measured in M6a, so 4 views still use one WebGL
// context), or of the bloom's buffer (bloom.js), and each view's HUD over it (view-hud.js: name, lap, place,
// banner). Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { viewRects, gapRects } from './view-layout.js';
import { createChaseCamera, followKart } from './chase-camera.js';
import { tuning } from './tuning.js';
import { createViewHud } from './view-hud.js';

const MAX_VIEWS = 4;
// The shell's game bar (End game, Close room) sits in the canvas's bottom right corner, about 66 px tall with its
// margin (host/index.html); the view in that corner lifts its place above it.
const GAME_BAR_CLEARANCE = 80;

// Returns { draw(renderer, scene, targets, dt, renderTarget, beforeView), drawOne(renderer, scene, camera,
// renderTarget), clearGaps(renderer, viewCount), destroy() }. renderTarget is where to draw: null for the canvas,
// or the bloom's buffer.
export function createViews(container) {
  const views = Array.from({ length: MAX_VIEWS }, () => ({
    camera: new THREE.PerspectiveCamera(tuning.fieldOfView, 16 / 9, 0.3, 1500),
    chase: createChaseCamera(),
    hud: createViewHud(container),
  }));

  // `targets` is 1, 2 or 4 views' worth of { pose, name, color, boosting, scale, hud }: the kart's pose as drawn,
  // the label text and its CSS colour, whether the kart boosts (the camera pulls back), the kart model's scale
  // (items/kart-effect-looks.js: a big kart's camera pulls back and up), and what its HUD shows (view-hud.js).
  // `dt` is the real time since the last drawn frame, in seconds, for the cameras' lag.
  // beforeView(camera) is called with each view's camera, placed, just before that view is drawn (the sun's
  // shadow map can follow each view: renderer.js).
  function draw(renderer, scene, targets, dt, renderTarget, beforeView) {
    const size = renderer.getSize(new THREE.Vector2());
    const rects = viewRects(targets.length, size.x, size.y);
    // Each render() clears only its own view, so the gaps between views are cleared first.
    renderer.setRenderTarget(renderTarget);
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.clear();
    targets.forEach((target, index) => {
      const view = views[index];
      followKart(view.chase, target.pose, dt, target.boosting, target.scale.y);
      const { position, up, look, fieldOfView } = view.chase;
      view.camera.fov = fieldOfView;
      view.camera.position.set(position.x, position.y, position.z);
      view.camera.up.set(up.x, up.y, up.z);
      view.camera.lookAt(look.x, look.y, look.z);
      beforeView(view.camera);
      drawRect(renderer, scene, view.camera, rects[index], renderTarget);
      const inBarCorner = rects[index].y === 0 && rects[index].x + rects[index].width === size.x;
      view.hud.show(target, rects[index], size.y, inBarCorner ? GAME_BAR_CLEARANCE : 0);
    });
    endScissor(renderer, renderTarget);
    views.slice(targets.length).forEach((view) => view.hud.hide());
  }

  // One view over the whole canvas from `camera`, with no HUD (the setup screen's overview).
  function drawOne(renderer, scene, camera, renderTarget = null) {
    const size = renderer.getSize(new THREE.Vector2());
    drawRect(renderer, scene, camera, viewRects(1, size.x, size.y)[0], renderTarget);
    endScissor(renderer, renderTarget);
    views.forEach((view) => view.hud.hide());
  }

  // Black again between the views on the canvas, after bloom spread glow into the gaps.
  function clearGaps(renderer, viewCount) {
    const size = renderer.getSize(new THREE.Vector2());
    renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    for (const { x, y, width, height } of gapRects(viewCount, size.x, size.y)) {
      renderer.setScissor(x, y, width, height);
      renderer.clear();
    }
    renderer.setScissorTest(false);
  }

  function destroy() {
    views.forEach((view) => view.hud.remove());
  }

  return { draw, drawOne, clearGaps, destroy };
}

// `rect` is in CSS pixels with y from the bottom, as WebGL's viewport counts. The canvas takes its viewport in
// CSS pixels; a render target keeps its own, in its own pixels, so those are scaled by the pixel ratio.
function drawRect(renderer, scene, camera, rect, renderTarget) {
  camera.aspect = rect.width / rect.height;
  camera.updateProjectionMatrix();
  if (renderTarget) {
    const ratio = renderer.getPixelRatio();
    const [x, y, width, height] = [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value * ratio));
    renderTarget.viewport.set(x, y, width, height);
    renderTarget.scissor.set(x, y, width, height);
    renderTarget.scissorTest = true;
    // setRenderTarget copies the target's viewport and scissor, so it is called again for each view.
    renderer.setRenderTarget(renderTarget);
  } else {
    renderer.setRenderTarget(null);
    renderer.setViewport(rect.x, rect.y, rect.width, rect.height);
    renderer.setScissor(rect.x, rect.y, rect.width, rect.height);
    renderer.setScissorTest(true);
  }
  renderer.render(scene, camera);
}

// The next passes (bloom's last one draws onto the canvas) and the next frame draw over the whole buffer and
// canvas, so the last view's viewport and scissor must not stay on.
function endScissor(renderer, renderTarget) {
  if (renderTarget) {
    renderTarget.viewport.set(0, 0, renderTarget.width, renderTarget.height);
    renderTarget.scissor.set(0, 0, renderTarget.width, renderTarget.height);
    renderTarget.scissorTest = false;
    renderer.setRenderTarget(renderTarget);
  }
  const size = renderer.getSize(new THREE.Vector2());
  renderer.setViewport(0, 0, size.x, size.y);
  renderer.setScissorTest(false);
}
