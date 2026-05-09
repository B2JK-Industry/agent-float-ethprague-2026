import type { SharedFetch, SharedFetchInit, SharedFetchResponse } from './types.js';

export interface RateLimitSpec {
  requestsPerMinute: number;
  burst?: number;
}

export interface CreateSharedFetchOptions {
  rateLimits?: Record<string, RateLimitSpec>;
  defaultTimeoutMs?: number;
  authTokens?: { githubToken?: string; etherscanKey?: string; thegraphKey?: string };
  warnLogger?: (msg: string, ctx?: Record<string, unknown>) => void;
  fetchImpl?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_TIMEOUT_MS = 1500;
const RETRY_DELAY_MS = 250;
const RETRYABLE_STATUSES = new Set([429, 503]);

const FALLBACK_LIMIT: RateLimitSpec = { requestsPerMinute: 100 };

const ANON_LIMITS: Record<string, RateLimitSpec> = {
  'api.github.com': { requestsPerMinute: 1 },
  'sourcify.dev': { requestsPerMinute: 17 },
  'repo.sourcify.dev': { requestsPerMinute: 17 },
  'ipfs.io': { requestsPerMinute: 100 },
  'api.etherscan.io': { requestsPerMinute: 300 },
  'api.studio.thegraph.com': { requestsPerMinute: 100 },
};

const AUTHED_LIMITS: Partial<Record<string, RateLimitSpec>> = {
  'api.github.com': { requestsPerMinute: 83 },
};

interface Bucket {
  tokens: number;
  capacity: number;
  refillPerMs: number;
  lastRefillMs: number;
}

function getHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

function makeBucket(spec: RateLimitSpec, nowMs: number): Bucket {
  const capacity = spec.burst ?? Math.max(1, Math.ceil(spec.requestsPerMinute));
  const refillPerMs = spec.requestsPerMinute / 60_000;
  return {
    tokens: capacity,
    capacity,
    refillPerMs,
    lastRefillMs: nowMs,
  };
}

function refill(bucket: Bucket, nowMs: number): void {
  const elapsed = nowMs - bucket.lastRefillMs;
  if (elapsed <= 0) return;
  const added = elapsed * bucket.refillPerMs;
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + added);
  bucket.lastRefillMs = nowMs;
}

function readEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

function chainAbort(parent: AbortSignal | undefined, child: AbortController): () => void {
  if (!parent) return () => {};
  if (parent.aborted) {
    child.abort(parent.reason);
    return () => {};
  }
  const onAbort = () => child.abort(parent.reason);
  parent.addEventListener('abort', onAbort, { once: true });
  return () => parent.removeEventListener('abort', onAbort);
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise<void>((res) => {
    setTimeout(res, ms);
  });

export function createSharedFetch(options: CreateSharedFetchOptions = {}): SharedFetch {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const warn = options.warnLogger ?? (() => {});

  const githubToken = options.authTokens?.githubToken ?? readEnv('GITHUB_TOKEN');
  const etherscanKey = options.authTokens?.etherscanKey ?? readEnv('ETHERSCAN_API_KEY');
  const thegraphKey = options.authTokens?.thegraphKey ?? readEnv('THEGRAPH_API_KEY');

  if (!githubToken) warn('GITHUB_TOKEN missing — using anonymous GitHub rate limit');
  if (!etherscanKey) warn('ETHERSCAN_API_KEY missing — using anonymous Etherscan rate limit');
  if (!thegraphKey) warn('THEGRAPH_API_KEY missing — using anonymous TheGraph rate limit');

  const limits: Record<string, RateLimitSpec> = { ...ANON_LIMITS };
  if (githubToken && AUTHED_LIMITS['api.github.com']) {
    limits['api.github.com'] = AUTHED_LIMITS['api.github.com'];
  }
  if (options.rateLimits) {
    for (const [host, spec] of Object.entries(options.rateLimits)) {
      limits[host] = spec;
    }
  }

  const buckets = new Map<string, Bucket>();
  const queues = new Map<string, Promise<void>>();

  function getBucket(host: string): Bucket {
    const existing = buckets.get(host);
    if (existing) return existing;
    const spec = limits[host] ?? FALLBACK_LIMIT;
    const bucket = makeBucket(spec, now());
    buckets.set(host, bucket);
    return bucket;
  }

  async function takeToken(host: string, signal: AbortSignal): Promise<void> {
    const prior = queues.get(host) ?? Promise.resolve();
    let release!: () => void;
    const slot = new Promise<void>((res) => {
      release = res;
    });
    queues.set(host, prior.then(() => slot));
    await prior;

    try {
      while (true) {
        if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError');
        const bucket = getBucket(host);
        refill(bucket, now());
        if (bucket.tokens >= 1) {
          bucket.tokens -= 1;
          return;
        }
        const needed = 1 - bucket.tokens;
        const waitMs = Math.max(10, Math.ceil(needed / bucket.refillPerMs));
        await sleep(waitMs);
      }
    } finally {
      release();
    }
  }

  async function doFetch(url: string, init: SharedFetchInit | undefined): Promise<Response> {
    const headers: Record<string, string> = { ...(init?.headers ?? {}) };
    const host = getHost(url);

    if (host === 'api.github.com' && githubToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${githubToken}`;
    }

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(new Error('timeout')), defaultTimeoutMs);
    const detach = chainAbort(init?.signal, timeoutController);

    try {
      return await fetchImpl(url, {
        method: init?.method ?? 'GET',
        headers,
        signal: timeoutController.signal,
      });
    } finally {
      clearTimeout(timer);
      detach();
    }
  }

  function adapt(response: Response): SharedFetchResponse {
    return {
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      text: () => response.text(),
      async json<T = unknown>(): Promise<T> {
        return (await response.json()) as T;
      },
    };
  }

  const wrapped: SharedFetch = async (
    url: string,
    init?: SharedFetchInit,
  ): Promise<SharedFetchResponse> => {
    const host = getHost(url);
    const callerSignal = init?.signal ?? new AbortController().signal;

    await takeToken(host, callerSignal);
    let response = await doFetch(url, init);

    if (RETRYABLE_STATUSES.has(response.status)) {
      try {
        await response.body?.cancel();
      } catch {
        // ignore body cancel errors
      }
      await sleep(RETRY_DELAY_MS);
      await takeToken(host, callerSignal);
      response = await doFetch(url, init);
    }

    return adapt(response);
  };

  return wrapped;
}

export const __testing = {
  ANON_LIMITS,
  AUTHED_LIMITS,
  FALLBACK_LIMIT,
};
