// M3 input lab scene: creates a room, shows the join panel, and gives each joined player a card with a live
// picture of their input plus its rate, round-trip time and jitter. Started by host/main.js.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES } from '/shared/protocol.js';
import { openSocket } from '/shared/socket.js';
import { createRateMeter } from '/shared/rate-meter.js';
import { createRoundTripStats, createJitterMeter } from '/host/latency-stats.js';
import { drawJoinPanel } from '/host/join-panel.js';
import { createPlayerCard } from '/host/player-card.js';

const GAME_WIDTH = 1920;
const GAME_HEIGHT = 1080;
// One color per slot, in join order. MAX_PLAYERS in shared/protocol.js is 9, so 9 colors.
const PLAYER_COLORS = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22,
  0x1abc9c, 0xff79b0, 0xa3e048,
];
// Once a second per player is plenty for a readout, and adds almost nothing to the input traffic.
const PING_INTERVAL_MS = 1000;
const STATS_REFRESH_MS = 250;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

export class InputLabScene extends Phaser.Scene {
  constructor() {
    super('input-lab');
    // playerId -> { colorIndex, card, inputRate, roundTrips, jitter }
    this.players = new Map();
  }

  create() {
    this.joinPanel = drawJoinPanel(this);
    // Runs after preload, so the room code appears only once the page is fully loaded.
    this.socket = openSocket({
      onOpen: () => this.socket.send({ type: MESSAGE_TYPES.CREATE_ROOM }),
      onMessage: (message) => this.handleMessage(message),
      onClose: () => this.showConnectionLost(),
    });
    // Plain setInterval, not Phaser's this.time: Phaser's clock is game time, which runs slow when frames
    // are slow (seen in headless Chromium at 13 fps), and these two must keep real time to measure it.
    setInterval(() => this.pingPlayers(), PING_INTERVAL_MS);
    setInterval(() => this.refreshStats(), STATS_REFRESH_MS);
  }

  handleMessage(message) {
    const player = this.players.get(message.playerId);
    switch (message.type) {
      case MESSAGE_TYPES.ROOM_CREATED:
        this.joinPanel.showRoom(message.roomCode);
        this.joinPanel.setPlayerCount(this.players.size);
        break;
      case MESSAGE_TYPES.PLAYER_JOINED:
        this.addPlayer(message.playerId);
        break;
      case MESSAGE_TYPES.PLAYER_LEFT:
        this.removePlayer(message.playerId);
        break;
      case MESSAGE_TYPES.INPUT:
        if (player) {
          this.applyInput(player, message);
        }
        break;
      case MESSAGE_TYPES.INPUT_MODE:
        player?.card.showMode(message.mode, message.fallbackFrom, message.reason);
        break;
      case MESSAGE_TYPES.DEVICE_INFO:
        player?.card.showDevice(`${message.platform} ${message.browser}`);
        break;
      case MESSAGE_TYPES.PONG:
        // sentAt is the performance.now() this host put in the PING, so the round trip needs no clock sync.
        player?.roundTrips.add(performance.now() - Number(message.sentAt));
        break;
      case MESSAGE_TYPES.RELOAD:
        location.reload();
        break;
      default:
        console.warn('Host ignoring unexpected message:', message);
    }
  }

  applyInput(player, message) {
    player.inputRate.record(performance.now());
    if (Number.isFinite(message.sentAt)) {
      player.jitter.record(Date.now(), message.sentAt);
    }
    player.card.showInput(message.input ?? {});
  }

  // The PING travels host -> server -> controller and back, so this measures the whole path an input takes.
  pingPlayers() {
    for (const playerId of this.players.keys()) {
      this.socket.send({ type: MESSAGE_TYPES.PING, playerId, sentAt: performance.now() });
    }
  }

  refreshStats() {
    const now = performance.now();
    for (const player of this.players.values()) {
      player.card.showStats({
        rate: player.inputRate.perSecond(now),
        roundTrip: player.roundTrips.summary(),
        jitter: player.jitter.spread(Date.now()),
      });
    }
  }

  addPlayer(playerId) {
    const colorIndex = this.findFreeColorIndex();
    this.players.set(playerId, {
      colorIndex,
      card: createPlayerCard(this, colorIndex, PLAYER_COLORS[colorIndex]),
      inputRate: createRateMeter(),
      roundTrips: createRoundTripStats(),
      jitter: createJitterMeter(),
    });
    this.joinPanel.setPlayerCount(this.players.size);
  }

  removePlayer(playerId) {
    const player = this.players.get(playerId);
    if (!player) {
      return;
    }
    player.card.destroy();
    this.players.delete(playerId);
    this.joinPanel.setPlayerCount(this.players.size);
  }

  findFreeColorIndex() {
    const usedIndexes = new Set([...this.players.values()].map((player) => player.colorIndex));
    return PLAYER_COLORS.findIndex((color, index) => !usedIndexes.has(index));
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
