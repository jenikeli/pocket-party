// The input lab's controls as HTML, which controller/games/input-lab/index.js puts into the game container.
// The ids are styled in controller/games/input-lab/style.css.

export const MARKUP = `
  <div id="pad-screen">
    <nav id="mode-tabs">
      <button type="button" data-mode="drag">Drag</button>
      <button type="button" data-mode="tap">Tap</button>
      <button type="button" data-mode="swipe">Swipe</button>
      <button type="button" data-mode="tilt">Tilt</button>
    </nav>
    <p id="lab-notice" hidden></p>
    <div id="input-pad">
      <div id="stick-ring"><div id="stick-knob"></div></div>
      <p id="big-readout"></p>
      <button type="button" id="enable-tilt-button">Enable tilt</button>
      <button type="button" id="calibrate-button">Set zero</button>
      <p id="pad-hint"></p>
    </div>
    <dl id="readout">
      <dt>Sending</dt><dd id="readout-value">-</dd>
      <dt>Rate</dt><dd id="readout-rate">0 Hz</dd>
      <dt>Tilt sensor</dt><dd id="readout-tilt">not enabled</dd>
    </dl>
  </div>`;
