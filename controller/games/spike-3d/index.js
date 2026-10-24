// The controller side of the 3D performance spike (M6a): the spike measures the host screen alone, so the phone
// only says so. Loaded and started by controller/game-screen.js.

export function start(container) {
  const note = document.createElement('p');
  note.id = 'spike-note';
  note.textContent = 'The 3D spike is running on the host screen. Nothing to do on the phone.';
  container.append(note);
}

// The spike never sends a view.
export function showView() {}

// Nothing to stop: the shell empties the container.
export function stop() {}
