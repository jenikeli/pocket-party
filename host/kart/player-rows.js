// The player rows of both kart races' setup screens: colour dot, name, how they drive in words
// ("Tilt · Auto · Left-handed"), a tick and "Ready" when ready, and a cross that removes them on its second
// click. A dropped player is dimmed, with "back in 0:24" in place of the words. Styled by host/kart/panels.css.
// Used by host/games/kart-2d/setup-panel.js and host/games/kart-3d/setup-panel.js.

import { icon } from '/shared/icons.js';
import { confirmOnSecondClick } from '/shared/confirm-click.js';
import { displayName, colorText, secondsUntilFreed, formatMinutes } from '/host/roster.js';
import { styleWords } from '/host/kart/setup-rows.js';
import { setText } from '/host/kart/panel-parts.js';

// Fills `list` (a <ul>) with one row per player. `onRemove(playerId)` runs when a row's cross is confirmed (the
// shell's removePlayer). Returns { show(rows) }, called every frame with setupRows' result: rows are kept and
// updated in place, so a cross armed by its first click is still armed when its second one comes.
export function createPlayerRows(list, { onRemove }) {
  // playerId -> the row's parts, from makeEntry.
  const entries = new Map();

  function makeEntry(playerId) {
    const row = document.createElement('li');
    row.className = 'kart-player-row';
    row.dataset.playerId = playerId;
    const dot = document.createElement('span');
    dot.className = 'pp-dot';
    const name = document.createElement('span');
    name.className = 'kart-player-name';
    const style = document.createElement('span');
    style.className = 'kart-player-style';
    const tick = document.createElement('span');
    tick.className = 'kart-player-tick';
    tick.innerHTML = `${icon('check')}<span>Ready</span>`;
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'pp-icon-button kart-remove-button';
    removeButton.dataset.removePlayer = playerId;
    removeButton.innerHTML = icon('close');
    const confirm = confirmOnSecondClick(removeButton, () => onRemove(playerId));
    row.append(dot, name, style, tick, removeButton);
    const entry = { row, dot, name, style, removeButton, confirm };
    entries.set(playerId, entry);
    return entry;
  }

  function show(rows) {
    const playerIds = new Set(rows.map((rowInfo) => rowInfo.player.playerId));
    for (const [playerId, entry] of entries) {
      if (!playerIds.has(playerId)) {
        entry.confirm.disarm();
        entry.row.remove();
        entries.delete(playerId);
      }
    }
    // A row is moved only when it is out of slot order, so one being clicked is not taken out of the page.
    rows.forEach((rowInfo, index) => {
      const entry = entries.get(rowInfo.player.playerId) ?? makeEntry(rowInfo.player.playerId);
      showRow(entry, rowInfo);
      if (list.children[index] !== entry.row) {
        list.insertBefore(entry.row, list.children[index] ?? null);
      }
    });
  }

  return { show };
}

// Names come from phones, so they only ever go in as text (and as an attribute value, never as markup).
function showRow(entry, { player, steering, autoAccelerate, leftHanded, ready, away }) {
  const color = colorText(player);
  if (entry.dot.style.getPropertyValue('--pp-dot-color') !== color) {
    entry.dot.style.setProperty('--pp-dot-color', color);
  }
  setText(entry.name, displayName(player));
  entry.row.classList.toggle('ready', ready);
  entry.row.classList.toggle('away', away);
  showStyle(entry, { player, steering, autoAccelerate, leftHanded, away });
  const removeLabel = `Remove ${displayName(player)}`;
  if (entry.removeButton.getAttribute('aria-label') !== removeLabel) {
    entry.removeButton.setAttribute('aria-label', removeLabel);
    entry.removeButton.title = removeLabel;
  }
}

// How the player drives, or for a dropped player the time their slot is held. setText writes only when the text
// changes, since this runs every frame.
function showStyle(entry, { player, steering, autoAccelerate, leftHanded, away }) {
  const words = away
    ? `back in ${formatMinutes(secondsUntilFreed(player, Date.now()))}`
    : styleWords({ steering, autoAccelerate, leftHanded });
  setText(entry.style, words);
}
