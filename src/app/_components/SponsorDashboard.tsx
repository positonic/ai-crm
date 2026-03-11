"use client";
import {
  Container,
  Title,
  SimpleGrid,
  Card,
  Text,
  Group,
  Stack,
  Button,
  Paper,
  ThemeIcon,
  Badge,
  Loader,
  Box,
  Anchor,
} from "@mantine/core";
import {
  IconBuildingBank,
  IconCalendarEvent,
  IconUsersGroup,
  IconTrendingUp,
  IconArrowRight,
  IconMail,
  IconHeartHandshake,
  IconMapPin,
  IconCalendar,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getEventGradient } from "~/utils/eventContent";
import { normalizeEventType } from "~/types/event";

interface SponsoredEvent {
  id: string;
  name: string;
  description: string | null;
  type: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  _count: {
    applications: number;
    userRoles: number;
  };
  sponsorInfo?: {
    id: string;
    sponsor: {
      id: string;
      name: string;
    };
  };
}

// Helper function to get Mantine gradient format from event type
function getMantineGradient(eventType: string) {
  const normalized = normalizeEventType(eventType);
  if (normalized === "CONFERENCE") {
    return { from: "green", to: "teal" };
  }

  if (normalized === "RESIDENCY" || normalized === "HACKATHON") {
    const gradientString = getEventGradient(normalized);
    if (gradientString.includes("blue")) {
      return { from: "blue", to: "cyan" };
    } else if (gradientString.includes("orange")) {
      return { from: "orange", to: "red" };
    }
  }

  return { from: "purple", to: "pink" };
}

function EventCard({ event }: { event: SponsoredEvent }) {
  const gradient = getMantineGradient(event.type);
  const isUpcoming = new Date(event.startDate) > new Date();
  const isOngoing =
    new Date() >= new Date(event.startDate) &&
    new Date() <= new Date(event.endDate);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="md"
      withBorder
      style={{ height: "100%" }}
    >
      <Card.Section>
        <Box
          h={100}
          style={{
            background: `linear-gradient(135deg, var(--mantine-color-${gradient.from}-6) 0%, var(--mantine-color-${gradient.to}-6) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemeIcon size={50} radius="xl" variant="light" color="white">
            <IconBuildingBank size={24} />
          </ThemeIcon>
        </Box>
      </Card.Section>

      <Stack gap="md" mt="md" style={{ height: "calc(100% - 100px)" }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between" align="flex-start">
            <Title order={4} size="h3">
              {event.name}
            </Title>
            <Badge
              color={isOngoing ? "green" : isUpcoming ? "blue" : "gray"}
              variant="light"
              size="sm"
            >
              {isOngoing ? "Live" : isUpcoming ? "Upcoming" : "Past"}
            </Badge>
          </Group>

          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description ?? "No description available"}
          </Text>

          <Group gap="xs" mt="sm">
            <IconCalendar size={14} />
            <Text size="xs" c="dimmed">
              {formatDate(event.startDate)} - {formatDate(event.endDate)}
            </Text>
          </Group>

          {event.location && (
            <Group gap="xs">
              <IconMapPin size={14} />
              <Text size="xs" c="dimmed">
                {event.location}
              </Text>
            </Group>
          )}

          <Group gap="md" mt="sm">
            <Group gap="xs">
              <IconUsersGroup size={14} />
              <Text size="xs" c="dimmed">
                {event._count.applications} applications
              </Text>
            </Group>
            <Group gap="xs">
              <IconHeartHandshake size={14} />
              <Text size="xs" c="dimmed">
                {event._count.userRoles} team members
              </Text>
            </Group>
          </Group>
        </Stack>

        <Stack gap="xs">
          <Link
            href={`/admin/events/${event.id}/applications`}
            style={{ textDecoration: "none" }}
          >
            <Button
              fullWidth
              variant="outline"
              rightSection={<IconArrowRight size={16} />}
              color={gradient.from}
            >
              Manage Applications
            </Button>
          </Link>

          {normalizeEventType(event.type) === "RESIDENCY" &&
            event.sponsorInfo && (
              <Link
                href={`/sponsors/${event.sponsorInfo.sponsor.id}/residency?eventId=${event.id}`}
                style={{ textDecoration: "none" }}
              >
                <Button
                  fullWidth
                  variant="filled"
                  rightSection={<IconMapPin size={16} />}
                  color="cyan"
                >
                  Residency Dashboard
                </Button>
              </Link>
            )}
        </Stack>
      </Stack>
    </Card>
  );
}

export default function SponsorDashboard() {
  const { data: sponsoredEvents, isLoading: loadingEvents } =
    api.event.getSponsoredEvents.useQuery();
  const { data: sponsorStats, isLoading: loadingStats } =
    api.sponsor.getSponsorStats.useQuery();
  const { data: config } = api.config.getPublicConfig.useQuery();

  if (loadingEvents || loadingStats) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  const totalEvents = sponsoredEvents?.length ?? 0;
  const activeEvents =
    sponsoredEvents?.filter((event) => new Date(event.endDate) > new Date())
      .length ?? 0;
  const totalApplications =
    sponsoredEvents?.reduce(
      (sum, event) => sum + event._count.applications,
      0,
    ) ?? 0;

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Stack gap="xl">
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon
              size="xl"
              radius="xl"
              variant="gradient"
              gradient={{ from: "violet", to: "purple" }}
            >
              <IconBuildingBank size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Sponsor Dashboard
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Manage your sponsored events, track impact, and connect with amazing
            builders in the public goods ecosystem.
          </Text>
        </Stack>

        {/* Key Metrics */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="violet">
                <IconCalendarEvent size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Sponsored Events
                </Text>
                <Text fw={700} size="xl">
                  {totalEvents}
                </Text>
                <Text size="xs" c="dimmed">
                  {activeEvents} active
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="blue">
                <IconUsersGroup size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Applications
                </Text>
                <Text fw={700} size="xl">
                  {totalApplications}
                </Text>
                <Text size="xs" c="dimmed">
                  across all events
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="green">
                <IconTrendingUp size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Impact Score
                </Text>
                <Text fw={700} size="xl">
                  {sponsorStats?.impactScore ?? "—"}
                </Text>
                <Text size="xs" c="dimmed">
                  builder engagement
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="orange">
                <IconHeartHandshake size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Total Reach
                </Text>
                <Text fw={700} size="xl">
                  {sponsorStats?.totalReach ?? "—"}
                </Text>
                <Text size="xs" c="dimmed">
                  participants supported
                </Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Sponsored Events */}
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={2}>Your Sponsored Events</Title>
            <Link href="/crm/contacts" style={{ textDecoration: "none" }}>
              <Button variant="light" leftSection={<IconMail size={16} />}>
                Manage CRM
              </Button>
            </Link>
          </Group>

          {!sponsoredEvents || sponsoredEvents.length === 0 ? (
            <Paper p="xl" withBorder radius="md" ta="center">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconBuildingBank size={30} />
                </ThemeIcon>
                <Stack gap="xs" align="center">
                  <Title order={3} c="dimmed">
                    No Sponsored Events
                  </Title>
                  <Text c="dimmed" ta="center" maw={400}>
                    You don&apos;t have any sponsored events yet. Contact our
                    team to get involved in upcoming events and support amazing
                    builders.
                  </Text>
                </Stack>
                <Anchor href={`mailto:${config?.adminEmail ?? ""}`}>
                  <Button leftSection={<IconMail size={16} />}>
                    Get In Touch
                  </Button>
                </Anchor>
              </Stack>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {sponsoredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </SimpleGrid>
          )}
        </Stack>

        {/* Quick Actions */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Card withBorder>
            <Stack>
              <Group>
                <ThemeIcon size="md" color="cyan" variant="light">
                  <IconMail size={18} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="lg">
                    Contact Management
                  </Text>
                  <Text size="sm" c="dimmed">
                    Manage your contact database and sponsor relationships
                  </Text>
                </div>
              </Group>

              <Link href="/crm/contacts" style={{ textDecoration: "none" }}>
                <Button rightSection={<IconArrowRight size={16} />} fullWidth>
                  View CRM
                </Button>
              </Link>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack>
              <Group>
                <ThemeIcon size="md" color="grape" variant="light">
                  <IconTrendingUp size={18} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="lg">
                    Market Data
                  </Text>
                  <Text size="sm" c="dimmed">
                    Track crypto market data and ecosystem trends
                  </Text>
                </div>
              </Group>

              <Link href="/coins" style={{ textDecoration: "none" }}>
                <Button rightSection={<IconArrowRight size={16} />} fullWidth>
                  View Market Data
                </Button>
              </Link>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
