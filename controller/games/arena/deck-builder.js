// The phone's deck builder: all 24 cards in a grid, tap to put one in or take it out of the 8, and Done once there
// are 8. Names and costs from shared/arena-cards.js. Used by setup-screen.js.

import { CARDS, DECK_SIZE } from '/shared/arena-cards.js';

const FACTION_COLORS = { cinder: '#e8552f', brook: '#35b6c9', thorn: '#5fae3b', cog: '#9aa6b5' };

// Builds the grid in `container` starting from the deck `start` (an array of ids). `onDone(deck)` gets the 8 ids.
// Returns { destroy() }.
export function createDeckBuilder(container, start, onDone) {
  const chosen = new Set(start);
  container.innerHTML = `
    <p id="ar-builder-count" class="pp-muted"></p>
    <div id="ar-builder-grid"></div>
    <button type="button" id="ar-builder-done" class="pp-button pp-primary pp-big">Done</button>`;
  const grid = container.querySelector('#ar-builder-grid');
  const count = container.querySelector('#ar-builder-count');
  const done = container.querySelector('#ar-builder-done');
  grid.innerHTML = CARDS.map((card) => `<button type="button" class="ar-tile" data-id="${card.id}" style="--ar-faction:${FACTION_COLORS[card.faction]}"><span class="ar-cost">${card.cost}</span><span class="ar-tile-name"></span></button>`).join('');
  grid.querySelectorAll('.ar-tile').forEach((tile) => {
    tile.querySelector('.ar-tile-name').textContent = CARDS.find((card) => card.id === tile.dataset.id).name;
  });

  function paint() {
    grid.querySelectorAll('.ar-tile').forEach((tile) => tile.setAttribute('aria-pressed', String(chosen.has(tile.dataset.id))));
    count.textContent = `${chosen.size} of ${DECK_SIZE} cards`;
    done.disabled = chosen.size !== DECK_SIZE;
  }

  grid.addEventListener('click', (event) => {
    const tile = event.target.closest('.ar-tile');
    if (!tile) {
      return;
    }
    if (chosen.has(tile.dataset.id)) {
      chosen.delete(tile.dataset.id);
    } else if (chosen.size < DECK_SIZE) {
      chosen.add(tile.dataset.id);
    }
    paint();
  });
  done.addEventListener('click', () => onDone([...chosen]));
  paint();
  return { destroy: () => container.replaceChildren() };
}
