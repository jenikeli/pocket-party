// Saltline's map registry: the playable maps by id. Used by session.js and the setup screen.

import { HARBOR } from './harbor.js';
import { DUSTLINE } from './dustline.js';
import { TERRACOTTA } from './terracotta.js';
import { FOUNDRY } from './foundry.js';

export const MAPS = Object.freeze({ [HARBOR.id]: HARBOR, [DUSTLINE.id]: DUSTLINE, [TERRACOTTA.id]: TERRACOTTA, [FOUNDRY.id]: FOUNDRY });
export const DEFAULT_MAP = HARBOR.id;
