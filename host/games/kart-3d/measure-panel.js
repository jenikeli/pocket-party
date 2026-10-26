// The Measure tool on the host (M7d4b; developer only, like the tuning panel): the setup screen's Measure button
// starts it, and while it runs (measure-run.js, one case frame per drawn frame) a line over the picture says what
// is being measured, with a Stop button; then the report shows, with Copy (to paste back to Claude) and Close.
// Used by host/games/kart-3d/index.js, which hides its other panels while it runs.

import { createMeasureRun } from './measure-run.js';
import { copyText } from './copy-text.js';

const STYLE = `
  #kart-3d-measure { position: fixed; z-index: 1; left: 8px; top: 8px; max-width: calc(100vw - 16px);
    max-height: calc(100dvh - 16px); overflow: auto; box-sizing: border-box; padding: 10px 14px; border-radius: 10px;
    background: rgba(16, 19, 28, 0.88); color: #ffffff; font: 14px sans-serif; }
  #kart-3d-measure p { margin: 0; }
  #kart-3d-measure .measure-buttons { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
  #kart-3d-measure button { font: 15px sans-serif; padding: 8px 12px; border: none; border-radius: 8px;
    background: #2a3145; color: #ffffff; cursor: pointer; }
  #kart-3d-measure pre { margin: 8px 0 0; font: 12px monospace; white-space: pre; }
  #kart-3d-measure textarea { width: 100%; height: 160px; margin-top: 8px; font: 12px monospace; }
  #kart-3d-measure-status { color: #9aa4bf; }
`;

// `renderer` is renderer.js's; `restoreLook()` puts the host's own quality back once a run ends. Returns
// { start(track, courseName), isRunning(), frame() }: start begins a run on the course shown; frame() draws the
// run's next frame (call it instead of the game's own drawing while isRunning()).
export function createMeasurePanel(container, renderer, restoreLook) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const panel = document.createElement('div');
  panel.id = 'kart-3d-measure';
  panel.hidden = true;
  panel.innerHTML = `
    <p id="kart-3d-measure-progress"></p>
    <pre id="kart-3d-measure-report" hidden></pre>
    <div class="measure-buttons">
      <button type="button" id="kart-3d-measure-stop">Stop</button>
      <button type="button" id="kart-3d-measure-copy" hidden>Copy</button>
      <button type="button" id="kart-3d-measure-close" hidden>Close</button>
      <p id="kart-3d-measure-status"></p>
    </div>
    <textarea id="kart-3d-measure-text" readonly hidden></textarea>`;
  container.append(style, panel);
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
