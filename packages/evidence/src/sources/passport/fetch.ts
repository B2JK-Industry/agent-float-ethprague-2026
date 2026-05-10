// Gitcoin Passport score fetcher.
//
// Cross-references subject's primaryAddress with Gitcoin Passport
// scoring API. Gitcoin Passport aggregates Web3 identity stamps
// (ENS, GitHub, Twitter, BrightID, Coinbase, Proof of Humanity)
// into a single Sybil-resistance score 0-100. We treat verified
// Passport score as a TRUST BOOSTER for Bench:
//   Passport > 20  → trust × 1.05 (verified human)
//   Passport > 50  → trust × 1.10 (well-verified)
//   Passport > 80  → trust × 1.15 (heavily-verified)
//
// Score also surfaces in dedicated PassportPanel as an anti-scam
// signal independent of our axes.
//
// Public API: https://api.passport.xyz/v2/stamps/{address}/score?scorer_id=...
// We use scorer_id 335 (the Aggregator scorer).

import type { Address } from '@upgrade-siren/shared';

const PASSPORT_API_BASE = 'https://api.passport.xyz/v2/stamps';
const PASSPORT_SCORER_ID = '335'; // Aggregator scorer (open public)

export interface PassportScoreResult {
  readonly address: Address;
  readonly score: number;        // 0-100 (sybil resistance score)
  readonly threshold: number;    // pass threshold (typically 20)
  readonly passing: boolean;     // score >= threshold
  readonly stampCount: number;   // number of verified stamps
  readonly evidenceTimestamp: string | null; // ISO timestamp of latest stamp
}

export type PassportFailureReason =
  | 'address_not_passport_user'  // 404 — address has no Passport
  | 'rate_limited'
  | 'server_error'
  | 'malformed_response'
  | 'network_error';

export interface PassportOk {
  readonly kind: 'ok';
  readonly value: PassportScoreResult;
}

export interface PassportError {
  readonly kind: 'error';
  readonly reason: PassportFailureReason;
  readonly message: string;
  readonly httpStatus?: number;
}

export type PassportResult = PassportOk | PassportError;

interface RawPassportResponse {
  address?: string;
  score?: string | number;
  passing_score?: boolean;
  threshold?: string | number;
  last_score_timestamp?: string;
  expiration_timestamp?: string;
  stamp_scores?: Record<string, { score: string; dedup: boolean; expiration_date: string }>;
}

export interface FetchPassportOptions {
  readonly apiKey?: string;          // X-API-KEY header (optional, raises rate limits)
  readonly scorerId?: string;        // Override default 335
  readonly fetchImpl?: typeof fetch;
  readonly signal?: AbortSignal;
  readonly baseUrl?: string;
}

export async function fetchPassportScore(
  address: Address,
  options: FetchPassportOptions = {},
): Promise<PassportResult> {
  const fetcher = options.fetchImpl ?? globalThis.fetch;
  const base = options.baseUrl ?? PASSPORT_API_BASE;
  const scorerId = options.scorerId ?? PASSPORT_SCORER_ID;
  const url = `${base}/${address}/score?scorer_id=${scorerId}`;

  const headers: Record<string, string> = { accept: 'application/json' };
  if (options.apiKey) headers['X-API-KEY'] = options.apiKey;

  let response: Response;
  try {
    const init: RequestInit = options.signal !== undefined
      ? { headers, signal: options.signal }
      : { headers };
    response = await fetcher(url, init);
  } catch (err) {
    return {
      kind: 'error',
      reason: 'network_error',
      message: `passport: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (response.status === 404) {
    return {
      kind: 'error',
      reason: 'address_not_passport_user',
      message: 'passport: address has no Gitcoin Passport',
      httpStatus: 404,
    };
  }
  if (response.status === 429) {
    return { kind: 'error', reason: 'rate_limited', message: 'passport: HTTP 429', httpStatus: 429 };
  }
  if (!response.ok) {
    return { kind: 'error', reason: 'server_error', message: `passport: HTTP ${response.status}`, httpStatus: response.status };
  }

  let body: RawPassportResponse;
  try {
    body = (await response.json()) as RawPassportResponse;
  } catch {
    return { kind: 'error', reason: 'malformed_response', message: 'passport: invalid JSON' };
  }

  const scoreNum = typeof body.score === 'number' ? body.score : parseFloat(body.score ?? '0');
  const thresholdNum = typeof body.threshold === 'number' ? body.threshold : parseFloat(body.threshold ?? '20');
  const stampCount = body.stamp_scores ? Object.keys(body.stamp_scores).length : 0;

  return {
    kind: 'ok',
    value: {
      address,
      score: Number.isFinite(scoreNum) ? scoreNum : 0,
      threshold: Number.isFinite(thresholdNum) ? thresholdNum : 20,
      passing: body.passing_score === true || (Number.isFinite(scoreNum) && Number.isFinite(thresholdNum) && scoreNum >= thresholdNum),
      stampCount,
      evidenceTimestamp: body.last_score_timestamp ?? null,
    },
  };
}
