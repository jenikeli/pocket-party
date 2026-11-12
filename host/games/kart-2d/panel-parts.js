// Small pieces the 2D race's HTML panels share: loading the stylesheet, setting text only when it changed, and a
// player's chip. Used by setup-panel.js, results-panel.js, race-hud.js and index.js.

import { displayName, colorText } from '/host/roster.js';

// Adds the stylesheet to the page and resolves with its <link> once it has loaded, so the panels are never
// shown unstyled. The game removes the link again when it stops.
export function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve(link);
    link.onerror = () => reject(new Error(`could not load the stylesheet ${href}`));
    document.head.append(link);
  });
}

// The panels are refreshed every frame, and writing the same text again makes the browser redo the layout.
export function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

// An empty chip (colour dot and name), the look's .pp-chip; fill it with fillPlayerChip.
export function createPlayerChip() {
  const chip = document.createElement('span');
  chip.className = 'pp-chip';
  const dot = document.createElement('span');
  dot.className = 'pp-dot';
  chip.append(dot, document.createElement('span'));
  return chip;
}

// Names come from phones, so they only ever go in as text.
export function fillPlayerChip(chip, player) {
  const [dot, name] = chip.children;
  const color = colorText(player);
  if (dot.style.getPropertyValue('--pp-dot-color') !== color) {
    dot.style.setProperty('--pp-dot-color', color);
  }
  setText(name, displayName(player));
}
