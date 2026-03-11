"use client";

import { useState } from "react";
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
  Menu,
  SegmentedControl,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconUsers,
  IconBuilding,
  IconCalendarEvent,
  IconAlertTriangle,
  IconCheck,
  IconX,
  IconPlayerPlay,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { getEventIcon, getEventGradient } from "~/utils/eventContent";
import { normalizeEventType } from "~/types/event";
import { CreateEventModal } from "./CreateEventModal";

// Helper function to get Mantine gradient format from event type
function getMantineGradient(eventType: string) {
  const normalized = normalizeEventType(eventType);
  if (normalized) {
    const gradientString = getEventGradient(normalized);
    // Convert Tailwind gradient to Mantine format
    if (gradientString.includes("teal")) {
      return { from: "teal", to: "cyan" };
    } else if (gradientString.includes("blue")) {
      return { from: "blue", to: "cyan" };
    } else if (gradientString.includes("orange")) {
      return { from: "orange", to: "red" };
    }
  }

  // Default fallback
  return { from: "purple", to: "pink" };
}

function getEventStatusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "green";
    case "COMPLETED":
      return "blue";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}

function getEventStatusLabel(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "Active";
    case "COMPLETED":
      return "Completed";
    case "CANCELLED":
      return "Cancelled";
    default:
      return status;
  }
}

function isEventOverdue(endDate: Date, status: string): boolean {
  return status === "ACTIVE" && new Date(endDate) < new Date();
}

const STATUS_ORDER: Record<string, number> = {
  ACTIVE: 0,
  COMPLETED: 1,
  CANCELLED: 2,
};

interface EventCardProps {
  event: {
    id: string;
    slug: string | null;
    name: string;
    description: string | null;
    type: string;
    status: string;
    startDate: Date;
    endDate: Date;
    location: string | null;
    isOnline: boolean;
    _count?: {
      applications?: number;
      sponsors?: number;
    };
  };
  onStatusChange: (
    eventId: string,
    status: "ACTIVE" | "COMPLETED" | "CANCELLED",
  ) => void;
}

function EventCard({ event, onStatusChange }: EventCardProps) {
  const Icon = getEventIcon(normalizeEventType(event.type) ?? "RESIDENCY");
  const gradient = getMantineGradient(event.type);
  // Use slug if available, otherwise fall back to id
  const eventIdentifier = event.slug ?? event.id;
  const overdue = isEventOverdue(event.endDate, event.status);

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="md"
      withBorder
      h="100%"
      component={Link}
      href={`/admin/events/${eventIdentifier}`}
      style={{ textDecoration: "none", cursor: "pointer" }}
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
            <Group gap={4} wrap="nowrap">
              {overdue && (
                <Tooltip label="Event has ended but is still marked Active">
                  <ThemeIcon size="sm" color="orange" variant="light">
                    <IconAlertTriangle size={14} />
                  </ThemeIcon>
                </Tooltip>
              )}
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <Badge
                    color={getEventStatusColor(event.status)}
                    variant="light"
                    size="sm"
                    tt="uppercase"
                    style={{ cursor: "pointer" }}
                    onClick={(e: React.MouseEvent) => e.preventDefault()}
                  >
                    {getEventStatusLabel(event.status)}
                  </Badge>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Label>Change Status</Menu.Label>
                  <Menu.Item
                    leftSection={<IconPlayerPlay size={14} />}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      onStatusChange(event.id, "ACTIVE");
                    }}
                    disabled={event.status === "ACTIVE"}
                  >
                    Active
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconCheck size={14} />}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      onStatusChange(event.id, "COMPLETED");
                    }}
                    disabled={event.status === "COMPLETED"}
                  >
                    Completed
                  </Menu.Item>
                  <Menu.Item
                    color="red"
                    leftSection={<IconX size={14} />}
                    onClick={(e: React.MouseEvent) => {
                      e.preventDefault();
                      onStatusChange(event.id, "CANCELLED");
                    }}
                    disabled={event.status === "CANCELLED"}
                  >
                    Cancelled
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Group>

          <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
            {event.description ?? "No description available"}
          </Text>
        </Stack>

        <Group gap="lg">
          <Group gap={4}>
            <IconUsers size={14} />
            <Text size="sm" fw={500}>
              {event._count?.applications ?? 0} Applications
            </Text>
          </Group>
          <Group gap={4}>
            <IconBuilding size={14} />
            <Text size="sm" fw={500}>
              {event._count?.sponsors ?? 0} Sponsors
            </Text>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
}

type EventWithCounts = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  location: string | null;
  isOnline: boolean;
  _count?: {
    applications?: number;
    sponsors?: number;
  };
};

export default function EventsClient() {
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");

  const utils = api.useUtils();

  // Fetch real events from database
  const { data: events, isLoading } = api.event.getEvents.useQuery();

  // Status update mutation
  const updateStatus = api.event.updateEventStatus.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Status Updated",
        message: "Event status has been updated successfully.",
        color: "green",
      });
      await utils.event.getEvents.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update event status",
        color: "red",
      });
    },
  });

  const handleStatusChange = (
    eventId: string,
    status: "ACTIVE" | "COMPLETED" | "CANCELLED",
  ) => {
    updateStatus.mutate({ id: eventId, status });
  };

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

  const eventsWithCounts: EventWithCounts[] = events ?? [];

  // Filter and sort events
  const filteredEvents = eventsWithCounts
    .filter((event) => statusFilter === "ALL" || event.status === statusFilter)
    .sort((a, b) => {
      const statusDiff =
        (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

  const activeCount = eventsWithCounts.filter(
    (e) => e.status === "ACTIVE",
  ).length;
  const completedCount = eventsWithCounts.filter(
    (e) => e.status === "COMPLETED",
  ).length;
  const cancelledCount = eventsWithCounts.filter(
    (e) => e.status === "CANCELLED",
  ).length;
  const overdueCount = eventsWithCounts.filter((e) =>
    isEventOverdue(e.endDate, e.status),
  ).length;

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
              Events Center
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={600} mx="auto">
            Manage and explore all events, track participants and sponsors
            across our ecosystem.
          </Text>
        </Stack>

        {/* Stats Overview */}
        <Paper p="md" radius="md" withBorder>
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="lg">
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="green">
                {activeCount}
              </Text>
              <Text size="sm" c="dimmed">
                Active Events
              </Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="blue">
                {completedCount}
              </Text>
              <Text size="sm" c="dimmed">
                Completed
              </Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="orange">
                {overdueCount > 0
                  ? overdueCount
                  : eventsWithCounts.reduce(
                      (sum: number, event: EventWithCounts) =>
                        sum + (event._count?.sponsors ?? 0),
                      0,
                    )}
              </Text>
              <Text size="sm" c="dimmed">
                {overdueCount > 0 ? "Overdue" : "Total Sponsors"}
              </Text>
            </Stack>
            <Stack gap={0} ta="center">
              <Text size="xl" fw={700} c="purple">
                {eventsWithCounts.reduce(
                  (sum: number, event: EventWithCounts) =>
                    sum + (event._count?.applications ?? 0),
                  0,
                )}
              </Text>
              <Text size="sm" c="dimmed">
                Total Applications
              </Text>
            </Stack>
          </SimpleGrid>
        </Paper>

        {/* Status Filter */}
        <SegmentedControl
          value={statusFilter}
          onChange={setStatusFilter}
          data={[
            { label: `Active (${activeCount})`, value: "ACTIVE" },
            { label: `All (${eventsWithCounts.length})`, value: "ALL" },
            { label: `Completed (${completedCount})`, value: "COMPLETED" },
            { label: `Cancelled (${cancelledCount})`, value: "CANCELLED" },
          ]}
        />

        {/* Events Grid */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {filteredEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onStatusChange={handleStatusChange}
            />
          ))}
        </SimpleGrid>

        {/* Additional Actions */}
        <Group justify="center" mt="xl">
          <Button
            variant="light"
            size="lg"
            leftSection={<IconCalendarEvent size={18} />}
            onClick={() => setCreateModalOpened(true)}
          >
            Create New Event
          </Button>
          <Button
            variant="outline"
            size="lg"
            leftSection={<IconUsers size={18} />}
          >
            Manage Participants
          </Button>
          <Button
            variant="outline"
            size="lg"
            leftSection={<IconBuilding size={18} />}
          >
            Sponsor Dashboard
          </Button>
        </Group>
      </Stack>

      <CreateEventModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
      />
    </Container>
  );
}
