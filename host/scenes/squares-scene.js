// M1 test scene: creates a room, shows its code and QR, and moves one colored square per joined player.
// Started by host/main.js. The host is the authority: positions live here, controllers only send stick values.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import { drawQrCode } from '/host/qr-code.js';

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
const PLAY_AREA_WIDTH = 1380; // the right-hand 540 px hold the join panel
const PANEL_CENTER_X = PLAY_AREA_WIDTH + 270;

const SQUARE_SIZE = 90;
const SQUARE_SPEED = 900; // px per second when the stick is pushed all the way
// One color per slot, in join order. MAX_PLAYERS in shared/protocol.js is 6, so 6 colors.
const PLAYER_COLORS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22];

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

export class SquaresScene extends Phaser.Scene {
  constructor() {
    super('squares');
    // playerId -> { colorIndex, square (Phaser container), stick: { x, y } }
    this.players = new Map();
  }

  create() {
    this.drawJoinPanel();
    // Runs after preload, so the room code appears only once the page is fully loaded.
    this.socket = openSocket({
      onOpen: () => this.socket.send({ type: MESSAGE_TYPES.CREATE_ROOM }),
      onMessage: (message) => this.handleMessage(message),
      onClose: () => this.showConnectionLost(),
    });
  }

  update(time, delta) {
    const seconds = delta / 1000;
    for (const player of this.players.values()) {
      const { square, stick } = player;
      square.x = clampToPlayArea(square.x + stick.x * SQUARE_SPEED * seconds, PLAY_AREA_WIDTH);
      square.y = clampToPlayArea(square.y + stick.y * SQUARE_SPEED * seconds, GAME_HEIGHT);
    }
  }

  handleMessage(message) {
    switch (message.type) {
      case MESSAGE_TYPES.ROOM_CREATED:
        this.showRoom(message.roomCode);
        break;
      case MESSAGE_TYPES.PLAYER_JOINED:
        this.addPlayer(message.playerId);
        break;
      case MESSAGE_TYPES.PLAYER_LEFT:
        this.removePlayer(message.playerId);
        break;
      case MESSAGE_TYPES.INPUT:
        this.applyInput(message.playerId, message.input);
        break;
      case MESSAGE_TYPES.RELOAD:
        location.reload();
        break;
      default:
        console.warn('Host ignoring unexpected message:', message);
    }
  }

  drawJoinPanel() {
    this.add.rectangle(PANEL_CENTER_X, GAME_HEIGHT / 2, 540, GAME_HEIGHT, 0x1c2130);
    this.add.text(PANEL_CENTER_X, 90, 'Scan to join', { ...TEXT_STYLE, fontSize: '48px' }).setOrigin(0.5);
    this.roomCodeText = this.add
      .text(PANEL_CENTER_X, 720, 'Connecting...', { ...TEXT_STYLE, fontSize: '56px' })
      .setOrigin(0.5);
    this.joinUrlText = this.add
      .text(PANEL_CENTER_X, 820, '', { ...TEXT_STYLE, fontSize: '26px', color: '#9aa4bf' })
      .setOrigin(0.5);
    this.playerCountText = this.add
      .text(PANEL_CENTER_X, 900, '', { ...TEXT_STYLE, fontSize: '32px' })
      .setOrigin(0.5);
  }

  showRoom(roomCode) {
    const joinUrl = `${location.origin}/?room=${roomCode}`;
    drawQrCode(this, joinUrl, PANEL_CENTER_X, 390, 420);
    this.roomCodeText.setText(roomCode).setFontSize(140).setLetterSpacing(12);
    this.joinUrlText.setText(joinUrl);
    this.updatePlayerCount();

    // The QR uses this page's own address. "localhost" only works on this machine, not on the phones.
    if (['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
      this.add
        .text(PANEL_CENTER_X, 990, 'Phones cannot reach "localhost".\nOpen /host using the LAN IP instead.', {
          ...TEXT_STYLE,
          fontSize: '24px',
          color: '#f39c12',
          align: 'center',
        })
        .setOrigin(0.5);
    }
  }

  addPlayer(playerId) {
    const colorIndex = this.findFreeColorIndex();
    // Start each square at its own spot so new players do not stack on top of each other.
    const x = 200 + colorIndex * 190;
    const y = GAME_HEIGHT / 2;
    const square = this.add.container(x, y, [
      this.add.rectangle(0, 0, SQUARE_SIZE, SQUARE_SIZE, PLAYER_COLORS[colorIndex]),
      this.add.text(0, 0, `P${colorIndex + 1}`, { ...TEXT_STYLE, fontSize: '36px' }).setOrigin(0.5),
    ]);
    this.players.set(playerId, { colorIndex, square, stick: { x: 0, y: 0 } });
    this.updatePlayerCount();
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }
    player.square.destroy();
    this.players.delete(playerId);
    this.updatePlayerCount();
  }

  // The square keeps moving at this stick value every frame until the next input arrives (release sends 0, 0).
  applyInput(playerId, input) {
    const player = this.players.get(playerId);
    if (!player || input?.kind !== 'drag') {
      console.warn('Host ignoring input:', playerId, input);
      return;
    }
    player.stick = { x: Number(input.x) || 0, y: Number(input.y) || 0 };
  }

  findFreeColorIndex() {
    const usedIndexes = new Set([...this.players.values()].map((player) => player.colorIndex));
    return PLAYER_COLORS.findIndex((color, index) => !usedIndexes.has(index));
  }

  updatePlayerCount() {
    this.playerCountText.setText(`Players: ${this.players.size}`);
  }

  showConnectionLost() {
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.75).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Lost connection to the server.\nReload this page.', {
        ...TEXT_STYLE,
        fontSize: '56px',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}

function clampToPlayArea(value, size) {
  const half = SQUARE_SIZE / 2;
  return Math.min(Math.max(value, half), size - half);
}
