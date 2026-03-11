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
  ThemeIcon,
} from "@mantine/core";
import {
  IconUsers,
  IconCalendarEvent,
  IconChartBar,
  IconArrowRight,
  IconRobot,
} from "@tabler/icons-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <Container size="xl" py="md">
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <Title order={1} mb="xs">
          Admin Dashboard
        </Title>
        <Text c="dimmed">Overview of your platform management</Text>
      </div>

      {/* Management Cards */}
      <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }}>
        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="orange" variant="light">
                <IconCalendarEvent size={18} />
              </ThemeIcon>
              <Text fw={600}>Events</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Manage events, applications, and event-specific settings
            </Text>
            <Link href="/admin/events" style={{ textDecoration: "none" }}>
              <Button fullWidth rightSection={<IconArrowRight size={16} />}>
                View Events
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="blue" variant="light">
                <IconUsers size={18} />
              </ThemeIcon>
              <Text fw={600}>Users</Text>
            </Group>
            <Text size="sm" c="dimmed">
              Manage existing users and assign event roles
            </Text>
            <Link href="/admin/users" style={{ textDecoration: "none" }}>
              <Button fullWidth rightSection={<IconArrowRight size={16} />}>
                Manage Users
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="green" variant="light">
                <IconChartBar size={18} />
              </ThemeIcon>
              <Text fw={600}>Impact Reports</Text>
            </Group>
            <Text size="sm" c="dimmed">
              View and manage event impact reports
            </Text>
            <Link href="/impact-reports" style={{ textDecoration: "none" }}>
              <Button fullWidth rightSection={<IconArrowRight size={16} />}>
                View Impact Reports
              </Button>
            </Link>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack>
            <Group>
              <ThemeIcon size="md" color="violet" variant="light">
                <IconRobot size={18} />
              </ThemeIcon>
              <Text fw={600}>AI Interactions</Text>
            </Group>
            <Text size="sm" c="dimmed">
              View AI chat conversations, ratings, and performance
            </Text>
            <Link
              href="/admin/ai-interactions"
              style={{ textDecoration: "none" }}
            >
              <Button fullWidth rightSection={<IconArrowRight size={16} />}>
                View Interactions
              </Button>
            </Link>
          </Stack>
        </Card>
      </SimpleGrid>
    </Container>
  );
}
