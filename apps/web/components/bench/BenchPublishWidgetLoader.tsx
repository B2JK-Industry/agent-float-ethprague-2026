"use client";

// Client-only wrapper around BenchPublishWidget. Next.js 16 forbids
// `ssr: false` on `next/dynamic` calls inside Server Components, so
// the page (server component) can't dynamically import the widget
// directly. This file is `"use client"`, so the dynamic import +
// ssr:false flag are legal here.
//
// The wrapper hydrates after page paint; before hydration the widget
// area is empty (no placeholder shifts the layout because the page
// reserves space via flex justify-between).

import dynamic from "next/dynamic";

import type { BenchPublishWidgetProps } from "./BenchPublishWidget";

const BenchPublishWidget = dynamic(
  () =>
    import("./BenchPublishWidget").then((m) => ({
      default: m.BenchPublishWidget,
    })),
  { ssr: false },
);

export function BenchPublishWidgetLoader(
  props: BenchPublishWidgetProps,
): React.JSX.Element {
  return <BenchPublishWidget {...props} />;
}