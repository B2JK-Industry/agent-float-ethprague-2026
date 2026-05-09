// Canonical Alchemy JSON-RPC response shapes for MSW fixturing. The web app
// + packages/evidence both POST JSON-RPC to https://*.g.alchemy.com/v2/{key}
// for `eth_getStorageAt`, `eth_getTransactionCount`, `eth_call`, etc.
//
// JSON-RPC bodies have a `method` field; MSW handlers below dispatch on that.

export type JsonRpcRequest = {
    jsonrpc: "2.0";
    id: number | string;
    method: string;
    params: ReadonlyArray<unknown>;
};

export const jsonRpcOk = <T>(id: number | string, result: T): { jsonrpc: "2.0"; id: number | string; result: T } => ({
    jsonrpc: "2.0",
    id,
    result,
});

export const jsonRpcError = (id: number | string, code: number, message: string) => ({
    jsonrpc: "2.0",
    id,
    error: { code, message },
});

// Common eth_getStorageAt return shape: 32-byte hex slot value padded.
export const eip1967SlotImpl = (impl: string): string =>
    `0x000000000000000000000000${impl.toLowerCase().replace(/^0x/, "")}`;
