"use client";

import {
  IconHome,
  IconUsers,
  IconBulb,
  IconHeartHandshake,
  IconCalendarEvent,
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
import { NavigationContainer } from "./nav/NavigationContainer";
import { NavigationTabs } from "./nav/NavigationTabs";
import { NavigationTab } from "./nav/NavigationTab";
import Link from "next/link";

interface AcceptedEvent {
  id: string;
  name: string;
  slug: string | null;
}

interface MainNavigationProps {
  acceptedEvents?: AcceptedEvent[];
}

export default function MainNavigation({
  acceptedEvents = [],
}: MainNavigationProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getActiveTab = () => {
    if (pathname === "/") return "home";
    if (pathname.startsWith("/community")) return "community";
    if (pathname.startsWith("/profiles")) return "profiles";
    if (pathname.startsWith("/projects")) return "projects";

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
    if (activeTab === "home") return "Home";
    if (activeTab === "community") return "Community";
    if (activeTab === "profiles") return "Profiles";
    if (activeTab === "projects") return "Projects";
    const event = acceptedEvents.find((e) => activeTab === `event-${e.id}`);
    return event?.name ?? "Menu";
  };

  const navItems = [
    { value: "home", href: "/", icon: <IconHome size={18} />, label: "Home" },
    {
      value: "community",
      href: "/community",
      icon: <IconHeartHandshake size={18} />,
      label: "Community",
    },
    {
      value: "profiles",
      href: "/profiles",
      icon: <IconUsers size={18} />,
      label: "Profiles",
    },
    {
      value: "projects",
      href: "/projects",
      icon: <IconBulb size={18} />,
      label: "Projects",
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
            <NavigationTab value="home" href="/" icon={<IconHome size={18} />}>
              Home
            </NavigationTab>
            <NavigationTab
              value="community"
              href="/community"
              icon={<IconHeartHandshake size={18} />}
            >
              Community
            </NavigationTab>
            <NavigationTab
              value="profiles"
              href="/profiles"
              icon={<IconUsers size={18} />}
            >
              Profiles
            </NavigationTab>
            <NavigationTab
              value="projects"
              href="/projects"
              icon={<IconBulb size={18} />}
            >
              Projects
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
