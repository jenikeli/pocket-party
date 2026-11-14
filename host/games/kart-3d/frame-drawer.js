// What the 3D game does each frame it draws: the setup screen or the Measure tool's frames or the race with its bar,
// tuning panel and results. Used by host/games/kart-3d/index.js, which owns the parts.

import { RACE_PHASES } from './race.js';
import { standingRows, describeClock, describeCountdown, describeRaceSummary } from './race-views.js';
import { COURSES } from './courses.js';

// A long pause (a hidden tab) must not swing the cameras a long way at once: the runner's own cap
// (host/fixed-step.js).
const MAX_FRAME_SECONDS = 0.25;

// `session` is race-session.js's, `setup` and `choices` as there, `chosenTrack()` the chosen course's track,
// `players()` the shell's roster, and `panels` is { setupPanel, raceBar, resultsPanel, tuningPanel, measurePanel }.
// Returns { draw(alpha) }.
export function createFrameDrawer({ renderer, readout, session, setup, choices, chosenTrack, players, panels }) {
  const { setupPanel, raceBar, resultsPanel, tuningPanel, measurePanel } = panels;
  // Whether the canvas shows a drawn frame, which the setup screen clears once (its HUDs too).
  let canvasDrawn = false;
  // When the last frame was drawn, for the cameras' time step.
  let lastDrawAt = null;

  // Nothing is drawn in 3D on the setup screen (its picture covers the canvas) or while a course is built (the
  // loading screen covers everything).
  function draw(alpha) {
    const now = performance.now();
    const dt = lastDrawAt === null ? 0 : Math.min((now - lastDrawAt) / 1000, MAX_FRAME_SECONDS);
    lastDrawAt = now;
    // The Measure tool draws its own frames (from the setup screen; a race cannot start meanwhile).
    if (measurePanel.isRunning()) {
      setupPanel.hide();
      raceBar.hide();
      measurePanel.frame();
      canvasDrawn = true;
    } else if (session.race) {
      drawRace(now, alpha, dt);
    } else {
      drawSetup(now);
    }
  }

  function drawSetup(now) {
    if (canvasDrawn) {
      renderer.clear();
      canvasDrawn = false;
    }
    readout.frameDrawn(now, 0, null, null, session.racers(), session.stepTimer.summary());
    tuningPanel.setVisible(false);
    raceBar.hide();
    resultsPanel.hide();
    setupPanel.show(setup, choices, players());
  }

  function drawRace(now, alpha, dt) {
    const { race } = session;
    setupPanel.hide();
    renderer.draw(race, session.racers(), alpha, dt);
    canvasDrawn = true;
    tuningPanel.setReadout(readout.frameDrawn(now, performance.now() - now, race, chosenTrack(), session.racers(), session.stepTimer.summary()));
    const racing = race.phase !== RACE_PHASES.RESULTS;
    tuningPanel.setVisible(racing);
    raceBar.show({
      clockText: describeClock(race),
      countdownText: describeCountdown(race),
      tuningOpen: tuningPanel.isOpen(),
      barShown: racing,
    });
    if (racing) {
      resultsPanel.hide();
    } else {
      resultsPanel.show(standingRows(race), session.racers(), raceSummary());
    }
  }

  // The choices cannot change during a race (index.js's choose), so they are what was raced.
  function raceSummary() {
    const courseName = COURSES.find((course) => course.id === choices.courseId).name;
    return describeRaceSummary(courseName, choices.engineClass, session.race.laps);
  }

  return { draw };
}
