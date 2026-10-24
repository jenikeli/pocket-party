// The 3D race's split-screen views: a chase camera for each (chase-camera.js), every view drawn into its own
// rectangle of one canvas (WebGL scissor viewports, as measured in M6a, so 4 views still use one WebGL
// context), and an HTML name label in each view's corner so players know which view is theirs.
// Used by host/games/kart-3d/renderer.js.

import * as THREE from 'three';
import { viewRects } from './view-layout.js';
import { createChaseCamera, followKart } from './chase-camera.js';

const MAX_VIEWS = 4;
const FIELD_OF_VIEW = 65;
const LABEL_STYLE = 'position: absolute; margin: 0; padding: 4px 10px; border-radius: 6px; font: bold 20px sans-serif; ' +
  'background: rgba(16, 19, 28, 0.6); pointer-events: none;';

// Returns { draw(renderer, scene, targets, dt), drawOne(renderer, scene, camera), destroy() }.
export function createViews(container) {
  const views = Array.from({ length: MAX_VIEWS }, () => ({
    camera: new THREE.PerspectiveCamera(FIELD_OF_VIEW, 16 / 9, 0.3, 1500),
    chase: createChaseCamera(),
    label: createLabel(container),
  }));

  // `targets` is 1, 2 or 4 views' worth of { pose, name, color }: the kart's pose as drawn, the label text and
  // its CSS colour. `dt` is the real time since the last drawn frame, in seconds, for the cameras' lag.
  function draw(renderer, scene, targets, dt) {
    const size = renderer.getSize(new THREE.Vector2());
    const rects = viewRects(targets.length, size.x, size.y);
    // Each render() clears only its own view, so the gaps between views are cleared first.
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.clear();
    renderer.setScissorTest(true);
    targets.forEach((target, index) => {
      const view = views[index];
      followKart(view.chase, target.pose, dt);
      const { position, up, look } = view.chase;
      view.camera.position.set(position.x, position.y, position.z);
      view.camera.up.set(up.x, up.y, up.z);
      view.camera.lookAt(look.x, look.y, look.z);
      drawRect(renderer, scene, view.camera, rects[index]);
      showLabel(view.label, target, rects[index], size.y);
    });
    renderer.setScissorTest(false);
    views.slice(targets.length).forEach((view) => (view.label.hidden = true));
  }

  // One view over the whole canvas from `camera`, with no labels (the setup screen's overview).
  function drawOne(renderer, scene, camera) {
    const size = renderer.getSize(new THREE.Vector2());
    drawRect(renderer, scene, camera, viewRects(1, size.x, size.y)[0]);
    views.forEach((view) => (view.label.hidden = true));
  }

  function destroy() {
    views.forEach((view) => view.label.remove());
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

function createLabel(container) {
  const label = document.createElement('p');
  label.className = 'kart-3d-view-label';
  label.style.cssText = LABEL_STYLE;
  label.hidden = true;
  container.append(label);
  return label;
}

// Writes to the page only on change: this runs every frame.
function showLabel(label, { name, color }, rect, canvasHeight) {
  label.hidden = false;
  if (label.textContent !== name) {
    label.textContent = name;
  }
  label.style.color = color;
  label.style.left = `${rect.x + 12}px`;
  label.style.top = `${canvasHeight - rect.y - rect.height + 12}px`;
}
