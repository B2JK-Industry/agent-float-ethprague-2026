// Canonical ENS subgraph (Graph Network gateway) response shapes for MSW
// fixturing. Source: packages/evidence/src/sources/ens-internal/fetch.ts
// (DEFAULT_GATEWAY = https://gateway.thegraph.com).
//
// The subgraph fetcher actually reads:
//   domain.createdAt                       → registrationDate
//   domain.subdomainCount                  → subnameCount
//   domain.resolver.texts                  → textRecordCount (length)
//   domain.resolver.events[0].blockNumber  → lastRecordUpdateBlock
//
// Earlier versions of this fixture nested data under `registration.*` and
// hung `events` off the domain root, neither of which the fetcher reads.
// Scenarios that drive `fetchEnsInternalSignals` got registrationDate=null
// and subnameCount=0 silently — only the smoke test's name-only assertion
// caught anything.

export const ensSubgraphDomainOk = (name: string) =>
    ({
        data: {
            domains: [
                {
                    id: `0xmock-${name}`,
                    name,
                    labelName: name.split(".")[0] ?? name,
                    parent: { name: name.split(".").slice(1).join(".") },
                    // Top-level fields the fetcher reads.
                    createdAt: "1700000000",
                    subdomainCount: 5,
                    resolver: {
                        texts: [
                            "agent-bench:owner",
                            "agent-bench:schema",
                            "agent-bench:bench_manifest",
                        ],
                        events: [
                            { blockNumber: "10000000" },
                        ],
                    },
                    resolvedAddress: { id: "0x747e453f13b5b14313e25393eb443fbaaa250cfc" },
                },
            ],
        },
    }) satisfies Record<string, unknown>;

export const ensSubgraphEmpty = {
    data: { domains: [] },
} as const;
