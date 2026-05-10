"use client";

// Client-only wrapper around UmiaPermitSection. Mirrors
// BenchPublishWidgetLoader: server components can't pass through
// `ssr: false` on a dynamic import, so this `"use client"` file does
// it. Without this, the wagmi `useAccount()` call inside
// UmiaPermitSection runs in the test/SSR environment where no
// WagmiProvider is mounted and crashes the page.
//
// The wrapper hydrates after page paint; the section header still
// renders (collapsed) so the layout stays stable.

import dynamic from "next/dynamic";

const UmiaPermitSection = dynamic(
  () =>
    import("./UmiaPermitSection").then((m) => ({
      default: m.UmiaPermitSection,
    })),
  { ssr: false },
);

interface Props {
  readonly subjectName: string;
}

export function UmiaPermitSectionLoader(props: Props): React.JSX.Element {
  return <UmiaPermitSection {...props} />;
}
