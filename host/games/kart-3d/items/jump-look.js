// How the jump looks (M8d): at the launch a puff of dust and a ring of sparkles burst out under the kart, from the
// shared bursts (burst-look.js; only the sparkles glow on High quality). Only drawing: each kart's
// item.jumpedAt (jump.js) is watched, and a change means a launch. A frame allocates nothing. Used by
// item-drawing.js.

// The puff of dust and the sparkles: how many, how far or fast they spread, how high over the road they start.
const DUST = { count: 22, reach: 1.9, height: 0.15 };
const SPARKLES = { count: 30, speed: 7, height: 0.35 };

// Returns { update(race, track, poses, dt), dispose() } (item-drawing.js's shape). `bursts` is burst-look.js's.
export function createJumpDrawing(scene, bursts) {
  // Each kart's jumpedAt as last seen, by its place in race.karts; the race they are for.
  const seen = [];
  let shownRace = null;
  const at = { x: 0, y: 0, z: 0 };

  function update(race, track, poses) {
    if (!race) {
      return;
    }
    // Plain loops, not forEach: a closure a frame would allocate.
    if (race !== shownRace) {
      shownRace = race;
      seen.length = 0;
      for (const kart of race.karts) {
        seen.push(kart.item?.jumpedAt ?? null);
      }
    }
    for (let index = 0; index < race.karts.length; index += 1) {
      const jumpedAt = race.karts[index].item?.jumpedAt ?? null;
      if (jumpedAt !== seen[index]) {
        seen[index] = jumpedAt;
        puffUnder(poses[index]);
      }
    }
  }

  function puffUnder(pose) {
    burstAt(pose, DUST.height);
    bursts.smoke(at, DUST.count, DUST.reach);
    burstAt(pose, SPARKLES.height);
    bursts.sparkles(at, SPARKLES.count, SPARKLES.speed);
  }

  // `at` set `height` over the road under the kart, along its up.
  function burstAt(pose, height) {
    at.x = pose.position.x + pose.up.x * height;
    at.y = pose.position.y + pose.up.y * height;
    at.z = pose.position.z + pose.up.z * height;
  }

  return { update, dispose() {} };
}
