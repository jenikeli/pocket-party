// The 2D race's phone controls as HTML, which controller/games/kart-2d/index.js puts into the game container.
// Held sideways like a Switch controller: the stick on the left, the status in the middle, the pedals on the
// right. The ids are styled in controller/games/kart-2d/style.css; data-button names match KART_BUTTONS.

export const MARKUP = `
  <div id="kart-screen">
    <p id="kart-turn-hint">Turn your phone sideways</p>
    <div id="kart-controls">
      <div id="kart-stick-zone">
        <div id="kart-stick-ring"><div id="kart-stick-knob"></div></div>
        <p class="kart-hint">Steer</p>
      </div>
      <div id="kart-status">
        <p id="kart-big"></p>
        <p id="kart-line"></p>
      </div>
      <div id="kart-pedals">
        <div class="kart-pedal" id="kart-brake" data-button="brake">Brake</div>
        <div class="kart-pedal" id="kart-accelerate" data-button="accelerate">Go</div>
      </div>
    </div>
  </div>`;
