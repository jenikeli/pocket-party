// The 2D race's results, drawn over the track when the race is over: places, names and finish times, and the
// "Race again" and "Back to lobby" buttons. Used by host/games/kart-2d/renderer.js.

import { drawButton } from '/host/buttons.js';
import { standingRows } from './race-views.js';
import { formatRaceTime } from '/host/kart/race-time.js';
import { ordinal } from '/shared/ordinal.js';
import { displayName, colorText } from '/host/roster.js';

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };
// Above the karts and the live readout.
const DEPTH = 2;
const FIRST_ROW_Y = 260;
const ROW_HEIGHT = 58;
// Button centres at 1:1 scale; the browser tests click them.
export const RACE_AGAIN_BUTTON = { x: 760, y: 880 };
export const BACK_TO_LOBBY_BUTTON = { x: 1160, y: 880 };

// Returns { show(race, players), hide() }. `onRaceAgain()` and `onBackToLobby()` run on a click.
export function createResultsPanel(scene, { onRaceAgain, onBackToLobby }) {
  // Dims the whole track and catches clicks, so nothing behind the panel reacts.
  const shade = scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.6).setInteractive();
  const panel = scene.add.rectangle(960, 540, 1000, 820, 0x1c2130).setStrokeStyle(4, 0x3a4258);
  const title = scene.add.text(960, 180, 'Results', { ...TEXT_STYLE, fontSize: '64px', fontStyle: 'bold' }).setOrigin(0.5);
  const raceAgain = drawButton(scene, RACE_AGAIN_BUTTON.x, RACE_AGAIN_BUTTON.y, {
    width: 340,
    height: 90,
    label: 'Race again',
    onClick: onRaceAgain,
  });
  const backToLobby = drawButton(scene, BACK_TO_LOBBY_BUTTON.x, BACK_TO_LOBBY_BUTTON.y, {
    width: 340,
    height: 90,
    label: 'Back to lobby',
    onClick: onBackToLobby,
  });
  const fixedObjects = [shade, panel, title, ...raceAgain.objects, ...backToLobby.objects];
  // The rows are drawn fresh for each race's results.
  let rowObjects = [];

  function show(race, players) {
    destroyRows();
    standingRows(race).forEach((standing, index) => {
      const player = players.get(standing.playerId);
      if (player) {
        rowObjects.push(...drawRow(scene, FIRST_ROW_Y + index * ROW_HEIGHT, standing, player));
      }
    });
    setVisible(true);
  }

  function hide() {
    destroyRows();
    setVisible(false);
  }

  function destroyRows() {
    for (const object of rowObjects) {
      object.destroy();
    }
    rowObjects = [];
  }

  function setVisible(visible) {
    for (const object of [...fixedObjects, ...rowObjects]) {
      object.setVisible(visible).setDepth(DEPTH);
    }
  }

  hide();
  return { show, hide };
}

function drawRow(scene, y, standing, player) {
  const time = standing.finishTime === null ? 'Did not finish' : formatRaceTime(standing.finishTime);
  return [
    scene.add.text(560, y, ordinal(standing.place), { ...TEXT_STYLE, fontSize: '38px', color: '#9aa4bf' }).setOrigin(0, 0.5),
    scene.add
      .text(680, y, displayName(player), { ...TEXT_STYLE, fontSize: '38px', fontStyle: 'bold', color: colorText(player) })
      .setOrigin(0, 0.5),
    scene.add.text(1360, y, time, { ...TEXT_STYLE, fontSize: '38px' }).setOrigin(1, 0.5),
  ];
}
