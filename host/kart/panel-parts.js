// Small pieces the kart races' HTML panels share: loading a game's stylesheet, setting text or a pressed state
// only when it changed, and the laps control. Used by host/games/kart-2d/ and host/games/kart-3d/.

import { icon } from '/shared/icons.js';

// Adds the stylesheet to the page and resolves with its <link> once it has loaded, so the panels are never
// shown unstyled. The game removes the link again when it stops.
export function loadStylesheet(href) {
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.onload = () => resolve(link);
    link.onerror = () => {
      link.remove();
      reject(new Error(`could not load the stylesheet ${href}`));
    };
    document.head.append(link);
  });
}

// Loads several stylesheets in order and resolves with their <link>s. If one fails, those already added are taken
// off again (a game that failed to load never gets its stop() called) and the error goes on.
export async function loadStylesheets(hrefs) {
  const links = [];
  try {
    for (const href of hrefs) {
      links.push(await loadStylesheet(href));
    }
  } catch (error) {
    links.forEach((link) => link.remove());
    throw error;
  }
  return links;
}

// The panels are refreshed every frame, and writing the same text again makes the browser redo the layout.
export function setText(element, text) {
  if (element.textContent !== text) {
    element.textContent = text;
  }
}

// The same for a button's pressed state (aria-pressed, which the look's .pp-button shows).
export function setPressed(button, pressed) {
  if (button.getAttribute('aria-pressed') !== String(pressed)) {
    button.setAttribute('aria-pressed', String(pressed));
  }
}

// The laps control of both races' setup screens: the word Laps, then minus, the number and plus. Returns markup with
// the ids the race gives it; the race wires the two buttons and writes the number. The icons and words are our
// own, so it can go into innerHTML.
export function lapsStepperMarkup({ minusId, valueId, plusId }) {
  return `
    <div class="kart-laps">
      <span class="pp-muted kart-laps-label">Laps</span>
      <button type="button" id="${minusId}" class="pp-icon-button" aria-label="Fewer laps" title="Fewer laps">${icon('minus')}</button>
      <span id="${valueId}" class="kart-laps-value"></span>
      <button type="button" id="${plusId}" class="pp-icon-button" aria-label="More laps" title="More laps">${icon('plus')}</button>
    </div>`;
}
