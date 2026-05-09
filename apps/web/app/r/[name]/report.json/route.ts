// Route handler that serves the Siren Report fixture as JSON. The Evidence
// drawer's "Download report JSON" link points here; without this handler, the
// link would fall back to the dynamic `/r/[name]` HTML page (Next.js does
// not strip the `.json` suffix for us). The handler reads the same fixture
// table as `apps/web/app/r/[name]/page.tsx` so the rendered report and the
// downloaded report are byte-equal at the schema level.

import { NextResponse } from "next/server";

import {
  FIXTURE_REPORTS,
  SUBNAME_TO_FIXTURE,
  publicReadFixture,
} from "../fixtures";

type RouteParams = {
  params: Promise<{ name: string }>;
};

export async function GET(
  _req: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  const { name: rawName } = await params;
  const name = decodeURIComponent(rawName);
  const fixtureKey = SUBNAME_TO_FIXTURE[name];
  const report = fixtureKey
    ? FIXTURE_REPORTS[fixtureKey]
    : publicReadFixture(name);

  return NextResponse.json(report, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `inline; filename="${name}.json"`,
      "cache-control": "no-store",
    },
  });
}
