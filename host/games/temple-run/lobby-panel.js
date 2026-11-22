// The temple run's settings page, an HTML panel over the idle causeway: who is here (colour chips with a tick when
// ready), a card per setting with an icon, a hint and one pill per option (click a pill to choose it), the last
// result, and Start now. Rebuilt only when what it shows changes. Used by renderer.js.

import { SETTING_ROWS, settingText } from './settings.js';
import { PLAYER_COLORS } from '/host/roster.js';
import { templeIcon } from '/shared/temple-icons.js';

function element(tag, css, content, parent) {
  const created = document.createElement(tag);
  created.style.cssText = css;
  created.textContent = content ?? '';
  parent?.append(created);
  return created;
}

const PILL = 'padding:0.8vmin 1.8vmin;font-size:2.3vmin;font-weight:700;border-radius:99px;cursor:pointer;border:1px solid #343d57;';

// `handlers` is { onSet(settingKey, value), onStart() }. Returns { update(model), hide() } where model is
// { settings, players: [{ name, colorIndex, ready }], result }.
export function createLobbyPanel(overlay, handlers) {
  const panel = element(
    'div',
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);pointer-events:auto;width:min(76vw,64em);max-height:86vh;overflow:auto;box-sizing:border-box;' +
      'background:linear-gradient(180deg,rgba(24,30,44,0.95),rgba(14,18,28,0.95));border:1px solid #343d57;border-radius:2vmin;padding:2.6vmin 3.4vmin;' +
      'color:#fff;font-family:sans-serif;box-shadow:0 2vmin 6vmin rgba(0,0,0,0.5);',
    '',
    overlay,
  );
  let shownKey = '';

  function addHeader(model) {
    const title = element('div', 'display:flex;align-items:center;gap:1.4vmin;font-size:5.4vmin;font-weight:800;', '', panel);
    title.innerHTML = `<span style="color:#f39c12;display:flex">${templeIcon('monkey')}</span>`;
    title.append(document.createTextNode('Temple Chase'));
    const subtitle = element('div', 'font-size:2.3vmin;color:#9aa4bf;margin:0.6vmin 0 1.6vmin;', '', panel);
    subtitle.textContent = model.result
      ? `Last round: ${model.result.meters} m, ${model.result.coins} coins, ${model.result.seconds} s`
      : 'One monkey chases. Everyone else runs. Swipe on your phone.';
  }

  function addPlayers(model) {
    const row = element('div', 'display:flex;flex-wrap:wrap;gap:1vmin;margin-bottom:1.8vmin;', '', panel);
    if (model.players.length === 0) {
      element('div', 'font-size:2.3vmin;color:#d8dff0;', 'Waiting for players: scan the code, or tap Add players', row);
    }
    for (const player of model.players) {
      const chip = element('div', `display:flex;align-items:center;gap:0.8vmin;padding:0.7vmin 1.6vmin;border-radius:99px;font-size:2.3vmin;font-weight:700;background:#2a3145;border:2px solid ${player.ready ? '#2ecc71' : '#343d57'};`, '', row);
      const dot = element('span', `width:1.8vmin;height:1.8vmin;border-radius:50%;background:#${PLAYER_COLORS[player.colorIndex].toString(16).padStart(6, '0')};`, '', chip);
      dot.setAttribute('aria-hidden', 'true');
      chip.append(document.createTextNode(player.name));
      if (player.ready) {
        const tick = element('span', 'color:#2ecc71;display:flex;', '', chip);
        tick.innerHTML = templeIcon('ready');
      }
    }
  }

  function addSettings(model) {
    for (const row of SETTING_ROWS) {
      const card = element('div', 'display:flex;align-items:center;gap:2vmin;padding:1.2vmin 0;border-top:1px solid #2a3145;', '', panel);
      const badge = element('div', 'width:5.4vmin;height:5.4vmin;border-radius:1.4vmin;background:#2a3145;color:#f39c12;display:flex;align-items:center;justify-content:center;font-size:3.2vmin;flex:none;', '', card);
      badge.innerHTML = templeIcon(row.icon);
      const words = element('div', 'flex:1;min-width:0;', '', card);
      element('div', 'font-size:2.7vmin;font-weight:700;', row.label, words);
      element('div', 'font-size:1.8vmin;color:#9aa4bf;', row.hint, words);
      const pills = element('div', 'display:flex;gap:0.8vmin;flex-wrap:wrap;justify-content:flex-end;', '', card);
      for (const option of row.options) {
        const chosen = option === model.settings[row.key];
        const pill = element('button', `${PILL}${chosen ? 'background:#f39c12;color:#1c2130;border-color:#f39c12;' : 'background:#1c2130;color:#d8dff0;'}`, settingText(option), pills);
        pill.setAttribute('aria-pressed', String(chosen));
        pill.addEventListener('click', () => handlers.onSet(row.key, option));
      }
    }
  }

  function addFooter() {
    const actions = element('div', 'display:flex;justify-content:space-between;align-items:center;margin-top:2vmin;gap:2vmin;', '', panel);
    element('div', 'font-size:2vmin;color:#9aa4bf;', 'Everyone taps Ready on their phone, or press Start now.', actions);
    const start = element(
      'button',
      'display:flex;align-items:center;gap:1vmin;padding:1.5vmin 3.4vmin;font-size:3.2vmin;font-weight:800;color:#1c2130;background:#f39c12;border:0;border-radius:99px;cursor:pointer;',
      '',
      actions,
    );
    start.innerHTML = `${templeIcon('runner')}<span>Start now</span>`;
    start.addEventListener('click', () => handlers.onStart());
  }

  function update(model) {
    panel.style.display = 'block';
    const key = JSON.stringify([model.settings, model.players.map((player) => [player.name, player.ready, player.colorIndex]), model.result]);
    if (key === shownKey) {
      return;
    }
    shownKey = key;
    panel.replaceChildren();
    addHeader(model);
    addPlayers(model);
    addSettings(model);
    addFooter();
  }

  return { update, hide: () => (panel.style.display = 'none') };
}
