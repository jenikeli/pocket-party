// The 16:9 .pp-stage (host/ui.css) each of the 3D race's HTML panels sits in, and the one stylesheet they share
// (race-panels.css). Used by race-bar.js, results-panel.js, tuning-panel.js and measure-panel.js.

const STYLESHEET = '/host/games/kart-3d/race-panels.css';

// Adds a stage to `container`, with `className` for the panel's own rules, and returns it. The stylesheet's <link>
// goes into the container too, once, so it leaves the page with the game's container when the game stops. The
// panels start hidden and are shown seconds later, by which time the stylesheet has loaded.
export function createRaceStage(container, className) {
  if (!container.querySelector('link[data-race-panels]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = STYLESHEET;
    link.dataset.racePanels = '';
    container.append(link);
  }
  const stage = document.createElement('div');
  stage.className = `pp-stage ${className}`;
  container.append(stage);
  return stage;
}
