// US-125 smoke test: prove the MSW + Playwright harness intercepts at the
// request level for the four sources the Bench orchestrator consumes.
//
// This test runs in the Playwright Node test process and exercises the
// handlers from apps/web/e2e/msw/handlers.ts directly via fetch. It does not
// drive the dev server — that's the job of US-126..US-129 scenario tests.
//
// GATE-34 (P0): suite must run green in CI without live network. This file
// is the canary: if MSW interception fails, it fails before any scenario
// test that depends on it.

import { test, expect } from "../fixtures/bench-test.js";
import { http, HttpResponse } from "msw";

test.describe("US-125 harness — MSW intercepts every Bench source", () => {
    test("Sourcify v2 contract → exact_match by default", async ({ msw: _msw }) => {
        const res = await fetch(
            "https://sourcify.dev/server/v2/contract/11155111/0xC53d3879aCF9Dd9d6fCF8Ed9B335A410Cc66Eb30",
        );
        expect(res.ok).toBe(true);
        const body = (await res.json()) as { match: string };
        expect(body.match).toBe("exact_match");
    });

    test("GitHub /users/{owner} returns fixture", async ({ msw: _msw }) => {
        const res = await fetch("https://api.github.com/users/B2JK-Industry");
        expect(res.ok).toBe(true);
        const body = (await res.json()) as { login: string; type: string };
        expect(body.login).toBe("B2JK-Industry");
        expect(body.type).toBe("Organization");
    });

    test("ENS subgraph (Graph Network gateway) returns domain fixture", async ({ msw: _msw }) => {
        const res = await fetch(
            "https://gateway.thegraph.com/api/abc/subgraphs/id/test",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    query: "{ domains { name } }",
                    variables: { name: "siren-agent-demo.upgrade-siren-demo.eth" },
                }),
            },
        );
        expect(res.ok).toBe(true);
        const body = (await res.json()) as {
            data: { domains: ReadonlyArray<{ name: string }> };
        };
        expect(body.data.domains[0]?.name).toBe(
            "siren-agent-demo.upgrade-siren-demo.eth",
        );
    });

    test("Alchemy JSON-RPC eth_getStorageAt returns padded slot", async ({ msw: _msw }) => {
        const res = await fetch("https://eth-sepolia.g.alchemy.com/v2/test-key", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "eth_getStorageAt",
                params: ["0xabc", "0x0", "latest"],
            }),
        });
        expect(res.ok).toBe(true);
        const body = (await res.json()) as { result: string };
        expect(body.result).toMatch(/^0x[0-9a-f]{64}$/);
    });

    test("per-test override via msw.use(...) shapes response", async ({ msw }) => {
        msw.use(
            http.get(
                "https://api.github.com/users/:owner",
                ({ params }) =>
                    HttpResponse.json({ login: String(params.owner), type: "User" }),
                { once: true },
            ),
        );
        const res = await fetch("https://api.github.com/users/scenario-override");
        const body = (await res.json()) as { type: string };
        expect(body.type).toBe("User");

        // Subsequent requests fall back to the default handler.
        const res2 = await fetch("https://api.github.com/users/B2JK-Industry");
        const body2 = (await res2.json()) as { type: string };
        expect(body2.type).toBe("Organization");
    });
});
