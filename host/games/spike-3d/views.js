// The M6a spike's split-screen views: a chase camera per view, and drawing every view into its own rectangle
// of one canvas (WebGL scissor viewports), so 4 views still use one WebGL context. Used by spike-renderer.js.

import * as THREE from 'three';
import { viewRects } from '../kart-3d/view-layout.js';

const MAX_VIEWS = 4;
// In world units (a kart is 2 long): a first guess, until M6b measures MK8DX's camera from footage.
const CAMERA_BEHIND = 7;
const CAMERA_ABOVE = 2.8;
const LOOK_AHEAD = 4;
// How quickly the camera catches up (per second): low enough to lag a little in turns.
const FOLLOW_RATE = 5;
const LOOK_RATE = 10;

export function createViews() {
  const views = Array.from({ length: MAX_VIEWS }, () => ({
    camera: new THREE.PerspectiveCamera(65, 16 / 9, 0.5, 2000),
    look: new THREE.Vector3(),
    placed: false,
  }));
  const wantedPosition = new THREE.Vector3();
  const wantedLook = new THREE.Vector3();

  // Moves view `index`'s camera toward its spot behind `pose` (from kart-paths.js); `dt` is the real time
  // since the last frame, in seconds, so the lag is the same at any frame rate.
  function follow(index, pose, dt) {
    const view = views[index];
    const { position, forward } = pose;
    wantedPosition.set(
      position.x - forward.x * CAMERA_BEHIND,
      position.y - forward.y * CAMERA_BEHIND + CAMERA_ABOVE,
      position.z - forward.z * CAMERA_BEHIND,
    );
    wantedLook.set(position.x + forward.x * LOOK_AHEAD, position.y + 1, position.z + forward.z * LOOK_AHEAD);
    if (!view.placed) {
      view.camera.position.copy(wantedPosition);
      view.look.copy(wantedLook);
      view.placed = true;
    }
    view.camera.position.lerp(wantedPosition, 1 - Math.exp(-FOLLOW_RATE * dt));
    view.look.lerp(wantedLook, 1 - Math.exp(-LOOK_RATE * dt));
    view.camera.lookAt(view.look);
  }

  // Draws `viewCount` views of `scene` into `target` (a render target, or null for the canvas). A canvas
  // viewport is set in CSS pixels; a render target's in its own pixels, so those are scaled by the pixel ratio.
  function draw(renderer, scene, viewCount, target) {
    const size = renderer.getSize(new THREE.Vector2());
    const scale = target ? renderer.getPixelRatio() : 1;
    const rects = viewRects(viewCount, size.x, size.y);
    // Clears the gaps between views too; a render target would otherwise keep old pixels there.
    renderer.setRenderTarget(target);
    renderer.clear();
    rects.forEach((rect, index) => {
      const camera = views[index].camera;
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
      const { x, y, width, height } = scaleRect(rect, scale);
      if (target) {
        target.viewport.set(x, y, width, height);
        target.scissor.set(x, y, width, height);
        target.scissorTest = true;
        // setRenderTarget copies the target's viewport and scissor, so it is called again for each view.
        renderer.setRenderTarget(target);
      } else {
        renderer.setRenderTarget(null);
        renderer.setViewport(x, y, width, height);
        renderer.setScissor(x, y, width, height);
        renderer.setScissorTest(true);
      }
      renderer.render(scene, camera);
    });
    // Later passes (bloom) draw over the whole buffer, so the last view's scissor must not stay on.
    if (target) {
      target.viewport.set(0, 0, target.width, target.height);
      target.scissor.set(0, 0, target.width, target.height);
      target.scissorTest = false;
    }
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, size.x, size.y);
  }

  return { follow, draw };
}

function scaleRect(rect, scale) {
  return {
    x: Math.round(rect.x * scale),
    y: Math.round(rect.y * scale),
    width: Math.round(rect.width * scale),
    height: Math.round(rect.height * scale),
  };
}
