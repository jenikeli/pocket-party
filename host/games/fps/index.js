// Saltline (fps): setup on the host and phones, a host-authoritative match, private views and Three.js rendering.
// It loads on demand through host/games/index.js and follows the shell game interface.

import { MESSAGE_TYPES, INPUT_KINDS, FPS_CHOICES, FPS_TEAMS } from '/shared/protocol.js';
import { playersInSlotOrder, displayName } from '/host/roster.js';
import { loadStylesheets } from '/host/kart/panel-parts.js';
import { MAX_VIEWS } from '/host/games/temple-run/layout.js';
import { DEFAULT_MAP } from './maps/index.js';
import { createSetupPanel } from './setup-panel.js';
import { createRenderer } from './renderer.js';
import { createSession } from './session.js';
import { createFpsSounds } from './sounds.js';
import { setupView, fullView, matchView, viewersFor } from './views.js';
import { TUNING } from './tuning.js';

export function createGame() {
  let shell = null;
  let stage = null;
  let renderer = null;
  let sounds = null;
  let panel = null;
  let stylesheets = [];
  let session = null;
  let modeId = 'tdm';
  let botLevel = 2;
  const ready = new Set();
  const wantedTeam = new Map();
  const sentViews = new Map();
  const scoresFor = new Set();
  const killFeed = [];

  async function load() {
    stylesheets = await loadStylesheets(['/host/games/fps/fps.css']);
  }

  function start(shellApi) {
    shell = shellApi;
    shell.setPlayerLimit(MAX_VIEWS);
    shell.setRoomOpen(true);
    stage = document.createElement('div');
    stage.className = 'pp-stage';
    shell.container.append(stage);
    renderer = createRenderer(stage);
    sounds = createFpsSounds();
    panel = createSetupPanel(stage, {
      onMode: (value) => { modeId = value; },
      onBotLevel: (value) => { botLevel = value; },
      onStart: startMatch,
      onWatch: watchMatch,
      onBack: backToSetup,
    });
  }

  function teamFor(playerId, index) {
    if (modeId === 'relay') return 0;
    if (modeId === 'ffa') return 2;
    return wantedTeam.get(playerId) ?? index % 2;
  }

  function setupPeople() {
    const people = playersInSlotOrder(shell.players);
    return people.map((player, index) => ({
      id: player.playerId,
      name: displayName(player),
      team: teamFor(player.playerId, index),
      primary: 'rifle',
      colorIndex: player.colorIndex,
    }));
  }

  function startSession(people) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    session = createSession({ people, modeId, botLevel, seed, mapId: DEFAULT_MAP });
    shell.setRoomOpen(false);
  }

  function startMatch() {
    const people = playersInSlotOrder(shell.players);
    if (!session && people.length > 0 && people.every((player) => ready.has(player.playerId))) {
      startSession(setupPeople());
    }
  }

  function watchMatch() {
    if (!session && shell.players.size === 0 && !TUNING.modes[modeId].cooperative) {
      startSession([]);
    }
  }

  function backToSetup() {
    session = null;
    ready.clear();
    sentViews.clear();
    scoresFor.clear();
    shell.setRoomOpen(true);
  }

  function onChoice(playerId, choice, value) {
    if (session) {
      return;
    }
    if (choice === FPS_CHOICES.READY) {
      value ? ready.add(playerId) : ready.delete(playerId);
    } else if (choice === FPS_CHOICES.TEAM && modeId !== 'relay' && Object.values(FPS_TEAMS).includes(value)) {
      wantedTeam.set(playerId, value);
    }
  }

  function onMessage(playerId, message) {
    if (message.type !== MESSAGE_TYPES.INPUT || !message.input) {
      return;
    }
    const input = message.input;
    if (session && input.kind === INPUT_KINDS.BUTTON && input.button === 'scores') {
      input.pressed ? scoresFor.add(playerId) : scoresFor.delete(playerId);
    }
    if (session) {
      session.input(playerId, input);
    } else if (input.kind === INPUT_KINDS.CHOICE) {
      onChoice(playerId, input.choice, input.value);
    }
  }

  function sendChangedViews() {
    const players = playersInSlotOrder(shell.players);
    for (const [index, player] of players.entries()) {
      let view;
      if (session) {
        view = matchView(session.match, session.playerOf(player.playerId)) ?? fullView();
      } else {
        view = setupView({
          mode: modeId,
          botLevel,
          team: teamFor(player.playerId, index),
          ready: ready.has(player.playerId),
          peopleCount: shell.players.size,
          readyCount: [...ready].length,
        });
      }
      if (session && !session.playerOf(player.playerId)) {
        view = fullView();
      }
      const text = JSON.stringify(view);
      if (sentViews.get(player.playerId) !== text) {
        sentViews.set(player.playerId, text);
        shell.setControllerView(player.playerId, JSON.parse(text));
      }
    }
  }

  function step(dt) {
    if (session) {
      session.step(dt);
      if (session.match.phase === 'over') {
        shell.setRoomOpen(true);
      }
    }
    sendChangedViews();
  }

  function render(alpha) {
    const events = session ? session.drainEvents() : [];
    for (const event of events) {
      if (event.type === 'kill') {
        const killer = session.match.world.players.find((player) => player.id === event.killer);
        const victim = session.match.world.players.find((player) => player.id === event.victim);
        if (killer && victim) killFeed.push({ text: `${killer.name}  ${event.head ? 'headshot' : 'eliminated'}  ${victim.name}` });
      }
    }
    while (killFeed.length > 5) killFeed.shift();
    const match = session?.match ?? null;
    const listeners = match ? match.world.players.filter((player) => player.human).map((player) => ({ x: player.x, y: player.y, z: player.z, yaw: player.yaw })) : [];
    const humanIds = match ? match.world.players.filter((player) => player.human).map((player) => player.id) : [];
    sounds?.handle(events, listeners, humanIds);
    const viewers = match ? viewersFor(match) : [];
    renderer?.draw({ match, viewers, alpha, events, feed: killFeed, scoresFor });
    const people = playersInSlotOrder(shell.players).map((player, index) => ({ player, team: teamFor(player.playerId, index) }));
    panel?.show({ visible: !session, modeId, botLevel, people, ready });
    if (match?.result) {
      const title = match.mode.cooperative
        ? (match.result.reason === 'mission-complete' ? 'Relay network restored' : 'Crew lost')
        : match.result.reason === 'time' ? 'Time' : 'Match complete';
      const line = match.mode.cooperative
        ? `${match.relays.filter((relay) => relay.cut).length} of ${match.relays.length} relays cut`
        : `${match.result.scores[0]} - ${match.result.scores[1]}`;
      panel?.showResult({ title, line });
    } else {
      panel?.showResult(null);
    }
  }

  function onPlayerLeft(playerId) {
    session?.takeOver(playerId);
    ready.delete(playerId);
    wantedTeam.delete(playerId);
    sentViews.delete(playerId);
  }

  function isDone() {
    return false;
  }

  function stop() {
    stylesheets.forEach((link) => link.remove());
    stage?.remove();
    renderer?.destroy();
    sounds?.stop();
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
