// The result card over the arena when a match is over: who won and why, the crowns, and Back to setup. HTML in the
// game's stage. Used by host/games/arena/index.js.

import { TEAM_NAMES } from './palette.js';
import { setText } from '/host/kart/panel-parts.js';

const REASONS = {
  keep: 'The Keep fell',
  crowns: 'Most crowns',
  overtime: 'Sudden death',
  tiebreak: 'Healthier towers',
  draw: 'Equal towers',
  forfeit: 'A team left',
};

// Adds the card to `stage`. `onBack()` runs on Back to setup. Returns { show(result) }; null hides it.
export function createResultPanel(stage, { onBack }) {
  const card = document.createElement('section');
  card.id = 'arena-result';
  card.className = 'ar-result';
  card.hidden = true;
  card.innerHTML = `
    <div class="pp-panel ar-result-panel">
      <h1 class="pp-title ar-result-title"></h1>
      <p class="ar-result-score"></p>
      <p class="pp-muted ar-result-reason"></p>
      <button type="button" class="pp-button pp-primary pp-big">Back to setup</button>
    </div>`;
  stage.append(card);
  card.querySelector('button').addEventListener('click', onBack);

  function show(result) {
    card.hidden = !result;
    if (!result) {
      return;
    }
    card.dataset.team = result.winner === null ? '' : String(result.winner);
    setText(card.querySelector('.ar-result-title'), result.winner === null ? 'Draw' : `${TEAM_NAMES[result.winner]} wins`);
    setText(card.querySelector('.ar-result-score'), `${result.crowns[0]} to ${result.crowns[1]} crowns`);
    setText(card.querySelector('.ar-result-reason'), REASONS[result.reason]);
  }

  return { show };
}
