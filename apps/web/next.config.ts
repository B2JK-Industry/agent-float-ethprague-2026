import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@upgrade-siren/shared",
    "@upgrade-siren/evidence",
    "@upgrade-siren/umia-permit",
  ],
  // 2026-05-10 audit: ConnectKit pulls in optional native deps (RN
  // AsyncStorage, pino-pretty) and one critical-dep warning from `ox`.
  // Mark them as externals on the server side and ignore the
  // critical-dep warning so `next build` is quiet for prod ops.
  serverExternalPackages: [
    "@react-native-async-storage/async-storage",
    "pino-pretty",
  ],
  // packages/evidence (and packages/shared) ship as raw ESM TypeScript with
  // `.js` import extensions per the ESM-with-TypeScript convention. Turbopack
  // does not auto-resolve `.js` → `.ts` inside workspace packages, so we
  // declare the alias explicitly. See:
  // https://nextjs.org/docs/app/api-reference/next-config-js/turbo#resolveextensions
  turbopack: {
    resolveExtensions: [
      ".mdx",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".mjs",
      ".json",
    ],
    resolveAlias: {
      // No-op alias map kept for future workspace package additions.
    },
  },
  webpack: (cfg) => {
    // Same intent for the webpack fallback (used by some non-Turbopack flows).
    cfg.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    // Silence the `ox` critical-dependency warning surfaced by ConnectKit's
    // graph. The dep loads via dynamic `require(expression)`, which webpack
    // flags but is harmless for our use.
    cfg.ignoreWarnings = [
      ...(cfg.ignoreWarnings ?? []),
      { module: /node_modules\/ox\// },
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ];
    return cfg;
  },
};

export default config;
