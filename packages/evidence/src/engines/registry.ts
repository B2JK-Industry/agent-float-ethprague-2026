// Unified engine registry. Holds both RecordEngines (record-keyed,
// reused from eval/) and SourceEngines (per-source-fetcher wrappers).
// Source-of-truth for "which engines exist and contribute to the score".

import type { AnyEngine, EngineId, SourceEngine } from './types.js';
import type { RecordEngine, RecordKey } from '../eval/types.js';

const REGISTRY = new Map<EngineId, AnyEngine>();

export function registerEngine(engine: AnyEngine): void {
  const id = getEngineId(engine);
  if (REGISTRY.has(id)) {
    throw new Error(`Engine already registered: ${id}`);
  }
  REGISTRY.set(id, engine);
}

export function getEngineId(engine: AnyEngine): EngineId {
  // RecordEngine uses `key`; SourceEngine uses `id`. Normalize.
  if ((engine as SourceEngine).category === 'source') {
    return (engine as SourceEngine).id;
  }
  return (engine as RecordEngine).key;
}

export function getRegisteredEngine(id: EngineId): AnyEngine | undefined {
  return REGISTRY.get(id);
}

export function listRegisteredEngines(): AnyEngine[] {
  return Array.from(REGISTRY.values());
}

export function clearEngineRegistry(): void {
  REGISTRY.clear();
}

export function isRecordEngine(engine: AnyEngine): engine is RecordEngine {
  return (engine as RecordEngine).key !== undefined;
}

export function isSourceEngine(engine: AnyEngine): engine is SourceEngine {
  return (engine as SourceEngine).category === 'source';
}

export function isRecordKey(id: EngineId): id is RecordKey {
  return id === 'addr.eth' || id === 'com.github' || id === 'description' || id === 'url' || id === 'ens-registration';
}
