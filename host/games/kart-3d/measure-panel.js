// The Measure tool on the host (M7d4b; developer only, like the tuning panel; in the host's look): the setup
// screen's Measure button starts it, and while it runs (measure-run.js, one case frame per drawn frame) a line over the picture says what
// is being measured, with a Stop button; then the report shows, with Copy (to paste back to Claude) and Close.
// Used by host/games/kart-3d/index.js, which hides its other panels while it runs.

import { createMeasureRun } from './measure-run.js';
import { copyText } from './copy-text.js';
import { createRaceStage } from './race-stage.js';

// `renderer` is renderer.js's; `restoreLook()` puts the host's own quality back once a run ends. Returns
// { start(track, courseName), isRunning(), frame() }: start begins a run on the course shown; frame() draws the
// run's next frame (call it instead of the game's own drawing while isRunning()).
export function createMeasurePanel(container, renderer, restoreLook) {
  // Over the setup screen, which comes first in the page.
  const stage = createRaceStage(container, 'k3d-race-stage k3d-stage-over');
  const panel = document.createElement('div');
  panel.id = 'kart-3d-measure';
  panel.className = 'pp-panel k3d-dev-panel k3d-measure';
  panel.hidden = true;
  panel.innerHTML = `
    <p id="kart-3d-measure-progress"></p>
    <pre id="kart-3d-measure-report" hidden></pre>
    <div class="measure-buttons">
      <button type="button" id="kart-3d-measure-stop" class="pp-button">Stop</button>
      <button type="button" id="kart-3d-measure-copy" class="pp-button" hidden>Copy</button>
      <button type="button" id="kart-3d-measure-close" class="pp-button" hidden>Close</button>
      <p id="kart-3d-measure-status" class="pp-muted"></p>
    </div>
    <textarea id="kart-3d-measure-text" class="k3d-dev-text" readonly hidden></textarea>`;
  stage.append(panel);
  const byId = (id) => panel.querySelector(`#kart-3d-measure-${id}`);
  let run = null;
  byId('stop').addEventListener('click', () => run?.stop());
  byId('copy').addEventListener('click', () => copyText(byId('report').textContent, byId('status'), byId('text')));
  byId('close').addEventListener('click', () => (panel.hidden = true));

  function start(track, courseName) {
    run = createMeasureRun(renderer, track, {
      course: courseName,
      canvas: `${container.clientWidth}x${container.clientHeight}`,
      devicePixelRatio: window.devicePixelRatio,
      gpu: renderer.describeGpu(),
      userAgent: navigator.userAgent,
    });
    panel.hidden = false;
    showButtons(true);
    byId('report').hidden = true;
    byId('text').hidden = true;
    byId('status').textContent = '';
  }

  function frame() {
    const progress = run.frame();
    if (progress !== null) {
      byId('progress').textContent = progress;
      return;
    }
    restoreLook();
    byId('progress').textContent = 'Measured. Copy the report and paste it back to Claude.';
    byId('report').textContent = run.report();
    byId('report').hidden = false;
    showButtons(false);
    run = null;
  }

  function showButtons(running) {
    byId('stop').hidden = !running;
    byId('copy').hidden = running;
    byId('close').hidden = running;
  }

  return { start, isRunning: () => run !== null, frame };
}
