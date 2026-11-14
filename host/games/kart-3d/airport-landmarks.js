// Palm Bay Airport's landmarks (M9), placed where airport-layout.js says: the terminal with an airliner at each jet
// bridge, another airliner and two small prop planes on the apron, the control tower, the taxiway's hangars, the
// big hangar round the anti-gravity ring, the baggage conveyor under the jump, the plane taking off each lap, and
// out in the sea the rocky islands and boats. Each landmark stands on
// its own origin facing +x and adds itself to no part: here each goes into one (buildings, planes and the conveyor
// with the props, the islands and boats with the surroundings, the flying plane with the sky). Used by
// airport-scenery.js.

import { buildTerminal, terminalGates } from './kit/terminal.js';
import { buildControlTower } from './kit/control-tower.js';
import { buildAirliner, AIRLINER_DOOR } from './kit/airliner.js';
import { buildPropPlane } from './kit/prop-plane.js';
import { buildHangar } from './kit/hangar.js';
import { buildBigHangar } from './kit/hangar-big.js';
import { buildBaggageConveyor } from './kit/baggage-conveyor.js';
import { buildTakeOffPlane } from './kit/take-off-plane.js';
import { buildRockIsland } from './kit/rock-island.js';
import { kitPart } from './kit/kit.js';
import { KIT_PARTS } from './kit/layout-rules.js';
import { addBoats } from './seaside-surroundings.js';
import {
  TERMINAL, GATE_LIVERIES, APRON_AIRLINERS, PROP_PLANES, CONTROL_TOWER, HANGARS, BIG_HANGAR, CONVEYOR, TAKE_OFF,
  ISLANDS, BOATS, gatePlaneSpot,
} from './airport-layout.js';

// Stands `landmark` ({ object, update }) at `spot` ({ x, z, heading } and, if not on the airfield at 0, y) in
// `kit.world` (callers pass a part's kit, kitPart, so it lands in that part's group), and returns it.
export function placeLandmark(kit, landmark, { x, z, y = 0, heading }) {
  landmark.object.position.set(x, y, z);
  landmark.object.rotation.y = heading;
  kit.world.add(landmark.object);
  return landmark;
}

// Adds every landmark; `kit` is the course's (kit/kit.js), `seaLevel` the sea's height. Returns { update(dt) } for
// those that move (the tower's radar, the conveyor, the plane taking off, the islands' surf, the boats).
export function buildAirportLandmarks(kit, seaLevel) {
  // One part's kit for every builder on land: the planes keep their shared shapes and maps per kit object, so the
  // flying plane, drawn in the sky's part, is built from this one too.
  const onLand = kitPart(kit, KIT_PARTS.PROPS);
  placeLandmark(onLand, buildTerminal(onLand, { length: TERMINAL.length }), TERMINAL);
  terminalGates(TERMINAL.length).forEach((gate, index) => {
    placeLandmark(onLand, buildAirliner(onLand, { livery: GATE_LIVERIES[index] }), gatePlaneSpot(TERMINAL, gate, AIRLINER_DOOR));
  });
  APRON_AIRLINERS.forEach((spot) => placeLandmark(onLand, buildAirliner(onLand, { livery: spot.livery }), spot));
  PROP_PLANES.forEach((spot) => placeLandmark(onLand, buildPropPlane(onLand), spot));
  const tower = placeLandmark(onLand, buildControlTower(onLand), CONTROL_TOWER);
  HANGARS.forEach((hangar) => placeLandmark(onLand, buildHangar(onLand, hangar), hangar));
  const bigHangar = buildBigHangar(onLand, BIG_HANGAR);
  placeLandmark(onLand, bigHangar, bigHangar.spot);
  const conveyor = placeLandmark(onLand, buildBaggageConveyor(onLand, CONVEYOR), CONVEYOR);
  const takeOff = buildTakeOffPlane(onLand, TAKE_OFF);
  kitPart(kit, KIT_PARTS.SKY).world.add(takeOff.object);
  const sea = kitPart(kit, KIT_PARTS.SURROUNDINGS);
  const islands = ISLANDS.map((island) => placeLandmark(sea, buildRockIsland(sea, island), { ...island, y: seaLevel }));
  const boats = addBoats(sea, seaLevel, BOATS);
  const moving = [tower, conveyor, takeOff, ...islands];
  // The boats rock by the time since the start (Seaside's addBoats), the others by each frame's dt.
  let time = 0;
  return {
    update(dt) {
      time += dt;
      for (const landmark of moving) {
        landmark.update(dt);
      }
      boats.bob(time);
    },
  };
}
