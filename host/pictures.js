// The shell's pictures (game covers and wide backgrounds): fetching them before the room opens, and showing one
// in an <img> only once it has loaded. Used by host/main.js, host/lobby.js and host/loading-screen.js.

// Resolves once every picture has loaded or failed. A missing picture is logged, not fatal: the lobby still
// works with a plain background, so it must not keep the room from opening.
export function preloadPictures(paths) {
  return Promise.all(
    paths.map(
      (path) =>
        new Promise((resolve) => {
          const image = new Image();
          image.onload = resolve;
          image.onerror = () => {
            console.warn(`Could not load the picture ${path}`);
            resolve();
          };
          image.src = path;
        }),
    ),
  );
}

// Shows `path` in `image`, or hides the image when path is null or the file cannot be loaded, so the plain
// background behind it shows instead of a broken picture.
export function showPicture(image, path) {
  image.onload = null;
  image.onerror = null;
  if (!path) {
    image.hidden = true;
    return;
  }
  // Setting the same src again does not reliably fire load again, so a picture already shown stays shown.
  if (image.getAttribute('src') === path && image.complete && image.naturalWidth > 0) {
    image.hidden = false;
    return;
  }
  image.hidden = true;
  image.onload = () => (image.hidden = false);
  image.onerror = () => console.warn(`Could not load the picture ${path}`);
  image.src = path;
}
