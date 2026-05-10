// GET /api/ens/debug/[name]
//
// Diagnostic surface for finding which text-record / coinType slot a
// subject is using to pin a contract address. Daniel 2026-05-10:
// sbo3lagent.eth shows 0xC53d3879…30 on app.ens.domains under some
// "Sourcify identifier" label, but our PUBLIC_READ_TEXT_KEYS scan
// returns nothing — the key name isn't one we anticipated.
//
// This route probes a wide candidate list against the real prod
// resolver, returning whatever it finds. Hit it from the browser:
//   /api/ens/debug/sbo3lagent.eth
// Then add the discovered key to PUBLIC_READ_TEXT_KEYS in
// packages/evidence/src/subject/publicRead.ts.
//
// Probe scope:
//   - 25 candidate text record keys (sourcify / contract / verifier /
//     custom variants)
//   - 6 multichain coinType slots (mainnet, optimism, polygon, base,
//     arbitrum, sepolia) per ENSIP-9/11
//   - Resolver address + registry owner + base-registrar owner so
//     non-text matches (resolver / NFT owner / wrapper) are caught.

import { createPublicClient, http, namehash, keccak256, toBytes } from "viem";
import { mainnet } from "viem/chains";

type RouteProps = { params: Promise<{ name: string }> };

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;
const BASE_REGISTRAR = "0x57f1887a8BF19b14fC0dF6Fd9B2acc9Af147eA85" as const;
const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401" as const;

const RESOLVER_ABI = [
  {
    name: "resolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
] as const;
const OWNER_ABI = [
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ type: "address" }],
  },
] as const;
const OWNER_OF_ABI = [
  {
    name: "ownerOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }],
  },
] as const;

const TEXT_KEYS = [
  // social / profile (already in PUBLIC_READ_TEXT_KEYS)
  "com.github",
  "com.twitter",
  "com.discord",
  "com.linkedin",
  "org.telegram",
  "xyz.farcaster",
  "org.lens",
  "X",
  "description",
  "url",
  "avatar",
  // contract-identity candidates
  "org.sourcify",
  "sourcify",
  "eth.contracts",
  "eth.contract",
  "contract",
  "contracts",
  "verified-contract",
  "verifier.sourcify",
  "agent-bench:contract",
  "agent-bench:contracts",
  "evm.contract",
  "web3.contract",
  "contractAddress",
  "contract_address",
  "accounts.contracts",
];

const ms = (cid: number): number => (0x80000000 | cid) >>> 0;
const COINS: ReadonlyArray<{ id: number; label: string }> = [
  { id: 60, label: "ETH (mainnet)" },
  { id: ms(10), label: "Optimism" },
  { id: ms(137), label: "Polygon" },
  { id: ms(8453), label: "Base" },
  { id: ms(42161), label: "Arbitrum One" },
  { id: ms(11155111), label: "Sepolia" },
];

export async function GET(_req: Request, props: RouteProps): Promise<Response> {
  const { name: rawName } = await props.params;
  const name = decodeURIComponent(rawName);
  const rpcUrl =
    process.env.ALCHEMY_RPC_MAINNET ?? process.env.ENS_RPC_URL ?? "";
  if (!rpcUrl) {
    return Response.json(
      { error: "no_rpc", message: "ALCHEMY_RPC_MAINNET / ENS_RPC_URL not set" },
      { status: 500 },
    );
  }
  const client = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });
  const node = namehash(name);

  // ─── on-chain identity slots ───
  const [resolver, registryOwner, wrapperOwner, baseRegistrarOwner] =
    await Promise.all([
      client
        .readContract({
          address: ENS_REGISTRY,
          abi: RESOLVER_ABI,
          functionName: "resolver",
          args: [node],
        })
        .catch(() => null),
      client
        .readContract({
          address: ENS_REGISTRY,
          abi: OWNER_ABI,
          functionName: "owner",
          args: [node],
        })
        .catch(() => null),
      client
        .readContract({
          address: NAME_WRAPPER,
          abi: OWNER_ABI,
          functionName: "owner",
          args: [node],
        })
        .catch(() => null),
      (async () => {
        try {
          const label = name.split(".")[0] ?? "";
          if (!label) return null;
          const labelHash = keccak256(toBytes(label));
          return (await client.readContract({
            address: BASE_REGISTRAR,
            abi: OWNER_OF_ABI,
            functionName: "ownerOf",
            args: [BigInt(labelHash)],
          })) as `0x${string}`;
        } catch {
          return null;
        }
      })(),
    ]);

  // ─── text records ───
  const texts: Record<string, string> = {};
  await Promise.all(
    TEXT_KEYS.map(async (k) => {
      try {
        const v = await client.getEnsText({ name, key: k });
        if (v && v.length > 0) texts[k] = v;
      } catch {
        /* missing or rpc error — skip */
      }
    }),
  );

  // ─── coinType addresses ───
  const coinAddresses: Record<string, string> = {};
  await Promise.all(
    COINS.map(async (coin) => {
      try {
        const v = await client.getEnsAddress({
          name,
          coinType: BigInt(coin.id),
        });
        if (v && v.length > 0) {
          coinAddresses[`${coin.label} (${coin.id})`] = v;
        }
      } catch {
        /* missing or rpc error — skip */
      }
    }),
  );

  return Response.json(
    {
      name,
      namehash: node,
      labelHash:
        name.split(".").length > 1
          ? keccak256(toBytes(name.split(".")[0] ?? ""))
          : null,
      identity: {
        resolver,
        registryOwner,
        wrapperOwner,
        baseRegistrarOwner,
      },
      textRecords: texts,
      coinTypeAddresses: coinAddresses,
      hint:
        "Search the JSON for the address you saw on app.ens.domains. " +
        "If it appears under textRecords, add that key to " +
        "PUBLIC_READ_TEXT_KEYS in packages/evidence/src/subject/publicRead.ts. " +
        "If it appears under coinTypeAddresses or identity, the EnsContractsPanel " +
        "needs to be extended to read that slot too.",
    },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    },
  );
}
