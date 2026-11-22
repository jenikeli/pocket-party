// The two team panels beside the arena during a match: each team's name, crowns, seats, tower health and its last
// plays, and on the right the clock with the elixir ribbon. HTML in the game's stage. Used by
// host/games/arena/index.js.

import { setText } from '/host/kart/panel-parts.js';
import { TEAM_NAMES } from './palette.js';
import { elixirMultiplier } from './tuning.js';
import { towerPercents, isPlaying } from './match.js';

const TOWER_LABELS = ['Left tower', 'Keep', 'Right tower'];

function build(team) {
  const side = document.createElement('aside');
  side.className = 'ar-side';
  side.dataset.team = String(team);
  side.hidden = true;
  side.innerHTML = `
    <h2 class="ar-side-title">${TEAM_NAMES[team]}</h2>
    ${team === 1 ? '<div class="ar-clock"><div class="ar-time"></div><div class="ar-ribbon"></div></div>' : ''}
    <div class="ar-crowns"><span class="ar-crown-number"></span><span class="pp-muted"> crowns</span></div>
    <ul class="ar-side-seats"></ul>
    <ul class="ar-towers">${TOWER_LABELS.map((label) => `<li><span>${label}</span><span class="ar-bar"><span class="ar-bar-fill"></span></span></li>`).join('')}</ul>
    <h3 class="ar-side-heading">Recent plays</h3>
    <ul class="ar-plays"></ul>`;
  return side;
}

function clockText(match) {
  if (match.phase === 'intro') {
    return 'Ready';
  }
  const seconds = Math.max(0, Math.ceil(match.clock));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function ribbonText(match, paused) {
  if (paused) {
    return 'Paused: waiting for a player';
  }
  if (!isPlaying(match)) {
    return '';
  }
  const multiplier = elixirMultiplier(match.phase, match.clock);
  const label = match.phase === 'overtime' ? 'Overtime. ' : '';
  return multiplier === 1 ? label.trim() : `${label}${multiplier === 2 ? 'Double' : 'Triple'} elixir`;
}

// Adds both panels to `stage`. Returns { show(model) } where model is { match, names, plays, paused }; match null
// hides them. `names` is Map(playerId -> name), `plays` the newest-last list of { team, text }.
export function createSidePanels(stage) {
  const sides = [build(0), build(1)];
  stage.append(...sides);

  function fillTeam(side, team, { match, names, plays }) {
    setText(side.querySelector('.ar-crown-number'), String(match.world.crowns[team]));
    side.querySelector('.ar-side-seats').replaceChildren(...match.players.filter((player) => player.team === team).map((player) => {
      const row = document.createElement('li');
      row.textContent = player.playerId === null ? 'CPU' : (names.get(player.playerId) ?? 'Player');
      return row;
    }));
    towerPercents(match.world, team).forEach((percent, index) => {
      side.querySelectorAll('.ar-bar-fill')[index].style.width = `${percent}%`;
    });
    side.querySelector('.ar-plays').replaceChildren(...plays.filter((play) => play.team === team).slice(-4).reverse().map((play) => {
      const row = document.createElement('li');
      row.textContent = play.text;
      return row;
    }));
  }

  function show(model) {
    sides.forEach((side, team) => {
      side.hidden = !model.match;
      if (model.match) {
        fillTeam(side, team, model);
      }
    });
    if (model.match) {
      setText(sides[1].querySelector('.ar-time'), clockText(model.match));
      setText(sides[1].querySelector('.ar-ribbon'), ribbonText(model.match, model.paused));
    }
  }

  return { show };
}
