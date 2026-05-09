// MSW node setup for Playwright e2e harness (US-125).
//
// `mswServer` runs in the Playwright test process (Node) and intercepts
// outbound `fetch` calls at the request level. For tests that drive the
// orchestrator (US-117) directly via package imports, this transparently
// fixtures Sourcify v2 / GitHub / ENS subgraph / Alchemy responses.
//
// The Next.js dev server (started by Playwright's webServer config) runs in
// a separate Node process and is NOT intercepted by this server. Per-scenario
// tests that drive `/b/[name]` end-to-end through the browser should pin
// fixtures via the apps/web cache fallback (apps/web/public/cache/, US-084
// pattern) for server-rendered fetches, and use Playwright's
// `page.route()` for browser-initiated fetches.
//
// US-125 ships the foundation: handlers + lifecycle. US-126..US-129 add
// scenario-specific overrides via `mswServer.use(...)`.

import { setupServer } from "msw/node";

import { handlers } from "./handlers.js";

export const mswServer = setupServer(...handlers);

export type MswServer = typeof mswServer;
