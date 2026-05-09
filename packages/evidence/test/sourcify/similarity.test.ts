import { describe, expect, it, vi } from 'vitest';

import { submitSimilarityVerification } from '../../src/sourcify/similarity.js';

const ADDR = '0x1111111111111111111111111111111111111111' as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

const noSleep = async (_ms: number) => undefined;

describe('submitSimilarityVerification', () => {
  describe('submit phase', () => {
    it('targets POST /verify/similarity/{chainId}/{address}', async () => {
      let capturedUrl = '';
      let capturedMethod: string | undefined;
      const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        capturedMethod = init?.method;
        return jsonResponse(200, { verificationId: 'id-1', status: 'verified' });
      });
      await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(capturedUrl).toBe(`https://sourcify.dev/server/v2/verify/similarity/1/${ADDR}`);
      expect(capturedMethod).toBe('POST');
    });

    it('returns synchronous verified terminal when submit body already says verified', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { verificationId: 'id-1', status: 'verified' }));
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.status).toBe('verified');
        expect(result.value.attempts).toBe(0);
      }
    });

    it('returns rate_limited on submit HTTP 429', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(429, {}));
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('rate_limited');
    });

    it('returns server_error on submit HTTP 5xx', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(503, {}));
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('server_error');
    });

    it('returns network_error on submit fetch throw', async () => {
      const fetchImpl = vi.fn(async () => {
        throw new TypeError('econnreset');
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('network_error');
    });

    it('returns malformed_response when submit body has no verificationId', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { status: 'pending' }));
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
    });
  });

  describe('poll phase', () => {
    it('polls until terminal verified', async () => {
      let pollCount = 0;
      const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        }
        // GET /verify/id-1
        pollCount += 1;
        if (pollCount < 3) return jsonResponse(200, { status: 'verifying' });
        return jsonResponse(200, { status: 'verified' });
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.status).toBe('verified');
        expect(result.value.attempts).toBe(3);
      }
    });

    it('polls until terminal no_match', async () => {
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        return jsonResponse(200, { status: 'no_match' });
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.status).toBe('no_match');
    });

    it('polls until terminal failed', async () => {
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        return jsonResponse(200, { status: 'failed', error: 'compiler mismatch' });
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.status).toBe('failed');
        expect(result.value.raw['error']).toBe('compiler mismatch');
      }
    });

    it('exhausts poll budget and returns failed terminal', async () => {
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        return jsonResponse(200, { status: 'verifying' });
      });
      const result = await submitSimilarityVerification(1, ADDR, {
        fetchImpl,
        sleep: noSleep,
        maxPollAttempts: 5,
      });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.status).toBe('failed');
        expect(result.value.attempts).toBe(5);
        expect(result.value.raw['_polling']).toBe('budget_exhausted');
      }
    });

    it('surfaces poll-phase HTTP error', async () => {
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        return jsonResponse(429, {});
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('rate_limited');
    });

    it('surfaces poll-phase malformed status string', async () => {
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        return jsonResponse(200, { status: 'mystery_status' });
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('error');
      if (result.kind === 'error') expect(result.error.reason).toBe('malformed_response');
    });

    it('honours custom pollIntervalMs (sleep called with the configured interval)', async () => {
      let lastSleep = -1;
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'pending' });
        return jsonResponse(200, { status: 'verified' });
      });
      const sleepSpy = async (ms: number) => {
        lastSleep = ms;
      };
      await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: sleepSpy, pollIntervalMs: 250 });
      expect(lastSleep).toBe(250);
    });
  });

  describe('status normalisation', () => {
    it('treats `success` synonym as verified', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { verificationId: 'id-1', status: 'success' }));
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.status).toBe('verified');
    });

    it('treats `running`/`in_progress` synonyms as verifying (continues polling)', async () => {
      let pollCount = 0;
      const fetchImpl = vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method === 'POST') return jsonResponse(200, { verificationId: 'id-1', status: 'running' });
        pollCount += 1;
        return jsonResponse(200, { status: pollCount === 1 ? 'in_progress' : 'verified' });
      });
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') {
        expect(result.value.status).toBe('verified');
        expect(result.value.attempts).toBe(2);
      }
    });

    it('treats `not_matched` synonym as no_match', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse(200, { verificationId: 'id-1', status: 'not_matched' }));
      const result = await submitSimilarityVerification(1, ADDR, { fetchImpl, sleep: noSleep });
      expect(result.kind).toBe('ok');
      if (result.kind === 'ok') expect(result.value.status).toBe('no_match');
    });
  });
});
