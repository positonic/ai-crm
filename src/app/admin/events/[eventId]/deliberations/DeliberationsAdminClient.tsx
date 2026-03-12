"use client";

import {
  Alert,
  Container,
  Title,
  Text,
  Stack,
  Group,
  Button,
  Badge,
  Paper,
  TextInput,
  Textarea,
  Table,
  Switch,
  Loader,
  Center,
  Stepper,
  Tooltip,
  Progress,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconPlus,
  IconLock,
  IconExternalLink,
  IconBrain,
  IconChartDots,
  IconRocket,
  IconCheck,
  IconAlertTriangle,
  IconCoin,
} from "@tabler/icons-react";
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

// Types matching deliberationAnalysis service output
interface ClassifiedPriority {
  priorityId: string;
  title: string;
  classification: "convergent" | "blind_spot" | "aspirational";
  reasoning: string;
  voteCount: number;
  relatedTopicLabels: string[];
}

interface BlockerTheme {
  theme: string;
  description: string;
  affectedPriorities: string[];
  frequency: number;
}

interface ResourceRecommendation {
  category: string;
  recommendation: string;
  relatedPriorities: string[];
  urgency: string;
}

interface AnalysisResult {
  synthesis: string;
  classifiedPriorities: ClassifiedPriority[];
  blockerThemes: BlockerTheme[];
  resourceRecommendations: ResourceRecommendation[];
  statistics: {
    totalPriorities: number;
    totalVotes: number;
    totalBlockers: number;
    totalResources: number;
    topicClusterCount: number;
    convergentCount: number;
    blindSpotCount: number;
    aspirationalCount: number;
  };
  generatedAt: string;
}

function getSignalBadge(classification: string) {
  switch (classification) {
    case "convergent":
      return { color: "green", label: "Convergent" };
    case "blind_spot":
      return { color: "orange", label: "Blind Spot" };
    case "aspirational":
      return { color: "blue", label: "Aspirational" };
    default:
      return { color: "gray", label: classification };
  }
}

function getUrgencyColor(urgency: string) {
  switch (urgency) {
    case "high":
      return "red";
    case "medium":
      return "orange";
    case "low":
      return "blue";
    default:
      return "gray";
  }
}

const STATUS_STEPS = [
  "COLLECTING",
  "CLOSED",
  "ANALYZING",
  "PUBLISHED",
] as const;

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.indexOf(status as (typeof STATUS_STEPS)[number]);
  return idx >= 0 ? idx : 0;
}

export default function DeliberationsAdminClient() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const utils = api.useUtils();

  const {
    data: deliberation,
    isLoading,
    isError,
    error,
  } = api.deliberation.getDeliberation.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  const { data: priorities } = api.deliberation.getPriorities.useQuery(
    { deliberationId: deliberation?.id ?? "", sortBy: "votes" },
    { enabled: !!deliberation?.id },
  );

  const { data: transcripts } = api.transcription.getByDeliberation.useQuery(
    { deliberationId: deliberation?.id ?? "" },
    { enabled: !!deliberation?.id },
  );

  const { data: topicClusters } = api.deliberation.getTopicClusters.useQuery(
    { deliberationId: deliberation?.id ?? "" },
    { enabled: !!deliberation?.id },
  );

  const { data: analysisResultRaw } =
    api.deliberation.getAnalysisResultsAdmin.useQuery(
      { deliberationId: deliberation?.id ?? "" },
      { enabled: !!deliberation?.id },
    );

  const analysis = analysisResultRaw as AnalysisResult | null;

  const createDeliberation = api.deliberation.createDeliberation.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Deliberation created",
        message: "The deliberation is now open for submissions.",
        color: "green",
      });
      setShowCreateForm(false);
      setNewTitle("");
      setNewDescription("");
      void utils.deliberation.getDeliberation.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const closeDeliberation = api.deliberation.closeDeliberation.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Deliberation closed",
        message: "No new submissions will be accepted.",
        color: "orange",
      });
      void utils.deliberation.getDeliberation.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const triggerClustering = api.deliberation.triggerClustering.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Clustering complete",
        message: `Extracted ${String(data.clusterCount)} topic clusters from transcripts.`,
        color: "green",
      });
      void utils.deliberation.getDeliberation.invalidate();
      void utils.deliberation.getTopicClusters.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Clustering failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const triggerAnalysis = api.deliberation.triggerAnalysis.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Analysis complete",
        message:
          "Priorities have been classified and synthesis generated.",
        color: "green",
      });
      void utils.deliberation.getDeliberation.invalidate();
      void utils.deliberation.getAnalysisResultsAdmin.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Analysis failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const publishResults = api.deliberation.publishResults.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Published to AT Protocol",
        message: `Created ${data.summaryUri ? "4" : "0"} DDS records successfully.`,
        color: "green",
        autoClose: 10000,
      });
      void utils.deliberation.getDeliberation.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Publication failed",
        message: err.message,
        color: "red",
      });
    },
  });

  const linkTranscriptions =
    api.deliberation.linkEventTranscriptions.useMutation({
      onSuccess: (data) => {
        notifications.show({
          title: "Transcriptions linked",
          message: `Linked ${String(data.linked)} transcription(s) to this deliberation.`,
          color: "green",
        });
        void utils.deliberation.getDeliberation.invalidate();
        void utils.transcription.getByDeliberation.invalidate();
      },
      onError: (err) => {
        notifications.show({
          title: "Error linking transcriptions",
          message: err.message,
          color: "red",
        });
      },
    });

  const moderatePriority = api.deliberation.moderatePriority.useMutation({
    onSuccess: () => {
      void utils.deliberation.getPriorities.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  if (isLoading) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (isError) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Group gap="xs">
            <Button
              component={Link}
              href={`/admin/events/${eventId}`}
              variant="subtle"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
            >
              Back to Event
            </Button>
          </Group>
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Failed to load deliberation"
            color="red"
            variant="light"
          >
            {error?.message ?? "An unexpected error occurred. Please try again later."}
          </Alert>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group gap="xs">
          <Button
            component={Link}
            href={`/admin/events/${eventId}`}
            variant="subtle"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
          >
            Back to Event
          </Button>
        </Group>

        <Title order={2}>Deliberation Management</Title>

        {deliberation && (
          <Stack gap={4}>
            <Text fw={600}>{deliberation.title}</Text>
            {deliberation.description && (
              <Text size="sm" c="dimmed">
                {deliberation.description}
              </Text>
            )}
          </Stack>
        )}

        {!deliberation ? (
          /* No deliberation yet — create form */
          <Paper p="lg" radius="md" withBorder>
            {showCreateForm ? (
              <Stack gap="md">
                <Title order={4}>Create Deliberation</Title>
                <TextInput
                  label="Title"
                  placeholder="e.g., Community Priorities 2026"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.currentTarget.value)}
                  required
                  maxLength={200}
                />
                <Textarea
                  label="Description (optional)"
                  placeholder="What should attendees focus on?"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.currentTarget.value)}
                  maxLength={2000}
                  minRows={2}
                  autosize
                />
                <Group>
                  <Button
                    onClick={() =>
                      createDeliberation.mutate({
                        eventId,
                        title: newTitle.trim(),
                        description: newDescription.trim() || undefined,
                      })
                    }
                    loading={createDeliberation.isPending}
                    disabled={newTitle.trim().length < 3}
                  >
                    Create
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={() => setShowCreateForm(false)}
                  >
                    Cancel
                  </Button>
                </Group>
              </Stack>
            ) : (
              <Stack gap="md" align="center">
                <Text c="dimmed">
                  No deliberation has been created for this event yet.
                </Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setShowCreateForm(true)}
                >
                  Create Deliberation
                </Button>
              </Stack>
            )}
          </Paper>
        ) : (
          <>
            {/* Status lifecycle */}
            <Paper p="lg" radius="md" withBorder>
              <Stack gap="md">
                <Title order={4}>Status</Title>
                <Stepper active={getStepIndex(deliberation.status)} size="sm">
                  <Stepper.Step label="Collecting" description="Open" />
                  <Stepper.Step label="Closed" description="No submissions" />
                  <Stepper.Step label="Analyzing" description="Processing" />
                  <Stepper.Step label="Published" description="Results live" />
                </Stepper>

                <Group gap="xs">
                  {deliberation.status === "COLLECTING" && (
                    <>
                      <Button
                        variant="light"
                        color="orange"
                        leftSection={<IconLock size={14} />}
                        onClick={() =>
                          closeDeliberation.mutate({
                            deliberationId: deliberation.id,
                          })
                        }
                        loading={closeDeliberation.isPending}
                      >
                        Close Submissions
                      </Button>
                      <Tooltip label="Run topic clustering on available transcripts (can run while still collecting)">
                        <Button
                          variant="light"
                          color="blue"
                          leftSection={<IconChartDots size={14} />}
                          onClick={() =>
                            triggerClustering.mutate({
                              deliberationId: deliberation.id,
                            })
                          }
                          loading={triggerClustering.isPending}
                          disabled={deliberation._count.transcripts === 0}
                        >
                          Run Clustering
                        </Button>
                      </Tooltip>
                    </>
                  )}
                  {deliberation.status === "CLOSED" && (
                    <>
                      <Button
                        variant="light"
                        color="blue"
                        leftSection={<IconChartDots size={14} />}
                        onClick={() =>
                          triggerClustering.mutate({
                            deliberationId: deliberation.id,
                          })
                        }
                        loading={triggerClustering.isPending}
                        disabled={deliberation._count.transcripts === 0}
                      >
                        Run Clustering
                      </Button>
                      <Button
                        variant="light"
                        color="violet"
                        leftSection={<IconBrain size={14} />}
                        onClick={() =>
                          triggerAnalysis.mutate({
                            deliberationId: deliberation.id,
                          })
                        }
                        loading={triggerAnalysis.isPending}
                      >
                        Run Analysis
                      </Button>
                    </>
                  )}
                  {deliberation.status === "ANALYZING" && (
                    <Button
                      variant="light"
                      color="teal"
                      leftSection={<IconRocket size={14} />}
                      onClick={() =>
                        publishResults.mutate({
                          deliberationId: deliberation.id,
                        })
                      }
                      loading={publishResults.isPending}
                    >
                      Publish to AT Protocol
                    </Button>
                  )}
                  {deliberation.status === "PUBLISHED" && (
                    <Button
                      component={Link}
                      href={`/events/${eventId}/deliberation/results`}
                      variant="light"
                      color="violet"
                      leftSection={<IconExternalLink size={14} />}
                    >
                      View Results
                    </Button>
                  )}
                </Group>

                {/* AT Protocol URIs after publication */}
                {deliberation.status === "PUBLISHED" &&
                  deliberation.summaryUri && (
                    <Paper p="sm" radius="sm" withBorder bg="var(--mantine-color-dark-6)">
                      <Stack gap="xs">
                        <Group gap="xs">
                          <IconCheck size={14} color="var(--mantine-color-green-6)" />
                          <Text size="sm" fw={600}>
                            Published DDS Records
                          </Text>
                        </Group>
                        <Stack gap={4}>
                          {deliberation.summaryUri && (
                            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                              Summary: {deliberation.summaryUri}
                            </Text>
                          )}
                          {deliberation.pcaUri && (
                            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                              PCA: {deliberation.pcaUri}
                            </Text>
                          )}
                          {deliberation.activityUri && (
                            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                              Activity: {deliberation.activityUri}
                            </Text>
                          )}
                          {deliberation.boardUri && (
                            <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                              Board: {deliberation.boardUri}
                            </Text>
                          )}
                        </Stack>
                      </Stack>
                    </Paper>
                  )}
              </Stack>
            </Paper>

            {/* Stats */}
            <Paper p="lg" radius="md" withBorder>
              <Group gap="xl">
                <Stack gap={2}>
                  <Text size="xl" fw={700}>
                    {deliberation._count.priorities}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Priorities
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xl" fw={700}>
                    {deliberation.totalVotes}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Votes
                  </Text>
                </Stack>
                <Stack gap={2}>
                  <Text size="xl" fw={700}>
                    {deliberation._count.transcripts}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Transcripts
                  </Text>
                  {deliberation._count.transcripts === 0 && (
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() =>
                        linkTranscriptions.mutate({
                          deliberationId: deliberation.id,
                        })
                      }
                      loading={linkTranscriptions.isPending}
                    >
                      Link Event Transcriptions
                    </Button>
                  )}
                </Stack>
                <Stack gap={2}>
                  <Text size="xl" fw={700}>
                    {deliberation._count.topicClusters}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Topic Clusters
                  </Text>
                </Stack>
              </Group>
            </Paper>

            {/* Topic Clusters */}
            {topicClusters && topicClusters.length > 0 && (
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Group gap="xs">
                    <Title order={4}>Topic Clusters</Title>
                    <Badge size="sm" variant="light">
                      {topicClusters.length}
                    </Badge>
                  </Group>
                  <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    {topicClusters.map((cluster) => (
                      <Paper
                        key={cluster.id}
                        p="sm"
                        radius="sm"
                        withBorder
                      >
                        <Stack gap="xs">
                          <Group justify="space-between" align="center">
                            <Text fw={600} size="sm">
                              {cluster.label}
                            </Text>
                            <Badge size="sm" variant="light" color="blue">
                              {cluster.mentionCount} mentions
                            </Badge>
                          </Group>
                          {cluster.keywords.length > 0 && (
                            <Group gap={4}>
                              {cluster.keywords.map((kw: string) => (
                                <Badge
                                  key={kw}
                                  size="xs"
                                  variant="outline"
                                  color="gray"
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </Group>
                          )}
                          {cluster.sourceExcerpts.length > 0 && (
                            <Text size="xs" c="dimmed" lineClamp={2} fs="italic">
                              {cluster.sourceExcerpts[0]}
                            </Text>
                          )}
                        </Stack>
                      </Paper>
                    ))}
                  </SimpleGrid>
                </Stack>
              </Paper>
            )}

            {/* Analysis Results Preview */}
            {analysis && (
              <>
                {/* Statistics Overview */}
                {analysis.statistics && (
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="md">
                      <Title order={4}>Analysis Statistics</Title>
                      <Group gap="xl">
                        <Stack gap={2}>
                          <Text size="xl" fw={700} c="green">
                            {analysis.statistics.convergentCount}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Convergent
                          </Text>
                        </Stack>
                        <Stack gap={2}>
                          <Text size="xl" fw={700} c="orange">
                            {analysis.statistics.blindSpotCount}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Blind Spots
                          </Text>
                        </Stack>
                        <Stack gap={2}>
                          <Text size="xl" fw={700} c="blue">
                            {analysis.statistics.aspirationalCount}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Aspirational
                          </Text>
                        </Stack>
                        <Stack gap={2}>
                          <Text size="xl" fw={700}>
                            {analysis.statistics.totalBlockers}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Blockers
                          </Text>
                        </Stack>
                        <Stack gap={2}>
                          <Text size="xl" fw={700}>
                            {analysis.statistics.totalResources}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Resources
                          </Text>
                        </Stack>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Generated {new Date(analysis.generatedAt).toLocaleString()}
                      </Text>
                    </Stack>
                  </Paper>
                )}

                {/* Classified Priorities */}
                {analysis.classifiedPriorities.length > 0 && (
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="md">
                      <Group gap="xs">
                        <Title order={4}>Classified Priorities</Title>
                        <Group gap="xs" ml="auto">
                          <Badge color="green" variant="light" size="xs">
                            Convergent = discussed + voted
                          </Badge>
                          <Badge color="orange" variant="light" size="xs">
                            Blind Spot = discussed only
                          </Badge>
                          <Badge color="blue" variant="light" size="xs">
                            Aspirational = voted only
                          </Badge>
                        </Group>
                      </Group>
                      {analysis.classifiedPriorities.map((p, i) => {
                        const badge = getSignalBadge(p.classification);
                        const maxVotes = Math.max(
                          ...analysis.classifiedPriorities.map((cp) => cp.voteCount),
                          1,
                        );
                        return (
                          <Paper key={p.priorityId} p="sm" radius="sm" withBorder>
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Group gap="xs">
                                  <Text fw={600} size="sm">
                                    {String(i + 1)}. {p.title}
                                  </Text>
                                  <Badge
                                    color={badge.color}
                                    variant="light"
                                    size="sm"
                                  >
                                    {badge.label}
                                  </Badge>
                                </Group>
                                <Text size="sm" c="dimmed">
                                  {p.voteCount} votes
                                </Text>
                              </Group>
                              <Progress
                                value={(p.voteCount / maxVotes) * 100}
                                color={badge.color}
                                size="sm"
                              />
                              <Text size="xs" c="dimmed">
                                {p.reasoning}
                              </Text>
                              {p.relatedTopicLabels.length > 0 && (
                                <Group gap={4}>
                                  <Text size="xs" c="dimmed">
                                    Matched topics:
                                  </Text>
                                  {p.relatedTopicLabels.map((t) => (
                                    <Badge
                                      key={t}
                                      size="xs"
                                      variant="outline"
                                      color="gray"
                                    >
                                      {t}
                                    </Badge>
                                  ))}
                                </Group>
                              )}
                            </Stack>
                          </Paper>
                        );
                      })}
                    </Stack>
                  </Paper>
                )}

                {/* Blocker Themes */}
                {analysis.blockerThemes.length > 0 && (
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="md">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="orange">
                          <IconAlertTriangle size={14} />
                        </ThemeIcon>
                        <Title order={4}>Blocker Themes</Title>
                      </Group>
                      <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {analysis.blockerThemes.map((bt, i) => (
                          <Paper key={i} p="sm" radius="sm" withBorder>
                            <Stack gap="xs">
                              <Group justify="space-between">
                                <Text fw={500} size="sm">
                                  {bt.theme}
                                </Text>
                                <Badge size="sm" variant="light" color="orange">
                                  {bt.frequency}x
                                </Badge>
                              </Group>
                              <Text size="xs" c="dimmed">
                                {bt.description}
                              </Text>
                              <Group gap={4}>
                                {bt.affectedPriorities.map((ap) => (
                                  <Badge
                                    key={ap}
                                    size="xs"
                                    variant="outline"
                                    color="gray"
                                  >
                                    {ap}
                                  </Badge>
                                ))}
                              </Group>
                            </Stack>
                          </Paper>
                        ))}
                      </SimpleGrid>
                    </Stack>
                  </Paper>
                )}

                {/* Resource Recommendations */}
                {analysis.resourceRecommendations.length > 0 && (
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="md">
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light" color="teal">
                          <IconCoin size={14} />
                        </ThemeIcon>
                        <Title order={4}>Resource Recommendations</Title>
                      </Group>
                      {analysis.resourceRecommendations.map((r, i) => (
                        <Paper key={i} p="sm" radius="sm" withBorder>
                          <Group gap="xs" align="flex-start">
                            <Badge variant="light" color="teal" size="sm">
                              {r.category}
                            </Badge>
                            <Badge
                              variant="light"
                              color={getUrgencyColor(r.urgency)}
                              size="xs"
                            >
                              {r.urgency}
                            </Badge>
                            <Stack gap={2} style={{ flex: 1 }}>
                              <Text size="sm">{r.recommendation}</Text>
                              {r.relatedPriorities.length > 0 && (
                                <Text size="xs" c="dimmed">
                                  Related: {r.relatedPriorities.join(", ")}
                                </Text>
                              )}
                            </Stack>
                          </Group>
                        </Paper>
                      ))}
                    </Stack>
                  </Paper>
                )}

                {/* Synthesis */}
                {analysis.synthesis && (
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="md">
                      <Title order={4}>Synthesis</Title>
                      <Text size="sm" style={{ whiteSpace: "pre-line" }}>
                        {analysis.synthesis}
                      </Text>
                    </Stack>
                  </Paper>
                )}
              </>
            )}

            {/* Transcripts */}
            {transcripts && transcripts.length > 0 && (
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={4}>Transcripts</Title>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Title</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Uploaded By</Table.Th>
                        <Table.Th>File</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {transcripts.map((t) => (
                        <Table.Tr key={t.id}>
                          <Table.Td>{t.title}</Table.Td>
                          <Table.Td>
                            <Badge
                              size="sm"
                              variant="light"
                              color={
                                t.status === "COMPLETED"
                                  ? "green"
                                  : t.status === "FAILED"
                                    ? "red"
                                    : t.status === "PROCESSING"
                                      ? "blue"
                                      : "gray"
                              }
                            >
                              {t.status}
                            </Badge>
                          </Table.Td>
                          <Table.Td>{t.uploadedBy?.name ?? "Unknown"}</Table.Td>
                          <Table.Td>
                            <Text size="xs" c="dimmed">
                              {t.audioFileName}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Paper>
            )}

            {/* Moderation queue */}
            {priorities && priorities.length > 0 && (
              <Paper p="lg" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={4}>Priority Moderation</Title>
                  <Text size="sm" c="dimmed">
                    Toggle moderation to hide inappropriate submissions from
                    attendees.
                  </Text>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Priority</Table.Th>
                        <Table.Th>Submitted By</Table.Th>
                        <Table.Th>Votes</Table.Th>
                        <Table.Th>Hidden</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {priorities.map((p) => (
                        <Table.Tr key={p.id}>
                          <Table.Td>
                            <Text size="sm" lineClamp={1}>
                              {p.title}
                            </Text>
                          </Table.Td>
                          <Table.Td>{p.user.name ?? "Anonymous"}</Table.Td>
                          <Table.Td>{p._count.votes}</Table.Td>
                          <Table.Td>
                            <Switch
                              checked={p.isModerated}
                              onChange={(e) =>
                                moderatePriority.mutate({
                                  priorityId: p.id,
                                  isModerated: e.currentTarget.checked,
                                })
                              }
                              size="xs"
                            />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Stack>
              </Paper>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
