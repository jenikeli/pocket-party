// A player's chip for the 2D race's HTML panels (the kart races' shared pieces are host/kart/panel-parts.js). Used
// by setup-panel.js, results-panel.js and race-hud.js.

import { displayName, colorText } from '/host/roster.js';
import { setText } from '/host/kart/panel-parts.js';

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
