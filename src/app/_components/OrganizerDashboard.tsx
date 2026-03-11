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
  Progress,
  Loader,
  Box,
  Anchor,
} from "@mantine/core";
import {
  IconSettings,
  IconCalendarEvent,
  IconUsersGroup,
  IconArrowRight,
  IconMail,
  IconEye,
  IconUserPlus,
  IconChartLine,
  IconCalendar,
  IconMapPin,
  IconClipboardList,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getEventGradient } from "~/utils/eventContent";
import { normalizeEventType } from "~/types/event";

interface OrganizedEvent {
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
    sponsors: number;
  };
  applicationStats?: {
    submitted: number;
    underReview: number;
    accepted: number;
    rejected: number;
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

function OrganizedEventCard({ event }: { event: OrganizedEvent }) {
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

  const acceptanceRate =
    event.applicationStats && event.applicationStats.submitted > 0
      ? Math.round(
          (event.applicationStats.accepted / event.applicationStats.submitted) *
            100,
        )
      : 0;

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
            <IconSettings size={24} />
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
            {event.description ?? "Event you&apos;re organizing"}
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

          <SimpleGrid cols={2} spacing="xs" mt="sm">
            <Group gap="xs">
              <IconClipboardList size={14} />
              <Text size="xs" c="dimmed">
                {event._count.applications} apps
              </Text>
            </Group>
            <Group gap="xs">
              <IconUsersGroup size={14} />
              <Text size="xs" c="dimmed">
                {event._count.userRoles} team
              </Text>
            </Group>
          </SimpleGrid>

          {event.applicationStats && (
            <Stack gap="xs" mt="sm">
              <Group justify="space-between">
                <Text size="xs" fw={500}>
                  Applications
                </Text>
                <Text size="xs" c="dimmed">
                  {acceptanceRate}% accepted
                </Text>
              </Group>
              <Progress value={acceptanceRate} color="green" size="sm" />
            </Stack>
          )}
        </Stack>

        <Group gap="xs">
          <Link
            href={`/admin/events/${event.id}/applications`}
            style={{ textDecoration: "none", flex: 1 }}
          >
            <Button
              fullWidth
              variant="filled"
              rightSection={<IconEye size={16} />}
              color={gradient.from}
              size="sm"
            >
              Manage
            </Button>
          </Link>
        </Group>
      </Stack>
    </Card>
  );
}

export default function OrganizerDashboard() {
  const { data: organizedEvents, isLoading: loadingEvents } =
    api.event.getOrganizerEvents.useQuery();
  const { data: organizerStats, isLoading: loadingStats } =
    api.event.getOrganizerStats.useQuery();
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

  const totalEvents = organizedEvents?.length ?? 0;
  const activeEvents =
    organizedEvents?.filter((event) => new Date(event.endDate) > new Date())
      .length ?? 0;
  const totalApplications =
    organizedEvents?.reduce(
      (sum, event) => sum + event._count.applications,
      0,
    ) ?? 0;
  const totalParticipants =
    organizedEvents?.reduce((sum, event) => sum + event._count.userRoles, 0) ??
    0;

  return (
    <Container size="xl" py="md">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon
              size="xl"
              radius="xl"
              variant="gradient"
              gradient={{ from: "indigo", to: "blue" }}
            >
              <IconSettings size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Organizer Dashboard
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Orchestrate amazing events that bring together builders, sponsors,
            and mentors to advance public goods funding.
          </Text>
        </Stack>

        {/* Key Metrics */}
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg">
          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="indigo">
                <IconCalendarEvent size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Events
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
                <IconClipboardList size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Applications
                </Text>
                <Text fw={700} size="xl">
                  {totalApplications}
                </Text>
                <Text size="xs" c="dimmed">
                  total received
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="green">
                <IconUsersGroup size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Participants
                </Text>
                <Text fw={700} size="xl">
                  {totalParticipants}
                </Text>
                <Text size="xs" c="dimmed">
                  engaged builders
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper p="md" radius="md" withBorder>
            <Group>
              <ThemeIcon size="lg" radius="md" color="orange">
                <IconChartLine size={20} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                  Success Rate
                </Text>
                <Text fw={700} size="xl">
                  {organizerStats?.averageAcceptanceRate ?? 0}%
                </Text>
                <Text size="xs" c="dimmed">
                  application acceptance
                </Text>
              </div>
            </Group>
          </Paper>
        </SimpleGrid>

        {/* Events You Organize */}
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={2}>Events You Organize</Title>
            <Link href="/admin/events" style={{ textDecoration: "none" }}>
              <Button variant="light" leftSection={<IconUserPlus size={16} />}>
                Manage All Events
              </Button>
            </Link>
          </Group>

          {!organizedEvents || organizedEvents.length === 0 ? (
            <Paper p="xl" withBorder radius="md" ta="center">
              <Stack gap="md" align="center">
                <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                  <IconCalendarEvent size={30} />
                </ThemeIcon>
                <Stack gap="xs" align="center">
                  <Title order={3} c="dimmed">
                    No Events Yet
                  </Title>
                  <Text c="dimmed" ta="center" maw={400}>
                    You haven&apos;t been assigned as an organizer for any
                    events yet. Contact your admin to get involved in event
                    organization.
                  </Text>
                </Stack>
                <Anchor href={`mailto:${config?.adminEmail ?? ""}`}>
                  <Button leftSection={<IconMail size={16} />}>
                    Get Involved
                  </Button>
                </Anchor>
              </Stack>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {organizedEvents.map((event) => (
                <OrganizedEventCard key={event.id} event={event} />
              ))}
            </SimpleGrid>
          )}
        </Stack>

        {/* Quick Actions */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          <Card withBorder>
            <Stack>
              <Group>
                <ThemeIcon size="md" color="blue" variant="light">
                  <IconUserPlus size={18} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="lg">
                    Send Invitations
                  </Text>
                  <Text size="sm" c="dimmed">
                    Invite mentors, sponsors, and participants to your events
                  </Text>
                </div>
              </Group>

              <Link
                href="/admin/invitations"
                style={{ textDecoration: "none" }}
              >
                <Button rightSection={<IconArrowRight size={16} />} fullWidth>
                  Manage Invitations
                </Button>
              </Link>
            </Stack>
          </Card>

          <Card withBorder>
            <Stack>
              <Group>
                <ThemeIcon size="md" color="green" variant="light">
                  <IconChartLine size={18} />
                </ThemeIcon>
                <div style={{ flex: 1 }}>
                  <Text fw={600} size="lg">
                    Event Analytics
                  </Text>
                  <Text size="sm" c="dimmed">
                    Track engagement, applications, and event success metrics
                  </Text>
                </div>
              </Group>

              <Link href="/admin/events" style={{ textDecoration: "none" }}>
                <Button rightSection={<IconArrowRight size={16} />} fullWidth>
                  View Analytics
                </Button>
              </Link>
            </Stack>
          </Card>
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
