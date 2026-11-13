// What the 3D race shows over the canvas while karts race, in the host's look (host/ui.css): a small bar at the
// top (Back to setup, Restart and Tuning, which opens tuning-panel.js and the readout), the race clock top right (under the shell's gear),
// and the countdown in big letters in the middle. The setup screen is setup-panel.js's, the results
// results-panel.js's. Used by host/games/kart-3d/index.js, which owns the state; the bar only shows it and reports
// clicks. The top corners stay clear for the shell's top bar.

import { setText, setPressed } from '../../kart/panel-parts.js';
import { createRaceStage } from './race-stage.js';

// `onBackToSetup()`, `onRestart()` and `onTuning()` run on a click of those buttons. Returns { show(...), hide() }.
export function createRaceBar(container, { onBackToSetup, onRestart, onTuning }) {
  const stage = createRaceStage(container, 'k3d-race-stage');
  const bar = document.createElement('div');
  bar.id = 'kart-3d-race-bar';
  bar.className = 'pp-panel k3d-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <div class="k3d-bar-buttons">
      <button type="button" id="kart-3d-setup-button" class="pp-button">Back to setup</button>
      <button type="button" id="kart-3d-restart-button" class="pp-button">Restart</button>
      <button type="button" id="kart-3d-tuning-button" class="pp-button" aria-pressed="false">Tuning</button>
    </div>
    <p id="kart-3d-readout" class="pp-muted k3d-readout" hidden></p>`;
  const clock = createLine('kart-3d-clock', 'k3d-clock');
  const countdown = createLine('kart-3d-countdown', 'k3d-countdown');
  stage.append(bar, clock, countdown);
  const readout = bar.querySelector('#kart-3d-readout');
  const tuningButton = bar.querySelector('#kart-3d-tuning-button');
  bar.querySelector('#kart-3d-setup-button').addEventListener('click', onBackToSetup);
  bar.querySelector('#kart-3d-restart-button').addEventListener('click', onRestart);
  tuningButton.addEventListener('click', onTuning);

  // Passed every frame: `clockText` is the clock's lines ('' before GO and at the results), `countdownText` '3',
  // '2', '1', 'GO!' or '' once the karts are off, `readoutText` the readout's text (null leaves it as it is,
  // since it is rebuilt only a few times a second), `readoutShown` whether it shows (with the tuning panel, so
  // the Tuning button reads as pressed), and `barShown` whether the bar shows (not over the results, which have
  // their own buttons).
  function show({ clockText, countdownText, readoutText, readoutShown, barShown }) {
    bar.hidden = !barShown;
    clock.hidden = clockText === '';
    setText(clock, clockText);
    countdown.hidden = countdownText === '';
    setText(countdown, countdownText);
    readout.hidden = !readoutShown;
    setPressed(tuningButton, readoutShown);
    if (readoutText !== null) {
      setText(readout, readoutText);
    }
  }

  function hide() {
    for (const element of [bar, clock, countdown]) {
      element.hidden = true;
    }
  }

  return { show, hide };
}

function createLine(id, className) {
  const line = document.createElement('p');
  line.id = id;
  line.className = className;
  line.hidden = true;
  return line;
}
