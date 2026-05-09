import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { getEngine } from './registry.js';
import type { EngineParams, RecordKey } from './types.js';
import { RECORD_KEYS } from './types.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const WEIGHTS_PATH = resolve(HERE, '../../../../config/evaluator-weights.json');

type WeightsFile = Partial<Record<RecordKey, EngineParams>>;

function loadWeightsFile(): WeightsFile {
  try {
    const text = readFileSync(WEIGHTS_PATH, 'utf8');
    const parsed = JSON.parse(text) as WeightsFile;
    return parsed ?? {};
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.warn(`[eval/params] failed to load ${WEIGHTS_PATH}: ${reason}`);
    return {};
  }
}

let CACHED_FILE: WeightsFile | null = null;

function getFile(): WeightsFile {
  if (CACHED_FILE === null) CACHED_FILE = loadWeightsFile();
  return CACHED_FILE;
}

const FALLBACK_PARAMS: EngineParams = {
  weight: 0,
  trustFloor: 0,
  trustCeiling: 1,
  timeoutMs: 2000,
  thresholds: {},
};

function mergeParams(
  base: EngineParams,
  ...layers: ReadonlyArray<Partial<EngineParams> | undefined>
): EngineParams {
  const merged: EngineParams = {
    weight: base.weight,
    trustFloor: base.trustFloor,
    trustCeiling: base.trustCeiling,
    timeoutMs: base.timeoutMs,
    thresholds: { ...base.thresholds },
  };
  for (const layer of layers) {
    if (!layer) continue;
    if (typeof layer.weight === 'number') merged.weight = layer.weight;
    if (typeof layer.trustFloor === 'number') merged.trustFloor = layer.trustFloor;
    if (typeof layer.trustCeiling === 'number') merged.trustCeiling = layer.trustCeiling;
    if (typeof layer.timeoutMs === 'number') merged.timeoutMs = layer.timeoutMs;
    if (layer.thresholds) {
      merged.thresholds = { ...merged.thresholds, ...layer.thresholds };
    }
  }
  return merged;
}

export function getParams(key: RecordKey, override?: Partial<EngineParams>): EngineParams {
  const engine = getEngine(key);
  const engineDefaults = engine?.defaultParams ?? FALLBACK_PARAMS;
  const fileLayer = getFile()[key];
  return mergeParams(engineDefaults, fileLayer, override);
}

export function getAllParams(): Map<RecordKey, EngineParams> {
  const out = new Map<RecordKey, EngineParams>();
  for (const key of RECORD_KEYS) {
    out.set(key, getParams(key));
  }
  return out;
}

export function reloadParams(): void {
  CACHED_FILE = null;
}

export const __WEIGHTS_PATH_FOR_TESTS = WEIGHTS_PATH;
