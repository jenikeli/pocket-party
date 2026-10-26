// Runs the Measure tool (M7d4b): one frame each time the game draws, case after case of measure-plan.js, each
// frame timed up to the end of draw() (the CPU's part) and again once the GPU has finished it. Sets each look on
// the renderer and the drawing switches in tuning.js, and puts the switches back when done or stopped (the game
// sets its quality back). No DOM: unit tested in Node with a stand-in renderer. Used by
// host/games/kart-3d/measure-panel.js.

import { setTuning, drawingSwitches } from './tuning.js';
import { createMeasureRaces, measureSetups, measureCases, describeMeasurement, WARM_UP_FRAMES, TIMED_FRAMES } from './measure-plan.js';

// `renderer` is renderer.js's, `track` the course shown, `context` what the report says about the host (see
// describeMeasurement; its drawing is filled in here). Returns { frame(), stop(), report() }: frame() draws the
// next frame and returns what is being measured as text, or null once every case is drawn; stop() ends early;
// report() is the text of the cases drawn so far.
export function createMeasureRun(renderer, track, context) {
  const drawing = drawingSwitches();
  const setups = measureSetups(drawing);
  const cases = measureCases(setups.length);
  const { races, players } = createMeasureRaces(track);
  const results = [];
  let caseIndex = 0;
  let framesDrawn = 0;
  let frames = [];

  function frame() {
    if (caseIndex >= cases.length) {
      return null;
    }
    const { setupIndex, viewCount, momentIndex } = cases[caseIndex];
    const setup = setups[setupIndex];
    if (framesDrawn === 0) {
      setDrawing(setup.drawing);
      renderer.setLook(setup.look);
    }
    // The views follow the first viewCount stand-ins' karts, as they would follow players'.
    const viewPlayers = new Map(players.slice(0, viewCount).map((player) => [player.playerId, player]));
    const startedAt = performance.now();
    renderer.draw(races[momentIndex], viewPlayers, 1, 0);
    const cpuMs = performance.now() - startedAt;
    renderer.waitForGpu();
    const totalMs = performance.now() - startedAt;
    if (framesDrawn >= WARM_UP_FRAMES) {
      frames.push({ cpuMs, totalMs, ...renderer.frameStats() });
    }
    framesDrawn += 1;
    if (framesDrawn === WARM_UP_FRAMES + TIMED_FRAMES) {
      results.push({ setupIndex, viewCount, momentIndex, frames });
      frames = [];
      framesDrawn = 0;
      caseIndex += 1;
    }
    if (caseIndex >= cases.length) {
      setDrawing(drawing);
      return null;
    }
    return `Measuring ${caseIndex + 1} of ${cases.length}: ${setups[cases[caseIndex].setupIndex].label}, ${cases[caseIndex].viewCount} view(s)`;
  }

  function stop() {
    caseIndex = cases.length;
    setDrawing(drawing);
  }

  function setDrawing(values) {
    Object.entries(values).forEach(([key, value]) => setTuning(key, value));
  }

  return { frame, stop, report: () => describeMeasurement(setups, results, { ...context, drawing }) };
}
