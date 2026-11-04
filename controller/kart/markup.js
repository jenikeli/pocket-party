// The kart races' phone screens as HTML, which controller/kart/controls.js puts into the game container.
// The setup screen (control style and ready) before every race, and the controls, held sideways like a Switch
// controller: steering on the left (the stick, or the tilt panel), the status in the middle, the buttons on the
// right (the 3D race adds Drift and the Item button, and with tilt moves Drift to the left).
// The ids are styled in controller/kart/style.css; data-button names match KART_BUTTONS, data-choice and
// data-value match KART_CHOICES and their values.

export const MARKUP = `
  <div id="kart-screen">
    <p id="kart-turn-hint">Turn your phone sideways</p>
    <div id="kart-setup" hidden>
      <div id="kart-choices">
        <p id="kart-setup-laps"></p>
        <div class="kart-choice-row">
          <span class="kart-hint">Steering</span>
          <button data-choice="steering" data-value="stick">Stick</button>
          <button data-choice="steering" data-value="tilt">Tilt</button>
        </div>
        <div class="kart-choice-row">
          <span class="kart-hint">Accelerate</span>
          <button data-choice="autoAccelerate" data-value="false">Go button</button>
          <button data-choice="autoAccelerate" data-value="true">Auto</button>
        </div>
        <p id="kart-steering-note" hidden></p>
      </div>
      <button id="kart-ready-button" aria-pressed="false">Ready</button>
    </div>
    <div id="kart-controls">
      <div id="kart-stick-zone">
        <div id="kart-stick-ring"><div id="kart-stick-knob"></div></div>
        <p class="kart-hint">Steer</p>
      </div>
      <div id="kart-tilt-zone" hidden>
        <div id="kart-wheel"><div id="kart-wheel-bar"></div></div>
        <button id="kart-enable-tilt">Enable tilt</button>
        <button id="kart-recenter">Recenter</button>
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
