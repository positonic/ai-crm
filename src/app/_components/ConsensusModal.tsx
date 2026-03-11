"use client";

import { useState } from "react";
import {
  Modal,
  Stack,
  Grid,
  Card,
  Group,
  Text,
  Title,
  Badge,
  Avatar,
  Button,
  Select,
  Textarea,
  Divider,
  Alert,
  Box,
  ActionIcon,
  Collapse,
  ScrollArea,
  Paper,
} from "@mantine/core";
import {
  IconStar,
  IconStarFilled,
  IconCheck,
  IconX,
  IconChevronDown,
  IconChevronUp,
  IconUsers,
  IconMessageCircle,
  IconAlertTriangle,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { getDisplayName } from "~/utils/userDisplay";
import {
  calculateEnhancedWeightedScores,
  getConsensusIndicator,
  getConfidenceColor,
  getConsensusColor,
  type EnhancedReviewerScore,
  type WeightedReviewerScore,
  getCompetencyColor,
  getCompetencyLabel,
  getCategoryDisplayName,
} from "~/utils/confidenceWeighting";

// Helper function to validate recommendation values from database
function validateRecommendation(
  rec: string | null,
): "ACCEPT" | "REJECT" | "WAITLIST" | "NEEDS_MORE_INFO" {
  if (
    rec === "ACCEPT" ||
    rec === "REJECT" ||
    rec === "WAITLIST" ||
    rec === "NEEDS_MORE_INFO"
  ) {
    return rec;
  }
  return "NEEDS_MORE_INFO"; // fallback for invalid values
}

interface ConsensusModalProps {
  opened: boolean;
  onClose: () => void;
  applicationId: string;
  onStatusUpdate?: () => void;
}

interface ReviewerCardProps {
  reviewer: WeightedReviewerScore;
  onExpandToggle: () => void;
  expanded: boolean;
}

function ReviewerCard({
  reviewer,
  onExpandToggle,
  expanded,
}: ReviewerCardProps) {
  const confidenceStars = Array.from({ length: 5 }, (_, i) => i + 1);

  return (
    <Card withBorder p="md" mb="sm">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Group gap="sm">
            <Avatar src={reviewer.reviewerImage ?? ""} size={32} radius="xl">
              {reviewer.reviewerName?.[0]?.toUpperCase() ??
                reviewer.reviewerEmail?.[0]?.toUpperCase() ??
                "?"}
            </Avatar>
            <Box>
              <Text fw={600} size="sm">
                {reviewer.reviewerName ?? "Unknown Reviewer"}
              </Text>
              <Text size="xs" c="dimmed">
                {reviewer.reviewerEmail}
              </Text>
            </Box>
          </Group>

          <ActionIcon variant="subtle" onClick={onExpandToggle}>
            {expanded ? (
              <IconChevronUp size={16} />
            ) : (
              <IconChevronDown size={16} />
            )}
          </ActionIcon>
        </Group>

        <Group justify="space-between" wrap="wrap">
          <Group gap="md">
            <Box ta="center">
              <Text size="xl" fw={700} c="blue">
                {reviewer.overallScore.toFixed(1)}
              </Text>
              <Text size="xs" c="dimmed">
                Original
              </Text>
            </Box>

            <Text size="lg" c="dimmed">
              →
            </Text>

            <Box ta="center">
              <Text
                size="xl"
                fw={700}
                c={getConfidenceColor(reviewer.confidence)}
              >
                {reviewer.weightedScore.toFixed(1)}
              </Text>
              <Text size="xs" c="dimmed">
                Weighted
              </Text>
            </Box>
          </Group>

          <Group gap="sm">
            <Badge
              color={
                reviewer.recommendation === "ACCEPT"
                  ? "green"
                  : reviewer.recommendation === "REJECT"
                    ? "red"
                    : reviewer.recommendation === "WAITLIST"
                      ? "orange"
                      : "gray"
              }
              variant="light"
            >
              {reviewer.recommendation}
            </Badge>
          </Group>
        </Group>

        <Group gap="xs" align="center">
          <Text size="sm" fw={500}>
            Confidence:
          </Text>
          <Group gap={2}>
            {confidenceStars.map((star) => (
              <ActionIcon
                key={star}
                size="xs"
                variant="transparent"
                c={getConfidenceColor(reviewer.confidence)}
              >
                {reviewer.confidence >= star ? (
                  <IconStarFilled size={12} />
                ) : (
                  <IconStar size={12} />
                )}
              </ActionIcon>
            ))}
          </Group>
          <Text size="sm" c="dimmed">
            ({reviewer.confidence}/5 •{" "}
            {Math.round(
              (reviewer.finalWeight ?? reviewer.confidenceWeight) * 100,
            )}
            % final weight)
          </Text>
        </Group>

        <Collapse in={expanded}>
          <Divider my="sm" />

          {/* Weight Breakdown */}
          <Stack gap="xs" mb="md">
            <Text size="sm" fw={500}>
              Weight Breakdown:
            </Text>
            <Group gap="md">
              <Box>
                <Text size="xs" c="dimmed">
                  Confidence
                </Text>
                <Text
                  size="sm"
                  fw={500}
                  c={getConfidenceColor(reviewer.confidence)}
                >
                  {Math.round(reviewer.confidenceWeight * 100)}%
                </Text>
              </Box>
              {reviewer.competencyWeight !== undefined &&
                reviewer.competencyWeight !== 1.0 && (
                  <Box>
                    <Text size="xs" c="dimmed">
                      Competency
                    </Text>
                    <Text size="sm" fw={500} c="blue">
                      {Math.round(reviewer.competencyWeight * 100)}%
                    </Text>
                  </Box>
                )}
              <Box>
                <Text size="xs" c="dimmed">
                  Final
                </Text>
                <Text size="sm" fw={600} c="dark">
                  {Math.round(
                    (reviewer.finalWeight ?? reviewer.confidenceWeight) * 100,
                  )}
                  %
                </Text>
              </Box>
            </Group>
          </Stack>

          {/* Competencies */}
          {reviewer.competencies && reviewer.competencies.length > 0 && (
            <Stack gap="xs" mb="md">
              <Text size="sm" fw={500}>
                Reviewer Competencies:
              </Text>
              <Group gap="xs">
                {reviewer.competencies.map((comp) => (
                  <Badge
                    key={comp.category}
                    color={getCompetencyColor(comp.competencyLevel)}
                    variant="light"
                    size="sm"
                  >
                    {getCategoryDisplayName(comp.category)}:{" "}
                    {getCompetencyLabel(comp.competencyLevel)}
                  </Badge>
                ))}
              </Group>
            </Stack>
          )}

          <Text size="sm" fw={500} mb="xs">
            Completed:
          </Text>
          <Text size="sm" c="dimmed">
            {reviewer.completedAt
              ? new Date(reviewer.completedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Unknown date"}
          </Text>
        </Collapse>
      </Stack>
    </Card>
  );
}

export default function ConsensusModal({
  opened,
  onClose,
  applicationId,
  onStatusUpdate,
}: ConsensusModalProps) {
  const [finalDecision, setFinalDecision] = useState<string>("");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [expandedReviewers, setExpandedReviewers] = useState<Set<string>>(
    new Set(),
  );

  // Fetch consensus data
  const { data: consensusData, refetch } =
    api.evaluation.getConsensusData.useQuery(
      { applicationId },
      { enabled: opened && !!applicationId },
    );

  // Update consensus mutation
  const updateConsensusMutation = api.evaluation.updateConsensus.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Application status updated successfully",
        color: "green",
        icon: <IconCheck />,
      });
      void refetch();
      onStatusUpdate?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message || "Failed to update application status",
        color: "red",
        icon: <IconX />,
      });
    },
  });

  const handleStatusUpdate = async () => {
    if (!finalDecision) return;

    await updateConsensusMutation.mutateAsync({
      applicationId,
      finalDecision: finalDecision as "ACCEPT" | "REJECT" | "WAITLIST",
      discussionNotes: decisionNotes,
    });
  };

  const toggleReviewerExpanded = (reviewerId: string) => {
    const newExpanded = new Set(expandedReviewers);
    if (newExpanded.has(reviewerId)) {
      newExpanded.delete(reviewerId);
    } else {
      newExpanded.add(reviewerId);
    }
    setExpandedReviewers(newExpanded);
  };

  if (!consensusData) {
    return (
      <Modal
        opened={opened}
        onClose={onClose}
        title="Consensus Review"
        size="100%"
      >
        <Text>Loading consensus data...</Text>
      </Modal>
    );
  }

  // Transform evaluation data to enhanced reviewer scores with competencies
  const reviewerScores: EnhancedReviewerScore[] = consensusData.evaluations.map(
    (evaluation) => ({
      reviewerId: evaluation.reviewer.id,
      reviewerName: evaluation.reviewer.name,
      reviewerEmail: evaluation.reviewer.email,
      reviewerImage: evaluation.reviewer.image,
      overallScore: evaluation.overallScore ?? 0,
      confidence: evaluation.confidence ?? 3,
      recommendation: validateRecommendation(evaluation.recommendation),
      completedAt: evaluation.completedAt,
      competencies: evaluation.reviewer.reviewerCompetencies?.map((comp) => ({
        category: comp.category,
        competencyLevel: comp.competencyLevel,
        baseWeight: comp.baseWeight,
      })),
    }),
  );

  const weightedScores = calculateEnhancedWeightedScores(reviewerScores);
  const consensusIndicator = getConsensusIndicator(weightedScores);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group justify="space-between" style={{ width: "100%" }}>
          <Text fw={600}>Consensus Review</Text>
          {consensusData.evaluations?.[0]?.id && (
            <Button
              component="a"
              href={`/admin/evaluations/${consensusData.evaluations[0].id}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="outline"
              size="xs"
              leftSection={<IconExternalLink size={14} />}
            >
              Open in New Tab
            </Button>
          )}
        </Group>
      }
      size="100%"
      styles={{
        body: { padding: 0 },
        content: { height: "90vh" },
      }}
    >
      <Box p="md">
        <Grid gutter="lg">
          {/* Left Panel - Application Details */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Stack gap="md" h="100%">
              <Group>
                <IconUsers size={20} />
                <Title order={4}>Application Details</Title>
              </Group>

              <Card withBorder p="md">
                <Group justify="space-between" mb="md">
                  <Box>
                    <Text size="lg" fw={600}>
                      {getDisplayName(consensusData.user, "No name provided")}
                    </Text>
                    <Text c="dimmed">{consensusData.user?.email}</Text>
                  </Box>
                  <Badge size="lg" color="blue" variant="light">
                    {consensusData.event?.name}
                  </Badge>
                </Group>
              </Card>

              <Box style={{ flex: 1, overflowY: "auto", maxHeight: "60vh" }}>
                <Stack gap="md">
                  {consensusData.responses?.map((response) => (
                    <Card key={response.question.questionKey} withBorder p="md">
                      <Title order={6} mb="xs">
                        {response.question.questionEn}
                      </Title>
                      <Text size="sm">
                        {response.answer || (
                          <Text fs="italic" c="dimmed">
                            No answer provided
                          </Text>
                        )}
                      </Text>
                    </Card>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Grid.Col>

          {/* Right Panel - Consensus Summary */}
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Paper bg="gray.0" p="md" radius="md" h="100%">
              <Stack gap="lg" h="100%">
                <Group>
                  <IconMessageCircle size={20} />
                  <Title order={4}>Reviewer Summary</Title>
                  <Badge color="blue" variant="light">
                    {weightedScores.length} review
                    {weightedScores.length !== 1 ? "s" : ""}
                  </Badge>
                </Group>

                {/* Consensus Indicator */}
                <Alert
                  icon={
                    consensusIndicator.type.includes("accept") ? (
                      <IconCheck size={16} />
                    ) : consensusIndicator.type.includes("reject") ? (
                      <IconX size={16} />
                    ) : (
                      <IconAlertTriangle size={16} />
                    )
                  }
                  color={getConsensusColor(consensusIndicator.type)}
                  title={consensusIndicator.label}
                >
                  {consensusIndicator.description}
                </Alert>

                <ScrollArea style={{ flex: 1, maxHeight: "50vh" }}>
                  <Stack gap="sm">
                    {weightedScores.map((reviewer) => (
                      <ReviewerCard
                        key={reviewer.reviewerId}
                        reviewer={reviewer}
                        onExpandToggle={() =>
                          toggleReviewerExpanded(reviewer.reviewerId)
                        }
                        expanded={expandedReviewers.has(reviewer.reviewerId)}
                      />
                    ))}

                    {weightedScores.length === 0 && (
                      <Text ta="center" c="dimmed" py="xl">
                        No completed reviews yet
                      </Text>
                    )}
                  </Stack>
                </ScrollArea>

                <Divider />

                {/* Final Decision Section */}
                <Card withBorder p="md">
                  <Title order={5} mb="md">
                    Final Decision
                  </Title>
                  <Stack gap="md">
                    <Select
                      label="Application Status"
                      placeholder="Select final decision"
                      value={finalDecision}
                      onChange={(value) => setFinalDecision(value ?? "")}
                      data={[
                        { value: "ACCEPT", label: "Accept" },
                        { value: "REJECT", label: "Reject" },
                        { value: "WAITLIST", label: "Waitlist" },
                      ]}
                    />

                    <Textarea
                      label="Decision Notes"
                      placeholder="Rationale for the final decision..."
                      value={decisionNotes}
                      onChange={(e) => setDecisionNotes(e.target.value)}
                      autosize
                      minRows={3}
                      maxRows={6}
                    />

                    <Button
                      fullWidth
                      leftSection={<IconCheck size={16} />}
                      onClick={handleStatusUpdate}
                      disabled={!finalDecision}
                      loading={updateConsensusMutation.isPending}
                    >
                      Update Application Status
                    </Button>
                  </Stack>
                </Card>

                {/* Current Consensus Status */}
                {consensusData.consensus && (
                  <Alert color="green" title="Decision Recorded">
                    Final Decision:{" "}
                    <strong>{consensusData.consensus.finalDecision}</strong>
                    {consensusData.consensus.decidedAt && (
                      <Text size="sm" mt="xs">
                        Decided on{" "}
                        {new Date(
                          consensusData.consensus.decidedAt,
                        ).toLocaleDateString()}
                      </Text>
                    )}
                  </Alert>
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>
      </Box>
    </Modal>
  );
}
