// Route handler that serves the Siren Report as JSON. The Evidence drawer's
// "Download report JSON" link points here; without this handler, the link
// would fall back to the dynamic `/r/[name]` HTML page (Next.js does not
// strip the `.json` suffix for us). The handler reads the same `loadReport`
// pipeline as `apps/web/app/r/[name]/page.tsx` so the rendered report and
// the downloaded report agree at the schema level.

import { NextResponse } from "next/server";

import { loadReport } from "../loadReport";

type RouteParams = {
  params: Promise<{ name: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);

  const url = new URL(request.url);
  const mockMode =
    url.searchParams.get("mock") === "true" ||
    url.searchParams.get("mock") === "1";
  const publicReadIntent = url.searchParams.get("mode") === "public-read";
  const origin = url.origin;

  const result = await loadReport(name, {
    mockMode,
    publicReadIntent,
    origin,
  });

  if (result.kind === "empty") {
    return NextResponse.json(
      {
        error: "no_report_available",
        reason: result.reason,
        name,
      },
      { status: 404, headers: { "cache-control": "no-store" } },
    );
  }

  if (result.kind === "error") {
    return NextResponse.json(
      {
        error: result.reason,
        message: result.message,
        name,
      },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }

  return NextResponse.json(result.report, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `inline; filename="${name}.json"`,
      "cache-control": "no-store",
    },
  });
}
