import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@upgrade-siren/shared", "@upgrade-siren/evidence"],
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
    return cfg;
  },
};

export default config;
