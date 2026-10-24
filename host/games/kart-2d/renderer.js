// Draws the 2D race with its own Phaser game inside the game's container: the track, a sprite per kart, the
// live readout and the results. It only reads the race state; the rules never see Phaser.
// Used by host/games/kart-2d/index.js, which calls draw() from render().

import { startHandDrivenPhaser } from '/host/hand-driven-phaser.js';
import { PLAYER_COLORS, displayName } from '/host/roster.js';
import { RACE_PHASES } from './race.js';
import { drawTrack } from './track-drawing.js';
import { createKartSprite } from './kart-sprite.js';
import { createRaceHud } from './race-hud.js';
import { createResultsPanel } from './results-panel.js';

// `onRaceAgain()` and `onBackToLobby()` are the results panel's buttons. Returns { draw(race, players, alpha),
// destroy() }.
export function createRenderer(container, { onRaceAgain, onBackToLobby }) {
  // Set once Phaser has made the scene, a frame or two after start.
  let hud = null;
  let resultsPanel = null;
  let scene = null;
  // playerId -> kart sprite.
  const sprites = new Map();
  // The race whose results are on screen, so the panel is built once per race, not every frame.
  let raceShowingResults = null;

  const phaser = startHandDrivenPhaser({
    parent: container,
    backgroundColor: '#1f3d2b',
    create(newScene) {
      scene = newScene;
      drawTrack(scene);
      hud = createRaceHud(scene);
      resultsPanel = createResultsPanel(scene, { onRaceAgain, onBackToLobby });
    },
  });

  // `race` is the current race state and `players` the shell's live roster.
  function draw(race, players, alpha) {
    if (scene) {
      showKarts(race, players, alpha);
      hud.show(race, players);
      showResults(race, players);
    }
    phaser.drawFrame();
  }

  function showKarts(race, players, alpha) {
    const inRace = new Set(race.karts.map((kart) => kart.playerId));
    for (const [playerId, sprite] of sprites) {
      if (!inRace.has(playerId)) {
        sprite.destroy();
        sprites.delete(playerId);
      }
    }
    for (const kart of race.karts) {
      const player = players.get(kart.playerId);
      if (!player) {
        continue;
      }
      if (!sprites.has(kart.playerId)) {
        sprites.set(kart.playerId, createKartSprite(scene, PLAYER_COLORS[player.colorIndex]));
      }
      sprites.get(kart.playerId).show(kart, alpha, displayName(player), player.connected);
    }
  }

  function showResults(race, players) {
    if (race.phase !== RACE_PHASES.RESULTS) {
      if (raceShowingResults) {
        resultsPanel.hide();
        raceShowingResults = null;
      }
      return;
    }
    if (raceShowingResults !== race) {
      resultsPanel.show(race, players);
      raceShowingResults = race;
    }
  }

  return { draw, destroy: () => phaser.destroy() };
}
