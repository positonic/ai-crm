"use client";

import {
  IconDashboard,
  IconCalendarEvent,
  IconUsers,
  IconChartBar,
  IconMenu2,
} from "@tabler/icons-react";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Drawer,
  Burger,
  NavLink,
  Stack,
  Text,
  Divider,
  Group,
} from "@mantine/core";
import { NavigationContainer } from "~/app/_components/nav/NavigationContainer";
import { NavigationTabs } from "~/app/_components/nav/NavigationTabs";
import { NavigationTab } from "~/app/_components/nav/NavigationTab";
import Link from "next/link";

interface AcceptedEvent {
  id: string;
  name: string;
  slug: string | null;
}

interface AdminNavigationProps {
  acceptedEvents?: AcceptedEvent[];
}

export default function AdminNavigation({
  acceptedEvents = [],
}: AdminNavigationProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Determine active tab based on current path
  const getActiveTab = () => {
    if (pathname === "/admin" || pathname === "/admin/") return "dashboard";
    if (pathname.startsWith("/admin/events")) return "events";
    if (
      pathname.startsWith("/admin/users") ||
      pathname.startsWith("/admin/communications")
    )
      return "users";
    if (pathname.startsWith("/impact-reports")) return "impact-reports";

    for (const event of acceptedEvents) {
      if (
        pathname.startsWith(`/events/${event.id}`) ||
        (event.slug && pathname.startsWith(`/events/${event.slug}`))
      ) {
        return `event-${event.id}`;
      }
    }
    return null;
  };

  const activeTab = getActiveTab();

  const getActiveLabel = () => {
    if (activeTab === "dashboard") return "Dashboard";
    if (activeTab === "events") return "Events";
    if (activeTab === "users") return "Users";
    if (activeTab === "impact-reports") return "Impact Reports";
    const event = acceptedEvents.find((e) => activeTab === `event-${e.id}`);
    return event?.name ?? "Admin";
  };

  const navItems = [
    {
      value: "dashboard",
      href: "/admin",
      icon: <IconDashboard size={18} />,
      label: "Dashboard",
    },
    {
      value: "events",
      href: "/admin/events",
      icon: <IconCalendarEvent size={18} />,
      label: "Events",
    },
    {
      value: "users",
      href: "/admin/users",
      icon: <IconUsers size={18} />,
      label: "Users",
    },
    {
      value: "impact-reports",
      href: "/impact-reports",
      icon: <IconChartBar size={18} />,
      label: "Impact Reports",
    },
  ];

  return (
    <>
      {/* Mobile: burger strip */}
      <div className="nav-mobile-strip">
        <Text size="sm" fw={500} c="dimmed">
          {getActiveLabel()}
        </Text>
        <Burger
          opened={drawerOpen}
          onClick={() => setDrawerOpen((o) => !o)}
          size="sm"
          aria-label="Toggle navigation"
        />
      </div>

      {/* Mobile drawer */}
      <Drawer
        opened={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={
          <Group gap="xs">
            <IconMenu2 size={18} />
            <Text fw={600}>Navigation</Text>
          </Group>
        }
        position="left"
        size={280}
        padding="md"
      >
        <Stack gap={4}>
          {navItems.map((item) => (
            <NavLink
              key={item.value}
              component={Link}
              href={item.href}
              label={item.label}
              leftSection={item.icon}
              active={activeTab === item.value}
              onClick={() => setDrawerOpen(false)}
            />
          ))}

          {acceptedEvents.length > 0 && (
            <>
              <Divider my="xs" label="My Events" labelPosition="left" />
              {acceptedEvents.map((event) => (
                <NavLink
                  key={event.id}
                  component={Link}
                  href={`/events/${event.slug ?? event.id}`}
                  label={event.name}
                  leftSection={<IconCalendarEvent size={18} />}
                  active={activeTab === `event-${event.id}`}
                  onClick={() => setDrawerOpen(false)}
                />
              ))}
            </>
          )}
        </Stack>
      </Drawer>

      {/* Desktop: horizontal tabs */}
      <div className="nav-desktop-tabs">
        <NavigationContainer level="main">
          <NavigationTabs activeTab={activeTab} level="main">
            <NavigationTab
              value="dashboard"
              href="/admin"
              icon={<IconDashboard size={18} />}
            >
              Dashboard
            </NavigationTab>
            <NavigationTab
              value="events"
              href="/admin/events"
              icon={<IconCalendarEvent size={18} />}
            >
              Events
            </NavigationTab>
            <NavigationTab
              value="users"
              href="/admin/users"
              icon={<IconUsers size={18} />}
            >
              Users
            </NavigationTab>
            <NavigationTab
              value="impact-reports"
              href="/impact-reports"
              icon={<IconChartBar size={18} />}
            >
              Impact Reports
            </NavigationTab>
            {acceptedEvents.map((event) => (
              <NavigationTab
                key={event.id}
                value={`event-${event.id}`}
                href={`/events/${event.slug ?? event.id}`}
                icon={<IconCalendarEvent size={18} />}
              >
                {event.name}
              </NavigationTab>
            ))}
          </NavigationTabs>
        </NavigationContainer>
      </div>
    </>
  );
}
