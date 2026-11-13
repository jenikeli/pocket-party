// What the 3D race shows over the canvas while karts race: a small bar at the top (Back to setup, Restart and
// Tuning, which opens tuning-panel.js and the readout), the race clock top right, and the countdown in big
// letters in the middle. The setup screen is setup-panel.js's, the results results-panel.js's. Used by
// host/games/kart-3d/index.js, which owns the state; the bar only shows it and reports clicks. The bottom right
// stays clear for the shell's game bar.

import { setText } from '/host/kart/panel-parts.js';

const STYLE = `
  #kart-3d-race-bar { position: fixed; left: 50%; top: 8px; transform: translateX(-50%); display: flex; gap: 12px;
    align-items: flex-start; padding: 8px 12px; border-radius: 10px; background: rgba(16, 19, 28, 0.75);
    color: #ffffff; font: 14px sans-serif; }
  #kart-3d-race-bar p { margin: 0; white-space: pre-line; }
  #kart-3d-clock { position: fixed; right: 12px; top: 8px; margin: 0; color: #ffffff; text-align: right;
    font: bold 28px sans-serif; text-shadow: 0 2px 0 #000000; pointer-events: none; white-space: pre-line; }
  #kart-3d-countdown { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); margin: 0;
    color: #ffd84a; font: bold 160px sans-serif; text-shadow: 0 6px 0 #a3471b, 0 0 24px rgba(0, 0, 0, 0.6);
    pointer-events: none; }
  #kart-3d-race-bar button { font: 16px sans-serif; padding: 8px 12px; border: none; border-radius: 8px;
    background: #2a3145; color: #ffffff; cursor: pointer; }
`;

// `onBackToSetup()`, `onRestart()` and `onTuning()` run on a click of those buttons. Returns { show(...), hide() }.
export function createRaceBar(container, { onBackToSetup, onRestart, onTuning }) {
  const style = document.createElement('style');
  style.textContent = STYLE;
  const bar = document.createElement('div');
  bar.id = 'kart-3d-race-bar';
  bar.hidden = true;
  bar.innerHTML = `
    <button type="button" id="kart-3d-setup-button">Back to setup</button>
    <button type="button" id="kart-3d-restart-button">Restart</button>
    <button type="button" id="kart-3d-tuning-button">Tuning</button>
    <p id="kart-3d-readout" hidden></p>`;
  const clock = createLine('kart-3d-clock');
  const countdown = createLine('kart-3d-countdown');
  container.append(style, bar, clock, countdown);
  const readout = bar.querySelector('#kart-3d-readout');
  bar.querySelector('#kart-3d-setup-button').addEventListener('click', onBackToSetup);
  bar.querySelector('#kart-3d-restart-button').addEventListener('click', onRestart);
  bar.querySelector('#kart-3d-tuning-button').addEventListener('click', onTuning);

  // Passed every frame: `clockText` is the clock's lines ('' before GO and at the results), `countdownText` '3',
  // '2', '1', 'GO!' or '' once the karts are off, `readoutText` the readout's text (null leaves it as it is,
  // since it is rebuilt only a few times a second), `readoutShown` whether it shows (with the tuning panel),
  // and `barShown` whether the bar shows (not over the results, which have their own buttons).
  function show({ clockText, countdownText, readoutText, readoutShown, barShown }) {
    bar.hidden = !barShown;
    clock.hidden = clockText === '';
    setText(clock, clockText);
    countdown.hidden = countdownText === '';
    setText(countdown, countdownText);
    readout.hidden = !readoutShown;
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

function createLine(id) {
  const line = document.createElement('p');
  line.id = id;
  line.hidden = true;
  return line;
}
