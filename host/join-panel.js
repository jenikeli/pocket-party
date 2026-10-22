// The right-hand join panel on the host: QR code, room code, join link and player count.
// Used by host/scenes/input-lab-scene.js.

import { drawQrCode } from '/host/qr-code.js';

const GAME_HEIGHT = 1080;
export const PANEL_WIDTH = 540;
const PANEL_CENTER_X = 1920 - PANEL_WIDTH / 2;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

// Draws the empty panel. Returns { showRoom(roomCode), setPlayerCount(count) }.
export function drawJoinPanel(scene) {
  scene.add.rectangle(PANEL_CENTER_X, GAME_HEIGHT / 2, PANEL_WIDTH, GAME_HEIGHT, 0x1c2130);
  scene.add.text(PANEL_CENTER_X, 90, 'Scan to join', { ...TEXT_STYLE, fontSize: '48px' }).setOrigin(0.5);
  const roomCodeText = scene.add
    .text(PANEL_CENTER_X, 720, 'Connecting...', { ...TEXT_STYLE, fontSize: '56px' })
    .setOrigin(0.5);
  const joinUrlText = scene.add
    .text(PANEL_CENTER_X, 820, '', { ...TEXT_STYLE, fontSize: '26px', color: '#9aa4bf' })
    .setOrigin(0.5);
  const playerCountText = scene.add
    .text(PANEL_CENTER_X, 900, '', { ...TEXT_STYLE, fontSize: '32px' })
    .setOrigin(0.5);

  function showRoom(roomCode) {
    const joinUrl = `${location.origin}/?room=${roomCode}`;
    drawQrCode(scene, joinUrl, PANEL_CENTER_X, 390, 420);
    roomCodeText.setText(roomCode).setFontSize(140).setLetterSpacing(12);
    joinUrlText.setText(joinUrl);

    // The QR uses this page's own address. "localhost" only works on this machine, not on the phones.
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
      scene.add
        .text(PANEL_CENTER_X, 990, 'Phones cannot reach "localhost".\nOpen /host using the LAN IP instead.', {
          ...TEXT_STYLE,
          fontSize: '24px',
          color: '#f39c12',
          align: 'center',
        })
        .setOrigin(0.5);
    }
  }

  function setPlayerCount(count) {
    playerCountText.setText(`Players: ${count}`);
  }

  return { showRoom, setPlayerCount };
}
