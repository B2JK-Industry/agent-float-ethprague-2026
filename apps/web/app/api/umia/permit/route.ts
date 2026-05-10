// GET /api/umia/permit
//
// Issues an EIP-712 ServerPermit for a Tailored Auction step gated on a
// subject's Bench tier. The bidder embeds the returned `hookData` blob in
// their bid; the on-chain UmiaValidationHook recovers our signer (set
// via `setSigner(...)` by the auction founder) and admits the bid.
//
// This endpoint is the sponsor-native discriminator: founders avoid
// running their own gating server, and Upgrade Siren's existing EIP-712
// signer (REPORT_SIGNER_PRIVATE_KEY) is reused without new key custody.
//
// Query params:
//   subject       (required) ENS name being attested (Bench score source)
//   wallet        (required) bidder wallet that the permit binds to
//   step          (required) auction step index (uint256-as-string)
//   minTier       (required) S | A | B | C | D — required Bench tier
//   hookAddress   (required) UmiaValidationHook contract address
//   chainId       (required) hook deployment chain id
//   deadline      (optional) unix seconds; default = now + 1800
//   controllerCheck (optional) "false" to skip addr(subject)==wallet
//                              gate (default: enforced)
//
// Responses:
//   200 { ok: true, mode: "signed" | "mock", permit: { hookData,
//         signer, signedAt, expiresAt }, evidence: { subject,
//         observedTier, score_100 } }
//   403 { ok: false, reason, observed?, required? }
//   400 { ok: false, reason: "bad_request", message }

import { NextResponse } from "next/server";
import {
  encodeHookData,
  signServerPermit,
  type SignedServerPermit,
} from "@upgrade-siren/umia-permit";
import { getAddress, isAddress, type Address, type Hex } from "viem";

import { loadBench } from "../../../b/[name]/loadBench";

type Tier = "S" | "A" | "B" | "C" | "D" | "U";

const TIER_RANK: Record<Tier, number> = { S: 5, A: 4, B: 3, C: 2, D: 1, U: 0 };
const REQUIRED_TIERS: ReadonlyArray<Tier> = ["S", "A", "B", "C", "D"];
const DEFAULT_DEADLINE_SECONDS = 30 * 60; // 30 min

function tierMeets(observed: Tier, required: Tier): boolean {
  const obs = TIER_RANK[observed];
  const req = TIER_RANK[required];
  if (obs === undefined || req === undefined) return false;
  return obs >= req;
}

function bad(reason: string, message: string, status = 400): Response {
  return NextResponse.json(
    { ok: false, reason, message },
    {
      status,
      headers: { "cache-control": "no-store" },
    },
  );
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const q = url.searchParams;

  const subject = q.get("subject")?.trim() ?? "";
  const walletRaw = q.get("wallet")?.trim() ?? "";
  const stepRaw = q.get("step")?.trim() ?? "";
  const minTierRaw = (q.get("minTier")?.trim().toUpperCase() ?? "") as Tier;
  const hookAddressRaw = q.get("hookAddress")?.trim() ?? "";
  const chainIdRaw = q.get("chainId")?.trim() ?? "";
  const deadlineRaw = q.get("deadline")?.trim() ?? "";
  const controllerCheckRaw = q.get("controllerCheck")?.trim().toLowerCase();
  const enforceController = controllerCheckRaw !== "false";

  if (!subject) return bad("bad_request", "missing subject");
  if (!isAddress(walletRaw)) return bad("bad_request", "invalid wallet");
  if (!isAddress(hookAddressRaw)) return bad("bad_request", "invalid hookAddress");
  if (!REQUIRED_TIERS.includes(minTierRaw)) {
    return bad("bad_request", "minTier must be one of S A B C D");
  }
  const step = (() => {
    if (!/^\d+$/.test(stepRaw)) return null;
    try {
      return BigInt(stepRaw);
    } catch {
      return null;
    }
  })();
  if (step === null) return bad("bad_request", "invalid step");
  const chainId = Number(chainIdRaw);
  if (!Number.isFinite(chainId) || chainId <= 0) {
    return bad("bad_request", "invalid chainId");
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const deadline = (() => {
    if (!deadlineRaw) return BigInt(nowSec + DEFAULT_DEADLINE_SECONDS);
    if (!/^\d+$/.test(deadlineRaw)) return null;
    try {
      const v = BigInt(deadlineRaw);
      return v;
    } catch {
      return null;
    }
  })();
  if (deadline === null) return bad("bad_request", "invalid deadline");
  if (deadline <= BigInt(nowSec)) {
    return bad("bad_request", "deadline already passed", 400);
  }

  const wallet = getAddress(walletRaw) as Address;
  const hookAddress = getAddress(hookAddressRaw) as Address;

  // Load Bench evidence + score for the subject. This is the same
  // engine /b/[subject] uses; the controller check + tier gate run
  // against the live result, not a cached snapshot.
  const bench = await loadBench(subject);
  if (bench.kind !== "loaded") {
    return NextResponse.json(
      {
        ok: false,
        reason: "bench_load_failed",
        message: bench.message,
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
  const observedTier = bench.score.tier as Tier;
  const score_100 = bench.score.score_100;

  // Controller check: the wallet asking for the permit must control the
  // subject's primary address (so a random wallet can't borrow another
  // subject's tier). Skip with controllerCheck=false for testing only.
  if (enforceController) {
    const primary = bench.evidence.subject.primaryAddress;
    if (!primary) {
      return NextResponse.json(
        {
          ok: false,
          reason: "no_primary_address",
          subject,
          message:
            "subject has no primary address on chain — cannot verify controller",
        },
        { status: 403, headers: { "cache-control": "no-store" } },
      );
    }
    if (getAddress(primary) !== wallet) {
      return NextResponse.json(
        {
          ok: false,
          reason: "controller_mismatch",
          subject,
          message:
            "wallet is not the primary address controller for subject; pass controllerCheck=false to bypass",
        },
        { status: 403, headers: { "cache-control": "no-store" } },
      );
    }
  }

  if (!tierMeets(observedTier, minTierRaw)) {
    return NextResponse.json(
      {
        ok: false,
        reason: "tier_below_threshold",
        subject,
        observed: observedTier,
        observed_score_100: score_100,
        required: minTierRaw,
      },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  // Sign — or fall back to mock when the operator key is absent (dev /
  // preview without secrets). The mock path returns a structurally valid
  // hookData blob with a zero signature so UI flows can be exercised
  // without REPORT_SIGNER_PRIVATE_KEY; production must NEVER ship that
  // path to a real bidder. Per CLAUDE.md mock: true rule.
  const signerKey = process.env.REPORT_SIGNER_PRIVATE_KEY as
    | Hex
    | undefined;
  let permit: SignedServerPermit;
  let mode: "signed" | "mock";

  if (signerKey) {
    permit = await signServerPermit({
      message: { wallet, step, deadline },
      domain: { hookAddress, chainId },
      signerPrivateKey: signerKey,
    });
    mode = "signed";
  } else {
    const zeroSig =
      ("0x" + "00".repeat(65)) as Hex;
    permit = {
      message: { wallet, step, deadline },
      domain: { hookAddress, chainId },
      signer: "0x0000000000000000000000000000000000000000" as Address,
      signature: zeroSig,
    };
    mode = "mock";
  }

  const hookData = encodeHookData(permit);

  return NextResponse.json(
    {
      ok: true,
      mode,
      mock: mode === "mock",
      permit: {
        hookData,
        signer: permit.signer,
        signedAt: nowSec,
        expiresAt: Number(deadline),
        wallet,
        step: step.toString(),
        deadline: deadline.toString(),
        hookAddress,
        chainId,
      },
      evidence: {
        subject,
        observedTier,
        score_100,
        required: minTierRaw,
      },
    },
    {
      status: 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
