"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Conditionally renders site chrome (header, theme toggle, etc.)
 * Hidden on standalone routes like /schedule-card/
 */
export function ChromeWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isStandalone =
    pathname.includes("/schedule-card/") ||
    pathname.includes("/schedule-cards/");

  if (isStandalone) return null;

  return <>{children}</>;
}
