// The temple run's settings page: what can be chosen before a round, their options, and how a click cycles one.
// Plain data and functions (no DOM), so Node unit tests run them. Used by index.js, rules.js, cpu.js and the
// renderer's settings panel.

export const DEFAULT_SETTINGS = Object.freeze({
  lives: 1,
  immune: false,
  hazards: true,
  role: 'random',
  cpuRunners: 0,
  skill: 'normal',
});

// icon: a name from shared/temple-icons.js. label: the row's name on the page. options: what clicking steps through. hint: one line under it.
export const SETTING_ROWS = Object.freeze([
  { key: 'lives', icon: 'heart', label: 'Runner lives', options: [1, 2, 3, 5], hint: 'Hitting an obstacle costs a life. At zero the runner is out.' },
  { key: 'immune', icon: 'shield', label: 'Immune to obstacles', options: [false, true], hint: 'Practice mode: obstacles cannot hurt. Corners still can.' },
  { key: 'hazards', icon: 'flame', label: 'Fire, gaps and falling tiles', options: [true, false], hint: 'Off leaves only logs, beams and walls.' },
  { key: 'role', icon: 'monkey', label: 'Playing alone, you are', options: ['random', 'runner', 'monster'], hint: 'A CPU takes the other side.' },
  { key: 'cpuRunners', icon: 'cpu', label: 'Extra CPU runners', options: [0, 1, 2, 3], hint: 'More runners for the monster to chase.' },
  { key: 'skill', icon: 'gauge', label: 'CPU skill', options: ['easy', 'normal', 'hard'], hint: 'How often a CPU makes a mistake.' },
]);

// The next option for `key`, wrapping round. Returns new settings; the old are untouched.
export function cycleSetting(settings, key) {
  const row = SETTING_ROWS.find((candidate) => candidate.key === key);
  if (!row) {
    return settings;
  }
  const next = row.options[(row.options.indexOf(settings[key]) + 1) % row.options.length];
  return { ...settings, [key]: next };
}

// The words on a row's button.
export function settingText(value) {
  if (value === true) {
    return 'On';
  }
  if (value === false) {
    return 'Off';
  }
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}
