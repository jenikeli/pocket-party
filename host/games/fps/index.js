// Saltline (fps): run the original standalone shooter directly in the host, as it worked before split-screen.
// Phones are optional and no setup or split-screen simulation is imposed on the game.

import { loadStylesheets } from '/host/kart/panel-parts.js';
import { createRenderer } from './renderer.js';

export function createGame() {
  let shell = null;
  let stage = null;
  let renderer = null;
  let stylesheets = [];

  async function load() {
    stylesheets = await loadStylesheets(['/host/games/fps/fps.css']);
  }

  function start(shellApi) {
    shell = shellApi;
    shell.setPlayerLimit(1);
    shell.setRoomOpen(true);
    stage = document.createElement('div');
    stage.className = 'pp-stage';
    shell.container.append(stage);
    renderer = createRenderer(stage);
  }

  function onMessage() {}

  function step() {}

  function render() {
    renderer?.draw({ match: null, viewers: [], alpha: 1 });
  }

  function onPlayerLeft() {}

  function isDone() {
    return false;
  }

  function stop() {
    stylesheets.forEach((link) => link.remove());
    stage?.remove();
    renderer?.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
