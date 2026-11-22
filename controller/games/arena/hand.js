// The four cards in a player's hand on the phone, and the card coming next. A card is pressed and dragged: this
// reports the press, every move and the release (with whether it was only a tap); match-screen.js decides what that
// means. Names and costs come from shared/arena-cards.js. Used by match-screen.js.

import { cardById } from '/shared/arena-cards.js';

const FACTION_COLORS = { cinder: '#e8552f', brook: '#35b6c9', thorn: '#5fae3b', cog: '#9aa6b5' };
const TAP_DISTANCE_PX = 10;

function cardMarkup(id, slot) {
  const card = cardById(id);
  return `<button type="button" class="ar-card" data-slot="${slot}" style="--ar-faction:${FACTION_COLORS[card.faction]}">
    <span class="ar-cost">${card.cost}</span><span class="ar-card-name"></span></button>`;
}

// `handlers` is { onPick(slot), onMove(x, y), onRelease(x, y, wasTap) } with client coordinates.
export function createHand(container, handlers) {
  container.innerHTML = '<div class="ar-next"><span class="ar-next-label">Next</span><span class="ar-next-name"></span></div><div class="ar-cards"></div>';
  const cards = container.querySelector('.ar-cards');
  const nextName = container.querySelector('.ar-next-name');
  let shownHand = '';
  let drag = null;

  cards.addEventListener('pointerdown', (event) => {
    const button = event.target.closest('.ar-card');
    if (!button || drag) {
      return;
    }
    drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
    button.setPointerCapture(event.pointerId);
    handlers.onPick(Number(button.dataset.slot));
  });
  cards.addEventListener('pointermove', (event) => {
    if (drag && event.pointerId === drag.pointerId) {
      drag.moved = drag.moved || Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > TAP_DISTANCE_PX;
      handlers.onMove(event.clientX, event.clientY);
    }
  });
  const release = (event) => {
    if (drag && event.pointerId === drag.pointerId) {
      handlers.onRelease(event.clientX, event.clientY, !drag.moved);
      drag = null;
    }
  };
  cards.addEventListener('pointerup', release);
  cards.addEventListener('pointercancel', release);

  // Names go in as text. `selected` is the held or tapped slot, `elixir` the current whole elixir.
  function show(view, elixir) {
    const key = view.hand.join();
    if (key !== shownHand) {
      shownHand = key;
      cards.innerHTML = view.hand.map(cardMarkup).join('');
      cards.querySelectorAll('.ar-card').forEach((button, slot) => {
        button.querySelector('.ar-card-name').textContent = cardById(view.hand[slot]).name;
      });
    }
    nextName.textContent = cardById(view.next).name;
    cards.querySelectorAll('.ar-card').forEach((button, slot) => {
      button.classList.toggle('ar-poor', view.cost[slot] > elixir);
      button.classList.toggle('ar-selected', view.selected === slot);
    });
  }

  return { show };
}
