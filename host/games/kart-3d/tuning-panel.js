// The 3D race's tuning panel on the host (developer only, like the readout): one slider per number in tuning.js,
// grouped, each showing its value and changing the drive at once; Copy values puts every value on the clipboard
// as text to paste back to Claude, and Reset puts the defaults back. Opened by the drive panel's Tuning button
// (panels.js), closed by that or its own Close (it lies over the drive panel on a narrow screen). Used by
// host/games/kart-3d/index.js.

import { TUNABLES, tuning, setTuning, resetTuning, describeTuning } from './tuning.js';

const STYLE = `
  #kart-3d-tuning { position: fixed; z-index: 1; left: 8px; top: 8px; width: 360px; max-height: calc(100dvh - 16px);
    overflow-y: auto; box-sizing: border-box; padding: 10px 14px; border-radius: 10px;
    background: rgba(16, 19, 28, 0.88); color: #ffffff; font: 14px sans-serif; }
  #kart-3d-tuning h3 { margin: 12px 0 4px; font-size: 15px; color: #ffd84a; }
  #kart-3d-tuning label { display: block; margin: 6px 0; }
  #kart-3d-tuning .tuning-name { display: flex; justify-content: space-between; gap: 8px; color: #c8cfe0; }
  #kart-3d-tuning .tuning-value { color: #ffffff; font-weight: bold; white-space: nowrap; }
  #kart-3d-tuning input[type="range"] { width: 100%; margin: 2px 0 0; }
  #kart-3d-tuning .tuning-buttons { display: flex; gap: 8px; align-items: center; }
  #kart-3d-tuning button { font: 15px sans-serif; padding: 8px 12px; border: none; border-radius: 8px;
    background: #2a3145; color: #ffffff; cursor: pointer; }
  #kart-3d-tuning textarea { width: 100%; height: 160px; margin-top: 8px; font: 12px monospace; }
  #kart-3d-tuning-status { margin: 0; color: #9aa4bf; }
`;

// Returns { toggle(), setVisible(visible) }: toggle opens or closes it (the Tuning button); setVisible(false)
// hides it whatever was chosen (the setup screen), setVisible(true) shows it again if it was open.
export function createTuningPanel(container) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const panel = document.createElement('div');
  panel.id = 'kart-3d-tuning';
  panel.hidden = true;
  panel.innerHTML = `
    <div class="tuning-buttons">
      <button type="button" id="kart-3d-tuning-copy">Copy values</button>
      <button type="button" id="kart-3d-tuning-reset">Reset</button>
      <button type="button" id="kart-3d-tuning-close">Close</button>
      <p id="kart-3d-tuning-status"></p>
    </div>
    <textarea id="kart-3d-tuning-text" readonly hidden></textarea>`;
  container.append(style, panel);
  const status = panel.querySelector('#kart-3d-tuning-status');
  const copyText = panel.querySelector('#kart-3d-tuning-text');
  const sliders = TUNABLES.map((tunable) => createSlider(tunable));
  for (const group of new Set(TUNABLES.map((tunable) => tunable.group))) {
    const heading = document.createElement('h3');
    heading.textContent = group;
    panel.append(heading, ...sliders.filter((slider) => slider.tunable.group === group).map((slider) => slider.row));
  }
  panel.querySelector('#kart-3d-tuning-copy').addEventListener('click', () => copyValues(status, copyText));
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

  return { toggle, setVisible };
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
  const decimals = (String(tunable.step).split('.')[1] ?? '').length;

  function show() {
    input.value = tuning[tunable.key];
    value.textContent = `${tuning[tunable.key].toFixed(decimals)} ${tunable.unit}`.trim();
  }

  input.addEventListener('input', () => {
    setTuning(tunable.key, input.valueAsNumber);
    show();
  });
  show();
  return { tunable, row, show };
}

// The clipboard needs a secure context (the HTTPS host has one) and a tap, which this click is. If the browser
// still refuses, the text shows in a box, selected, to copy by hand.
async function copyValues(status, copyText) {
  const text = describeTuning();
  try {
    await navigator.clipboard.writeText(text);
    copyText.hidden = true;
    status.textContent = 'Copied';
  } catch (error) {
    console.error('Copying the tuning values failed, showing them to copy by hand', error);
    copyText.hidden = false;
    copyText.value = text;
    copyText.select();
    status.textContent = 'Select and copy the text below';
  }
}
