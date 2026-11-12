// The kart races' phone screens as HTML, which controller/kart/controls.js puts into the game container.
// The setup screen (control style and ready) before every race, laid out for portrait, and the controls, held
// sideways like a Switch controller: steering on the left (the stick, or the tilt panel), the status in the
// middle, the buttons on the right (the 3D race adds Drift and the Item button, and with tilt moves Drift to the
// left). On a portrait page the controls are drawn a quarter turn round (controller/kart/controls.css).
// The ids are styled in controller/kart/setup.css and controls.css; data-button names match KART_BUTTONS,
// data-choice and data-value match KART_CHOICES and their values. The pp- classes are the shared look
// (controller/style.css).

export const MARKUP = `
  <div id="kart-screen">
    <div id="kart-setup" hidden>
      <div id="kart-choices">
        <p id="kart-setup-game" class="pp-muted"></p>
        <p id="kart-setup-title" class="pp-title"></p>
        <p id="kart-setup-laps" class="pp-muted"></p>
        <p class="kart-setup-label pp-muted">Steering</p>
        <div class="pp-segment">
          <button class="pp-button" data-choice="steering" data-value="stick">Stick</button>
          <button class="pp-button" data-choice="steering" data-value="tilt">Tilt</button>
        </div>
        <p class="kart-setup-label pp-muted">Accelerate</p>
        <div class="pp-segment">
          <button class="pp-button" data-choice="autoAccelerate" data-value="false">Go button</button>
          <button class="pp-button" data-choice="autoAccelerate" data-value="true">Auto</button>
        </div>
        <p id="kart-steering-note" hidden></p>
      </div>
      <div id="kart-ready-area">
        <p id="kart-turn-note" class="pp-muted">Turn your phone sideways when the race starts</p>
        <button id="kart-ready-button" class="pp-button pp-primary" aria-pressed="false">Ready</button>
      </div>
    </div>
    <div id="kart-controls">
      <div id="kart-stick-zone">
        <div id="kart-stick-ring"><div id="kart-stick-knob"></div></div>
        <p class="kart-hint">Steer</p>
      </div>
      <div id="kart-tilt-zone" hidden>
        <div id="kart-wheel"><div id="kart-wheel-bar"></div></div>
        <button id="kart-enable-tilt" class="pp-button">Enable tilt</button>
        <button id="kart-recenter" class="pp-button">Recenter</button>
        <p class="kart-hint">Turn the phone like a wheel</p>
      </div>
      <div id="kart-status">
        <p id="kart-big"></p>
        <p id="kart-line"></p>
      </div>
      <div id="kart-pedals">
        <div class="kart-pedal" id="kart-item-slot" data-button="item" hidden>
          <div id="kart-item-icon"></div>
          <span id="kart-item-label">Item</span>
          <div id="kart-item-effects"></div>
        </div>
        <div class="kart-pedal" id="kart-drift" data-button="drift" hidden>Drift</div>
        <div class="kart-pedal" id="kart-brake" data-button="brake">Brake</div>
        <div class="kart-pedal" id="kart-accelerate" data-button="accelerate">Go</div>
      </div>
    </div>
  </div>`;
