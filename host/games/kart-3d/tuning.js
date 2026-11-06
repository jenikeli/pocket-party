// Every number of the 3D race that is tuned by feel (from M7a on), in one place: its value, the range of its
// slider and what it means. The rules read the live values from `tuning`; the host's tuning panel
// (tuning-panel.js) moves them while driving, and its Copy values button gives them back as text, to be written
// in here as the new defaults. Values last until the host page reloads. Plain data, unit tested in Node.
//
// A kart is 2 units long. Angles are in degrees and turn rates in degrees per second, which read more easily on a
// slider than radians. MK8DX's numbers (docs/mk8dx-reference.md, level 10) are noted where a default came from.

import { ITEM_TUNABLES } from './items/item-tuning.js';

export const TUNABLES = Object.freeze([
  // 16 kart lengths a second, tuned by feel on the M7a device run to feel like MK8DX's 150cc (M6 guessed 24).
  // Every speed-based rule scales with it.
  { key: 'topSpeed', group: 'Speed', label: 'Top speed', unit: 'units/s', min: 12, max: 48, step: 0.5, value: 32 },

  // How hard a small stick or tilt turns: the slope of the steering near the middle. 37.8 is MK8DX's 0.011
  // radians a frame (Drive_DirRotH), the M6 steering, kept so small movements feel the same.
  { key: 'steerRate', group: 'Steering', label: 'Turn near the middle', unit: 'deg/s', min: 15, max: 80, step: 0.5, value: 37.8 },
  // The turn at full stick or tilt, tuned on the M7a device run: 67 deg/s turns a circle of radius 13.7 kart
  // lengths at top speed (32), against 18 for the M6 steering, which the M6c device run found far too wide.
  { key: 'fullSteerRate', group: 'Steering', label: 'Turn at full stick', unit: 'deg/s', min: 30, max: 180, step: 1, value: 67 },
  // How the turn bends from the middle's slope up to the full turn: 1 is a straight line, higher keeps more of
  // the stick's travel gentle and puts the extra turn at the end.
  { key: 'steerCurve', group: 'Steering', label: 'Steering curve', unit: '', min: 1, max: 6, step: 0.1, value: 3 },
  // The tightest drift, stick pushed fully into it, tuned on the M7a device run. It must turn tighter than a full
  // normal turn, as in MK8DX, whose data has the drift at 1.73 times the steering (Drift_DirRotH 0.019 against
  // Drive_DirRotH 0.011 radians a frame; the unit of both is our reading).
  { key: 'driftTightRate', group: 'Steering', label: 'Drift, stick into it', unit: 'deg/s', min: 40, max: 200, step: 0.5, value: 72.5 },
  // The widest drift, stick pushed away, as a share of the tightest (a guess; MK8DX's data has only the tightest).
  { key: 'driftWideShare', group: 'Steering', label: 'Drift, stick away (share)', unit: '', min: 0, max: 1, step: 0.01, value: 0.35 },

  // A hit (not resting against the wall) keeps 1 - graze loss - hit loss x sin(angle) of the speed along the wall,
  // so a square hit costs most, and even a glancing one costs something: the wall is never the fast line.
  { key: 'wallHitLoss', group: 'Walls', label: 'Speed lost, square hit', unit: 'share', min: 0, max: 1, step: 0.01, value: 0.8 },
  { key: 'wallGrazeLoss', group: 'Walls', label: 'Speed lost, any hit', unit: 'share', min: 0, max: 0.5, step: 0.01, value: 0.3 },
  // The kart bounces back off the wall with this share of its speed into it, and at least the bounce speed, so
  // even a gentle hit visibly pushes it away.
  { key: 'wallBounce', group: 'Walls', label: 'Bounce', unit: 'share', min: 0, max: 1, step: 0.01, value: 0.4 },
  { key: 'wallBounceSpeed', group: 'Walls', label: 'Least bounce speed', unit: 'units/s', min: 0, max: 10, step: 0.1, value: 3 },
  // Rubbing along a wall drags the kart, per second while touching.
  { key: 'wallScrape', group: 'Walls', label: 'Scrape drag', unit: 'per s', min: 0, max: 6, step: 0.1, value: 3 },
  // A kart meeting a wall at under this angle turns to slide along it instead of stopping nose first.
  { key: 'wallAlignDegrees', group: 'Walls', label: 'Turn along it under', unit: 'deg', min: 0, max: 90, step: 1, value: 45 },

  // Karts bouncing off each other: the share of their closing speed that bounces back (1 would be perfectly
  // elastic), and the speed they part at however gently they touched.
  { key: 'bumpBounce', group: 'Bumps', label: 'Bounce', unit: 'share', min: 0, max: 1, step: 0.01, value: 0.25 },
  { key: 'bumpMinSpeed', group: 'Bumps', label: 'Least parting speed', unit: 'units/s', min: 0, max: 15, step: 0.1, value: 5 },
  // A kart's mass is its weight times this share standing still, rising to its full weight at top speed (MK8DX's
  // rule; its own numbers are not in the reference).
  { key: 'standingMassShare', group: 'Bumps', label: 'Mass standing still', unit: 'share', min: 0.1, max: 1, step: 0.05, value: 0.7 },
  // Grip takes away sideways sliding, per second. Right after a bump or a wall hit the grip is the slide grip for
  // the slide time, so the kart visibly slides away instead of stopping dead.
  { key: 'grip', group: 'Bumps', label: 'Grip', unit: 'per s', min: 1, max: 20, step: 0.5, value: 8 },
  { key: 'slideGrip', group: 'Bumps', label: 'Grip after a bump', unit: 'per s', min: 0, max: 8, step: 0.1, value: 1.5 },
  { key: 'slideSeconds', group: 'Bumps', label: 'Slide after a bump', unit: 's', min: 0, max: 1.5, step: 0.05, value: 0.35 },

  // The spin-boost posts in anti-gravity (M9; spin-posts.js): a kart touching one is slid round it and spin-boosted,
  // and cannot be spun by a post again for the cooldown. Their bounce was removed after the M9 device run.
  { key: 'postCooldown', group: 'Spin posts', label: 'Cooldown', unit: 's', min: 0, max: 3, step: 0.05, value: 0.6 },

  // The hop on pressing Drift: how high and how long in the air. The M6 hop was 0.23 high and 0.27 s, and
  // MK8DX's is higher; 0.4 was tuned on the M7a device run.
  { key: 'hopHeight', group: 'Hop and body', label: 'Hop height', unit: 'units', min: 0.1, max: 1.5, step: 0.05, value: 0.4 },
  { key: 'hopSeconds', group: 'Hop and body', label: 'Hop time', unit: 's', min: 0.1, max: 0.6, step: 0.01, value: 0.27 },
  // How far the body turns into a drift, and about how long it takes to ease there and back.
  { key: 'driftLeanDegrees', group: 'Hop and body', label: 'Drift lean', unit: 'deg', min: 0, max: 45, step: 1, value: 23 },
  { key: 'leanSeconds', group: 'Hop and body', label: 'Lean time', unit: 's', min: 0.05, max: 1, step: 0.01, value: 0.3 },
  // The trick's barrel roll and the spin boost's turn.
  { key: 'trickSeconds', group: 'Hop and body', label: 'Trick roll time', unit: 's', min: 0.2, max: 1.2, step: 0.05, value: 0.5 },
  { key: 'spinSeconds', group: 'Hop and body', label: 'Spin time', unit: 's', min: 0.2, max: 1.2, step: 0.05, value: 0.5 },

  // A held Go arriving this long after "2" appears rocket starts (earlier stalls), by arrival at the host. The
  // M6c device run's presses arrived +0.13 to +0.57 s after "2"; the M7a device run moved the window to 0.3-1.2 s,
  // so it runs 0.2 s past "1". The boost is longest for a press at the start of the window (see Boosts).
  { key: 'rocketFrom', group: 'Timing windows', label: 'Rocket start from', unit: 's after "2"', min: -0.5, max: 1, step: 0.01, value: 0.3 },
  { key: 'rocketTo', group: 'Timing windows', label: 'Rocket start to', unit: 's after "2"', min: 0, max: 1.5, step: 0.01, value: 1.2 },
  // Drift pressed this long before the kart crosses a ramp's lip, or this long after, does a trick.
  { key: 'trickEarly', group: 'Timing windows', label: 'Trick, before the lip', unit: 's', min: 0, max: 0.5, step: 0.01, value: 0.1 },
  { key: 'trickLate', group: 'Timing windows', label: 'Trick, after the lip', unit: 's', min: 0, max: 0.6, step: 0.01, value: 0.3 },

  // How fast each boost pushes the kart, as a share of top speed: the gap between normal and boosted speed.
  // MK8DX's level 10 gives the mini-turbo 1.1 and the jump boost 1.35; the dash panel and rocket start are
  // "like a mushroom" (the jump boost's speed), slipstream is "modest" and the spin boost about a mini-turbo.
  { key: 'miniTurboSpeed', group: 'Boosts', label: 'Mini-turbo speed', unit: 'x top', min: 1, max: 2, step: 0.01, value: 1.1 },
  { key: 'jumpBoostSpeed', group: 'Boosts', label: 'Trick boost speed', unit: 'x top', min: 1, max: 2, step: 0.01, value: 1.35 },
  { key: 'dashPanelSpeed', group: 'Boosts', label: 'Dash panel speed', unit: 'x top', min: 1, max: 2, step: 0.01, value: 1.35 },
  { key: 'rocketStartSpeed', group: 'Boosts', label: 'Rocket start speed', unit: 'x top', min: 1, max: 2, step: 0.01, value: 1.35 },
  { key: 'slipstreamSpeed', group: 'Boosts', label: 'Slipstream speed', unit: 'x top', min: 1, max: 2, step: 0.01, value: 1.08 },
  { key: 'spinBoostSpeed', group: 'Boosts', label: 'Spin boost speed', unit: 'x top', min: 1, max: 2, step: 0.01, value: 1.1 },
  // A rocket start boosts longest for a press arriving at "Rocket start from", falling evenly to the shortest at
  // "Rocket start to" (guesses; M6c gave every rocket start 1 s).
  { key: 'rocketBestSeconds', group: 'Boosts', label: 'Rocket start, best timing', unit: 's', min: 0.2, max: 2, step: 0.05, value: 1 },
  { key: 'rocketWorstSeconds', group: 'Boosts', label: 'Rocket start, latest timing', unit: 's', min: 0.1, max: 2, step: 0.05, value: 0.3 },

  // Gliding off a glide ramp (M9; kart-glide.js). Gravity is gentler while the glider is open and stronger while
  // Brake dives; both are 150cc's, and other engine classes scale them with their speed squared, so every class
  // comes down in the same place. At 7.5, off Palm Bay Airport's glide ramp at top speed, a glide with no dive comes
  // down onto the gap's line just before the beach road; boosted off the dash panel before the ramp (as most karts
  // are), it lands 15 to 20 units down the road, and a trick adds a few more (6.5 sent some floats into the turn
  // after the landing). The glider flies at MK8DX's air speed (8.05 against a ground top speed of 7.75), turns at
  // a share of the ground steering and banks with it. The camera rides higher and further back while gliding.
  { key: 'glideGravity', group: 'Gliding', label: 'Gravity, floating', unit: 'units/s^2', min: 1, max: 20, step: 0.1, value: 7.5 },
  { key: 'glideDiveGravity', group: 'Gliding', label: 'Gravity, diving', unit: 'units/s^2', min: 5, max: 50, step: 0.5, value: 22 },
  { key: 'glideSpeedShare', group: 'Gliding', label: 'Air speed', unit: 'x top', min: 0.8, max: 1.3, step: 0.01, value: 1.04 },
  { key: 'glideTurnShare', group: 'Gliding', label: 'Turn, share of steering', unit: 'share', min: 0.1, max: 1.5, step: 0.05, value: 0.6 },
  { key: 'glideBankDegrees', group: 'Gliding', label: 'Bank at full steer', unit: 'deg', min: 0, max: 60, step: 1, value: 25 },
  { key: 'glideCameraLift', group: 'Gliding', label: 'Camera higher by', unit: 'units', min: 0, max: 6, step: 0.1, value: 1.5 },
  { key: 'glideCameraPullBack', group: 'Gliding', label: 'Camera further back by', unit: 'units', min: 0, max: 8, step: 0.1, value: 2 },

  // The CPU drivers' catch-up (M7e; cpu-pace.js), mild as in MK8DX: a CPU kart behind the leading player gets up
  // to this share more top speed, one ahead up to this share less, in full at the range's distance (guesses; 0
  // turns it off).
  { key: 'cpuCatchUp', group: 'CPU drivers', label: 'Catch-up share', unit: 'x top', min: 0, max: 0.2, step: 0.01, value: 0.05 },
  { key: 'cpuCatchUpRange', group: 'CPU drivers', label: 'Catch-up in full at', unit: 'units', min: 20, max: 600, step: 10, value: 200 },
  // How the CPU drivers drive (M7e; cpu-driver.js): they steer toward the point on their racing line this many
  // seconds of driving ahead (at least 5 units; longer is smoother but cuts corners), and plan their braking for
  // corners as if braking this hard (a kart brakes at 30 units/s^2: less leaves a margin).
  { key: 'cpuLookAhead', group: 'CPU drivers', label: 'Steering looks ahead', unit: 's', min: 0.1, max: 1, step: 0.01, value: 0.35 },
  { key: 'cpuBraking', group: 'CPU drivers', label: 'Braking planned with', unit: 'units/s^2', min: 5, max: 30, step: 0.5, value: 22 },

  // The chase camera (chase-camera.js). It felt right on the M6c device run.
  { key: 'cameraBehind', group: 'Camera', label: 'Behind the kart', unit: 'units', min: 2, max: 15, step: 0.1, value: 6.5 },
  { key: 'cameraAbove', group: 'Camera', label: 'Above the kart', unit: 'units', min: 0.5, max: 6, step: 0.1, value: 2.4 },
  { key: 'cameraLookAhead', group: 'Camera', label: 'Looks ahead', unit: 'units', min: 0, max: 12, step: 0.1, value: 4 },
  { key: 'cameraLookAbove', group: 'Camera', label: 'Looks above', unit: 'units', min: -1, max: 3, step: 0.1, value: 1 },
  { key: 'fieldOfView', group: 'Camera', label: 'Field of view', unit: 'deg', min: 40, max: 100, step: 1, value: 65 },
  // How quickly the camera catches up, per second: its direction (a turn shows the kart's side), its up (small
  // bumps do not shake the picture) and its position.
  { key: 'cameraTurnRate', group: 'Camera', label: 'Turn catch-up', unit: 'per s', min: 1, max: 20, step: 0.5, value: 5 },
  { key: 'cameraUpRate', group: 'Camera', label: 'Up catch-up', unit: 'per s', min: 1, max: 20, step: 0.5, value: 3 },
  { key: 'cameraFollowRate', group: 'Camera', label: 'Position catch-up', unit: 'per s', min: 2, max: 40, step: 1, value: 12 },
  // While boosting the camera drops back and widens its view.
  { key: 'boostPullBack', group: 'Camera', label: 'Boost pull-back', unit: 'units', min: 0, max: 6, step: 0.1, value: 2 },
  { key: 'boostWiden', group: 'Camera', label: 'Boost widen', unit: 'deg', min: 0, max: 20, step: 1, value: 8 },

  // The look (M7c), drawn by renderer.js. Bloom makes whatever is brighter than the threshold glow (sparks,
  // flames, glowing panels, the sun's shine on paint and sea); its strength and radius were M6a's starting
  // values (0.4 and 0.2) until the M7d1 device run on the iPad set a softer, wider glow. Bloom only shows on the High quality setting (quality.js). Exposure brightens or darkens the whole
  // picture before tone mapping.
  { key: 'bloomStrength', group: 'Look', label: 'Bloom strength', unit: '', min: 0, max: 2, step: 0.05, value: 0.2 },
  { key: 'bloomRadius', group: 'Look', label: 'Bloom radius', unit: '', min: 0, max: 1, step: 0.05, value: 0.3 },
  { key: 'bloomThreshold', group: 'Look', label: 'Bloom threshold', unit: '', min: 0.5, max: 3, step: 0.05, value: 1 },
  { key: 'exposure', group: 'Look', label: 'Exposure', unit: '', min: 0.5, max: 2, step: 0.05, value: 1 },
  // How bright the dash panels are drawn (M7d1). Above about 1.3 their yellow stripes pass the bloom threshold;
  // at M7c's 2.5 they bloomed too bright on the iPad, and the M7d1 device run chose 1.6 (a little glow under
  // the softer bloom above).
  { key: 'dashPanelGlow', group: 'Look', label: 'Dash panel glow', unit: '', min: 0.5, max: 3, step: 0.05, value: 1.6 },

  // How strong the light from the course is (M7d4b2): the environment map's share of the lighting, which stands
  // in for most of the flat sky light. Software screenshots suggested 1.5; the M7d4b2 device run on the iPad
  // chose 0.7. The plain course (plain-course.js) lights itself from the sky's environment map at this strength.
  { key: 'courseLightStrength', group: 'Look', label: 'Light from the course, strength', unit: '', min: 0, max: 3, step: 0.05, value: 0.7 },

  // The items (M8), in their own file beside their rules.
  ...ITEM_TUNABLES,
]);

// The live values, by key. The rules read from here every step, so a slider changes the race at once.
export const tuning = {};
resetTuning();

// Back to the defaults above (the panel's Reset, and tests that changed a value).
export function resetTuning() {
  for (const tunable of TUNABLES) {
    tuning[tunable.key] = tunable.value;
  }
}

// Sets one value, kept inside its slider's range. Unknown keys are an error: they would be a typo.
export function setTuning(key, value) {
  const tunable = TUNABLES.find((each) => each.key === key);
  if (!tunable) {
    throw new Error(`No tuned number is called ${key}`);
  }
  tuning[key] = Math.min(Math.max(value, tunable.min), tunable.max);
}

// The text Copy values puts on the clipboard: one `key = value` line per number, the changed ones marked with
// their default, so they can be pasted back into this file.
export function describeTuning() {
  const lines = TUNABLES.map(({ key, value }) => {
    const changed = tuning[key] !== value ? `   (default ${value})` : '';
    return `${key} = ${tuning[key]}${changed}`;
  });
  return ['3D race tuning (host/games/kart-3d/tuning.js)', ...lines].join('\n');
}
