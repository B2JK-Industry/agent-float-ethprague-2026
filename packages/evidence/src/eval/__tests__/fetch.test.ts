import { describe, expect, it } from 'vitest';

import { createSharedFetch } from '../fetch.js';

function okResponse(): Response {
  return new Response('ok', { status: 200 });
}

describe('createSharedFetch — abort propagates into rate-limit waits', () => {
  it('rejects a queued request when its AbortSignal fires while the token bucket is empty', async () => {
    let fetchCalls = 0;
    const sf = createSharedFetch({
      rateLimits: { 'example.com': { requestsPerMinute: 1, burst: 1 } },
      fetchImpl: async () => {
        fetchCalls += 1;
        return okResponse();
      },
    });

    // Drain the single token.
    await sf('https://example.com/first');
    expect(fetchCalls).toBe(1);

    // Second call has to wait — bucket needs ~60s to refill 1 token at 1/min.
    const controller = new AbortController();
    const start = Date.now();
    const pending = sf('https://example.com/second', { signal: controller.signal });

    setTimeout(() => controller.abort(new Error('test-abort')), 30);

    await expect(pending).rejects.toBeDefined();
    const elapsed = Date.now() - start;

    // Without abortable sleep this would hang ~60_000ms. With the fix, abort lands in <500ms.
    expect(elapsed).toBeLessThan(500);
    // The aborted call must NOT have made it to fetchImpl.
    expect(fetchCalls).toBe(1);
  });

  it('honours an already-aborted signal without performing the fetch', async () => {
    let fetchCalls = 0;
    const sf = createSharedFetch({
      fetchImpl: async () => {
        fetchCalls += 1;
        return okResponse();
      },
    });

    const controller = new AbortController();
    controller.abort(new Error('pre-aborted'));

    await expect(sf('https://example.com/x', { signal: controller.signal })).rejects.toBeDefined();
    expect(fetchCalls).toBe(0);
  });
});

describe('createSharedFetch — happy path', () => {
  it('attaches GitHub Bearer auth header when GITHUB_TOKEN is provided', async () => {
    let seenAuth: string | null = null;
    const sf = createSharedFetch({
      authTokens: { githubToken: 'test-token-xyz' },
      fetchImpl: async (_url, init) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        seenAuth = headers['Authorization'] ?? null;
        return okResponse();
      },
    });

    await sf('https://api.github.com/users/foo');
    expect(seenAuth).toBe('Bearer test-token-xyz');
  });

  it('does NOT inject auth header for non-github hosts', async () => {
    let seenAuth: string | null = null;
    const sf = createSharedFetch({
      authTokens: { githubToken: 'test-token-xyz' },
      fetchImpl: async (_url, init) => {
        const headers = (init?.headers ?? {}) as Record<string, string>;
        seenAuth = headers['Authorization'] ?? null;
        return okResponse();
      },
    });

    await sf('https://sourcify.dev/server/v2/contract/1/0xabc');
    expect(seenAuth).toBeNull();
  });

  it('warns once per missing env token at construction time', () => {
    const warnings: string[] = [];
    // Empty strings short-circuit the `?? readEnv(...)` fallback so this is
    // deterministic regardless of the test runner's environment.
    createSharedFetch({
      authTokens: { githubToken: '', etherscanKey: '', thegraphKey: '' },
      warnLogger: (msg) => warnings.push(msg),
    });
    expect(warnings).toHaveLength(3);
    expect(warnings[0]).toContain('GITHUB_TOKEN');
    expect(warnings[1]).toContain('ETHERSCAN_API_KEY');
    expect(warnings[2]).toContain('THEGRAPH_API_KEY');
  });
});
