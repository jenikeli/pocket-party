// What the 3D race shows while karts race, in the host's look (host/ui.css): its three buttons (Setup, Restart and
// Tuning, which opens tuning-panel.js) and the race clock, which sit in the shell's bottom strip (bar.slot, see
// host/game-session.js), and the countdown in big letters in the middle of the views. The setup screen is
// setup-panel.js's, the results results-panel.js's. Used by host/games/kart-3d/index.js, which owns the state; the
// bar only shows it and reports clicks.

import { setText, setPressed } from '../../kart/panel-parts.js';
import { createRaceStage } from './race-stage.js';

// `slot` is the shell's bar.slot, where the buttons and the clock go. `onBackToSetup()`, `onRestart()` and
// `onTuning()` run on a click of those buttons. Returns { show(...), hide(), remove() }.
export function createRaceBar(container, slot, { onBackToSetup, onRestart, onTuning }) {
  // Over the views, which end where the strip starts (race-panels.css).
  const stage = createRaceStage(container, 'k3d-race-stage k3d-above-strip');
  const bar = document.createElement('div');
  bar.id = 'kart-3d-race-bar';
  bar.className = 'k3d-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <button type="button" id="kart-3d-setup-button" class="pp-button">Setup</button>
    <button type="button" id="kart-3d-restart-button" class="pp-button">Restart</button>
    <button type="button" id="kart-3d-tuning-button" class="pp-button" aria-pressed="false">Tuning</button>`;
  // The clock is last in the bar, pushed to the right edge of the slot (race-panels.css).
  const clock = createLine('kart-3d-clock', 'k3d-clock');
  bar.append(clock);
  const countdown = createLine('kart-3d-countdown', 'k3d-countdown');
  slot.append(bar);
  stage.append(countdown);
  const tuningButton = bar.querySelector('#kart-3d-tuning-button');
  bar.querySelector('#kart-3d-setup-button').addEventListener('click', onBackToSetup);
  bar.querySelector('#kart-3d-restart-button').addEventListener('click', onRestart);
  tuningButton.addEventListener('click', onTuning);

  // Passed every frame: `clockText` is the clock's lines ('' before GO and at the results), `countdownText` '3',
  // '2', '1', 'GO!' or '' once the karts are off, `tuningOpen` whether the tuning popup is open (the Tuning button
  // reads as pressed), and `barShown` whether the buttons show (not over the results, which have their own).
  function show({ clockText, countdownText, tuningOpen, barShown }) {
    bar.hidden = !barShown;
    clock.hidden = clockText === '';
    setText(clock, clockText);
    countdown.hidden = countdownText === '';
    setText(countdown, countdownText);
    setPressed(tuningButton, tuningOpen);
  }

  function hide() {
    for (const element of [bar, countdown]) {
      element.hidden = true;
    }
  }

  // The buttons are in the shell's slot, which outlives this bar's stage, so the game takes them out itself.
  function remove() {
    bar.remove();
  }

  return { show, hide, remove };
}

function createLine(id, className) {
  const line = document.createElement('p');
  line.id = id;
  line.className = className;
  line.hidden = true;
  return line;
}
