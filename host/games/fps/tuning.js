// Every shooter number that is not map data: movement, the weapon table, grenades, respawn, and match modes.
// Tune here. Used by the rules (player.js, weapons.js, ballistics.js, grenades.js,
// modes.js, bots.js) and the host's drawing.

export const TUNING = Object.freeze({
  // Body: the player is a box of this half-width and height; eye height is for the camera.
  radius: 0.4, height: 1.8, crouchHeight: 1.15, eyeHeight: 1.62, crouchEye: 1.0, stepHeight: 0.45,
  // Movement: m/s and m/s squared.
  silent: 2.2, run: 3.8, sprint: 6.4, crouchSpeed: 1.9, adsSpeed: 2.4,
  accelGround: 34, decelGround: 26, accelAir: 9, gravity: 21, jumpApex: 0.9,
  // The stick: under this push is a silent walk, over the second is a sprint.
  silentBelow: 0.45, sprintAbove: 0.9,
  stride: { run: 1.55, sprint: 2.1 },
  // Looking: radians for a drag across the whole look pad, and the up-down limit.
  lookRadians: 3.2, adsLook: 0.6, pitchLimit: 1.5,
  maxHp: 100, respawnSeconds: 3, protectSeconds: 2, introSeconds: 3,
  headMultiplier: 2.5, torsoMultiplier: 1, legMultiplier: 0.75,
  grenade: Object.freeze({
    fuse: 2.2, throwSpeed: 15, lobSpeed: 7, gravity: 21, bounce: 0.4, radius: 0.12,
    fragRadius: 7, fragDamage: 130, smokeRadius: 3.4, smokeSeconds: 14, flashSeconds: 3.5, flashRadius: 22,
  }),
  modes: Object.freeze({
    tdm: Object.freeze({ id: 'tdm', name: 'Team Deathmatch', teams: true, targetScore: 30, seconds: 480 }),
    ffa: Object.freeze({ id: 'ffa', name: 'Free For All', teams: false, targetScore: 20, seconds: 480 }),
    sad: Object.freeze({ id: 'sad', name: 'Search and Defuse', teams: true, targetScore: 1, seconds: 240, uplink: true }),
    relay: Object.freeze({ id: 'relay', name: 'Relay Recovery', teams: true, cooperative: true, targetScore: 3, seconds: 900 }),
  }),
  // Bot skill: seconds before a bot reacts to a new enemy, degrees of aim error, and its shots per burst.
  botLevels: Object.freeze({ 1: { react: 0.8, error: 5, burst: 3 }, 2: { react: 0.5, error: 3, burst: 5 }, 3: { react: 0.3, error: 1.6, burst: 8 } }),
});

// damage per hit (per pellet for a shotgun), rpm, auto fire, magazine, reserve, reload seconds (per shell when
// perShell), spread in degrees (standing, plus moving, crouching multiplier), recoil in radians per shot, range in
// metres, wall penetration (share of damage kept), the speed multiplier and the zoom steps (field of view).
export const WEAPONS = Object.freeze({
  rifle: { id: 'rifle', name: 'Ranger AR-9', slot: 'primary', damage: 40, rpm: 600, auto: true, mag: 30, reserve: 90, reload: 2.5, spread: 0.6, moveSpread: 3.2, crouchMul: 0.6, pellets: 1, recoil: 0.014, recoilYaw: 0.006, range: 120, pen: 0.5, speedMul: 1, zoom: [70, 52] },
  carbine: { id: 'carbine', name: 'Tactical Carbine', slot: 'primary', damage: 30, rpm: 750, auto: true, mag: 30, reserve: 120, reload: 2.0, spread: 0.45, moveSpread: 2.6, crouchMul: 0.6, pellets: 1, recoil: 0.009, recoilYaw: 0.004, range: 110, pen: 0.4, speedMul: 1.04, zoom: [70, 54] },
  shotgun: { id: 'shotgun', name: 'Combat Shotgun', slot: 'primary', damage: 9, rpm: 70, auto: false, mag: 8, reserve: 32, reload: 0.5, perShell: true, spread: 4.5, moveSpread: 1.5, crouchMul: 0.8, pellets: 8, recoil: 0.05, recoilYaw: 0.01, range: 30, pen: 0.2, speedMul: 0.97, zoom: [70, 62] },
  sniper: { id: 'sniper', name: 'Sniper Rifle', slot: 'primary', damage: 100, rpm: 45, auto: false, mag: 5, reserve: 20, reload: 3.0, spread: 0.05, moveSpread: 9, crouchMul: 0.7, pellets: 1, recoil: 0.06, recoilYaw: 0.004, range: 250, pen: 0.6, speedMul: 0.92, zoom: [70, 30, 15] },
  pistol: { id: 'pistol', name: 'Sidearm', slot: 'sidearm', damage: 22, rpm: 380, auto: false, mag: 15, reserve: 60, reload: 1.6, spread: 0.7, moveSpread: 2.4, crouchMul: 0.6, pellets: 1, recoil: 0.02, recoilYaw: 0.005, range: 70, pen: 0.3, speedMul: 1.02, zoom: [70, 60] },
  knife: { id: 'knife', name: 'Combat Knife', slot: 'melee', damage: 40, rpm: 150, auto: false, mag: 0, reserve: 0, reload: 0, spread: 0, moveSpread: 0, crouchMul: 1, pellets: 1, recoil: 0, recoilYaw: 0, range: 2.2, pen: 0, speedMul: 1.12, zoom: [70] },
});

export const PRIMARIES = Object.freeze(['rifle', 'carbine', 'shotgun', 'sniper']);
export const SLOT_ORDER = Object.freeze(['primary', 'sidearm', 'melee']);
export const GRENADE_KINDS = Object.freeze(['frag', 'smoke', 'flash']);
