export {
  EIP1967_IMPLEMENTATION_SLOT,
  extractImplementationFromSlot,
  readImplementationSlot,
} from './chain/eip1967.js';

export type {
  Eip1967ReadResult,
  Eip1967ReadOk,
  Eip1967ReadError,
} from './chain/eip1967.js';

export {
  UPGRADED_EVENT,
  readUpgradeEvents,
} from './chain/upgradeEvents.js';

export type {
  UpgradeEvent,
  UpgradeEventsReadResult,
  UpgradeEventsReadOk,
  UpgradeEventsReadError,
} from './chain/upgradeEvents.js';
