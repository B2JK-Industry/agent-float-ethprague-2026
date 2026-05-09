import {
  EMPTY_RESULT,
  type EngineParams,
  type EvaluatorResult,
  type RecordEngine,
  type ResolvedRecord,
  type SharedFetch,
  type SharedFetchResponse,
  type SignalEntry,
} from './types.js';

type SocialPlatform = 'linkedin' | 'github' | 'twitter' | 'farcaster' | 'lens';

interface SocialMatch {
  platform: SocialPlatform;
  handle: string;
}

export const SOCIAL_PATTERNS: ReadonlyArray<{
  platform: SocialPlatform;
  hosts: readonly string[];
  extract(path: string[]): string | null;
}> = [
  { platform: 'linkedin', hosts: ['linkedin.com'], extract: (p) => (p[0] === 'in' ? p[1] ?? null : null) },
  { platform: 'github', hosts: ['github.com'], extract: (p) => p[0] ?? null },
  { platform: 'twitter', hosts: ['twitter.com', 'x.com'], extract: (p) => p[0] ?? null },
  { platform: 'farcaster', hosts: ['warpcast.com', 'farcaster.xyz'], extract: (p) => p[0] ?? null },
  { platform: 'lens', hosts: ['hey.xyz', 'lenster.xyz', 'lens.xyz'], extract: (p) => (p[0] === 'u' ? p[1] ?? null : p[0] ?? null) },
];

const RESERVED = new Set(['', 'home', 'intent', 'login', 'orgs', 'search', 'share', 'topics']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 2;

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const score = (items: readonly SignalEntry[]): number =>
  clamp01(items.reduce((sum, item) => sum + item.value * item.weight, 0));

function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function hostMatches(host: string, patternHost: string): boolean {
  return host === patternHost || host.endsWith(`.${patternHost}`);
}

function classifySocial(url: URL): SocialMatch | null {
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const path = url.pathname.split('/').filter(Boolean).map((x) => x.toLowerCase());
  for (const pattern of SOCIAL_PATTERNS) {
    if (!pattern.hosts.some((h) => hostMatches(host, h))) continue;
    const handle = pattern.extract(path);
    if (!handle || RESERVED.has(handle)) return null;
    return { platform: pattern.platform, handle };
  }
  return null;
}

async function headWithRedirects(
  start: URL,
  fetcher: SharedFetch,
  signal: AbortSignal,
): Promise<{ response: SharedFetchResponse | null; url: URL; redirects: number; error: string | null }> {
  let url = start;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects += 1) {
    const response = await fetcher(url.toString(), {
      method: 'HEAD',
      headers: { accept: '*/*' },
      signal,
    });
    const location = response.headers.get('location');
    if (!REDIRECT_STATUSES.has(response.status) || !location) {
      return { response, url, redirects, error: null };
    }
    if (redirects === MAX_REDIRECTS) {
      return { response, url, redirects, error: 'too many redirects' };
    }
    url = new URL(location, url);
  }
  return { response: null, url, redirects: MAX_REDIRECTS, error: 'too many redirects' };
}

export const urlEngine: RecordEngine = {
  key: 'url',
  defaultParams: {
    weight: 0.6,
    trustFloor: 0.5,
    trustCeiling: 0.8,
    timeoutMs: 2000,
    thresholds: {
      socialSeniority: 0.52,
      socialRelevance: 0.55,
      genericSeniority: 0.2,
      genericRelevance: 0.35,
    },
  },
  async evaluate(record: ResolvedRecord, ctx, params: EngineParams): Promise<EvaluatorResult> {
    const started = Date.now();
    if (!record.raw) return EMPTY_RESULT('url', params.weight, Date.now() - started);

    const parsed = parseHttpUrl(record.raw);
    if (!parsed) {
      const empty = EMPTY_RESULT('url', params.weight, Date.now() - started, ['malformed URL']);
      return { ...empty, exists: true, confidence: 'complete' };
    }

    const social = classifySocial(parsed);
    if (social) {
      const socialSignal: SignalEntry = {
        name: 'socialPlatformDetected',
        value: params.thresholds.socialSeniority ?? 0.52,
        weight: 1,
        raw: social,
      };
      const relevanceSignal: SignalEntry = {
        name: 'socialProfileUrl',
        value: params.thresholds.socialRelevance ?? 0.55,
        weight: 1,
        raw: social,
      };
      return {
        recordKey: 'url',
        exists: true,
        validity: 1,
        liveness: 1,
        seniority: score([socialSignal]),
        relevance: score([relevanceSignal]),
        trust: Math.min(params.trustCeiling, params.trustFloor + 0.1),
        weight: params.weight,
        signals: { seniorityBreakdown: [socialSignal], relevanceBreakdown: [relevanceSignal], antiSignals: [] },
        evidence: [{ label: 'Social platform URL', value: `${social.platform}:${social.handle}`, source: parsed.hostname }],
        confidence: 'complete',
        durationMs: Date.now() - started,
        cacheHit: false,
        errors: [],
      };
    }

    const head = await headWithRedirects(parsed, ctx.fetch, ctx.signal);
    const status = head.response?.status ?? 0;
    const live = status >= 200 && status < 400 && head.error === null;
    const genericSignal: SignalEntry = {
      name: 'headLiveness',
      value: live ? params.thresholds.genericSeniority ?? 0.2 : 0,
      weight: 1,
      raw: { status, redirects: head.redirects },
    };
    const relevanceSignal: SignalEntry = {
      name: 'websiteReachable',
      value: live ? params.thresholds.genericRelevance ?? 0.35 : 0,
      weight: 1,
      raw: { finalUrl: head.url.toString(), status },
    };

    return {
      recordKey: 'url',
      exists: true,
      validity: 1,
      liveness: live ? 1 : 0,
      seniority: score([genericSignal]),
      relevance: score([relevanceSignal]),
      trust: Math.min(params.trustCeiling, params.trustFloor + (live ? 0.1 : 0)),
      weight: params.weight,
      signals: {
        seniorityBreakdown: [genericSignal],
        relevanceBreakdown: [relevanceSignal],
        antiSignals: head.error ? [{ name: 'url_head_failed', penalty: 0, reason: head.error }] : [],
      },
      evidence: [{ label: 'HEAD status', value: String(status), source: head.url.toString() }],
      confidence: head.error ? 'partial' : 'complete',
      durationMs: Date.now() - started,
      cacheHit: false,
      errors: head.error ? [head.error] : [],
    };
  },
};
