// The setup screen's Colour row: one swatch per player colour. The player's own has a white ring and a tick, one
// another player holds is a hollow ring with the holder's initial and cannot be tapped, a free one is a plain
// disc that asks the host for that colour. The highlight moves only when the host's view says so, as the other
// choices do. Used by controller/kart/setup-screen.js.

import { KART_CHOICES } from '/shared/protocol.js';
import { icon } from '/shared/icons.js';

// `box` is the #kart-colors element, `sendChoice(choice, value)` sends a choice. Returns { show(colors, own) }.
export function createColorPicker(box, sendChoice) {
  // The swatch buttons, made once for the colours the host lists and then only updated: a button replaced while a
  // finger is on it would lose the tap.
  let swatches = [];

  box.addEventListener('click', (event) => {
    const swatch = event.target.closest('[data-color]');
    // A taken swatch is disabled, so its taps never get here; the player's own sends nothing new.
    if (swatch && swatch.getAttribute('aria-pressed') !== 'true') {
      sendChoice(KART_CHOICES.COLOR, Number(swatch.dataset.color));
    }
  });

  function makeSwatches(count) {
    swatches = Array.from({ length: count }, (unused, index) => {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'kart-swatch';
      swatch.dataset.color = String(index);
      return swatch;
    });
    box.replaceChildren(...swatches);
  }

  // `colors` is the view's [{ color, name, takenBy }], one per slot; `own` the player's slot (colorIndex).
  function show(colors, own) {
    if (swatches.length !== colors.length) {
      makeSwatches(colors.length);
    }
    colors.forEach((choice, index) => {
      const swatch = swatches[index];
      const label = swatchLabel(choice);
      swatch.style.setProperty('--swatch', choice.color);
      swatch.setAttribute('aria-pressed', String(index === own));
      swatch.setAttribute('aria-label', label);
      swatch.title = label;
      swatch.disabled = Boolean(choice.takenBy);
      swatch.classList.toggle('taken', Boolean(choice.takenBy));
      // The name comes from another phone, so it goes in as text, never as HTML.
      if (index === own) {
        swatch.innerHTML = icon('check');
      } else {
        swatch.textContent = choice.takenBy ? initialOf(choice.takenBy) : '';
      }
    });
  }

  return { show };
}

// "Blue, taken by Mei". A holder with no name is called by their colour (host/roster.js), which is this swatch's
// own name, so "Red, taken" rather than "Red, taken by Red".
function swatchLabel(choice) {
  if (!choice.takenBy) {
    return choice.name;
  }
  return choice.takenBy === choice.name ? `${choice.name}, taken` : `${choice.name}, taken by ${choice.takenBy}`;
}

// Array.from splits by character, not by UTF-16 unit, so a name starting with an emoji keeps it whole.
function initialOf(name) {
  return Array.from(name)[0].toUpperCase();
}
