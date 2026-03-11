"use client";

import dynamic from "next/dynamic";

const AIChatFAB = dynamic(
  () => import("./AIChatFAB").then((mod) => mod.AIChatFAB),
  { ssr: false },
);

export function AIChatFABLazy() {
  return <AIChatFAB />;
}
