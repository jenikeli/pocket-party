// The lobby's list of players on the host: a color dot, the name, ready / not ready / waiting to reconnect,
// and a Remove button. Used by host/scenes/lobby-scene.js.

import { MAX_PLAYERS } from '/shared/protocol.js';
import { PLAYER_COLORS, displayName, playersInSlotOrder, secondsUntilFreed, formatMinutes } from '/host/roster.js';
import { drawConfirmButton } from '/host/buttons.js';

// Row i's dot is centered at (DOT_X, FIRST_ROW_Y + i * ROW_HEIGHT).
export const DOT_X = 110;
export const FIRST_ROW_Y = 230;
export const ROW_HEIGHT = 72;
const DOT_RADIUS = 22;
const NAME_X = 155;
const STATUS_X = 620;
export const REMOVE_BUTTON_X = 1190;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };
const READY_COLOR = '#2ecc71';
const DIM_COLOR = '#9aa4bf';
const WARNING_COLOR = '#f39c12';

// Draws MAX_PLAYERS empty rows. `onRemove(playerId)` runs when the host confirms a Remove button.
// Returns { show(players, now) }, which fills the rows in slot order.
export function drawPlayerList(scene, { onRemove }) {
  const rows = [];
  for (let i = 0; i < MAX_PLAYERS; i += 1) {
    const y = FIRST_ROW_Y + i * ROW_HEIGHT;
    const row = {
      // Which player the row shows right now; rows are reused as players come and go.
      playerId: null,
      dot: scene.add.circle(DOT_X, y, DOT_RADIUS, 0xffffff),
      name: scene.add.text(NAME_X, y, '', { ...TEXT_STYLE, fontSize: '40px' }).setOrigin(0, 0.5),
      status: scene.add.text(STATUS_X, y, '', { ...TEXT_STYLE, fontSize: '32px' }).setOrigin(0, 0.5),
    };
    row.removeButton = drawConfirmButton(scene, REMOVE_BUTTON_X, y, {
      width: 170,
      height: 56,
      fontSize: 28,
      label: 'Remove',
      onConfirm: () => onRemove(row.playerId),
    });
    rows.push(row);
  }
  const emptyText = scene.add
    .text(NAME_X, FIRST_ROW_Y, 'Scan the code to join', { ...TEXT_STYLE, fontSize: '40px', color: DIM_COLOR })
    .setOrigin(0, 0.5);

  function show(players, now) {
    const ordered = playersInSlotOrder(players);
    emptyText.setVisible(ordered.length === 0);
    rows.forEach((row, index) => {
      const player = ordered[index];
      row.playerId = player?.playerId ?? null;
      row.dot.setVisible(Boolean(player));
      row.name.setVisible(Boolean(player));
      row.status.setVisible(Boolean(player));
      row.removeButton.setVisible(Boolean(player));
      if (player) {
        showPlayer(row, player, now);
      }
    });
  }

  return { show };
}

function showPlayer(row, player, now) {
  row.dot.setFillStyle(PLAYER_COLORS[player.colorIndex]);
  row.name.setText(displayName(player));
  if (!player.connected) {
    // Shown as a countdown so everyone can see how long the slot is still held.
    const timeLeft = formatMinutes(secondsUntilFreed(player, now));
    row.status.setText(`waiting to reconnect (${timeLeft})`).setColor(WARNING_COLOR);
    row.dot.setAlpha(0.35);
  } else {
    row.status.setText(player.ready ? 'ready' : 'not ready').setColor(player.ready ? READY_COLOR : DIM_COLOR);
    row.dot.setAlpha(1);
  }
}
