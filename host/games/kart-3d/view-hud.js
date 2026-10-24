// What one split-screen view of the 3D race shows over its picture, as HTML on top of the canvas: the player's
// name top left (so players know which view is theirs), the lap bottom left and the place bottom right (where
// MK8DX puts them), and a banner in the middle ("Final lap!", "Finish!"). Sizes follow the view's height, so a
// quarter view gets smaller text. Used by host/games/kart-3d/views.js, one per view.

import { ordinal } from '/shared/ordinal.js';

const STYLE = `
  .kart-3d-view-hud { position: absolute; overflow: hidden; pointer-events: none; font-family: sans-serif;
    color: #ffffff; }
  .kart-3d-view-hud p { position: absolute; margin: 0; }
  .kart-3d-view-label { left: 0.5em; top: 0.5em; padding: 0.15em 0.4em; border-radius: 0.25em;
    background: rgba(16, 19, 28, 0.6); font-weight: bold; }
  .kart-3d-view-lap { left: 0.5em; bottom: 0.3em; font-size: 1.6em; font-weight: bold;
    text-shadow: 0 0.08em 0 #000000; }
  .kart-3d-view-place { right: 0.3em; bottom: 0; font-size: 3.2em; font-weight: bold; color: #ffd84a;
    text-shadow: 0 0.06em 0 #a3471b, 0 0 0.15em rgba(0, 0, 0, 0.6); }
  .kart-3d-view-banner { left: 0; right: 0; top: 30%; font-size: 3em; text-align: center; font-weight: bold;
    color: #ffd84a; text-shadow: 0 0.06em 0 #a3471b, 0 0 0.2em rgba(0, 0, 0, 0.6); }
`;

// Adds the style once per page, the first time a HUD is made.
function addStyle(container) {
  if (!document.getElementById('kart-3d-view-hud-style')) {
    const style = document.createElement('style');
    style.id = 'kart-3d-view-hud-style';
    style.textContent = STYLE;
    container.append(style);
  }
}

// Returns { show(target, rect, canvasHeight, placeLift), hide(), remove() }.
export function createViewHud(container) {
  addStyle(container);
  const root = document.createElement('div');
  root.className = 'kart-3d-view-hud';
  root.hidden = true;
  const label = createLine(root, 'kart-3d-view-label');
  const lap = createLine(root, 'kart-3d-view-lap');
  const place = createLine(root, 'kart-3d-view-place');
  const banner = createLine(root, 'kart-3d-view-banner');
  container.append(root);

  // `target` is { name, color, hud }: the label text and its CSS colour, and race-views.js viewHud's
  // { lap, laps, place, banner }. `rect` is the view's rectangle in CSS pixels with y from the bottom, as WebGL
  // counts. `placeLift` raises the place this many pixels, clear of the shell's game bar. Writes to the page only
  // on change: this runs every frame.
  function show({ name, color, hud }, rect, canvasHeight, placeLift) {
    root.hidden = false;
    setStyle(root, 'left', `${rect.x}px`);
    setStyle(root, 'top', `${canvasHeight - rect.y - rect.height}px`);
    setStyle(root, 'width', `${rect.width}px`);
    setStyle(root, 'height', `${rect.height}px`);
    // The base size, which the lines' sizes (in em) follow: 20 px on a 540 px tall view, at least 12.
    setStyle(root, 'font-size', `${Math.max(Math.round(rect.height / 27), 12)}px`);
    setText(label, name);
    setStyle(label, 'color', color);
    setText(lap, hud.lap === null ? '' : `Lap ${hud.lap}/${hud.laps}`);
    setText(place, ordinal(hud.place));
    setStyle(place, 'bottom', `${placeLift}px`);
    setText(banner, hud.banner ?? '');
  }

  function hide() {
    root.hidden = true;
  }

  function remove() {
    root.remove();
  }

  return { show, hide, remove };
}

function createLine(root, className) {
  const line = document.createElement('p');
  line.className = className;
  root.append(line);
  return line;
}

function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

function setStyle(element, property, value) {
  if (element.style.getPropertyValue(property) !== value) {
    element.style.setProperty(property, value);
  }
}
