// Runs the controller side of the host's current game: the first time the host names a game it loads
// controller/games/<id>/ (index.js by dynamic import(), and style.css), starts it in #game-container, and passes
// on every view the host sends. Used by controller/main.js.

const container = document.getElementById('game-container');

// The game this phone is showing: { gameId, view, module }. module is null while the files load, and view is
// the newest view from the host, which the game gets as soon as it has started.
let current = null;

// Called for every CONTROLLER_STATE on the GAME screen. `send(message)` sends one message to the server.
export function showGame(gameId, view, send) {
  if (current?.gameId === gameId) {
    current.view = view;
    current.module?.showView(view);
    return;
  }
  stopGame();
  current = { gameId, view, module: null };
  startGame(current, send);
}

export function stopGame() {
  if (current?.module) {
    current.module.stop();
  }
  current = null;
  container.replaceChildren();
}

// `entry` stops being `current` if the host moves on (back to the lobby) while the files are still loading;
// the game is then never started.
async function startGame(entry, send) {
  try {
    const [module] = await Promise.all([
      import(`/controller/games/${entry.gameId}/index.js`),
      // Waiting for the stylesheet means the game's controls never show unstyled, even for a moment.
      loadStylesheet(`/controller/games/${entry.gameId}/style.css`),
    ]);
    if (current !== entry) {
      return;
    }
    module.start(container, send);
    entry.module = module;
    module.showView(entry.view);
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
