// Split screen for the temple run: up to four views, one per person, each with its own camera, its own HUD (lives,
// metres, coins, countdown, the corner prompt) and its own name labels, all over one shared Three.js scene. The
// renderer draws each view into its part of the canvas with a scissor. Used by renderer.js.

import * as THREE from 'three';
import { pathPoint, LANE_WIDTH } from './path.js';
import { layoutViews, MAX_VIEWS } from './layout.js';

const LOOK_AHEAD = 18;
const BLEND_RATE = 11;
const BORDER = 'box-shadow:inset 0 0 0 2px #05090a;';
const PILL = 'background:rgba(8,12,20,0.6);padding:0.2em 0.7em;border-radius:99px;color:#fff;font-family:sans-serif;';

function box(parent, css) {
  const element = document.createElement('div');
  element.style.cssText = `position:absolute;${css}`;
  parent.append(element);
  return element;
}

function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

// For the HUD: built only from constant icons and numbers, never from anything a phone sent.
function setHtml(element, html) {
  if (element.dataset.html !== html) {
    element.innerHTML = html;
    element.dataset.html = html;
  }
}

function makeView(overlay) {
  const el = box(overlay, `overflow:hidden;box-sizing:border-box;${BORDER}`);
  return {
    el,
    camera: new THREE.PerspectiveCamera(62, 16 / 9, 0.3, 200),
    // Eased lane, look-at point and who the camera followed last frame (a new target snaps instead of gliding).
    lane: 1,
    look: new THREE.Vector3(),
    targetKey: null,
    rect: { x: 0, y: 0, w: 1, h: 1 },
    labels: new Map(),
    hud: {
      left: box(el, `left:2%;top:56px;font-size:1.25em;font-weight:700;display:flex;align-items:center;gap:0.7em;${PILL}`),
      right: box(el, `right:2%;top:56px;font-size:1.25em;font-weight:700;display:flex;align-items:center;gap:0.5em;${PILL}`),
      big: box(el, 'left:0;right:0;top:calc(56px + 8%);text-align:center;font-size:4.5em;font-weight:800;text-shadow:0 0.05em 0.2em #000;'),
      turn: box(el, 'left:50%;transform:translateX(-50%);bottom:9%;font-size:2.2em;font-weight:900;color:#1c2130;background:#f39c12;border-radius:99px;padding:0.1em 0.7em;display:flex;align-items:center;gap:0.3em;box-shadow:0 0 1em #f39c12;'),
    },
  };
}

export function createSplitViews(overlay, renderer) {
  const views = Array.from({ length: MAX_VIEWS }, () => makeView(overlay));
  const spot = new THREE.Vector3();
  const lookSpot = new THREE.Vector3();
  const labelSpot = new THREE.Vector3();

  // Places the first `count` views on a screen of width x height CSS pixels and hides the rest.
  function layout(count, width, height) {
    const fractions = layoutViews(count);
    views.forEach((view, index) => {
      const fraction = fractions[index];
      view.el.style.display = fraction ? 'block' : 'none';
      if (!fraction) {
        return;
      }
      view.rect = { x: fraction.x * width, y: fraction.y * height, w: fraction.w * width, h: fraction.h * height };
      Object.assign(view.el.style, {
        left: `${view.rect.x}px`, top: `${view.rect.y}px`, width: `${view.rect.w}px`, height: `${view.rect.h}px`,
        fontSize: `${Math.min(view.rect.w, view.rect.h * 1.4) / 26}px`,
      });
      view.camera.aspect = view.rect.w / view.rect.h;
      view.camera.updateProjectionMatrix();
    });
  }

  // Eases the view's camera to sit `up` metres above the corridor at `anchor` and look ahead along it. `key`
  // names what is followed: a change of target, or `snap`, jumps the camera instead of gliding.
  function follow(view, { seed, anchor, lane, up, key, snap, dt }) {
    view.lane += (lane - view.lane) * 0.15;
    const eye = pathPoint(seed, anchor, (view.lane - 1) * LANE_WIDTH * 0.5);
    const look = pathPoint(seed, anchor + LOOK_AHEAD, (view.lane - 1) * LANE_WIDTH * 0.3);
    spot.set(eye.x, up, eye.z);
    lookSpot.set(look.x, 1.2, look.z);
    const jump = snap || key !== view.targetKey;
    const blend = jump ? 1 : 1 - Math.exp(-dt * BLEND_RATE);
    view.targetKey = key;
    view.camera.position.lerp(spot, blend);
    view.look.lerp(lookSpot, blend);
    view.camera.lookAt(view.look);
  }

  // Draws one view's name labels: items are { id, text, color, position (Vector3), above }.
  function placeLabels(view, items) {
    const used = new Set();
    for (const item of items) {
      labelSpot.set(item.position.x, item.position.y + item.above, item.position.z).project(view.camera);
      if (labelSpot.z > 1 || Math.abs(labelSpot.x) > 1.1 || Math.abs(labelSpot.y) > 1.1) {
        continue;
      }
      used.add(item.id);
      if (!view.labels.has(item.id)) {
        view.labels.set(item.id, box(view.el, 'left:0;top:0;font-size:0.95em;font-weight:800;white-space:nowrap;'));
      }
      const label = view.labels.get(item.id);
      label.style.display = 'block';
      label.style.color = item.color;
      setText(label, item.text);
      label.style.transform = `translate(${(labelSpot.x * 0.5 + 0.5) * view.rect.w}px,${(-labelSpot.y * 0.5 + 0.5) * view.rect.h}px) translate(-50%,-100%)`;
    }
    view.labels.forEach((label, id) => {
      if (!used.has(id)) {
        label.style.display = 'none';
      }
    });
  }

  // hud: { left, right, big, turn } for one view. left, right and turn are HTML built from icons; big is text. An
  // empty one is hidden.
  function setHud(view, hud) {
    for (const part of ['left', 'right', 'turn']) {
      setHtml(view.hud[part], hud[part]);
      view.hud[part].style.display = hud[part] ? 'flex' : 'none';
    }
    setText(view.hud.big, hud.big);
  }

  // Renders the scene into each of the first `count` views' parts of the canvas.
  function render(scene, count, height) {
    renderer.setScissorTest(true);
    for (let index = 0; index < count; index += 1) {
      const { rect, camera } = views[index];
      const glY = height - (rect.y + rect.h);
      renderer.setViewport(rect.x, glY, rect.w, rect.h);
      renderer.setScissor(rect.x, glY, rect.w, rect.h);
      renderer.render(scene, camera);
    }
    renderer.setScissorTest(false);
  }

  return { views, layout, follow, placeLabels, setHud, render };
}
