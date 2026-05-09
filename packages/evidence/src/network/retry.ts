// Generic retry primitive with exponential backoff. Used by the Sourcify
// fetchers and RPC clients to absorb transient 429 / 5xx responses without
// surfacing them to the verdict engine. On exhaustion, the wrapped function's
// last error bubbles up as a typed network_unavailable failure.

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export const DEFAULT_BACKOFF_MS = [100, 200, 400, 800] as const;

export interface RetryOptions {
  // Override the default exponential schedule. Length === max retry count.
  readonly backoffMs?: ReadonlyArray<number>;
  // Predicate to decide whether an exception is worth retrying. Default: any
  // error retries; the per-fetch wrapper layers a more specific predicate on
  // top.
  readonly isRetryable?: (err: unknown) => boolean;
  // Test-only sleep override (defaults to setTimeout). Lets test suites run
  // hermetically without real timers.
  readonly sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export interface NetworkUnavailableError {
  readonly kind: 'network_unavailable';
  readonly message: string;
  readonly attempts: number;
  readonly lastError: unknown;
}

export class NetworkUnavailable extends Error {
  readonly kind = 'network_unavailable' as const;
  readonly attempts: number;
  readonly lastError: unknown;
  constructor(attempts: number, lastError: unknown) {
    const lastMessage = lastError instanceof Error ? lastError.message : String(lastError);
    super(`network_unavailable: gave up after ${attempts} attempts; last error: ${lastMessage}`);
    this.name = 'NetworkUnavailable';
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const backoff = options.backoffMs ?? DEFAULT_BACKOFF_MS;
  const isRetryable = options.isRetryable ?? (() => true);
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  let lastError: unknown;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt >= backoff.length || !isRetryable(err)) {
        throw new NetworkUnavailable(attempt + 1, err);
      }
      const delayMs = backoff[attempt] ?? 0;
      attempt += 1;
      if (delayMs > 0) await sleep(delayMs);
    }
  }
}

// Sentinel exception used internally so withRetry retries on 429/5xx
// responses without leaking that detail to the public Response surface.
class HttpRetryable extends Error {
  readonly status: number;
  constructor(status: number) {
    super(`http_retryable: status=${status}`);
    this.name = 'HttpRetryable';
    this.status = status;
  }
}

function isHttpRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

// Wraps a FetchLike so that 429 / 5xx responses are retried with the same
// backoff schedule as withRetry, and other responses pass through unchanged.
export function retryableFetch(
  fetchImpl: FetchLike,
  options: RetryOptions = {},
): FetchLike {
  return async (input, init) => {
    return withRetry(
      async () => {
        const response = await fetchImpl(input, init);
        if (isHttpRetryableStatus(response.status)) {
          throw new HttpRetryable(response.status);
        }
        return response;
      },
      {
        ...options,
        isRetryable: (err) => err instanceof HttpRetryable || (options.isRetryable?.(err) ?? true),
      },
    );
  };
}

export interface PrimaryFallbackUrls {
  readonly primary: string | undefined;
  readonly fallback: string | undefined;
}

// Reads ALCHEMY_RPC_<CHAIN> and PUBLIC_RPC_<CHAIN> from process.env, returning
// both URLs (either may be undefined). The retry/failover wrapper composes
// these: try primary with retry; on full exhaustion, switch to fallback.
export function readRpcConfigForChain(chainId: number, env: NodeJS.ProcessEnv = process.env): PrimaryFallbackUrls {
  const suffix = chainId === 1 ? 'MAINNET' : chainId === 11155111 ? 'SEPOLIA' : `CHAIN_${chainId}`;
  return {
    primary: env[`ALCHEMY_RPC_${suffix}`],
    fallback: env[`PUBLIC_RPC_${suffix}`],
  };
}

// Composes withRetry + a primary/fallback split for asynchronous functions
// that take a URL argument. Calls fn(primary), retries with backoff, and on
// exhaustion calls fn(fallback) once with no retry.
export async function withPrimaryFallback<T>(
  primaryUrl: string | undefined,
  fallbackUrl: string | undefined,
  fn: (url: string) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  if (primaryUrl) {
    try {
      return await withRetry(() => fn(primaryUrl), options);
    } catch (err) {
      if (!fallbackUrl) throw err;
      // Fall through to fallback below.
    }
  }
  if (fallbackUrl) {
    return fn(fallbackUrl);
  }
  throw new NetworkUnavailable(
    0,
    new Error('withPrimaryFallback: neither primary nor fallback URL configured'),
  );
}
