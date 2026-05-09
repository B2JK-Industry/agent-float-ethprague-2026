// Playwright test fixture for Bench Mode e2e (US-125 foundation).
//
// Auto-starts MSW for each test and resets handlers between tests. Per-scenario
// tests use `test.extend({ ... })` further or call `msw.use(...)` inline.
//
// `use` is typed explicitly as `(value: typeof mswServer) => Promise<void>`
// because TypeScript's strict-mode contextual inference for `base.extend`
// callback signatures depends on the local @playwright/test version. Vercel's
// production build hit `Parameter 'use' implicitly has an 'any' type` even
// though local `pnpm typecheck` passed — explicit typing removes that
// inference dependency entirely and matches the project's "all exported
// functions typed; no `any`" rule.

import { test as base, expect } from "@playwright/test";

import { mswServer } from "../msw/server.js";

export type BenchTestFixtures = {
    msw: typeof mswServer;
};

export const test = base.extend<BenchTestFixtures>({
    msw: async (
        {},
        use: (value: typeof mswServer) => Promise<void>,
        testInfo,
    ) => {
        mswServer.listen({ onUnhandledRequest: "warn" });
        await use(mswServer);
        mswServer.resetHandlers();
        mswServer.close();
        // Surface a hint in the test output so debugging unhandled requests
        // doesn't require re-reading the harness docstring every time.
        if (testInfo.status === "failed") {
            console.log(
                `[msw] ${testInfo.title}: failed; if root cause was an unhandled ` +
                    `request to a real network, override via msw.use(...)`,
            );
        }
    },
});

export { expect };
