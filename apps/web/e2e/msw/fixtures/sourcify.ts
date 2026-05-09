// Canonical Sourcify v2 contract response shapes for MSW fixturing.
// Source: packages/evidence/src/sourcify/types.ts (SOURCIFY_BASE_URL).
//
// match values per Sourcify v2: "exact_match" | "match" | (404 → status: false).
// US-125 ships these as building blocks; per-scenario tests in
// US-126..US-129 override individual entries via mswServer.use(...).

export const sourcifyExactMatch = (address: string) =>
    ({
        match: "exact_match" as const,
        chainId: "11155111",
        address,
        creationMatch: "exact_match" as const,
        runtimeMatch: "exact_match" as const,
        verifiedAt: "2026-05-09T00:00:00Z",
        matchId: `mock-${address.slice(2, 10)}`,
    }) satisfies Record<string, unknown>;

export const sourcifyPartialMatch = (address: string) =>
    ({
        match: "match" as const,
        chainId: "11155111",
        address,
        creationMatch: "match" as const,
        runtimeMatch: "match" as const,
        verifiedAt: "2026-05-09T00:00:00Z",
        matchId: `mock-${address.slice(2, 10)}`,
    }) satisfies Record<string, unknown>;

// Sourcify returns HTTP 404 with this body for unknown contracts.
export const sourcifyNotFoundBody = {
    customCode: "not_found",
    message: "Contract not verified",
    errorId: "mock-not-found",
} as const;
