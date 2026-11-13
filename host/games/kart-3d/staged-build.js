// Runs a slow build (the 3D race's course) in stages with a drawn frame between each, so a loading bar can move
// while it works: JavaScript holds the page until it yields, and a single long build would show one frozen bar.
// No Three.js and no DOM in runStages, so it is unit tested in Node. Used by host/games/kart-3d/renderer.js.

// Runs `stages` ([{ label, weight, run() }], in order). Before each stage it calls `onProgress(fraction, label)`
// (fraction: the weights of the stages done over the total), then waits for `nextFrame()` so the bar is drawn,
// then runs the stage; after the last it calls onProgress(1). If `isCancelled()` turns true while it waits, it
// stops there and resolves false (nothing left to build for); otherwise it resolves true. A stage that throws
// rejects the promise.
export async function runStages(stages, { onProgress, nextFrame, isCancelled }) {
  const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
  let doneWeight = 0;
  for (const stage of stages) {
    onProgress(doneWeight / totalWeight, stage.label);
    await nextFrame();
    if (isCancelled()) {
      return false;
    }
    stage.run();
    doneWeight += stage.weight;
  }
  onProgress(1);
  return true;
}

// Resolves once the browser has drawn a frame. A requestAnimationFrame callback runs just before the frame is
// drawn, and a promise resolved there would carry on before the drawing too; the timeout moves the next stage
// after it.
export function nextDrawnFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
}
