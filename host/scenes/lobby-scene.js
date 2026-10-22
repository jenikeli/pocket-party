// The lobby: creates the room, shows the join panel, the players with their ready state, and the game
// settings, and starts the game (for now the input lab) once everyone is ready. First scene in host/main.js.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { drawJoinPanel } from '/host/join-panel.js';
import { drawPlayerList } from '/host/lobby-player-list.js';
import { drawSettingsPanel } from '/host/settings-panel.js';
import { drawConnectionLost } from '/host/connection-lost.js';
import { stepMaxPlayers, stepGraceSeconds, canStartGame, describeWaitingFor } from '/host/lobby-rules.js';

// A short countdown once everyone is ready, so a player who tapped "ready" by mistake can still back out.
const START_COUNTDOWN_MS = 3000;
// Often enough for the countdowns on screen to tick smoothly.
const REFRESH_MS = 250;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

export class LobbyScene extends Phaser.Scene {
  constructor(room) {
    super('lobby');
    this.room = room;
    // Date.now() time the game starts, while the start countdown runs; null otherwise.
    this.startsAt = null;
  }

  create() {
    this.joinPanel = drawJoinPanel(this);
    this.add.text(80, 60, 'Lobby', { ...TEXT_STYLE, fontSize: '64px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.statusText = this.add.text(80, 140, '', { ...TEXT_STYLE, fontSize: '36px' }).setOrigin(0, 0.5);
    this.playerList = drawPlayerList(this);
    this.settingsPanel = drawSettingsPanel(this, {
      onMaxPlayersStep: (step) => this.changeMaxPlayers(step),
      onGraceStep: (step) => this.changeGraceSeconds(step),
    });

    this.room.setListener(this);
    // Connecting here, after preload, means the room code appears only once the page is fully loaded.
    this.room.connect();
    // Plain setInterval, not Phaser's this.time: Phaser's clock is game time, which runs slow when frames are
    // slow, and the countdowns on this screen must keep real time.
    const refreshTimer = setInterval(() => this.refresh(), REFRESH_MS);
    this.events.once('shutdown', () => clearInterval(refreshTimer));
    this.refresh();
  }

  handleMessage(message, player) {
    switch (message.type) {
      case MESSAGE_TYPES.ROOM_CREATED:
        this.joinPanel.showRoom(message.roomCode);
        break;
      case MESSAGE_TYPES.SET_READY:
        if (player) {
          player.ready = message.ready === true;
          this.room.sendControllerState(player);
        }
        break;
      default:
        // Joins, drops and names are already in the roster (host/room.js); refresh() below shows them.
        break;
    }
    this.refresh();
  }

  handleConnectionLost() {
    drawConnectionLost(this);
  }

  changeMaxPlayers(step) {
    const { players, settings } = this.room;
    this.room.setMaxPlayers(stepMaxPlayers(settings.maxPlayers, step, players.size));
    this.refresh();
  }

  // Applies to players who drop from now on; anyone already waiting keeps the time they were given.
  changeGraceSeconds(step) {
    const { settings } = this.room;
    settings.graceSeconds = stepGraceSeconds(settings.graceSeconds, step);
    this.refresh();
  }

  refresh() {
    // The game has started, and this scene is only waiting for Phaser to shut it down.
    if (this.room.screen !== CONTROLLER_SCREENS.LOBBY) {
      return;
    }
    const { players, settings } = this.room;
    const now = Date.now();
    this.playerList.show(players, now);
    this.settingsPanel.show(settings);
    this.joinPanel.setPlayerCount(players.size, settings.maxPlayers);
    this.updateStartCountdown(now);
  }

  // Runs on every refresh, so anything that breaks the start condition (someone un-readies, drops or joins)
  // cancels the countdown, and it begins again from the top once everyone is ready.
  updateStartCountdown(now) {
    if (!canStartGame(this.room.players)) {
      this.startsAt = null;
      this.statusText.setText(describeWaitingFor(this.room.players)).setColor('#9aa4bf');
      return;
    }
    if (this.startsAt === null) {
      this.startsAt = now + START_COUNTDOWN_MS;
    }
    const secondsLeft = Math.ceil((this.startsAt - now) / 1000);
    if (secondsLeft <= 0) {
      this.startGame();
      return;
    }
    this.statusText.setText(`Everyone is ready! Starting in ${secondsLeft}...`).setColor('#2ecc71');
  }

  // The input lab stands in for the game until the minigames exist (M5).
  startGame() {
    this.room.setScreen(CONTROLLER_SCREENS.INPUT_LAB);
    this.scene.start('input-lab');
  }
}
