"use client";

import {
  Container,
  Title,
  SimpleGrid,
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  ThemeIcon,
  Box,
  Paper,
  Loader,
} from "@mantine/core";
import {
  IconCalendar,
  IconCalendarEvent,
  IconMapPin,
  IconUsersGroup,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import {
  getEventCardIcon,
  getEventCardGradient,
  formatEventDate,
  getTemporalStatus,
} from "~/utils/eventCardUtils";

interface EventCardProps {
  event: {
    id: string;
    slug: string | null;
    name: string;
    description: string | null;
    type: string;
    startDate: Date;
    endDate: Date;
    location: string | null;
    _count: {
      applications: number;
    };
  };
  applicationStatus?: {
    hasApplication: boolean;
    application?: {
      status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "ACCEPTED"
        | "REJECTED"
        | "WAITLISTED"
        | "CANCELLED";
    };
  };
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    default:
      return "gray";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ACCEPTED":
      return IconCheck;
    case "REJECTED":
      return IconX;
    case "UNDER_REVIEW":
    case "SUBMITTED":
      return IconClock;
    default:
      return IconClock;
  }
}

function getButtonLabel(
  applicationStatus?: EventCardProps["applicationStatus"],
) {
  if (!applicationStatus?.hasApplication) {
    return "Learn More & Apply";
  }
  if (applicationStatus.application?.status === "ACCEPTED") {
    return "View Event";
  }
  return "View Application";
}

function EventCard({ event, applicationStatus }: EventCardProps) {
  const Icon = getEventCardIcon(event.type);
  const gradient = getEventCardGradient(event.type);
  const temporalStatus = getTemporalStatus(event.startDate, event.endDate);
  const eventHref = `/events/${event.slug ?? event.id}`;

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="md"
      withBorder
      component={Link}
      href={eventHref}
      style={{ height: "100%", textDecoration: "none", color: "inherit" }}
    >
      <Card.Section>
        <Box
          h={120}
          style={{
            background: `linear-gradient(135deg, var(--mantine-color-${gradient.from}-6) 0%, var(--mantine-color-${gradient.to}-6) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ThemeIcon size={60} radius="xl" variant="light" color="white">
            <Icon size={30} />
          </ThemeIcon>
        </Box>
      </Card.Section>

      <Stack gap="md" mt="md" style={{ height: "calc(100% - 120px)" }}>
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group justify="space-between" align="flex-start">
            <Title order={3} size="h2" style={{ flex: 1 }}>
              {event.name}
            </Title>
            <Group gap="xs" wrap="nowrap">
              {applicationStatus?.hasApplication &&
                applicationStatus.application && (
                  <Badge
                    color={getStatusColor(applicationStatus.application.status)}
                    variant="light"
                    size="sm"
                    leftSection={(() => {
                      const StatusIcon = getStatusIcon(
                        applicationStatus.application?.status ?? "DRAFT",
                      );
                      return <StatusIcon size={12} />;
                    })()}
                    tt="capitalize"
                  >
                    {applicationStatus.application.status
                      .replace("_", " ")
                      .toLowerCase()}
                  </Badge>
                )}
              <Badge color={temporalStatus.color} variant="light" size="sm">
                {temporalStatus.label}
              </Badge>
            </Group>
          </Group>

          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description ?? "No description available"}
          </Text>

          <Group gap="xs" mt="sm">
            <IconCalendar size={14} />
            <Text size="xs" c="dimmed">
              {formatEventDate(event.startDate)} -{" "}
              {formatEventDate(event.endDate)}
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

          <Group gap="xs" mt="sm">
            <IconUsersGroup size={14} />
            <Text size="xs" c="dimmed">
              {event._count.applications} applications received
            </Text>
          </Group>
        </Stack>

        <Button
          fullWidth
          variant="filled"
          rightSection={<IconArrowRight size={16} />}
          color={gradient.from}
        >
          {getButtonLabel(applicationStatus)}
        </Button>
      </Stack>
    </Card>
  );
}

export default function ParticipantEventsClient() {
  const { data: events, isLoading } = api.event.getAvailableEvents.useQuery();
  const { data: userApplications } =
    api.application.getUserApplications.useQuery();

  // Create a map of event applications for quick lookup
  const applicationMap = new Map(
    userApplications?.map((app) => [app.eventId, app]) ?? [],
  );

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="lg">
          <Loader size="lg" />
          <Text c="dimmed">Loading events...</Text>
        </Stack>
      </Container>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack align="center" gap="lg">
          <Text size="xl" fw={500}>
            No Events Available
          </Text>
          <Text c="dimmed">
            There are currently no events available for registration.
          </Text>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header Section */}
        <Stack gap="md" ta="center">
          <Group justify="center" gap="xs">
            <ThemeIcon
              size="xl"
              radius="xl"
              variant="gradient"
              gradient={{ from: "blue", to: "purple" }}
            >
              <IconCalendarEvent size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Available Events
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Discover and apply to events that match your interests. Track your
            applications and stay updated on your status.
          </Text>
        </Stack>

        {/* Stats Overview */}
        <Paper p="md" radius="md" withBorder>
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="lg">
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="blue">
                {events.length}
              </Text>
              <Text size="sm" c="dimmed">
                Available Events
              </Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="green">
                {userApplications?.length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">
                Your Applications
              </Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="orange">
                {userApplications?.filter((app) => app.status === "ACCEPTED")
                  .length ?? 0}
              </Text>
              <Text size="sm" c="dimmed">
                Accepted
              </Text>
            </Stack>
          </SimpleGrid>
        </Paper>

        {/* Events Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {events.map((event) => {
            const application = applicationMap.get(event.id);
            const applicationStatus = {
              hasApplication: !!application,
              application: application
                ? {
                    status: application.status as
                      | "DRAFT"
                      | "SUBMITTED"
                      | "UNDER_REVIEW"
                      | "ACCEPTED"
                      | "REJECTED"
                      | "WAITLISTED"
                      | "CANCELLED",
                  }
                : undefined,
            };

            return (
              <EventCard
                key={event.id}
                event={event}
                applicationStatus={applicationStatus}
              />
            );
          })}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}
