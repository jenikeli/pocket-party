// The lobby: creates the room, shows the join panel, the players with their ready state, and the room settings
// with the game picker. The host starts the chosen game once everyone is ready (host/game-session.js), and the
// game hands back here when it ends. The shell's only scene, created in host/main.js.

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES, CONTROLLER_SCREENS } from '/shared/protocol.js';
import { drawJoinPanel } from '/host/join-panel.js';
import { drawPlayerList } from '/host/lobby-player-list.js';
import { drawSettingsPanel, drawGamePicker } from '/host/settings-panel.js';
import { drawConnectionLost } from '/host/connection-lost.js';
import { drawButton, drawCloseRoomButton } from '/host/buttons.js';
import { stepMaxPlayers, stepGraceSeconds, canStartGame, describeWaitingFor } from '/host/lobby-rules.js';
import { GAMES, findGame } from '/host/games/index.js';
import { playGame } from '/host/game-session.js';

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
    // True from Start until the game is loaded and running (or failed to load).
    this.isStarting = false;
  }

  create() {
    this.joinPanel = drawJoinPanel(this);
    this.add.text(80, 60, 'Lobby', { ...TEXT_STYLE, fontSize: '64px', fontStyle: 'bold' }).setOrigin(0, 0.5);
    this.statusText = this.add.text(80, 140, '', { ...TEXT_STYLE, fontSize: '36px' }).setOrigin(0, 0.5);
    // Why the last game did not load or stopped; cleared by the next Start.
    this.problemText = this.add.text(80, 186, '', { ...TEXT_STYLE, fontSize: '26px', color: '#f39c12' });
    this.problemText.setOrigin(0, 0.5);
    this.gamePicker = drawGamePicker(this, (step) => this.changeGame(step));
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

  // Cycles through the registry. Only the player range matters to the lobby, and refresh() checks it.
  changeGame(step) {
    const { settings } = this.room;
    const index = GAMES.findIndex((game) => game.id === settings.gameId);
    settings.gameId = GAMES[(index + step + GAMES.length) % GAMES.length].id;
    this.refresh();
  }

  // Applies to players who drop from now on; anyone already waiting keeps the time they were given.
  changeGraceSeconds(step) {
    const { settings } = this.room;
    settings.graceSeconds = stepGraceSeconds(settings.graceSeconds, step);
    this.refresh();
  }

  refresh() {
    // A game is running: this scene is asleep and hidden until it hands back.
    if (this.room.screen !== CONTROLLER_SCREENS.LOBBY) {
      return;
    }
    const { players, settings } = this.room;
    const game = findGame(settings.gameId);
    const now = Date.now();
    this.playerList.show(players, now);
    this.settingsPanel.show(settings);
    this.gamePicker.show(game.title);
    this.joinPanel.setPlayerCount(players.size, settings.maxPlayers);
    if (this.isStarting) {
      this.startButton.setEnabled(false);
      this.statusText.setText(`Loading ${game.title}...`).setColor('#9aa4bf');
      return;
    }
    const canStart = canStartGame(players, game);
    this.startButton.setEnabled(canStart);
    if (canStart) {
      this.statusText.setText('Everyone is ready!').setColor('#2ecc71');
    } else {
      this.statusText.setText(describeWaitingFor(players, game)).setColor('#9aa4bf');
    }
  }

  // Checked again here, because a player may have un-readied or dropped since the button was last drawn as
  // enabled. Players stay in the lobby while the game's code loads; a game that fails to load leaves them there.
  async startGame() {
    const game = findGame(this.room.settings.gameId);
    if (this.isStarting || !canStartGame(this.room.players, game)) {
      return;
    }
    this.isStarting = true;
    this.problemText.setText('');
    this.refresh();
    try {
      await playGame({ room: this.room, lobby: this, gameInfo: game });
    } catch (error) {
      console.error(`Could not load ${game.title}`, error);
      this.problemText.setText(`Could not load ${game.title} (details in the browser console).`);
    }
    this.isStarting = false;
    this.refresh();
  }

  // Called by host/game-session.js once the game has stopped and this scene is awake again. Everyone starts
  // the lobby unready, so the next game waits for them to say they are back. The room opens to new players.
  returnFromGame(problem) {
    for (const player of this.room.players.values()) {
      player.ready = false;
    }
    this.room.setScreen(CONTROLLER_SCREENS.LOBBY);
    this.problemText.setText(problem ?? '');
    this.refresh();
  }
}
