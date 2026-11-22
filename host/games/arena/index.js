// Spirefall (docs/arena-plan.md), a game module: a tower-clash duel, 1v1 or 2v2, empty seats played by CPUs. The
// setup screen is the mode on the host and team, deck and Ready on each phone; then a match runs on the host's
// arena and on each phone's private hand. Loaded through host/games/index.js and run by the shell
// (host/game-session.js). Seats are in seats.js, the match in session.js and match.js, what phones see in views.js,
// drawing in renderer.js and the panels; this file wires them to the shell.

import { MESSAGE_TYPES, INPUT_KINDS, ARENA_CHOICES, ARENA_TEAMS, ARENA_EMOTES } from '/shared/protocol.js';
import { PRESET_DECKS, isValidDeck, cardById } from '/shared/arena-cards.js';
import { playersInSlotOrder, displayName } from '/host/roster.js';
import { loadStylesheets } from '/host/kart/panel-parts.js';
import { buildSeats, everyoneReady } from './seats.js';
import { setupView, fullView } from './views.js';
import { createSession } from './session.js';
import { createRng } from './rng.js';
import { createRenderer } from './renderer.js';
import { createSetupPanel } from './setup-panel.js';
import { createSidePanels } from './side-panels.js';
import { createResultPanel } from './result-panel.js';
import { preloadArt } from './atlas.js';
import { createArenaSounds } from './sounds.js';
import { elixirMultiplier } from './tuning.js';
import { playTune, tuneForArena } from '/host/audio/music.js';

const PRESET_KEYS = Object.keys(PRESET_DECKS);

// Returns a fresh game that follows the game module interface in plan.md.
export function createGame() {
  let shell = null;
  let stage = null;
  let renderer = null;
  let sounds = null;
  let panels = null;
  let stylesheets = [];
  let mode = '1v1';
  // Who is ready, the team each person asked for and the deck they chose (setup only).
  const ready = new Set();
  const wantedTeam = new Map();
  const chosenDeck = new Map();
  // playerId -> the JSON of the view last sent, so a phone is only messaged when its view changes.
  const sentViews = new Map();
  let seating = { seats: [], overflow: [] };
  // The running match, or null on the setup screen, and the plays shown in the side panels.
  let session = null;
  let plays = [];
  const lastEmote = new Map();

  async function load() {
    stylesheets = await loadStylesheets(['/host/games/arena/arena.css']);
    await preloadArt();
  }

  function start(shellApi) {
    shell = shellApi;
    shell.setRoomOpen(true);
    renderer = createRenderer(shell.container);
    sounds = createArenaSounds();
    stage = document.createElement('div');
    stage.className = 'pp-stage';
    shell.container.append(stage);
    panels = {
      setup: createSetupPanel(stage, { onMode: (newMode) => { mode = newMode; }, onStart: startMatch, onWatch: watchMatch }),
      sides: createSidePanels(stage),
      result: createResultPanel(stage, { onBack: backToSetup }),
    };
  }

  function onMessage(playerId, message) {
    const input = message.input;
    if (message.type !== MESSAGE_TYPES.INPUT || !input) {
      return;
    }
    if (input.kind === INPUT_KINDS.PLACE) {
      session?.place(playerId, input);
    } else if (input.kind === INPUT_KINDS.CHOICE) {
      onChoice(playerId, input.choice, input.value);
    }
  }

  function onChoice(playerId, choice, value) {
    if (choice === ARENA_CHOICES.FORFEIT && session && value === true) {
      session.takeOver(playerId);
    } else if (choice === ARENA_CHOICES.EMOTE && session) {
      sayEmote(playerId, value);
    } else if (session) {
      return;
    } else if (choice === ARENA_CHOICES.READY) {
      if (value === true) {
        ready.add(playerId);
      } else {
        ready.delete(playerId);
      }
    } else if (choice === ARENA_CHOICES.TEAM && Object.values(ARENA_TEAMS).includes(value)) {
      wantedTeam.set(playerId, value);
    } else if (choice === ARENA_CHOICES.DECK && isValidDeck(value)) {
      chosenDeck.set(playerId, value);
    }
  }

  // An emote shows in the sender's team panel; one every 2 seconds per person.
  function sayEmote(playerId, value) {
    const index = session.indexOf(playerId);
    const now = Date.now();
    if (index < 0 || !Number.isInteger(value) || !ARENA_EMOTES[value] || now - (lastEmote.get(playerId) ?? 0) < 2000) {
      return;
    }
    lastEmote.set(playerId, now);
    plays.push({ team: session.match.players[index].team, text: `Says: ${ARENA_EMOTES[value]}` });
  }

  // The decks: a person's own, else a preset by seat; a CPU gets a random preset.
  function startSession(seats) {
    const seed = Math.floor(Math.random() * 2 ** 31);
    const random = createRng(seed);
    const decks = seats.map((seat, index) => (seat.playerId !== null && chosenDeck.get(seat.playerId)) || PRESET_DECKS[PRESET_KEYS[seat.playerId === null ? Math.floor(random() * 4) : index % 4]]);
    session = createSession({ seats: seats.map((seat) => ({ ...seat })), decks, seed, settings: {} });
    plays = [];
    shell.setRoomOpen(false);
  }

  function startMatch() {
    if (!session && everyoneReady(seating.seats, ready)) {
      startSession(seating.seats);
    }
  }

  // Two CPUs play each other (the seats are all CPUs), with the phones joined watching.
  function watchMatch() {
    if (!session) {
      startSession(buildSeats(mode, []).seats);
    }
  }

  function backToSetup() {
    session = null;
    plays = [];
    ready.clear();
    shell.setRoomOpen(true);
  }

  function humansAway() {
    return session.match.players.some((player) => player.playerId !== null && shell.players.get(player.playerId)?.connected === false);
  }

  // The match waits while a person's phone is away (their grace time), then a CPU takes the seat (onPlayerLeft).
  function step(dt) {
    if (!session) {
      const humans = playersInSlotOrder(shell.players).map((player) => ({ playerId: player.playerId, team: wantedTeam.get(player.playerId) ?? null }));
      seating = buildSeats(mode, humans);
    } else if (!humansAway()) {
      session.step(dt);
      if (session.match.phase === 'over') {
        shell.setRoomOpen(true);
      }
    }
    sendChangedViews();
  }

  function viewOf(playerId, names) {
    if (session) {
      return session.viewFor(playerId, humansAway()) ?? fullView(mode);
    }
    if (seating.overflow.includes(playerId)) {
      return fullView(mode);
    }
    return setupView({ seats: seating.seats, mode, playerId, ready, names, deck: chosenDeck.get(playerId) ?? null });
  }

  function sendChangedViews() {
    const names = new Map([...shell.players.values()].map((player) => [player.playerId, displayName(player)]));
    for (const playerId of shell.players.keys()) {
      const viewText = JSON.stringify(viewOf(playerId, names));
      if (sentViews.get(playerId) !== viewText) {
        sentViews.set(playerId, viewText);
        shell.setControllerView(playerId, JSON.parse(viewText));
      }
    }
  }

  function render(alpha) {
    const events = session ? session.drainEvents() : [];
    for (const event of events) {
      if (event.type === 'play') {
        plays.push({ team: event.team, text: cardById(event.cardId).name });
      }
    }
    const match = session?.match ?? null;
    sounds.handle(events, match);
    playTune(tuneForArena(match, match && elixirMultiplier(match.phase, match.clock)));
    renderer.draw({ match, alpha, ghosts: session ? session.ghosts() : [], events });
    const names = new Map([...shell.players.values()].map((player) => [player.playerId, displayName(player)]));
    panels.setup.show({ visible: !session, mode, seats: seating.seats, players: shell.players, ready, overflow: seating.overflow });
    panels.sides.show({ match, names, plays, paused: session ? humansAway() : false });
    panels.result.show(match?.result ?? null);
  }

  // A person who left for good: during a match a CPU takes their seat.
  function onPlayerLeft(playerId) {
    session?.takeOver(playerId);
    ready.delete(playerId);
    wantedTeam.delete(playerId);
    chosenDeck.delete(playerId);
    sentViews.delete(playerId);
  }

  // A game is left through the shell's back arrow, which closes the room, so the game never ends itself.
  function isDone() {
    return false;
  }

  function stop() {
    stylesheets.forEach((link) => link.remove());
    stage?.remove();
    renderer?.destroy();
    sounds?.stop();
    playTune(null);
  }

  return { load, start, onMessage, step, render, onPlayerLeft, isDone, stop };
}
