// The kart races' phone screens as HTML, which controller/kart/controls.js puts into the game container.
// The setup screen before every race (the race's line, then Colour, Steering and Options rows, and Ready), laid
// out for portrait, and the driving controls (also shown after Ready, with Back to setup, until the race starts), held sideways: steering on the left, the status in the middle, the
// buttons on the right (controller/kart/controls.css lays out each race's grid, and mirrors it for Left-handed).
// On a portrait page the controls are drawn a quarter turn round. The ids are styled in controller/kart/setup.css,
// controls.css and buttons.css; data-button names match KART_BUTTONS, data-choice and data-value match
// KART_CHOICES and their values. The pp- classes are the shared look (controller/style.css). Stick and Tilt are an
// icon with a word under it (shared/icons.js), since neither has a conventional icon on its own.

import { icon } from '/shared/icons.js';

// The tilt panel: the wheel picture, Enable tilt (until tilt runs) and Recenter. The 2D race has it on the left
// in place of the stick; the 3D race, whose left thumb holds Drift, has it small in the status column.
const TILT_PANEL = `
      <div id="kart-tilt-zone" hidden>
        <div id="kart-wheel"><div id="kart-wheel-bar"></div></div>
        <button id="kart-enable-tilt" class="pp-button">Enable tilt</button>
        <button id="kart-recenter" class="pp-button">Recenter</button>
        <p class="kart-hint">Turn the phone like a wheel</p>
      </div>`;

const SETUP_SCREEN = `
    <div id="kart-setup" hidden>
      <div id="kart-choices">
        <div>
          <p id="kart-setup-game" class="pp-muted"></p>
          <p id="kart-setup-title" class="pp-title"></p>
          <p id="kart-setup-laps" class="pp-muted"></p>
        </div>
        <p class="kart-row-word">Colour</p>
        <div id="kart-colors" role="group" aria-label="Colour"></div>
        <p id="kart-driver" hidden></p>
        <p class="kart-row-word">Steering</p>
        <div class="pp-segment" role="group" aria-label="Steering">
          <button class="pp-button kart-choice" data-choice="steering" data-value="stick">${icon('stick')}Stick</button>
          <button class="pp-button kart-choice" data-choice="steering" data-value="tilt">${icon('tilt')}Tilt</button>
        </div>
        <p id="kart-steering-note" hidden></p>
        <p class="kart-row-word">Options</p>
        <div id="kart-options">
          <button class="kart-toggle" data-choice="autoAccelerate" aria-pressed="false">Auto-accelerate<span class="kart-switch"></span></button>
          <button class="kart-toggle" data-choice="leftHanded" aria-pressed="false">Left-handed<span class="kart-switch"></span></button>
        </div>
      </div>
      <div id="kart-ready-area">
        <p id="kart-turn-note" class="pp-muted">Ready shows your controls. Turn your phone sideways.</p>
        <button id="kart-ready-button" class="pp-button pp-primary" aria-pressed="false">Ready</button>
      </div>
    </div>`;

// `tiltInStatus` puts the tilt panel in the status column (the 3D race) rather than on the left (the 2D race).
export function kartMarkup(tiltInStatus) {
  return `
  <div id="kart-screen">${SETUP_SCREEN}
    <div id="kart-controls">
      <div id="kart-stick-zone">
        <div id="kart-steer-meter"><div id="kart-steer-amount"></div></div>
        <div id="kart-stick-ring" hidden><div id="kart-stick-knob"></div></div>
        <p class="kart-hint">Steer<br><small>thumb down anywhere</small></p>
      </div>${tiltInStatus ? '' : TILT_PANEL}
      <div id="kart-status">
        <button type="button" id="kart-leave" class="pp-icon-button" aria-label="Leave game" title="Leave game">${icon('leave')}</button>
        <div id="kart-readout">
          <p id="kart-me"><span id="kart-me-dot"></span><span id="kart-me-name"></span></p>
          <p id="kart-big"></p>
          <p id="kart-line"></p>${tiltInStatus ? TILT_PANEL : ''}
          <button type="button" id="kart-back" class="pp-button" hidden>Back to setup</button>
        </div>
      </div>
      <div class="kart-pedal" id="kart-item-slot" data-button="item" hidden>
        <div id="kart-item-icon"></div>
        <span id="kart-item-label">Item</span>
        <div id="kart-item-effects"></div>
      </div>
      <div class="kart-pedal" id="kart-drift" data-button="drift" hidden>Drift<small>hold to drift, let go to boost</small></div>
      <div class="kart-pedal" id="kart-brake" data-button="brake">Brake</div>
      <div class="kart-pedal" id="kart-accelerate" data-button="accelerate">Go<small id="kart-go-hint" hidden>tap, then hold: drift</small></div>
    </div>
  </div>`;
}
