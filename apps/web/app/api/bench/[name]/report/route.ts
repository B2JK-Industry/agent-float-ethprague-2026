// GET /api/bench/[name]/report
//
// Returns the latest Bench report for a subject + the EAS attestation
// bundle (off-chain always present after generation, on-chain when
// the subject has published).
//
// Read-only. No tx submission. Persistence layer (Turso) is the source
// of truth — fresh reports are written by the page render path, this
// endpoint only reads.

import { NextResponse } from "next/server";

import { loadLatestAttestationForSubject } from "../../../../../lib/easStore";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
): Promise<Response> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  let bundle;
  try {
    bundle = await loadLatestAttestationForSubject(name);
  } catch (err) {
    return NextResponse.json(
      {
        error: "store_read_failed",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }

  if (!bundle) {
    // 2026-05-10 audit: 404 here was a footgun — the empty-store case
    // is normal (no off-chain row has been written yet for this
    // subject), not an HTTP-error condition. Return 200 with eas: null
    // so callers don't have to treat "no attestation yet" as a failure.
    return NextResponse.json(
      {
        subject: name,
        eas: null,
        status: "no_attestation",
        message:
          "No EAS attestation has been issued for this subject yet. Visit /b/<name> and use the Publish widget to issue one.",
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    subject: name,
    eas: bundle,
  });
}