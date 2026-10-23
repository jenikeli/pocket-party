// The lobby: creates the room, shows the join panel, the players with their ready state, and the game
// settings. The host starts the game (for now the input lab) once everyone is ready. First scene in host/main.js.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { drawJoinPanel } from '/host/join-panel.js';
import { drawPlayerList } from '/host/lobby-player-list.js';
import { drawSettingsPanel } from '/host/settings-panel.js';
import { drawConnectionLost } from '/host/connection-lost.js';
import { drawButton, drawCloseRoomButton } from '/host/buttons.js';
import { stepMaxPlayers, stepGraceSeconds, canStartGame, describeWaitingFor } from '/host/lobby-rules.js';

// Often enough for the grace countdowns on screen to tick smoothly.
const REFRESH_MS = 250;

const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };
// Button centers at 1:1 scale.
export const START_BUTTON = { x: 1160, y: 100 };
export const CLOSE_BUTTON = { x: 1190, y: 990 };

export class LobbyScene extends Phaser.Scene {
  constructor(room) {
    super('lobby');
    this.room = room;
  }

  create() {
    this.joinPanel = drawJoinPanel(this);
    this.add.text(80, 60, 'Lobby', { ...TEXT_STYLE, fontSize: '64px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.statusText = this.add.text(80, 140, '', { ...TEXT_STYLE, fontSize: '36px' }).setOrigin(0, 0.5);
    this.startButton = drawButton(this, START_BUTTON.x, START_BUTTON.y, {
      width: 320,
      height: 90,
      label: 'Start game',
      onClick: () => this.startGame(),
    });
    drawCloseRoomButton(this, this.room, CLOSE_BUTTON.x, CLOSE_BUTTON.y);
    this.playerList = drawPlayerList(this, { onRemove: (playerId) => this.room.kickPlayer(playerId) });
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

  handleConnectionLost(closedByHost) {
    drawConnectionLost(this, closedByHost);
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
    const canStart = canStartGame(players);
    this.startButton.setEnabled(canStart);
    if (canStart) {
      this.statusText.setText('Everyone is ready!').setColor('#2ecc71');
    } else {
      this.statusText.setText(describeWaitingFor(players)).setColor('#9aa4bf');
    }
  }

  // The input lab stands in for the game until the minigames exist (M5). Checked again here, because a player
  // may have un-readied or dropped since the button was last drawn as enabled.
  startGame() {
    if (!canStartGame(this.room.players)) {
      return;
    }
    this.room.setScreen(CONTROLLER_SCREENS.INPUT_LAB);
    this.scene.start('input-lab');
  }
}
