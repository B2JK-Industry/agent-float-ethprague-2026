import { toFunctionSelector, type Abi, type AbiFunction } from 'viem';

import { RISKY_SELECTOR_NAMES, isRiskySelectorName } from './riskySelectors.js';

export interface SelectorMatch {
  readonly name: string;
  readonly selector: `0x${string}`;
  readonly stateMutability: AbiFunction['stateMutability'];
  readonly inputs: ReadonlyArray<string>;
}

export interface AbiRiskyDiff {
  readonly added: ReadonlyArray<SelectorMatch>;
  readonly removed: ReadonlyArray<SelectorMatch>;
  readonly addedAny: boolean;
  readonly removedAny: boolean;
}

function describeInputs(fn: AbiFunction): string[] {
  return fn.inputs.map((input) => input.type);
}

function isAbiFunction(item: Abi[number]): item is AbiFunction {
  return item.type === 'function';
}

function selectorOf(fn: AbiFunction): `0x${string}` {
  return toFunctionSelector(fn);
}

function indexFunctions(abi: Abi | null | undefined): Map<string, AbiFunction> {
  const out = new Map<string, AbiFunction>();
  if (!abi) return out;
  for (const item of abi) {
    if (!isAbiFunction(item)) continue;
    out.set(selectorOf(item), item);
  }
  return out;
}

function toMatch(fn: AbiFunction): SelectorMatch {
  return {
    name: fn.name,
    selector: selectorOf(fn),
    stateMutability: fn.stateMutability,
    inputs: describeInputs(fn),
  };
}

export function diffAbiRiskySelectors(
  previousAbi: Abi | null | undefined,
  currentAbi: Abi | null | undefined,
): AbiRiskyDiff {
  const prev = indexFunctions(previousAbi);
  const curr = indexFunctions(currentAbi);

  const added: SelectorMatch[] = [];
  const removed: SelectorMatch[] = [];

  for (const [selector, fn] of curr) {
    if (prev.has(selector)) continue;
    if (isRiskySelectorName(fn.name)) {
      added.push(toMatch(fn));
    }
  }

  for (const [selector, fn] of prev) {
    if (curr.has(selector)) continue;
    if (isRiskySelectorName(fn.name)) {
      removed.push(toMatch(fn));
    }
  }

  // Stable order: by name, then by selector.
  const cmp = (a: SelectorMatch, b: SelectorMatch) =>
    a.name.localeCompare(b.name) || a.selector.localeCompare(b.selector);
  added.sort(cmp);
  removed.sort(cmp);

  return {
    added,
    removed,
    addedAny: added.length > 0,
    removedAny: removed.length > 0,
  };
}

export { RISKY_SELECTOR_NAMES, isRiskySelectorName };
export type { RiskySelectorName } from './riskySelectors.js';
