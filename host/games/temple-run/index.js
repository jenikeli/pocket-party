// Temple Chase, a game module: one monster chaser and the rest runners in an endless corridor, steered by swipes,
// with corners, coins, powerups, hazards, lives and revives. A settings page on the host (the lobby) leads to a
// countdown, the run, and back to the lobby with the result. CPU players fill in when someone plays alone, or by
// the settings. Loaded through host/games/index.js and run by the shell (host/game-session.js). Rules are in
// rules.js, CPUs in cpu.js, what phones see in views.js, drawing in renderer.js; this file wires them together.

import { MESSAGE_TYPES, INPUT_KINDS, TEMPLE_CHOICES } from '/shared/protocol.js';
import { playersInSlotOrder, displayName, PLAYER_COLORS } from '/host/roster.js';
import { createRound, stepRound, applyAction, reviveRunner, removeRoundPlayer } from './rules.js';
import { lobbyView, watchingView, roundView } from './views.js';
import { createRenderer } from './renderer.js';
import { DEFAULT_SETTINGS } from './settings.js';

const SWIPE_ACTIONS = { left: 'left', right: 'right', up: 'jump', down: 'slide' };

// Returns a fresh game that follows the game module interface in plan.md.
export function createGame() {
  let shell = null;
  let renderer = null;
  // The running round, or null in the lobby.
  let round = null;
  let result = null;
  let settings = DEFAULT_SETTINGS;
  const ready = new Set();
  // CPU players of the running round: id -> { name, colorIndex }.
  const cpus = new Map();
  // playerId -> the JSON of the last view sent, so a phone is only messaged when its view changes.
  const sentViews = new Map();

  async function load() {}

  function start(shellApi) {
    shell = shellApi;
    shell.setRoomOpen(true);
    renderer = createRenderer(shell.container, {
      onSet: (key, value) => {
        settings = { ...settings, [key]: value };
      },
      onStart: () => {
        if (!round && shell.players.size > 0) {
          startRound();
        }
      },
    });
  }

  function onMessage(playerId, message) {
    if (message.type !== MESSAGE_TYPES.INPUT) {
      return;
    }
    const input = message.input ?? {};
    if (input.kind === INPUT_KINDS.SWIPE && round) {
      applyAction(round, playerId, SWIPE_ACTIONS[input.direction]);
    } else if (input.kind === INPUT_KINDS.CHOICE && input.choice === TEMPLE_CHOICES.READY && !round) {
      if (input.value === true) {
        ready.add(playerId);
      } else {
        ready.delete(playerId);
      }
    } else if (input.kind === INPUT_KINDS.CHOICE && input.choice === TEMPLE_CHOICES.REVIVE && round) {
      reviveRunner(round, playerId, input.value);
    }
  }

  function step(dt) {
    if (round) {
      stepRound(round, dt);
      if (round.phase === 'over') {
        endRound();
      }
    } else if (everyoneReady()) {
      startRound();
    }
    sendViews();
  }

  function everyoneReady() {
    const connected = [...shell.players.values()].filter((player) => player.connected);
    return connected.length >= 1 && connected.every((player) => ready.has(player.playerId));
  }

  // Who plays what. Alone, you are the runner or the monkey as chosen and a CPU takes the other side; with
  // friends a random person is the monkey. Extra CPU runners come from the settings. Players who dropped but are
  // still in their grace time run on with no input.
  function startRound() {
    const humans = [...shell.players.keys()];
    const cpuIds = [];
    let chaserId;
    let runnerCpus = settings.cpuRunners;
    if (humans.length === 1) {
      const wantsMonkey = settings.role === 'monster' || (settings.role === 'random' && Math.random() < 0.5);
      chaserId = wantsMonkey ? humans[0] : 'cpu-monkey';
      runnerCpus = wantsMonkey ? Math.max(1, runnerCpus) : runnerCpus;
    } else {
      chaserId = humans[Math.floor(Math.random() * humans.length)];
    }
    if (chaserId === 'cpu-monkey') {
      cpuIds.push(chaserId);
    }
    for (let number = 1; number <= runnerCpus; number += 1) {
      cpuIds.push(`cpu-${number}`);
    }
    nameCpus(cpuIds, humans);
    round = createRound({ playerIds: [...humans, ...cpuIds], chaserId, seed: Math.floor(Math.random() * 2 ** 31), settings, cpuIds });
    ready.clear();
    result = null;
    shell.setRoomOpen(false);
  }

  // CPUs get names and colours no person holds.
  function nameCpus(cpuIds, humans) {
    cpus.clear();
    const taken = new Set(humans.map((id) => shell.players.get(id).colorIndex));
    let colorIndex = 0;
    for (const id of cpuIds) {
      while (taken.has(colorIndex)) {
        colorIndex += 1;
      }
      taken.add(colorIndex);
      cpus.set(id, { name: id === 'cpu-monkey' ? 'CPU Monkey' : `CPU ${id.slice(4)}`, colorIndex: colorIndex % PLAYER_COLORS.length });
    }
  }

  function endRound() {
    result = round.result;
    round = null;
    cpus.clear();
    shell.setRoomOpen(true);
  }

  function nameOf(playerId) {
    const player = shell.players.get(playerId);
    return player ? displayName(player) : (cpus.get(playerId)?.name ?? '');
  }

  function sendViews() {
    for (const player of shell.players.values()) {
      const view = viewFor(player.playerId);
      const key = JSON.stringify(view);
      if (sentViews.get(player.playerId) !== key) {
        sentViews.set(player.playerId, key);
        shell.setControllerView(player.playerId, view);
      }
    }
  }

  function viewFor(playerId) {
    if (!round) {
      return lobbyView({ ready: ready.has(playerId), readyCount: ready.size, playerCount: shell.players.size, result });
    }
    return round.players.has(playerId) ? roundView(round, playerId, nameOf) : watchingView();
  }

  function render() {
    const people = playersInSlotOrder(shell.players).map((player) => ({
      id: player.playerId, name: displayName(player), colorIndex: player.colorIndex, ready: ready.has(player.playerId),
    }));
    const computers = [...cpus].map(([id, info]) => ({ id, name: info.name, colorIndex: info.colorIndex, ready: true }));
    // Each person in the round gets their own screen, in colour order, like the kart race's split screen.
    const viewers = round ? people.map((person) => person.id).filter((id) => round.players.has(id)) : [];
    renderer.draw({ round, result, settings, players: [...people, ...computers], viewers });
  }

  function onPlayerLeft(playerId) {
    ready.delete(playerId);
    sentViews.delete(playerId);
    if (round) {
      removeRoundPlayer(round, playerId);
      if (round.phase === 'over') {
        endRound();
      }
    }
  }

  // Back to games is the way out.
  function isDone() {
    return false;
  }

  function stop() {
    renderer.destroy();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
