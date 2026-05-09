import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BACKOFF_MS,
  NetworkUnavailable,
  readRpcConfigForChain,
  retryableFetch,
  withPrimaryFallback,
  withRetry,
  type FetchLike,
} from '../../src/network/retry.js';

const noSleep = async () => {};

describe('withRetry', () => {
  it('returns the value on first success without sleeping', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        return 'ok';
      },
      { sleep: noSleep },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(1);
  });

  it('retries up to backoffMs.length and succeeds eventually', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new Error(`transient ${calls}`);
        return 'ok-after-retries';
      },
      { backoffMs: [1, 1, 1, 1], sleep: noSleep },
    );
    expect(result).toBe('ok-after-retries');
    expect(calls).toBe(3);
  });

  it('throws NetworkUnavailable after exhausting retries', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error(`fail ${calls}`);
        },
        { backoffMs: [1, 1], sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(NetworkUnavailable);
    expect(calls).toBe(3); // initial + 2 retries
  });

  it('skips retry when isRetryable returns false', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new Error('non-retryable');
        },
        { isRetryable: () => false, backoffMs: [1, 1], sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(NetworkUnavailable);
    expect(calls).toBe(1);
  });

  it('default schedule is [100, 200, 400, 800]', () => {
    expect([...DEFAULT_BACKOFF_MS]).toEqual([100, 200, 400, 800]);
  });

  it('NetworkUnavailable carries attempts count and lastError', async () => {
    try {
      await withRetry(
        async () => {
          throw new Error('boom');
        },
        { backoffMs: [1], sleep: noSleep },
      );
    } catch (err) {
      expect(err).toBeInstanceOf(NetworkUnavailable);
      const ne = err as NetworkUnavailable;
      expect(ne.attempts).toBe(2);
      expect((ne.lastError as Error).message).toBe('boom');
    }
  });
});

describe('retryableFetch', () => {
  function fakeResponse(status: number, body = 'ok'): Response {
    return new Response(body, { status });
  }

  it('passes through 200 responses without retrying', async () => {
    let calls = 0;
    const upstream: FetchLike = async () => {
      calls += 1;
      return fakeResponse(200, 'hi');
    };
    const wrapped = retryableFetch(upstream, { sleep: noSleep, backoffMs: [1, 1] });
    const r = await wrapped('https://x', { method: 'GET' });
    expect(r.status).toBe(200);
    expect(calls).toBe(1);
  });

  it('retries on HTTP 429', async () => {
    let calls = 0;
    const upstream: FetchLike = async () => {
      calls += 1;
      return calls < 3 ? fakeResponse(429) : fakeResponse(200);
    };
    const wrapped = retryableFetch(upstream, { sleep: noSleep, backoffMs: [1, 1, 1] });
    const r = await wrapped('https://x');
    expect(r.status).toBe(200);
    expect(calls).toBe(3);
  });

  it('retries on HTTP 5xx', async () => {
    let calls = 0;
    const upstream: FetchLike = async () => {
      calls += 1;
      return calls < 2 ? fakeResponse(503) : fakeResponse(200);
    };
    const wrapped = retryableFetch(upstream, { sleep: noSleep, backoffMs: [1, 1] });
    const r = await wrapped('https://x');
    expect(r.status).toBe(200);
    expect(calls).toBe(2);
  });

  it('does NOT retry on HTTP 404 (handled by caller as success/notfound)', async () => {
    let calls = 0;
    const upstream: FetchLike = async () => {
      calls += 1;
      return fakeResponse(404);
    };
    const wrapped = retryableFetch(upstream, { sleep: noSleep, backoffMs: [1, 1] });
    const r = await wrapped('https://x');
    expect(r.status).toBe(404);
    expect(calls).toBe(1);
  });

  it('throws NetworkUnavailable when retries are exhausted on 429', async () => {
    let calls = 0;
    const upstream: FetchLike = async () => {
      calls += 1;
      return fakeResponse(429);
    };
    const wrapped = retryableFetch(upstream, { sleep: noSleep, backoffMs: [1, 1] });
    await expect(wrapped('https://x')).rejects.toBeInstanceOf(NetworkUnavailable);
    expect(calls).toBe(3);
  });
});

describe('readRpcConfigForChain', () => {
  it('reads mainnet (chainId 1) keys', () => {
    const env = { ALCHEMY_RPC_MAINNET: 'https://alchemy/m', PUBLIC_RPC_MAINNET: 'https://public/m' };
    expect(readRpcConfigForChain(1, env)).toEqual({
      primary: 'https://alchemy/m',
      fallback: 'https://public/m',
    });
  });

  it('reads sepolia (chainId 11155111) keys', () => {
    const env = { ALCHEMY_RPC_SEPOLIA: 'https://alchemy/s', PUBLIC_RPC_SEPOLIA: 'https://public/s' };
    expect(readRpcConfigForChain(11155111, env)).toEqual({
      primary: 'https://alchemy/s',
      fallback: 'https://public/s',
    });
  });

  it('uses CHAIN_<id> suffix for unknown chains', () => {
    const env = { ALCHEMY_RPC_CHAIN_424242: 'https://x' };
    expect(readRpcConfigForChain(424242, env)).toEqual({
      primary: 'https://x',
      fallback: undefined,
    });
  });

  it('returns undefined for missing keys', () => {
    expect(readRpcConfigForChain(1, {})).toEqual({
      primary: undefined,
      fallback: undefined,
    });
  });
});

describe('withPrimaryFallback', () => {
  it('uses primary when it succeeds', async () => {
    const seen: string[] = [];
    const result = await withPrimaryFallback('https://primary', 'https://fallback', async (url) => {
      seen.push(url);
      return 'p';
    }, { sleep: noSleep });
    expect(result).toBe('p');
    expect(seen).toEqual(['https://primary']);
  });

  it('falls back when primary exhausts retries', async () => {
    const seen: string[] = [];
    const result = await withPrimaryFallback(
      'https://primary',
      'https://fallback',
      async (url) => {
        seen.push(url);
        if (url === 'https://primary') throw new Error('primary down');
        return 'f';
      },
      { sleep: noSleep, backoffMs: [1, 1] },
    );
    expect(result).toBe('f');
    expect(seen.filter((u) => u === 'https://primary').length).toBe(3); // initial + 2 retries
    expect(seen[seen.length - 1]).toBe('https://fallback');
  });

  it('throws when neither URL is configured', async () => {
    await expect(
      withPrimaryFallback(undefined, undefined, async () => 'never', { sleep: noSleep }),
    ).rejects.toBeInstanceOf(NetworkUnavailable);
  });

  it('throws primary exhaustion when fallback is undefined', async () => {
    await expect(
      withPrimaryFallback(
        'https://primary',
        undefined,
        async () => {
          throw new Error('boom');
        },
        { sleep: noSleep, backoffMs: [1] },
      ),
    ).rejects.toBeInstanceOf(NetworkUnavailable);
  });
});
