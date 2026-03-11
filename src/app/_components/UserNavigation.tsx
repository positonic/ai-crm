"use client";

import { Tabs } from "@mantine/core";
import {
  IconMapPin,
  IconHeart,
  IconNews,
  IconHandStop,
  IconUsers,
  IconBulb,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentPropsWithRef } from "react";

// Proper type for Tab component with Link
type TabWithLinkProps = ComponentPropsWithRef<typeof Tabs.Tab> & {
  href?: string;
};

export default function UserNavigation() {
  const pathname = usePathname();

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname.startsWith("/events/funding-commons-residency-2025/impact"))
      return "impact";
    if (pathname.startsWith("/events/funding-commons-residency-2025/latest"))
      return "latest";
    if (
      pathname.startsWith("/events/funding-commons-residency-2025/asks-offers")
    )
      return "asks-offers";
    if (
      pathname.startsWith("/events/funding-commons-residency-2025/participants")
    )
      return "participants";
    if (pathname.startsWith("/events/funding-commons-residency-2025/projects"))
      return "event-projects";
    if (pathname.startsWith("/events/funding-commons-residency-2025"))
      return "residency";
    return null;
  };

  const TabsTab = Tabs.Tab as React.ComponentType<TabWithLinkProps>;

  return (
    <Tabs value={getActiveTab()} color="blue">
      <Tabs.List>
        <TabsTab
          value="latest"
          leftSection={<IconNews size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/latest"
          style={{ textDecoration: "none" }}
        >
          Latest
        </TabsTab>

        <TabsTab
          value="asks-offers"
          leftSection={<IconHandStop size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/asks-offers"
          style={{ textDecoration: "none" }}
        >
          Asks & Offers
        </TabsTab>

        <TabsTab
          value="participants"
          leftSection={<IconUsers size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/participants"
          style={{ textDecoration: "none" }}
        >
          Participants
        </TabsTab>

        <TabsTab
          value="event-projects"
          leftSection={<IconBulb size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/projects"
          style={{ textDecoration: "none" }}
        >
          Projects
        </TabsTab>

        <TabsTab
          value="impact"
          leftSection={<IconHeart size={16} />}
          component={Link}
          href="/events/funding-commons-residency-2025/impact"
          style={{ textDecoration: "none" }}
        >
          Impact
        </TabsTab>

        <TabsTab
          value="residency"
          leftSection={<IconMapPin size={16} />}
          component={Link}
          href="https://platform.fundingthecommons.io/events/funding-commons-residency-2025"
          style={{ textDecoration: "none" }}
        >
          My Residency
        </TabsTab>
      </Tabs.List>
    </Tabs>
  );
}
