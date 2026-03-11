"use client";

import {
  Container,
  Title,
  Text,
  Card,
  Stack,
  Group,
  Button,
  Badge,
  Divider,
  Alert,
} from "@mantine/core";
import {
  IconUserCheck,
  IconCalendarEvent,
  IconMapPin,
  IconInfoCircle,
  IconSettings,
  IconUsers,
  IconClipboardList,
} from "@tabler/icons-react";
import Link from "next/link";

interface Event {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  startDate: Date;
  endDate: Date;
  location: string | null;
  type: string;
}

interface MentorApplicationViewProps {
  event: Event;
}

export default function MentorApplicationView({
  event,
}: MentorApplicationViewProps) {
  // Format dates
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header with mentor badge */}
        <div>
          <Group align="center" gap="md" mb="md">
            <IconUserCheck size={32} color="green" />
            <div>
              <Title order={1}>Mentor Portal</Title>
              <Text c="dimmed">
                Welcome to the mentor dashboard for {event.name}
              </Text>
            </div>
            <Badge
              size="lg"
              color="green"
              variant="light"
              leftSection={<IconUserCheck size={16} />}
            >
              Mentor Access
            </Badge>
          </Group>

          <Alert
            color="green"
            title="Mentor Access Confirmed"
            icon={<IconInfoCircle />}
          >
            You have mentor privileges for this event. This gives you access to
            mentor-specific tools and information instead of the standard
            application form.
          </Alert>
        </div>

        {/* Event Information */}
        <Card shadow="lg" padding="xl" radius="md" withBorder>
          <Group align="flex-start" gap="lg">
            <div className="hidden-mobile">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <IconCalendarEvent size={32} color="white" />
              </div>
            </div>

            <Stack gap="sm" style={{ flex: 1 }}>
              <Group justify="space-between" align="flex-start">
                <Title order={2} size="h2">
                  {event.name}
                </Title>
                <Badge size="lg" variant="light" tt="uppercase">
                  {event.type}
                </Badge>
              </Group>

              <Text size="lg" c="dimmed">
                {event.description}
              </Text>

              <Group gap="xl" mt="md">
                <Group gap="xs">
                  <IconCalendarEvent
                    size={20}
                    color="var(--mantine-color-blue-6)"
                  />
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      Start Date
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(event.startDate)}
                    </Text>
                  </Stack>
                </Group>

                <Group gap="xs">
                  <IconCalendarEvent
                    size={20}
                    color="var(--mantine-color-green-6)"
                  />
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      End Date
                    </Text>
                    <Text size="xs" c="dimmed">
                      {formatDate(event.endDate)}
                    </Text>
                  </Stack>
                </Group>

                {event.location && (
                  <Group gap="xs">
                    <IconMapPin
                      size={20}
                      color="var(--mantine-color-orange-6)"
                    />
                    <Stack gap={0}>
                      <Text size="sm" fw={500}>
                        Location
                      </Text>
                      <Text size="xs" c="dimmed">
                        {event.location}
                      </Text>
                    </Stack>
                  </Group>
                )}
              </Group>
            </Stack>
          </Group>
        </Card>

        {/* Mentor Actions */}
        <div>
          <Title order={3} mb="md">
            Mentor Dashboard
          </Title>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Applications Review */}
            <Card
              p="lg"
              radius="md"
              withBorder
              className="hover:shadow-lg transition-shadow"
            >
              <Group gap="md" mb="md">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <IconClipboardList
                    size={24}
                    color="var(--mantine-color-blue-6)"
                  />
                </div>
                <div>
                  <Text fw={600}>Review Applications</Text>
                  <Text size="sm" c="dimmed">
                    Evaluate and provide feedback
                  </Text>
                </div>
              </Group>
              <Text size="sm" mb="md">
                Access the application review system to evaluate candidates and
                provide mentor feedback.
              </Text>
              <Button
                variant="light"
                color="blue"
                fullWidth
                component={Link}
                href={`/admin/events/${event.id}/applications`}
              >
                View Applications
              </Button>
            </Card>

            {/* Mentor Settings */}
            <Card
              p="lg"
              radius="md"
              withBorder
              className="hover:shadow-lg transition-shadow"
            >
              <Group gap="md" mb="md">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <IconSettings
                    size={24}
                    color="var(--mantine-color-purple-6)"
                  />
                </div>
                <div>
                  <Text fw={600}>Mentor Profile</Text>
                  <Text size="sm" c="dimmed">
                    Complete your mentor application
                  </Text>
                </div>
              </Group>
              <Text size="sm" mb="md">
                Complete your mentor application with your skills, availability,
                and contact preferences.
              </Text>
              <Button
                variant="light"
                color="purple"
                fullWidth
                component={Link}
                href={`/events/${event.slug ?? event.id}/mentor`}
              >
                Complete Mentor Application
              </Button>
            </Card>

            {/* Mentee Assignments */}
            <Card
              p="lg"
              radius="md"
              withBorder
              className="hover:shadow-lg transition-shadow"
            >
              <Group gap="md" mb="md">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <IconUsers size={24} color="var(--mantine-color-green-6)" />
                </div>
                <div>
                  <Text fw={600}>My Mentees</Text>
                  <Text size="sm" c="dimmed">
                    Connect with assigned participants
                  </Text>
                </div>
              </Group>
              <Text size="sm" mb="md">
                View and manage your mentorship assignments and schedule
                sessions.
              </Text>
              <Button
                variant="light"
                color="green"
                fullWidth
                component={Link}
                href={`/mentor/mentees?eventId=${event.id}`}
              >
                View Mentees
              </Button>
            </Card>
          </div>
        </div>

        <Divider />

        {/* Alternative Access */}
        <Card p="md" radius="md" withBorder bg="gray.0">
          <Text size="sm" c="dimmed" mb="xs">
            Need to access the regular application form?
          </Text>
          <Button
            variant="subtle"
            size="sm"
            component={Link}
            href={`/events/${event.slug ?? event.id}?tab=application`}
          >
            View Application Form
          </Button>
        </Card>
      </Stack>
    </Container>
  );
}
