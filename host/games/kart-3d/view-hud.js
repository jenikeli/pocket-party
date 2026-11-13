// What one split-screen view of the 3D race shows over its picture, as HTML on top of the canvas: the player's
// name top left (so players know which view is theirs), the lap bottom left and the place bottom right (where
// MK8DX puts them), the item frame under the name (the held item, or the roulette, and a ring per running effect,
// M8a), and a banner in the middle ("Final lap!", "Finish!"). Sizes follow the view's height, so a
// quarter view gets smaller text. Used by host/games/kart-3d/views.js, one per view.

import { ordinal } from '/shared/ordinal.js';
import { KART_ITEMS } from '/shared/protocol.js';
import { ITEM_ICONS } from '/shared/item-icons.js';
import { setText } from '/host/kart/panel-parts.js';

// The roulette flips to the next icon this often, in milliseconds (MK8DX's spins fast).
const ROULETTE_FLIP_MS = 80;
const ROULETTE_IDS = Object.values(KART_ITEMS);

const STYLE = `
  .kart-3d-view-hud { position: absolute; overflow: hidden; pointer-events: none; font-family: sans-serif;
    color: #ffffff; }
  .kart-3d-view-hud p { position: absolute; margin: 0; }
  .kart-3d-view-label { left: 0.5em; top: calc(var(--top-inset) + 0.5em); padding: 0.15em 0.4em; border-radius: 0.25em;
    background: rgba(16, 19, 28, 0.6); font-weight: bold; }
  .kart-3d-item-frame { position: absolute; left: 0.5em; top: calc(var(--top-inset) + 2.6em); display: flex;
    align-items: center; gap: 0.5em; }
  .kart-3d-item-frame[hidden] { display: none; }
  .kart-3d-item-box { width: 2.6em; height: 2.6em; box-sizing: border-box; padding: 0.3em; border-radius: 0.5em;
    border: 0.18em solid #e6ebf5; background: rgba(16, 19, 28, 0.55); }
  .kart-3d-item-box svg, .kart-3d-effect-ring svg { display: block; width: 100%; height: 100%; }
  .kart-3d-effect-ring { width: 1.9em; height: 1.9em; box-sizing: border-box; padding: 0.3em; border-radius: 50%;
    background: conic-gradient(#ffffff calc(var(--share) * 360deg), rgba(16, 19, 28, 0.55) 0); }
  .kart-3d-effect-ring svg { background: rgba(16, 19, 28, 0.85); border-radius: 50%; padding: 0.1em;
    box-sizing: border-box; }
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

// Returns { show(target, rect, canvasHeight, topInset), hide(), remove() }.
export function createViewHud(container) {
  addStyle(container);
  const root = document.createElement('div');
  root.className = 'kart-3d-view-hud';
  root.hidden = true;
  const label = createLine(root, 'kart-3d-view-label');
  const itemFrame = createItemFrame(root);
  const lap = createLine(root, 'kart-3d-view-lap');
  const place = createLine(root, 'kart-3d-view-place');
  const banner = createLine(root, 'kart-3d-view-banner');
  container.append(root);

  // `target` is { name, color, hud }: the label text and its CSS colour, and race-views.js viewHud's
  // { lap, laps, place, banner, item }. `rect` is the view's rectangle in CSS pixels with y from the bottom, as WebGL
  // counts. `topInset` lowers the name and the item frame this many pixels, clear of the shell's back arrow.
  // Writes to the page only on change: this runs every frame.
  function show({ name, color, hud }, rect, canvasHeight, topInset) {
    root.hidden = false;
    setStyle(root, 'left', `${rect.x}px`);
    setStyle(root, 'top', `${canvasHeight - rect.y - rect.height}px`);
    setStyle(root, 'width', `${rect.width}px`);
    setStyle(root, 'height', `${rect.height}px`);
    // The base size, which the lines' sizes (in em) follow: 20 px on a 540 px tall view, at least 12.
    setStyle(root, 'font-size', `${Math.max(Math.round(rect.height / 27), 12)}px`);
    setStyle(root, '--top-inset', `${topInset}px`);
    setText(label, name);
    setStyle(label, 'color', color);
    itemFrame.show(hud.item ?? null);
    setText(lap, hud.lap === null ? '' : `Lap ${hud.lap}/${hud.laps}`);
    setText(place, ordinal(hud.place));
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

// The item frame: a rounded square with the held item's icon (the roulette's icons cycling while rolling, nothing
// while empty), and beside it a ring per running effect that empties with its `share`. Returns { show(item) },
// `item` being item-views.js itemHud's { held, rolling, effects } or null (items off: the frame is hidden).
function createItemFrame(root) {
  const frame = document.createElement('div');
  frame.className = 'kart-3d-item-frame';
  const box = document.createElement('div');
  box.className = 'kart-3d-item-box';
  frame.append(box);
  root.append(frame);
  // The icons shown now, as ids, so the SVG is only rebuilt when it changes (the effects' rings keep theirs).
  let shownBox = null;
  let shownEffects = '';
  let rings = [];

  function show(item) {
    frame.hidden = item === null;
    if (item === null) {
      return;
    }
    const rouletteIndex = Math.floor(performance.now() / ROULETTE_FLIP_MS) % ROULETTE_IDS.length;
    const boxItem = item.rolling ? ROULETTE_IDS[rouletteIndex] : item.held;
    if (boxItem !== shownBox) {
      shownBox = boxItem;
      box.innerHTML = boxItem === null ? '' : ITEM_ICONS[boxItem].svg;
    }
    const effectIds = item.effects.map((effect) => effect.item).join(',');
    if (effectIds !== shownEffects) {
      shownEffects = effectIds;
      rings.forEach((ring) => ring.remove());
      rings = item.effects.map((effect) => createRing(frame, effect.item));
    }
    // Rounded to 1%, so a ring's style is written about 100 times an effect, not every frame.
    item.effects.forEach((effect, index) => setStyle(rings[index], '--share', effect.share.toFixed(2)));
  }

  return { show };
}

function createRing(frame, itemId) {
  const ring = document.createElement('div');
  ring.className = 'kart-3d-effect-ring';
  ring.dataset.item = itemId;
  // The icons are our own SVG text, never from a phone.
  ring.innerHTML = ITEM_ICONS[itemId].svg;
  frame.append(ring);
  return ring;
}

function createLine(root, className) {
  const line = document.createElement('p');
  line.className = className;
  root.append(line);
  return line;
}

function setStyle(element, property, value) {
  if (element.style.getPropertyValue(property) !== value) {
    element.style.setProperty(property, value);
  }
}
