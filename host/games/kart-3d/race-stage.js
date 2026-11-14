// The 16:9 .pp-stage (host/ui.css) each of the 3D race's HTML panels sits in. Used by race-bar.js,
// results-panel.js, tuning-panel.js and measure-panel.js. Their stylesheets (race-panels.css, results-panel.css,
// dev-panels.css) are loaded and removed by index.js, like setup.css.

// Adds a stage to `container`, with `className` for the panel's own rules, and returns it.
export function createRaceStage(container, className) {
  const stage = document.createElement('div');
  stage.className = `pp-stage ${className}`;
  container.append(stage);
  return stage;
}
