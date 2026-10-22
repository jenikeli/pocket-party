// M3 input lab scene, which stands in for the game until M5: a card per player with a live picture of their
// input plus its rate, round-trip time and jitter. Started by host/scenes/lobby-scene.js once all are ready.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES } from '/shared/protocol.js';
import { createRateMeter } from '/shared/rate-meter.js';
import { createRoundTripStats, createJitterMeter } from '/host/latency-stats.js';
import { drawJoinPanel } from '/host/join-panel.js';
import { drawConnectionLost } from '/host/connection-lost.js';
import { createPlayerCard } from '/host/player-card.js';
import { PLAYER_COLORS, displayName, colorText, secondsUntilFreed, formatMinutes } from '/host/roster.js';

// Once a second per player is plenty for a readout, and adds almost nothing to the input traffic.
const PING_INTERVAL_MS = 1000;
const STATS_REFRESH_MS = 250;

export class InputLabScene extends Phaser.Scene {
  constructor(room) {
    super('input-lab');
    this.room = room;
    // playerId -> { card, inputRate, roundTrips, jitter }: what this scene draws and measures per player.
    // Who the players are lives in this.room.players.
    this.views = new Map();
  }

  create() {
    this.joinPanel = drawJoinPanel(this);
    this.joinPanel.showRoom(this.room.roomCode);
    for (const player of this.room.players.values()) {
      this.addView(player);
    }
    this.room.setListener(this);
    // Plain setInterval, not Phaser's this.time: Phaser's clock is game time, which runs slow when frames
    // are slow (seen in headless Chromium at 13 fps), and these two must keep real time to measure it.
    const pingTimer = setInterval(() => this.pingPlayers(), PING_INTERVAL_MS);
    const statsTimer = setInterval(() => this.refreshStats(), STATS_REFRESH_MS);
    this.events.once('shutdown', () => {
      clearInterval(pingTimer);
      clearInterval(statsTimer);
    });
    this.refreshStats();
  }

  handleMessage(message, player) {
    const view = this.views.get(message.playerId);
    switch (message.type) {
      case MESSAGE_TYPES.PLAYER_JOINED:
        this.addView(player);
        break;
      case MESSAGE_TYPES.PLAYER_LEFT:
        this.removeView(message.playerId);
        break;
      case MESSAGE_TYPES.PLAYER_NAME:
        view?.card.showName(displayName(player));
        break;
      case MESSAGE_TYPES.INPUT:
        if (view) {
          this.applyInput(view, message);
        }
        break;
      case MESSAGE_TYPES.INPUT_MODE:
        view?.card.showMode(message.mode, message.fallbackFrom, message.reason);
        break;
      case MESSAGE_TYPES.DEVICE_INFO:
        view?.card.showDevice(player.device);
        break;
      case MESSAGE_TYPES.PONG:
        // sentAt is the performance.now() this host put in the PING, so the round trip needs no clock sync.
        view?.roundTrips.add(performance.now() - Number(message.sentAt));
        break;
      default:
        // Drops and rejoins are in the roster (host/room.js); refreshStats() shows them on the cards.
        break;
    }
    this.joinPanel.setPlayerCount(this.room.players.size, this.room.settings.maxPlayers);
  }

  handleConnectionLost() {
    drawConnectionLost(this);
  }

  applyInput(view, message) {
    view.inputRate.record(performance.now());
    if (Number.isFinite(message.sentAt)) {
      view.jitter.record(Date.now(), message.sentAt);
    }
    view.card.showInput(message.input ?? {});
  }

  // The PING travels host -> server -> controller and back, so this measures the whole path an input takes.
  // Disconnected players are skipped: the server has no socket to pass the ping to.
  pingPlayers() {
    for (const player of this.room.players.values()) {
      if (player.connected) {
        this.room.send({ type: MESSAGE_TYPES.PING, playerId: player.playerId, sentAt: performance.now() });
      }
    }
  }

  refreshStats() {
    const now = performance.now();
    for (const [playerId, view] of this.views) {
      const player = this.room.players.get(playerId);
      view.card.showWaiting(
        player.connected ? null : `${displayName(player)}\nwaiting to reconnect\n${formatMinutes(secondsUntilFreed(player, Date.now()))}`,
      );
      view.card.showStats({
        rate: view.inputRate.perSecond(now),
        roundTrip: view.roundTrips.summary(),
        jitter: view.jitter.spread(Date.now()),
      });
    }
  }

  // Cards sit by color slot, so a player keeps their card position across a drop and rejoin.
  addView(player) {
    const card = createPlayerCard(this, player.colorIndex, PLAYER_COLORS[player.colorIndex], colorText(player));
    card.showName(displayName(player));
    card.showDevice(player.device);
    this.views.set(player.playerId, {
      card,
      inputRate: createRateMeter(),
      roundTrips: createRoundTripStats(),
      jitter: createJitterMeter(),
    });
  }

  removeView(playerId) {
    this.views.get(playerId)?.card.destroy();
    this.views.delete(playerId);
  }
}
