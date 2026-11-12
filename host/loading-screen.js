// The loading screen: a title and a bar over a picture, while a game's files load (the shell, around the game's
// load()) or while a game builds something slow (the 3D race's course). Exported for the shell and the games.

// Relative, not /host/..., so the unit tests can load this file in Node.
import { showPicture } from './pictures.js';

// A bar nobody moves looks like a hang, so until the first real report it creeps on its own, slowing as it goes
// and never passing this.
const CREEP_LIMIT = 0.9;
// Time for the creep to cover about two thirds of the way to its limit.
const CREEP_MS = 3000;
const CREEP_TICK_MS = 100;

// Where the bar stands `elapsedMs` after showLoading() when nothing has reported progress yet.
export function creepFraction(elapsedMs) {
  return CREEP_LIMIT * (1 - Math.exp(-elapsedMs / CREEP_MS));
}

// Shows the screen with `title` over `picture` (a path, or null for the plain background). Returns
// { setProgress(fraction, label), hide() }: fraction 0..1 moves the bar (and stops the creep), label is the
// line under it ('Building the course'), left as it was when omitted.
export function showLoading({ title, picture }) {
  const screen = document.getElementById('loading-screen');
  const bar = document.getElementById('loading-bar');
  const label = document.getElementById('loading-label');
  document.getElementById('loading-title').textContent = title;
  label.textContent = '';
  showPicture(document.getElementById('loading-picture'), picture);
  const shownAt = performance.now();
  let creepTimer = setInterval(() => drawBar(creepFraction(performance.now() - shownAt)), CREEP_TICK_MS);

  function drawBar(fraction) {
    bar.style.width = `${Math.min(Math.max(fraction, 0), 1) * 100}%`;
  }

  function stopCreeping() {
    clearInterval(creepTimer);
    creepTimer = null;
  }

  drawBar(0);
  screen.hidden = false;

  return {
    setProgress(fraction, newLabel) {
      stopCreeping();
      drawBar(fraction);
      if (newLabel !== undefined) {
        label.textContent = newLabel;
      }
    },
    hide() {
      stopCreeping();
      screen.hidden = true;
    },
  };
}
