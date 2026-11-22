// The phone on Spirefall's setup screen: a Dawn or Dusk switch, a deck (a faction preset or your own 8 cards), a big
// Ready button and who is ready. Used by index.js.

import { MESSAGE_TYPES, INPUT_KINDS, ARENA_CHOICES, ARENA_TEAMS } from '/shared/protocol.js';
import { PRESET_DECKS } from '/shared/arena-cards.js';
import { createDeckBuilder } from './deck-builder.js';

const PRESET_LABELS = { cinder: 'Cinder', brook: 'Brook', thorn: 'Thorn', cog: 'Cog' };

// Built from constants only; text from the host goes in through textContent.
const MARKUP = `
  <div id="ar-screen">
    <h1 id="ar-title" class="pp-title">Spirefall</h1>
    <p id="ar-mode" class="pp-muted"></p>
    <div id="ar-teams" role="group" aria-label="Team">
      <button type="button" class="pp-button" data-team="${ARENA_TEAMS.DAWN}">Dawn</button>
      <button type="button" class="pp-button" data-team="${ARENA_TEAMS.DUSK}">Dusk</button>
    </div>
    <p class="ar-label pp-muted">Deck</p>
    <div id="ar-decks" role="group" aria-label="Deck">
      ${Object.keys(PRESET_DECKS).map((key) => `<button type="button" class="pp-button" data-preset="${key}">${PRESET_LABELS[key]}</button>`).join('')}
      <button type="button" class="pp-button" data-preset="custom">Build</button>
    </div>
    <p id="ar-mate" class="pp-muted"></p>
    <button type="button" id="ar-ready" class="pp-button pp-primary pp-big"></button>
    <p id="ar-status" class="pp-muted"></p>
    <div id="ar-builder" hidden></div>
  </div>`;

// Builds the screen in `container`. `send(message)` sends to the server. Returns { show(view), unmount() }.
export function mountSetupScreen(container, send) {
  container.innerHTML = MARKUP;
  const byId = (id) => container.querySelector(`#${id}`);
  const [screen, mode, teams, decks, mate, ready, status, builder] = ['ar-screen', 'ar-mode', 'ar-teams', 'ar-decks', 'ar-mate', 'ar-ready', 'ar-status', 'ar-builder'].map(byId);
  let view = null;
  let building = null;

  function sendChoice(choice, value) {
    send({ type: MESSAGE_TYPES.INPUT, input: { kind: INPUT_KINDS.CHOICE, choice, value }, sentAt: Date.now() });
  }

  teams.addEventListener('click', (event) => {
    const button = event.target.closest('[data-team]');
    if (button) {
      sendChoice(ARENA_CHOICES.TEAM, Number(button.dataset.team));
    }
  });
  ready.addEventListener('click', () => sendChoice(ARENA_CHOICES.READY, !view.ready));
  decks.addEventListener('click', (event) => {
    const button = event.target.closest('[data-preset]');
    if (!button) {
      return;
    }
    if (button.dataset.preset !== 'custom') {
      sendChoice(ARENA_CHOICES.DECK, PRESET_DECKS[button.dataset.preset]);
      return;
    }
    building = createDeckBuilder(builder, view.deck ?? PRESET_DECKS.cinder, (deck) => {
      sendChoice(ARENA_CHOICES.DECK, deck);
      building.destroy();
      building = null;
      builder.hidden = true;
    });
    builder.hidden = false;
  });

  function presetOf(deck) {
    const key = Object.keys(PRESET_DECKS).find((name) => deck && PRESET_DECKS[name].join() === deck.join());
    return deck ? (key ?? 'custom') : null;
  }

  function show(newView) {
    view = newView;
    const seated = view.phase === 'setup';
    teams.hidden = !seated;
    decks.hidden = !seated;
    ready.hidden = !seated;
    mode.textContent = view.mode;
    if (!seated) {
      screen.dataset.team = '';
      mate.textContent = '';
      status.textContent = 'Every seat is taken. Ask the host to switch to 2v2, or wait.';
      return;
    }
    screen.dataset.team = String(view.team);
    for (const button of teams.children) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.team) === view.team));
    }
    for (const button of decks.children) {
      button.setAttribute('aria-pressed', String(button.dataset.preset === presetOf(view.deck)));
    }
    mate.textContent = view.mate ? `With ${view.mate}` : (view.mode === '2v2' ? 'A CPU is your partner' : '');
    ready.textContent = view.ready ? 'Ready. Tap to undo' : 'Ready';
    ready.classList.toggle('ar-is-ready', view.ready);
    status.textContent = `${view.readyCount} of ${view.peopleCount} ready`;
  }

  return { show, unmount: () => building?.destroy() };
}
