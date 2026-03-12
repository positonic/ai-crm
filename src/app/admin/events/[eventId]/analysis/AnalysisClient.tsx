"use client";

import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Paper,
  Progress,
  Button,
  SimpleGrid,
  ThemeIcon,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconAlertTriangle,
  IconCoin,
  IconBrain,
  IconRocket,
  IconExternalLink,
} from "@tabler/icons-react";
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

export default function AnalysisClient() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const utils = api.useUtils();

  const { data: deliberation, isLoading: loadingDelib } =
    api.deliberation.getDeliberation.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  const { data: topicClusters } = api.deliberation.getTopicClusters.useQuery(
    { deliberationId: deliberation?.id ?? "" },
    { enabled: !!deliberation?.id },
  );

  const { data: analysisResultRaw, isLoading: loadingAnalysis } =
    api.deliberation.getAnalysisResultsAdmin.useQuery(
      { deliberationId: deliberation?.id ?? "" },
      { enabled: !!deliberation?.id },
    );

  const analysis = analysisResultRaw as AnalysisResult | null;

  const triggerAnalysis = api.deliberation.triggerAnalysis.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Analysis complete",
        message: "Priorities have been classified and synthesis generated.",
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

  const makeResultsPublic = api.deliberation.makeResultsPublic.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Results published",
        message: "Analysis results are now publicly visible.",
        color: "green",
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

  const publishToDDS = api.deliberation.publishResults.useMutation({
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
        title: "AT Protocol publication failed",
        message: err.message,
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

  if (loadingDelib || loadingAnalysis) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!deliberation) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="md" align="center">
          <Title order={3}>No Deliberation Found</Title>
          <Text c="dimmed">
            Create a deliberation first before viewing analysis.
          </Text>
          <Button
            component={Link}
            href={`/admin/events/${eventId}/deliberations`}
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Deliberations
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Button
              component={Link}
              href={`/admin/events/${eventId}/deliberations`}
              variant="subtle"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
            >
              Back to Deliberations
            </Button>
            <Title order={2}>Deliberation Analysis</Title>
            <Text size="sm" c="dimmed">
              {deliberation.title}
            </Text>
          </Stack>
          <Group gap="xs">
            <Button
              variant="light"
              color="blue"
              leftSection={<IconBrain size={14} />}
              onClick={() =>
                triggerClustering.mutate({
                  deliberationId: deliberation.id,
                })
              }
              loading={triggerClustering.isPending}
              disabled={deliberation._count.transcripts === 0}
              size="sm"
            >
              Re-run Clustering
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
              size="sm"
            >
              Re-run Analysis
            </Button>
            {analysis && deliberation.status !== "PUBLISHED" && (
              <Button
                variant="filled"
                color="teal"
                leftSection={<IconRocket size={14} />}
                onClick={() =>
                  makeResultsPublic.mutate({
                    deliberationId: deliberation.id,
                  })
                }
                loading={makeResultsPublic.isPending}
                size="sm"
              >
                Make Results Public
              </Button>
            )}
            {deliberation.status === "PUBLISHED" && (
              <>
                <Button
                  component={Link}
                  href={`/events/${eventId}/deliberation/results`}
                  variant="light"
                  color="teal"
                  leftSection={<IconExternalLink size={14} />}
                  size="sm"
                >
                  View Public Results
                </Button>
                {!deliberation.summaryUri && (
                  <Button
                    variant="light"
                    color="gray"
                    leftSection={<IconRocket size={14} />}
                    onClick={() =>
                      publishToDDS.mutate({
                        deliberationId: deliberation.id,
                      })
                    }
                    loading={publishToDDS.isPending}
                    size="sm"
                  >
                    Publish to AT Protocol
                  </Button>
                )}
              </>
            )}
          </Group>
        </Group>

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
                  <Paper key={cluster.id} p="sm" radius="sm" withBorder>
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

        {/* No analysis yet */}
        {!analysis && (
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="center">
              <IconBrain
                size={48}
                color="var(--mantine-color-dimmed)"
              />
              <Title order={3}>No Analysis Results Yet</Title>
              <Text c="dimmed" ta="center">
                Run the analysis to classify priorities, identify blocker
                themes, and generate resource recommendations.
              </Text>
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
            </Stack>
          </Paper>
        )}

        {/* Analysis Results */}
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
                    Generated{" "}
                    {new Date(analysis.generatedAt).toLocaleString()}
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
                      ...analysis.classifiedPriorities.map(
                        (cp) => cp.voteCount,
                      ),
                      1,
                    );
                    return (
                      <Paper
                        key={p.priorityId}
                        p="sm"
                        radius="sm"
                        withBorder
                      >
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
                            <Badge
                              size="sm"
                              variant="light"
                              color="orange"
                            >
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
      </Stack>
    </Container>
  );
}
