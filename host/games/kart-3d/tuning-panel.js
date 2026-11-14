// The 3D race's tuning popup on the host (developer only), in the host's look. It opens upward from the strip, over
// the left of the views. Its first section, Stats, is the readout (readout.js: the step time, frame rate and each
// player's numbers), always in sight; under it the sliders scroll, one per number in tuning.js, grouped, each
// showing its value and changing the race at once; at the bottom Copy values puts every value on the clipboard as
// text to paste back to Claude, Reset puts the defaults back, and Close shuts the popup. Opened by the race bar's
// Tuning button, closed by that or its own Close. Used by host/games/kart-3d/index.js.

import { TUNABLES, tuning, setTuning, resetTuning, describeTuning } from './tuning.js';
import { copyText } from './copy-text.js';
import { createRaceStage } from './race-stage.js';

// Returns { toggle(), setVisible(visible), isOpen(), setReadout(text) }: toggle opens or closes it (the Tuning
// button); setVisible(false) hides it whatever was chosen (the setup screen), setVisible(true) shows it again if it
// was open; isOpen() says whether it is open (the Tuning button reads as pressed); setReadout(text) sets the Stats
// (null leaves them as they are, since the text is rebuilt only a few times a second).
export function createTuningPanel(container) {
  // Over the views and the HUDs, above the strip.
  const stage = createRaceStage(container, 'k3d-race-stage k3d-above-strip k3d-stage-over');
  const panel = document.createElement('div');
  panel.id = 'kart-3d-tuning';
  panel.className = 'pp-panel k3d-tuning';
  panel.hidden = true;
  panel.innerHTML = `
    <h3 class="tuning-first">Stats</h3>
    <p id="kart-3d-readout" class="pp-muted k3d-readout"></p>
    <div class="tuning-sliders"></div>
    <div class="tuning-buttons">
      <button type="button" id="kart-3d-tuning-copy" class="pp-button">Copy values</button>
      <button type="button" id="kart-3d-tuning-reset" class="pp-button">Reset</button>
      <button type="button" id="kart-3d-tuning-close" class="pp-button">Close</button>
      <p id="kart-3d-tuning-status" class="pp-muted"></p>
    </div>
    <textarea id="kart-3d-tuning-text" class="k3d-dev-text" readonly hidden></textarea>`;
  stage.append(panel);
  const status = panel.querySelector('#kart-3d-tuning-status');
  const copyBox = panel.querySelector('#kart-3d-tuning-text');
  const readout = panel.querySelector('#kart-3d-readout');
  const sliderList = panel.querySelector('.tuning-sliders');
  const sliders = TUNABLES.map((tunable) => createSlider(tunable));
  for (const group of new Set(TUNABLES.map((tunable) => tunable.group))) {
    const heading = document.createElement('h3');
    heading.textContent = group;
    sliderList.append(heading, ...sliders.filter((slider) => slider.tunable.group === group).map((slider) => slider.row));
  }
  panel.querySelector('#kart-3d-tuning-copy').addEventListener('click', () => copyText(describeTuning(), status, copyBox));
  panel.querySelector('#kart-3d-tuning-reset').addEventListener('click', () => {
    resetTuning();
    sliders.forEach((slider) => slider.show());
    status.textContent = 'Defaults back';
  });
  let open = false;
  let visible = false;
  panel.querySelector('#kart-3d-tuning-close').addEventListener('click', () => toggle());

  function toggle() {
    open = !open;
    panel.hidden = !(open && visible);
  }

  // Called every frame, so it only touches the page on a change.
  function setVisible(isVisible) {
    visible = isVisible;
    const hidden = !(open && visible);
    if (panel.hidden !== hidden) {
      panel.hidden = hidden;
    }
  }

  function setReadout(text) {
    if (text !== null && readout.textContent !== text) {
      readout.textContent = text;
    }
  }

  return { toggle, setVisible, isOpen: () => open, setReadout };
}

// A tuned number as the panel shows it: as many decimals as its slider's step has, then its unit.
export function tuningValueText(tunable, number) {
  const decimals = (String(tunable.step).split('.')[1] ?? '').length;
  return `${number.toFixed(decimals)} ${tunable.unit}`.trim();
}

// One slider: { tunable, row, show() }, show() setting it to the live value.
function createSlider(tunable) {
  const row = document.createElement('label');
  const name = document.createElement('span');
  name.className = 'tuning-name';
  const nameText = document.createElement('span');
  nameText.textContent = tunable.label;
  const value = document.createElement('span');
  value.className = 'tuning-value';
  name.append(nameText, value);
  const input = document.createElement('input');
  Object.assign(input, { type: 'range', min: tunable.min, max: tunable.max, step: tunable.step });
  row.append(name, input);

  function show() {
    input.value = tuning[tunable.key];
    value.textContent = tuningValueText(tunable, tuning[tunable.key]);
  }

  input.addEventListener('input', () => {
    setTuning(tunable.key, input.valueAsNumber);
    show();
  });
  show();
  return { tunable, row, show };
}
