// The M6a spike's on-screen panel (HTML over the canvas, top left): a switch for each cost of the look, the
// live frame-time readout, the load times, and the benchmark button and its results. Used by the spike's
// index.js, which owns the settings; the panel only shows them and reports clicks.

const CHOICES = [
  { key: 'views', label: 'Views', values: [1, 2, 4] },
  { key: 'karts', label: 'Karts', values: [4, 8, 12] },
];
const SWITCHES = [
  { key: 'shadows', label: 'Shadows' },
  { key: 'glossy', label: 'Glossy' },
  { key: 'bloom', label: 'Bloom' },
  { key: 'particles', label: 'Particles' },
  { key: 'detailedKarts', label: 'Detailed karts' },
  { key: 'fullResolution', label: `Full res (x${window.devicePixelRatio})` },
  { key: 'cap30', label: 'Cap 30 fps' },
];

const STYLE = `
  #spike-panel { position: fixed; left: 12px; top: 12px; width: 380px; padding: 12px; border-radius: 10px;
    background: rgba(16, 19, 28, 0.82); color: #ffffff; font: 15px sans-serif; }
  #spike-panel .row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; align-items: center; }
  #spike-panel button { font: 15px sans-serif; padding: 8px 10px; border: none; border-radius: 6px;
    background: #2a3145; color: #ffffff; cursor: pointer; }
  #spike-panel button[aria-pressed="true"] { background: #3498db; }
  #spike-panel button:disabled { opacity: 0.5; }
  #spike-panel p { margin: 6px 0; color: #c9d1e6; white-space: pre-line; }
  #spike-results { width: 100%; height: 300px; font: 11px monospace; }
`;

// `onChoose(key, value)` when a choice (views, karts) is clicked, `onToggle(key)` for a switch, and
// `onBenchmark()` for the benchmark button.
// Returns { showSettings(settings), showStats(text), showLoad(text), showProgress(text), showResults(text) }.
export function createPanel(container, { onChoose, onToggle, onBenchmark }) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const panel = document.createElement('div');
  panel.id = 'spike-panel';
  const buttons = [];

  for (const choice of CHOICES) {
    const row = addRow(panel, `${choice.label}:`);
    for (const value of choice.values) {
      buttons.push(addButton(row, String(value), choice.key, value, () => onChoose(choice.key, value)));
    }
  }
  const switchRow = addRow(panel, '');
  for (const option of SWITCHES) {
    buttons.push(addButton(switchRow, option.label, option.key, null, () => onToggle(option.key)));
  }
  const stats = addText(panel, 'spike-stats');
  const load = addText(panel, 'spike-load');
  const benchmarkButton = document.createElement('button');
  benchmarkButton.id = 'spike-benchmark-button';
  benchmarkButton.textContent = 'Run benchmark (about 2.5 min)';
  benchmarkButton.addEventListener('click', onBenchmark);
  panel.append(benchmarkButton);
  const progress = addText(panel, 'spike-progress');
  const results = document.createElement('textarea');
  results.id = 'spike-results';
  results.readOnly = true;
  results.hidden = true;
  panel.append(results);
  container.append(style, panel);

  // A choice button is pressed when the setting equals its value; a switch (no value) when the setting is on.
  function showSettings(settings) {
    for (const button of buttons) {
      const setting = settings[button.dataset.key];
      const pressed = button.dataset.value === undefined ? setting === true : String(setting) === button.dataset.value;
      button.setAttribute('aria-pressed', String(pressed));
    }
  }

  // While the benchmark runs, it owns the settings, so the switches are disabled.
  function showProgress(text) {
    progress.textContent = text;
    const running = text !== '';
    for (const button of [...buttons, benchmarkButton]) {
      button.disabled = running;
    }
  }

  // Shown in a text box, so it can be selected and copied on a tablet too.
  function showResults(text) {
    results.hidden = false;
    results.value = text;
  }

  return {
    showSettings,
    showStats: (text) => (stats.textContent = text),
    showLoad: (text) => (load.textContent = text),
    showProgress,
    showResults,
  };
}

function addRow(panel, label) {
  const row = document.createElement('div');
  row.className = 'row';
  if (label) {
    row.append(label);
  }
  panel.append(row);
  return row;
}

// `value` is null for a switch.
function addButton(row, label, key, value, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.dataset.key = key;
  if (value !== null) {
    button.dataset.value = String(value);
  }
  button.addEventListener('click', onClick);
  row.append(button);
  return button;
}

function addText(panel, id) {
  const text = document.createElement('p');
  text.id = id;
  panel.append(text);
  return text;
}
