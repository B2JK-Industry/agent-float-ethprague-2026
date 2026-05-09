import { descriptionEngine } from './description.js';
import type { RecordEngine, RecordKey } from './types.js';
import { addrEthEngine } from './addr-eth.js';

const REGISTRY = new Map<RecordKey, RecordEngine>();

export function register(engine: RecordEngine): void {
  if (REGISTRY.has(engine.key)) {
    throw new Error(`Engine already registered for key: ${engine.key}`);
  }
  REGISTRY.set(engine.key, engine);
}

export function getEngine(key: RecordKey): RecordEngine | undefined {
  return REGISTRY.get(key);
}

export function listEngines(): RecordEngine[] {
  return Array.from(REGISTRY.values());
}

export function hasEngine(key: RecordKey): boolean {
  return REGISTRY.has(key);
}

export function clearRegistry(): void {
  REGISTRY.clear();
}

register(addrEthEngine);
register(descriptionEngine);
