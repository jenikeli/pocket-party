// Small pieces the kart races' HTML panels share: loading a game's stylesheet, and setting text or a pressed
// state only when it changed. Used by host/games/kart-2d/ and host/games/kart-3d/.

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

// The same for a button's pressed state (aria-pressed, which the look's .pp-button shows).
export function setPressed(button, pressed) {
  if (button.getAttribute('aria-pressed') !== String(pressed)) {
    button.setAttribute('aria-pressed', String(pressed));
  }
}
