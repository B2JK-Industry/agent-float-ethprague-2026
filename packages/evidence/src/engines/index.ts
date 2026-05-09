// Single import surface for the unified Engine architecture.
// Importing this file registers every engine with the global registry
// (side-effect import ordering matters — keep alphabetical for
// deterministic merge-conflict surface).

import { addrEthEngine } from '../eval/addr-eth.js';
import { descriptionEngine } from '../eval/description.js';
import { urlEngine } from '../eval/url.js';
import { ensEngine } from './ensEngine.js';
import { githubEngine } from './githubEngine.js';
import { onchainEngine } from './onchainEngine.js';
import { sourcifyEngine } from './sourcifyEngine.js';
import { registerEngine, clearEngineRegistry } from './registry.js';

// Register all engines exactly once. This module is imported by the
// orchestrator + tests so the registry is hydrated before the runner
// is invoked.
//
// NOTE: We deliberately DO NOT register the `com.github` record engine
// from `eval/com-github.ts` because it duplicates the GitHub source
// engine's signal extraction. Cleanup pass will fold its anti-signal
// rules into githubEngine and delete the record-engine variant.
let registered = false;
function registerAll(): void {
  if (registered) return;
  registerEngine(addrEthEngine);
  registerEngine(descriptionEngine);
  registerEngine(urlEngine);
  registerEngine(sourcifyEngine);
  registerEngine(githubEngine);
  registerEngine(onchainEngine);
  registerEngine(ensEngine);
  registered = true;
}

export function ensureEnginesRegistered(): void {
  registerAll();
}

export function resetEnginesForTesting(): void {
  clearEngineRegistry();
  registered = false;
}

// Eager register on module load so any consumer importing the runner
// or aggregator gets a populated registry.
registerAll();

export { sourcifyEngine, githubEngine, onchainEngine, ensEngine };
export { runEngines } from './runner.js';
export {
  registerEngine,
  listRegisteredEngines,
  clearEngineRegistry,
  isRecordEngine,
  isSourceEngine,
} from './registry.js';
export type {
  AnyEngine,
  EngineCategory,
  EngineContribution,
  EngineId,
  SourceEngine,
  SourceEngineId,
} from './types.js';
export { recordResultToContribution, emptyContribution } from './types.js';
