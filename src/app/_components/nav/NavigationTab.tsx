"use client";

import { Tabs } from "@mantine/core";
import Link from "next/link";
import { type ComponentPropsWithRef, type ReactNode } from "react";

type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

interface NavigationTabProps {
  value: string;
  href: string;
  icon?: ReactNode;
  children: ReactNode;
  level?: "main" | "sub";
}

export function NavigationTab({
  value,
  href,
  icon,
  children,
}: NavigationTabProps) {
  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <TabsTab
      value={value}
      leftSection={icon}
      component={Link}
      href={href}
      className="no-underline"
    >
      {children}
    </TabsTab>
  );
}
