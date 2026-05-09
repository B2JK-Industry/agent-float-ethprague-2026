// Default MSW request handlers for the four external sources the Bench Mode
// orchestrator (US-117) consumes: Sourcify v2, GitHub REST, ENS subgraph
// (Graph Network gateway), Alchemy JSON-RPC.
//
// These are the FOUNDATION handlers shipped by US-125. Per-scenario tests
// (US-126 high-score / US-127 mid-score / US-128 public-read /
// US-129 storage-collision) override these with `mswServer.use(...)` to
// shape the response set their assertions need.
//
// All handlers return CI-safe deterministic data — no live network egress.

import { http, HttpResponse } from "msw";

import {
    sourcifyExactMatch,
    sourcifyNotFoundBody,
} from "./fixtures/sourcify.js";
import {
    githubUserOk,
    githubReposListOk,
    githubRepoOk,
    githubContentReadme,
} from "./fixtures/github.js";
import { ensSubgraphDomainOk } from "./fixtures/ens.js";
import { jsonRpcOk, eip1967SlotImpl, type JsonRpcRequest } from "./fixtures/alchemy.js";

const SOURCIFY_BASE = "https://sourcify.dev";
const GITHUB_BASE = "https://api.github.com";
const ENS_GATEWAY = "https://gateway.thegraph.com";
const ALCHEMY_HOSTNAMES = /^https:\/\/[a-z0-9-]+\.g\.alchemy\.com\//;

// Default placeholder implementation address surfaced in proxy storage slot
// reads. Per-scenario tests override per address.
const DEFAULT_IMPL = "0x0000000000000000000000000000000000000001";

export const sourcifyHandlers = [
    http.get(`${SOURCIFY_BASE}/server/v2/contract/:chainId/:address`, ({ params }) => {
        const address = String(params.address);
        // Default: every contract verified exact-match. Per-scenario tests
        // override to introduce `match` / `not_found` cases.
        return HttpResponse.json(sourcifyExactMatch(address));
    }),
    // 404 path Sourcify returns for unknown contracts is handled by the
    // server-error variant when scenario tests `mswServer.use(...)`.
    http.get(`${SOURCIFY_BASE}/server/v2/contract/:chainId/:address/_unknown`, () =>
        HttpResponse.json(sourcifyNotFoundBody, { status: 404 }),
    ),
];

export const githubHandlers = [
    http.get(`${GITHUB_BASE}/users/:owner`, ({ params }) => {
        return HttpResponse.json(githubUserOk(String(params.owner)));
    }),
    http.get(`${GITHUB_BASE}/users/:owner/repos`, ({ params }) => {
        return HttpResponse.json(githubReposListOk(String(params.owner)));
    }),
    http.get(`${GITHUB_BASE}/repos/:owner/:repo`, ({ params }) => {
        return HttpResponse.json(githubRepoOk(String(params.owner), String(params.repo)));
    }),
    http.get(`${GITHUB_BASE}/repos/:owner/:repo/contents/README.md`, () => {
        return HttpResponse.json(githubContentReadme);
    }),
    http.get(`${GITHUB_BASE}/repos/:owner/:repo/contents/LICENSE`, () => {
        return HttpResponse.json(githubContentReadme);
    }),
];

export const ensHandlers = [
    http.post(`${ENS_GATEWAY}/api/:apiKey/subgraphs/id/:subgraphId`, async ({ request }) => {
        // Best-effort: pull a name out of the GraphQL query body if present.
        let name = "siren-agent-demo.upgrade-siren-demo.eth";
        try {
            const body = (await request.clone().json()) as { variables?: { name?: string } };
            if (body?.variables?.name) name = body.variables.name;
        } catch {
            // Non-JSON body falls through to default.
        }
        return HttpResponse.json(ensSubgraphDomainOk(name));
    }),
];

export const alchemyHandlers = [
    http.post(ALCHEMY_HOSTNAMES, async ({ request }) => {
        const body = (await request.clone().json()) as JsonRpcRequest;
        const id = body.id ?? 1;
        switch (body.method) {
            case "eth_getStorageAt":
                return HttpResponse.json(jsonRpcOk(id, eip1967SlotImpl(DEFAULT_IMPL)));
            case "eth_getTransactionCount":
                return HttpResponse.json(jsonRpcOk(id, "0x10"));
            case "eth_call":
                // Default: empty bytes. Per-scenario tests override for
                // ENS resolver text() lookups, EIP-1967 reads via call, etc.
                return HttpResponse.json(jsonRpcOk(id, "0x"));
            case "eth_blockNumber":
                return HttpResponse.json(jsonRpcOk(id, "0xa00000"));
            case "eth_getLogs":
                return HttpResponse.json(jsonRpcOk(id, []));
            default:
                return HttpResponse.json(jsonRpcOk(id, "0x"));
        }
    }),
];

export const handlers = [
    ...sourcifyHandlers,
    ...githubHandlers,
    ...ensHandlers,
    ...alchemyHandlers,
];
