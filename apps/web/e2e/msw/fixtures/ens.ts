// Canonical ENS subgraph (Graph Network gateway) response shapes for MSW
// fixturing. Source: packages/evidence/src/sources/ens-internal/fetch.ts
// (DEFAULT_GATEWAY = https://gateway.thegraph.com).
//
// The subgraph queries return shapes like { data: { domains: [...] } }. The
// fixture below covers a minimal happy-path for a registered subname.

export const ensSubgraphDomainOk = (name: string) =>
    ({
        data: {
            domains: [
                {
                    id: `0xmock-${name}`,
                    name,
                    labelName: name.split(".")[0] ?? name,
                    parent: { name: name.split(".").slice(1).join(".") },
                    registration: {
                        registrationDate: "1700000000",
                        expiryDate: "9999999999",
                    },
                    subdomainCount: 0,
                    resolvedAddress: { id: "0x747e453f13b5b14313e25393eb443fbaaa250cfc" },
                    events: [
                        {
                            __typename: "TextChanged",
                            blockNumber: 1,
                            transactionID: "0xmock",
                            key: "agent-bench:bench_manifest",
                        },
                    ],
                },
            ],
        },
    }) satisfies Record<string, unknown>;

export const ensSubgraphEmpty = {
    data: { domains: [] },
} as const;
