// The input lab (M3), a developer tool and the first game module: a card per player with a live picture of
// their input plus its rate, round-trip time and jitter. Loaded through host/games/index.js and run by the shell
// (host/game-session.js). It draws with its own Phaser game inside the container, driven by hand from render().

import * as Phaser from '/host/vendor/phaser-3.90.0.esm.min.js';
import { MESSAGE_TYPES } from '/shared/protocol.js';
import { createRateMeter } from '/shared/rate-meter.js';
import { createRoundTripStats, createJitterMeter } from '/host/games/input-lab/latency-stats.js';
import { createPlayerCard } from '/host/games/input-lab/player-card.js';
import { PLAYER_COLORS, displayName, colorText, secondsUntilFreed, formatMinutes } from '/host/roster.js';

// Once a second per player is plenty for a readout, and adds almost nothing to the input traffic.
const PING_INTERVAL_MS = 1000;
const STATS_REFRESH_MS = 250;
const TEXT_STYLE = { fontFamily: 'sans-serif', color: '#ffffff' };

// Returns a fresh lab that follows the game module interface in plan.md.
export function createGame() {
  let phaserGame = null;
  // The Phaser scene, once Phaser has created it (a frame or two after start()).
  let scene = null;
  // From start(): the shell's live roster and what the lab may ask of the shell.
  let players = null;
  let removePlayer = null;
  let pingPlayer = null;
  let pingTimer = null;
  let lastRenderTime = null;
  let lastStatsTime = 0;
  // playerId -> { card, mode, inputRate, roundTrips, jitter }: what the lab measures per player. Kept apart
  // from the card, because messages can arrive before Phaser is ready to draw one.
  const tracks = new Map();

  // The lab has no assets of its own, and Phaser is the same module the shell already loaded.
  async function load() {}

  function start(shell) {
    players = shell.players;
    removePlayer = shell.removePlayer;
    pingPlayer = shell.pingPlayer;
    phaserGame = new Phaser.Game({
      type: Phaser.AUTO,
      parent: shell.container,
      backgroundColor: '#10131c',
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1920, height: 1080 },
      scene: {
        create() {
          scene = this;
          drawTitle(this);
        },
      },
    });
    // Plain setInterval, not step(): the round trip is measured in real time, whatever the frame rate.
    pingTimer = setInterval(pingConnectedPlayers, PING_INTERVAL_MS);
  }

  function onMessage(playerId, message) {
    const track = trackFor(playerId);
    switch (message.type) {
      case MESSAGE_TYPES.INPUT:
        track.inputRate.record(performance.now());
        if (Number.isFinite(message.sentAt)) {
          track.jitter.record(Date.now(), message.sentAt);
        }
        track.card?.showInput(message.input ?? {});
        break;
      case MESSAGE_TYPES.INPUT_MODE:
        track.mode = message;
        track.card?.showMode(message.mode, message.fallbackFrom, message.reason);
        break;
      case MESSAGE_TYPES.PONG:
        // sentAt is the performance.now() this lab put in the PING, so the round trip needs no clock sync.
        track.roundTrips.add(performance.now() - Number(message.sentAt));
        break;
      default:
        console.warn('Input lab ignoring message:', message);
    }
  }

  // The lab has no rules that advance with time; everything it shows comes straight from messages.
  function step() {}

  function render() {
    // Phaser boots asynchronously (it decodes its default textures first).
    if (!phaserGame.isRunning) {
      return;
    }
    // Once booted, Phaser starts its own requestAnimationFrame loop. Putting that to sleep leaves the shell's
    // runner as the only clock, so each frame is drawn exactly once, from here.
    if (phaserGame.loop.running) {
      phaserGame.loop.sleep();
    }
    const now = performance.now();
    if (scene) {
      addMissingCards();
      if (now - lastStatsTime >= STATS_REFRESH_MS) {
        lastStatsTime = now;
        refreshCards();
      }
    }
    phaserGame.step(now, lastRenderTime === null ? 0 : now - lastRenderTime);
    lastRenderTime = now;
  }

  function onPlayerLeft(playerId) {
    tracks.get(playerId)?.card?.destroy();
    tracks.delete(playerId);
  }

  // The lab never ends by itself; the host ends it with the shell's "End game".
  function isDone() {
    return false;
  }

  function stop() {
    clearInterval(pingTimer);
    // Phaser only marks the game for destruction and tears it down at the start of its next step. Its own loop
    // is asleep, so step it once here; that also frees its WebGL context and removes the canvas.
    phaserGame.destroy(true);
    phaserGame.step(performance.now(), 0);
  }

  function trackFor(playerId) {
    if (!tracks.has(playerId)) {
      tracks.set(playerId, {
        card: null,
        mode: null,
        inputRate: createRateMeter(),
        roundTrips: createRoundTripStats(),
        jitter: createJitterMeter(),
      });
    }
    return tracks.get(playerId);
  }

  // The PING travels host -> server -> controller and back, so this measures the whole path an input takes.
  // Disconnected players are skipped: the server has no socket to pass the ping to.
  function pingConnectedPlayers() {
    for (const player of players.values()) {
      if (player.connected) {
        pingPlayer(player.playerId, performance.now());
      }
    }
  }

  // Cards sit by color slot, so a player keeps their card position across a drop and rejoin. A player who
  // joined just before the room closed to new players gets a card too.
  function addMissingCards() {
    for (const player of players.values()) {
      const track = trackFor(player.playerId);
      if (track.card) {
        continue;
      }
      track.card = createPlayerCard(scene, player.colorIndex, PLAYER_COLORS[player.colorIndex], colorText(player), () =>
        removePlayer(player.playerId),
      );
      if (track.mode) {
        track.card.showMode(track.mode.mode, track.mode.fallbackFrom, track.mode.reason);
      }
      refreshCard(track.card, player, track, performance.now());
    }
  }

  function refreshCards() {
    const now = performance.now();
    for (const player of players.values()) {
      const track = tracks.get(player.playerId);
      if (track?.card) {
        refreshCard(track.card, player, track, now);
      }
    }
  }

  // Names, phones and drops live in the shell's roster, so the card reads them from there.
  function refreshCard(card, player, track, now) {
    card.showName(displayName(player));
    card.showDevice(player.device);
    const timeLeft = formatMinutes(secondsUntilFreed(player, Date.now()));
    card.showWaiting(player.connected ? null : `${displayName(player)}\nwaiting to reconnect\n${timeLeft}`);
    card.showStats({
      rate: track.inputRate.perSecond(now),
      roundTrip: track.roundTrips.summary(),
      jitter: track.jitter.spread(Date.now()),
    });
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}

// In the space right of the cards; the shell's End game and Close room buttons sit below it.
function drawTitle(scene) {
  scene.add.text(1650, 90, 'Input lab', { ...TEXT_STYLE, fontSize: '56px', fontStyle: 'bold' }).setOrigin(0.5);
  scene.add
    .text(1650, 180, 'Compare drag, tap, swipe and tilt.\nPick the input on each phone.', {
      ...TEXT_STYLE,
      fontSize: '26px',
      color: '#9aa4bf',
      align: 'center',
    })
    .setOrigin(0.5);
}
