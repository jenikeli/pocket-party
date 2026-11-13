// The players as chips (colour dot and name), in slot order, with "back in 0:24" on a dropped player. Used by
// the lobby (where a click arms the chip, red, and a second click removes) and the join window (chips only).

import { displayName, colorText, playersInSlotOrder, secondsUntilFreed, formatMinutes } from '/host/roster.js';
import { confirmOnSecondClick } from '/shared/confirm-click.js';

// Fills `list` (an element) with one chip per player. With `onRemove(playerId)` the chips are buttons that
// remove a player on a confirmed click. Returns { show(players, now) }, called on every refresh: chips are
// kept and updated in place, not rebuilt, so a click or an armed chip survives the refresh between its clicks.
export function createPlayerChips(list, { onRemove } = {}) {
  // playerId -> { chip, name, status, confirm }.
  const chips = new Map();

  function makeChip(playerId) {
    const chip = document.createElement(onRemove ? 'button' : 'span');
    chip.className = 'pp-chip';
    chip.dataset.playerId = playerId;
    const dot = document.createElement('span');
    dot.className = 'pp-dot';
    const name = document.createElement('span');
    const status = document.createElement('span');
    status.className = 'pp-muted';
    chip.append(dot, name, status);
    const entry = { chip, dot, name, status, confirm: null };
    if (onRemove) {
      chip.type = 'button';
      entry.confirm = confirmOnSecondClick(chip, () => onRemove(playerId));
    }
    chips.set(playerId, entry);
    return entry;
  }

  function show(players, now) {
    for (const [playerId, entry] of chips) {
      if (!players.has(playerId)) {
        entry.confirm?.disarm();
        entry.chip.remove();
        chips.delete(playerId);
      }
    }
    // A chip is moved only when it is out of slot order, so one being clicked is not taken out of the page.
    playersInSlotOrder(players).forEach((player, index) => {
      const entry = chips.get(player.playerId) ?? makeChip(player.playerId);
      showPlayer(entry, player, now);
      if (list.children[index] !== entry.chip) {
        list.insertBefore(entry.chip, list.children[index] ?? null);
      }
    });
  }

  return { show };
}

// Names come from phones, so they only ever go in as text.
function showPlayer(entry, player, now) {
  entry.dot.style.setProperty('--pp-dot-color', colorText(player));
  entry.name.textContent = displayName(player);
  entry.chip.classList.toggle('away', !player.connected);
  if (!player.connected) {
    // A countdown, so everyone can see how long the slot is still held.
    entry.status.textContent = `back in ${formatMinutes(secondsUntilFreed(player, now))}`;
  } else {
    entry.status.textContent = '';
  }
}
