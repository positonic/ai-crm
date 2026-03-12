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
  Anchor,
  Center,
  Loader,
  ThemeIcon,
  SimpleGrid,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconTarget,
  IconAlertTriangle,
  IconCoin,
  IconExternalLink,
} from "@tabler/icons-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/react";

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
  classifiedPriorities?: ClassifiedPriority[];
  blockerThemes?: BlockerTheme[];
  resourceRecommendations?: ResourceRecommendation[];
  synthesis?: string;
  statistics?: {
    totalPriorities: number;
    totalVotes: number;
    totalBlockers: number;
    totalResources: number;
    topicClusterCount: number;
    convergentCount: number;
    blindSpotCount: number;
    aspirationalCount: number;
  };
  generatedAt?: string;
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

export default function ResultsClient() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;

  const { data: deliberation, isLoading: loadingDelib } =
    api.deliberation.getDeliberation.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  const { data: results, isLoading: loadingResults } =
    api.deliberation.getAnalysisResults.useQuery(
      { deliberationId: deliberation?.id ?? "" },
      { enabled: !!deliberation?.id },
    );

  if (loadingDelib || loadingResults) {
    return (
      <Center h="60vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!deliberation || !results) {
    return (
      <Container size="md" py="xl">
        <Stack gap="md" align="center">
          <IconTarget size={48} color="var(--mantine-color-dimmed)" />
          <Title order={3}>Results Not Available</Title>
          <Text c="dimmed" ta="center">
            Analysis results will appear here after the deliberation is analyzed
            and published.
          </Text>
          <Button
            component={Link}
            href={`/events/${eventId}/deliberation`}
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
          >
            Back to Priorities
          </Button>
        </Stack>
      </Container>
    );
  }

  const analysis = results.analysisResult as AnalysisResult | null;

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="xs">
          <Button
            component={Link}
            href={`/events/${eventId}/deliberation`}
            variant="subtle"
            size="xs"
            leftSection={<IconArrowLeft size={14} />}
            style={{ alignSelf: "flex-start" }}
          >
            Back to Priorities
          </Button>
          <Title order={2}>Deliberation Results</Title>
        </Stack>

        {/* Signal Legend */}
        <Paper p="md" radius="md" withBorder>
          <Group gap="lg">
            <Text size="sm" fw={500}>
              Signal Classification:
            </Text>
            <Group gap="xs">
              <Badge color="green" variant="light">
                Convergent
              </Badge>
              <Text size="xs" c="dimmed">
                Discussed + voted
              </Text>
            </Group>
            <Group gap="xs">
              <Badge color="orange" variant="light">
                Blind Spot
              </Badge>
              <Text size="xs" c="dimmed">
                Discussed but not submitted
              </Text>
            </Group>
            <Group gap="xs">
              <Badge color="blue" variant="light">
                Aspirational
              </Badge>
              <Text size="xs" c="dimmed">
                Voted but not discussed
              </Text>
            </Group>
          </Group>
        </Paper>

        {/* Classified Priorities */}
        {analysis?.classifiedPriorities && analysis.classifiedPriorities.length > 0 && (
          <Stack gap="md">
            <Title order={3}>Classified Priorities</Title>
            {analysis.classifiedPriorities.map((p, i) => {
              const badge = getSignalBadge(p.classification);
              const maxVotes = Math.max(
                ...analysis.classifiedPriorities!.map((cp) => cp.voteCount),
                1,
              );
              return (
                <Paper key={p.priorityId} p="md" radius="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text fw={600}>
                          {String(i + 1)}. {p.title}
                        </Text>
                        <Badge color={badge.color} variant="light" size="sm">
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
        )}

        {/* Blocker Themes */}
        {analysis?.blockerThemes && analysis.blockerThemes.length > 0 && (
          <Stack gap="md">
            <Group gap="xs">
              <ThemeIcon size="sm" variant="light" color="orange">
                <IconAlertTriangle size={14} />
              </ThemeIcon>
              <Title order={3}>Blocker Themes</Title>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              {analysis.blockerThemes.map((bt, i) => (
                <Paper key={i} p="md" radius="md" withBorder>
                  <Stack gap="xs">
                    <Group justify="space-between">
                      <Text fw={500}>{bt.theme}</Text>
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
        )}

        {/* Resource Recommendations */}
        {analysis?.resourceRecommendations &&
          analysis.resourceRecommendations.length > 0 && (
            <Stack gap="md">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color="teal">
                  <IconCoin size={14} />
                </ThemeIcon>
                <Title order={3}>Resource Recommendations</Title>
              </Group>
              {analysis.resourceRecommendations.map((r, i) => (
                <Paper key={i} p="md" radius="md" withBorder>
                  <Group gap="xs" align="flex-start">
                    <Badge variant="light" color="teal" size="sm">
                      {r.category}
                    </Badge>
                    <Badge
                      variant="light"
                      color={
                        r.urgency === "high"
                          ? "red"
                          : r.urgency === "medium"
                            ? "orange"
                            : "blue"
                      }
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
          )}

        {/* Synthesis */}
        {analysis?.synthesis && (
          <Stack gap="md">
            <Title order={3}>Synthesis</Title>
            <Paper p="lg" radius="md" withBorder>
              <Text size="sm" style={{ whiteSpace: "pre-line" }}>
                {analysis.synthesis}
              </Text>
            </Paper>
          </Stack>
        )}

        {/* AT Protocol Links */}
        {(results.summaryUri ?? results.pcaUri ?? results.activityUri) && (
          <Stack gap="md">
            <Title order={3}>Verifiable Records</Title>
            <Paper p="md" radius="md" withBorder>
              <Stack gap="xs">
                {results.summaryUri && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Summary:
                    </Text>
                    <Anchor href={results.summaryUri} target="_blank" size="sm">
                      <Group gap={4}>
                        {results.summaryUri}
                        <IconExternalLink size={12} />
                      </Group>
                    </Anchor>
                  </Group>
                )}
                {results.pcaUri && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Topic Analysis:
                    </Text>
                    <Anchor href={results.pcaUri} target="_blank" size="sm">
                      <Group gap={4}>
                        {results.pcaUri}
                        <IconExternalLink size={12} />
                      </Group>
                    </Anchor>
                  </Group>
                )}
                {results.activityUri && (
                  <Group gap="xs">
                    <Text size="sm" fw={500}>
                      Activity Cert:
                    </Text>
                    <Anchor
                      href={results.activityUri}
                      target="_blank"
                      size="sm"
                    >
                      <Group gap={4}>
                        {results.activityUri}
                        <IconExternalLink size={12} />
                      </Group>
                    </Anchor>
                  </Group>
                )}
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* Placeholder if no analysis */}
        {!analysis && (
          <Paper p="xl" radius="md" withBorder>
            <Stack gap="md" align="center">
              <Text c="dimmed" ta="center">
                Analysis data is not yet available. Results will appear here
                once the deliberation is analyzed.
              </Text>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Container>
  );
}
