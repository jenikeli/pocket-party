// Runs the controller side of the host's current game: the first time the host names a game it loads
// controller/games/<id>/ (index.js by dynamic import(), and style.css), starts it in #game-container, and passes
// on every view the host sends. A game module has start(container, send, leave), showView(view, player) and
// stop(). Used by controller/main.js.

const container = document.getElementById('game-container');

// The game this phone is showing: { gameId, view, player, module }. module is null while the files load; view
// and player are the newest from the host, which the game gets as soon as it has started.
let current = null;

// Called for every CONTROLLER_STATE on the GAME screen. `player` is { name, color } from it. `send(message)`
// sends one message to the server and `leave()` leaves the game (the shell's Leave, with no confirm of its own:
// a game that offers it adds the two taps).
export function showGame(gameId, view, player, send, leave) {
  if (current?.gameId === gameId) {
    current.view = view;
    current.player = player;
    current.module?.showView(view, player);
    return;
  }
  stopGame();
  current = { gameId, view, player, module: null };
  startGame(current, send, leave);
}

// Between joining and the host's first CONTROLLER_STATE.
export function showConnected() {
  stopGame();
  const note = document.createElement('p');
  note.className = 'game-connected';
  note.textContent = 'Connected';
  container.append(note);
}

export function stopGame() {
  if (current?.module) {
    current.module.stop();
  }
  current = null;
  container.replaceChildren();
}

// `entry` stops being `current` if the host moves on (the room closes) while the files are still loading;
// the game is then never started.
async function startGame(entry, send, leave) {
  try {
    const [module] = await Promise.all([
      import(`/controller/games/${entry.gameId}/index.js`),
      // Waiting for the stylesheet means the game's controls never show unstyled, even for a moment.
      loadStylesheet(`/controller/games/${entry.gameId}/style.css`),
    ]);
    if (current !== entry) {
      return;
    }
    module.start(container, send, leave);
    entry.module = module;
    module.showView(entry.view, entry.player);
  } catch (error) {
    console.error(`Could not start game "${entry.gameId}"`, error);
    if (current === entry) {
      container.textContent = 'Could not load the game. Try reloading the page.';
    }
  }
}

// Each stylesheet is added once and stays: game styles are scoped by their element ids.
function loadStylesheet(href) {
  if (document.querySelector(`link[href="${href}"]`)) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () => reject(new Error(`Could not load ${href}`)));
    document.head.append(link);
  });
}
