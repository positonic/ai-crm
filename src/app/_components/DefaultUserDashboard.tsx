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
  IconRocket,
  IconUsersGroup,
  IconArrowRight,
  IconBrain,
  IconBuildingBank,
  IconCalendar,
  IconMapPin,
  IconPlus,
  IconEye,
  IconChecklist,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import {
  getEventCardIcon,
  getEventCardGradient,
  formatEventDate,
  getTemporalStatus,
} from "~/utils/eventCardUtils";

interface AvailableEvent {
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
}

function OpportunityCard({
  title,
  description,
  icon: Icon,
  color,
  action,
  actionText,
}: {
  title: string;
  description: string;
  icon: React.FC<{ size?: number }>;
  color: string;
  action: string;
  actionText: string;
}) {
  return (
    <Card withBorder padding="lg" radius="md" style={{ height: "100%" }}>
      <Stack gap="md" style={{ height: "100%" }}>
        <Group>
          <ThemeIcon size="lg" radius="md" color={color} variant="light">
            <Icon size={20} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text fw={600} size="md">
              {title}
            </Text>
          </div>
        </Group>

        <Text size="sm" c="dimmed" style={{ flex: 1, lineHeight: 1.5 }}>
          {description}
        </Text>

        <Anchor href={action}>
          <Button
            variant="light"
            fullWidth
            rightSection={<IconArrowRight size={16} />}
          >
            {actionText}
          </Button>
        </Anchor>
      </Stack>
    </Card>
  );
}

function EventCard({ event }: { event: AvailableEvent }) {
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
            <Title order={3} size="h2">
              {event.name}
            </Title>
            <Badge color={temporalStatus.color} variant="light" size="sm">
              {temporalStatus.label}
            </Badge>
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
          Learn More & Apply
        </Button>
      </Stack>
    </Card>
  );
}

export default function DefaultUserDashboard() {
  const { data: availableEvents, isLoading: loadingEvents } =
    api.event.getAvailableEvents.useQuery();
  const { data: userApplications, isLoading: loadingApplications } =
    api.application.getUserApplications.useQuery();
  const { data: config } = api.config.getPublicConfig.useQuery();
  const { data: communityStats } = api.config.getCommunityStats.useQuery();

  if (loadingEvents || loadingApplications) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  const hasApplications = userApplications && userApplications.length > 0;

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
              gradient={{ from: "pink", to: "grape" }}
            >
              <IconRocket size={28} />
            </ThemeIcon>
            <Title order={1} size="h1" fw={700}>
              Welcome to The Commons
            </Title>
          </Group>
          <Text size="lg" c="dimmed" maw={700} mx="auto">
            Home of public goods funding innovation. Explore events, submit
            applications, and get involved in our vibrant community.
          </Text>
        </Stack>

        {/* User's Applications (if any) */}
        {hasApplications && (
          <Stack gap="md">
            <Title order={2}>Your Applications</Title>
            <Link href="/events" style={{ textDecoration: "none" }}>
              <Button variant="light" leftSection={<IconEye size={16} />}>
                View All Applications
              </Button>
            </Link>
          </Stack>
        )}

        {/* Upcoming Events - Only show if there are active events */}
        {availableEvents && availableEvents.length > 0 && (
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={2}>Upcoming Events</Title>
              {hasApplications && (
                <Link href="/events" style={{ textDecoration: "none" }}>
                  <Button variant="light" leftSection={<IconPlus size={16} />}>
                    New Application
                  </Button>
                </Link>
              )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
              {availableEvents
                .slice(0, hasApplications ? 3 : 6)
                .map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
            </SimpleGrid>
          </Stack>
        )}

        {/* Get Involved Opportunities */}
        <Stack gap="md">
          <Title order={2}>Get Involved</Title>
          <Text c="dimmed" maw={600}>
            There are many ways to contribute to the Funding the Commons
            ecosystem beyond just attending events.
          </Text>

          <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="lg">
            <OpportunityCard
              title="Projects & Tasks"
              description="Explore active projects and tasks across the Funding the Commons ecosystem. Find ways to contribute and track progress."
              icon={IconChecklist}
              color="pink"
              action="https://www.exponential.im/w/cl/projects-tasks"
              actionText="View Projects"
            />

            <OpportunityCard
              title="Become a Mentor"
              description="Share your expertise and guide builders working on public goods projects. Help shape the next generation of impact-driven technologies."
              icon={IconBrain}
              color="teal"
              action={`mailto:${config?.adminEmail ?? ""}?subject=Mentor Interest`}
              actionText="Express Interest"
            />

            <OpportunityCard
              title="Sponsor Events"
              description="Support our events and get visibility with top builders in the space. Connect your brand with meaningful impact."
              icon={IconBuildingBank}
              color="violet"
              action={`mailto:${config?.adminEmail ?? ""}?subject=Sponsorship Inquiry`}
              actionText="Learn More"
            />

            <OpportunityCard
              title="Organize Events"
              description="Help us create amazing experiences for the community. Organize local meetups, workshops, or larger events."
              icon={IconUsersGroup}
              color="indigo"
              action={`mailto:${config?.adminEmail ?? ""}?subject=Organizer Interest`}
              actionText="Get Started"
            />
          </SimpleGrid>
        </Stack>

        {/* Community Stats */}
        <Paper
          p="xl"
          withBorder
          radius="md"
          style={{
            background:
              "linear-gradient(135deg, var(--mantine-color-pink-0) 0%, var(--mantine-color-grape-0) 100%)",
          }}
        >
          <Stack gap="md" ta="center">
            <Title order={3} c="grape.7">
              Join Our Growing Community
            </Title>
            <Text c="dimmed" maw={500} mx="auto">
              Join a global community of builders, sponsors, and thinkers
              advancing public goods, open systems, and collective impact.
            </Text>

            <SimpleGrid cols={{ base: 2, md: 4 }} spacing="lg" mt="md">
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {communityStats?.members ?? 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Members
                </Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {communityStats?.projects ?? 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Projects
                </Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {communityStats?.updates ?? 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Updates
                </Text>
              </Stack>
              <Stack gap={0} ta="center">
                <Text size="xl" fw={700} c="grape.7">
                  {communityStats?.events ?? 0}
                </Text>
                <Text size="sm" c="dimmed">
                  Events
                </Text>
              </Stack>
            </SimpleGrid>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
