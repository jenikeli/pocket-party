// Where our go-kart's parts are (M7d5): its wheels, where the driver sits, holds the wheel and puts the feet,
// and the spots the particles come from. Plain numbers, no Three.js, so the effects and the tests can read them.
// Used by the kart's builders (karts/), the drivers (karts/drivers/), kart-models.js and effects.js.
//
// Model axes: +z forward, +y up, +x the kart's left; the wheels stand on y = 0. A kart is about 2 long.

// Where each wheel's middle sits (x, z) and its size, front pair first; the rear tyres are bigger. `side` is 1 for
// the kart's left, -1 for its right.
export const WHEELS = Object.freeze([
  { x: 0.6, z: 0.66, radius: 0.27, width: 0.27, front: true, side: 1 },
  { x: -0.6, z: 0.66, radius: 0.27, width: 0.27, front: true, side: -1 },
  { x: 0.64, z: -0.64, radius: 0.35, width: 0.36, front: false, side: 1 },
  { x: -0.64, z: -0.64, radius: 0.35, width: 0.36, front: false, side: -1 },
]);

// The driver's anchors, given to every design's buildDriver: `hip` the middle of the seat where the driver sits,
// `hands` where the gloves hold the steering wheel (left, right), `feet` where the shoes rest in the nose (left,
// right). [x, y, z] each.
export const SEAT = Object.freeze({
  hip: Object.freeze([0, 0.44, -0.3]),
  hands: Object.freeze([Object.freeze([0.13, 0.86, 0.27]), Object.freeze([-0.13, 0.86, 0.27])]),
  feet: Object.freeze([Object.freeze([0.13, 0.36, 0.74]), Object.freeze([-0.13, 0.36, 0.74])]),
});

// The steering wheel: its middle, its radius and how far it leans back from upright (radians).
export const STEERING = Object.freeze({ middle: Object.freeze([0, 0.86, 0.3]), radius: 0.13, lean: 0.75 });

// The exhausts' gold bell tips: the middle of each bell's mouth (left, right) and the way it points.
export const EXHAUST_TIPS = Object.freeze([Object.freeze([0.4, 0.92, -1.3]), Object.freeze([-0.4, 0.92, -1.3])]);
export const EXHAUST_POINTING = Object.freeze([0.06, 0.4, -0.92]);

// Where particles start (effects.js): sparks, smoke and dust under the rear wheels, flames out of the bells.
export const REAR_WHEEL_SPOTS = WHEELS.filter((wheel) => !wheel.front).map((wheel) => [wheel.x, 0.1, wheel.z]);
export const EXHAUST_SPOTS = EXHAUST_TIPS.map((tip) => [...tip]);
