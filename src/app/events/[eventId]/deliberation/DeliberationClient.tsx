"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  SegmentedControl,
  Grid,
  Alert,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconTarget,
  IconPlus,
  IconArrowLeft,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import PriorityCard from "./PriorityCard";
import PrioritySubmitForm from "./PrioritySubmitForm";
import TopicClustersSidebar from "./TopicClustersSidebar";

function getStatusBadge(status: string) {
  switch (status) {
    case "COLLECTING":
      return { color: "green", label: "Open for submissions" };
    case "CLOSED":
      return { color: "orange", label: "Submissions closed" };
    case "ANALYZING":
      return { color: "blue", label: "Analyzing results" };
    case "PUBLISHED":
      return { color: "violet", label: "Results published" };
    default:
      return { color: "gray", label: status };
  }
}

export default function DeliberationClient() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const { data: session } = useSession();
  const [sortBy, setSortBy] = useState<string>("votes");
  const [submitOpen, setSubmitOpen] = useState(false);

  const { data: deliberation, isLoading } =
    api.deliberation.getDeliberation.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  const { data: priorities } = api.deliberation.getPriorities.useQuery(
    {
      deliberationId: deliberation?.id ?? "",
      sortBy: sortBy as "votes" | "recent",
    },
    {
      enabled: !!deliberation?.id && !!session?.user,
      refetchInterval: 30000,
    },
  );

  if (isLoading) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!deliberation) {
    return (
      <Container size="md" py="xl">
        <Stack gap="md" align="center">
          <IconTarget size={48} color="var(--mantine-color-dimmed)" />
          <Title order={3}>No Active Deliberation</Title>
          <Text c="dimmed" ta="center">
            There is no active deliberation for this event yet. Check back later
            or contact the event organizers.
          </Text>
          <Button
            component={Link}
            href={`/events/${eventId}`}
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Event
          </Button>
        </Stack>
      </Container>
    );
  }

  const statusBadge = getStatusBadge(deliberation.status);
  const isCollecting = deliberation.status === "COLLECTING";

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Group gap="xs">
              <Button
                component={Link}
                href={`/events/${eventId}`}
                variant="subtle"
                size="xs"
                leftSection={<IconArrowLeft size={14} />}
              >
                Back
              </Button>
            </Group>
            <Title order={2}>{deliberation.title}</Title>
            {deliberation.description && (
              <Text c="dimmed" size="sm" maw={600}>
                {deliberation.description}
              </Text>
            )}
            <Group gap="xs">
              <Badge color={statusBadge.color} variant="light">
                {statusBadge.label}
              </Badge>
              <Text size="xs" c="dimmed">
                {deliberation._count.priorities} priorities &middot;{" "}
                {deliberation.totalVotes} votes
              </Text>
            </Group>
          </Stack>

          {isCollecting && session?.user && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setSubmitOpen(true)}
            >
              Submit Priority
            </Button>
          )}
        </Group>

        {deliberation.status === "PUBLISHED" && (
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="violet"
            variant="light"
          >
            <Group justify="space-between">
              <Text size="sm">
                Results have been published. View the full analysis and signal
                classification.
              </Text>
              <Button
                component={Link}
                href={`/events/${eventId}/deliberation/results`}
                variant="light"
                color="violet"
                size="xs"
              >
                View Results
              </Button>
            </Group>
          </Alert>
        )}

        {/* Sort controls */}
        <Group justify="space-between">
          <SegmentedControl
            value={sortBy}
            onChange={setSortBy}
            data={[
              { value: "votes", label: "Most Voted" },
              { value: "recent", label: "Most Recent" },
            ]}
            size="xs"
          />
        </Group>

        {/* Main content */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              {!priorities?.length ? (
                <Text c="dimmed" ta="center" py="xl">
                  {isCollecting
                    ? "No priorities yet. Be the first to submit one!"
                    : "No priorities were submitted."}
                </Text>
              ) : (
                priorities.map((p) => (
                  <PriorityCard
                    key={p.id}
                    priority={p}
                    isCollecting={isCollecting}
                  />
                ))
              )}
            </Stack>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 4 }}>
            <TopicClustersSidebar deliberationId={deliberation.id} />
          </Grid.Col>
        </Grid>
      </Stack>

      <PrioritySubmitForm
        deliberationId={deliberation.id}
        opened={submitOpen}
        onClose={() => setSubmitOpen(false)}
      />
    </Container>
  );
}
