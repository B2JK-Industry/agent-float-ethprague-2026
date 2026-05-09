// Closed list of selector names that, when newly added in an upgrade, raise an
// alert. Closed-set per docs/04-technical-design.md "ABI Risk" section.
// Adding a name here is a P1 polish item, not a P0 fix.

export const RISKY_SELECTOR_NAMES = [
  'sweep',
  'withdraw',
  'setOwner',
  'setAdmin',
  'transferOwnership',
  'mint',
  'pause',
  'unpause',
  'upgradeTo',
  'upgradeToAndCall',
  'call',
  'delegatecall',
] as const;

export type RiskySelectorName = (typeof RISKY_SELECTOR_NAMES)[number];

const RISKY_SET = new Set<string>(RISKY_SELECTOR_NAMES);

export function isRiskySelectorName(name: string): boolean {
  return RISKY_SET.has(name);
}
