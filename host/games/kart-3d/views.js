// The 3D race's split-screen views: a chase camera for each (chase-camera.js), every view drawn into its own
// rectangle of one canvas (WebGL scissor viewports, as measured in M6a, so 4 views still use one WebGL
// context), and each view's HUD over it (view-hud.js: name, lap, place, banner).
// Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { viewRects } from './view-layout.js';
import { createChaseCamera, followKart } from './chase-camera.js';
import { tuning } from './tuning.js';
import { createViewHud } from './view-hud.js';

const MAX_VIEWS = 4;
// The shell's game bar (End game, Close room) sits in the canvas's bottom right corner, about 66 px tall with its
// margin (host/index.html); the view in that corner lifts its place above it.
const GAME_BAR_CLEARANCE = 80;

// Returns { draw(renderer, scene, targets, dt), drawOne(renderer, scene, camera), destroy() }.
export function createViews(container) {
  const views = Array.from({ length: MAX_VIEWS }, () => ({
    camera: new THREE.PerspectiveCamera(tuning.fieldOfView, 16 / 9, 0.3, 1500),
    chase: createChaseCamera(),
    hud: createViewHud(container),
  }));

  // `targets` is 1, 2 or 4 views' worth of { pose, name, color, boosting, hud }: the kart's pose as drawn, the
  // label text and its CSS colour, whether the kart boosts (the camera pulls back), and what its HUD shows
  // (view-hud.js). `dt` is the real time since the last drawn frame, in seconds, for the cameras' lag.
  function draw(renderer, scene, targets, dt) {
    const size = renderer.getSize(new THREE.Vector2());
    const rects = viewRects(targets.length, size.x, size.y);
    // Each render() clears only its own view, so the gaps between views are cleared first.
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.clear();
    renderer.setScissorTest(true);
    targets.forEach((target, index) => {
      const view = views[index];
      followKart(view.chase, target.pose, dt, target.boosting);
      const { position, up, look, fieldOfView } = view.chase;
      view.camera.fov = fieldOfView;
      view.camera.position.set(position.x, position.y, position.z);
      view.camera.up.set(up.x, up.y, up.z);
      view.camera.lookAt(look.x, look.y, look.z);
      drawRect(renderer, scene, view.camera, rects[index]);
      const inBarCorner = rects[index].y === 0 && rects[index].x + rects[index].width === size.x;
      view.hud.show(target, rects[index], size.y, inBarCorner ? GAME_BAR_CLEARANCE : 0);
    });
    renderer.setScissorTest(false);
    views.slice(targets.length).forEach((view) => view.hud.hide());
  }

  // One view over the whole canvas from `camera`, with no HUD (the setup screen's overview).
  function drawOne(renderer, scene, camera) {
    const size = renderer.getSize(new THREE.Vector2());
    drawRect(renderer, scene, camera, viewRects(1, size.x, size.y)[0]);
    views.forEach((view) => view.hud.hide());
  }

  function destroy() {
    views.forEach((view) => view.hud.remove());
  }

  return { draw, drawOne, destroy };
}

// `rect` is in CSS pixels with y from the bottom, as WebGL's viewport counts.
function drawRect(renderer, scene, camera, { x, y, width, height }) {
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setViewport(x, y, width, height);
  renderer.setScissor(x, y, width, height);
  renderer.render(scene, camera);
}
