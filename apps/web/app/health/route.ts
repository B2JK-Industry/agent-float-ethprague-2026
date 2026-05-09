import { NextResponse } from "next/server";

type EnvConfigState = "configured" | "missing";
type SourcifyConfigState = "configured" | "public";

function anyEnv(...keys: string[]): EnvConfigState {
  return keys.some((k) => Boolean(process.env[k])) ? "configured" : "missing";
}

function sourcifyState(): SourcifyConfigState {
  return process.env.SOURCIFY_BASE_URL ? "configured" : "public";
}

export function GET(): NextResponse {
  return NextResponse.json({
    ens_rpc: anyEnv(
      "ALCHEMY_API_KEY",
      "NEXT_PUBLIC_ALCHEMY_API_KEY",
      "ENS_RPC_URL",
    ),
    sourcify: sourcifyState(),
    ai_gateway: anyEnv("AI_GATEWAY_API_KEY", "VERCEL_AI_GATEWAY_KEY"),
  });
}
