"use client";

import React, { useState } from "react";
import {
  Container,
  Stack,
  Grid,
  Card,
  Group,
  Text,
  Title,
  Badge,
  Avatar,
  Button,
  Alert,
  Box,
  ActionIcon,
  Collapse,
  ScrollArea,
  Paper,
  Divider,
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
  IconArrowLeft,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
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
  recommendation: string | null,
): "ACCEPT" | "REJECT" | "WAITLIST" | "NEEDS_MORE_INFO" {
  if (!recommendation) return "NEEDS_MORE_INFO";
  const valid = ["ACCEPT", "REJECT", "WAITLIST"];
  return valid.includes(recommendation)
    ? (recommendation as "ACCEPT" | "REJECT" | "WAITLIST")
    : "NEEDS_MORE_INFO";
}

interface ReviewerCardProps {
  reviewer: WeightedReviewerScore;
  onExpandToggle: () => void;
  expanded: boolean;
  evaluationData?: {
    id: string;
    overallScore: number | null;
    confidence: number | null;
    recommendation: string | null;
    overallComments: string | null;
    completedAt: Date | null;
    scores: Array<{
      id: string;
      score: number;
      reasoning: string | null;
      criteria: {
        id: string;
        name: string;
        weight: number;
        order: number;
      };
    }>;
    comments: Array<{
      id: string;
      comment: string;
      createdAt: Date;
    }>;
  };
}

function ReviewerCard({
  reviewer,
  onExpandToggle,
  expanded,
  evaluationData,
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

        {/* Score and recommendation summary */}
        <Group justify="space-between">
          <Group gap="sm">
            <Group gap="xs">
              <IconStar size={14} />
              <Text fw={600} size="sm">
                {reviewer.weightedScore?.toFixed(1) ?? "N/A"}
              </Text>
            </Group>

            {reviewer.recommendation && (
              <Badge
                color={
                  reviewer.recommendation === "ACCEPT"
                    ? "green"
                    : reviewer.recommendation === "REJECT"
                      ? "red"
                      : "yellow"
                }
                variant="filled"
                size="sm"
              >
                {reviewer.recommendation}
              </Badge>
            )}
          </Group>

          <Group gap="xs">
            <Text size="xs" c="dimmed">
              Confidence:
            </Text>
            {confidenceStars.map((star) =>
              star <= reviewer.confidence ? (
                <IconStarFilled
                  key={star}
                  size={12}
                  color={getConfidenceColor(reviewer.confidence)}
                />
              ) : (
                <IconStar
                  key={star}
                  size={12}
                  color="var(--mantine-color-gray-4)"
                />
              ),
            )}
          </Group>
        </Group>

        {/* Expanded details */}
        <Collapse in={expanded}>
          <Divider my="sm" />
          <Stack gap="md">
            {/* Competency weights */}
            {reviewer.competencies && reviewer.competencies.length > 0 && (
              <Box>
                <Text size="xs" fw={600} mb="xs">
                  Reviewer Competencies
                </Text>
                <Group gap="xs">
                  {reviewer.competencies.map((comp, index) => (
                    <Badge
                      key={index}
                      color={getCompetencyColor(comp.competencyLevel)}
                      variant="light"
                      size="xs"
                    >
                      {getCategoryDisplayName(comp.category)}(
                      {getCompetencyLabel(comp.competencyLevel)})
                    </Badge>
                  ))}
                </Group>
              </Box>
            )}

            {/* Overall evaluation details */}
            {evaluationData && (
              <Box>
                <Text size="xs" fw={600} mb="xs">
                  Overall Evaluation
                </Text>
                <Group gap="md" mb="xs">
                  {evaluationData.overallScore && (
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        Overall Score:
                      </Text>
                      <Badge color="blue" size="sm">
                        {evaluationData.overallScore.toFixed(1)}/10
                      </Badge>
                    </Group>
                  )}
                  <Group gap="xs">
                    <Text size="xs" c="dimmed">
                      Confidence:
                    </Text>
                    <Group gap={2}>
                      {confidenceStars.map((star) =>
                        star <= (evaluationData.confidence ?? 0) ? (
                          <IconStarFilled
                            key={star}
                            size={10}
                            color={getConfidenceColor(
                              evaluationData.confidence ?? 0,
                            )}
                          />
                        ) : (
                          <IconStar
                            key={star}
                            size={10}
                            color="var(--mantine-color-gray-4)"
                          />
                        ),
                      )}
                    </Group>
                  </Group>
                </Group>
              </Box>
            )}

            {/* Overall recommendation notes */}
            {evaluationData?.overallComments && (
              <Box>
                <Text size="xs" fw={600} mb="xs">
                  Recommendation Notes
                </Text>
                <Paper p="sm" bg="blue.1" radius="sm">
                  <Text size="sm" style={{ lineHeight: 1.4 }}>
                    {evaluationData.overallComments}
                  </Text>
                </Paper>
              </Box>
            )}

            {/* Detailed criteria scores */}
            {evaluationData?.scores && evaluationData.scores.length > 0 && (
              <Box>
                <Text size="xs" fw={600} mb="xs">
                  Detailed Scores
                </Text>
                <Stack gap="xs">
                  {evaluationData.scores
                    .sort((a, b) => a.criteria.order - b.criteria.order)
                    .map((score) => (
                      <Paper key={score.id} p="xs" bg="gray.1" radius="sm">
                        <Group justify="space-between" mb="xs">
                          <Text size="xs" fw={500}>
                            {score.criteria.name}
                          </Text>
                          <Badge color="blue" size="xs">
                            {score.score}/10
                          </Badge>
                        </Group>
                        {score.reasoning && (
                          <Text
                            size="xs"
                            c="dimmed"
                            style={{ lineHeight: 1.3 }}
                          >
                            {score.reasoning}
                          </Text>
                        )}
                      </Paper>
                    ))}
                </Stack>
              </Box>
            )}

            {/* Comments */}
            {evaluationData?.comments && evaluationData.comments.length > 0 && (
              <Box>
                <Text size="xs" fw={600} mb="xs">
                  Comments
                </Text>
                <Stack gap="xs">
                  {evaluationData.comments.map((comment) => (
                    <Paper key={comment.id} p="xs" bg="yellow.1" radius="sm">
                      <Text size="xs" style={{ lineHeight: 1.3 }}>
                        {comment.comment}
                      </Text>
                      <Text size="xs" c="dimmed" mt="xs">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </Text>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Review completed date */}
            {reviewer.completedAt && (
              <Text size="xs" c="dimmed">
                Completed: {new Date(reviewer.completedAt).toLocaleDateString()}
              </Text>
            )}
          </Stack>
        </Collapse>
      </Stack>
    </Card>
  );
}

interface ConsensusEvaluationViewProps {
  evaluationData: {
    id: string;
    applicationId: string;
    stage: string;
    status: string;
    consensusData?: {
      id: string;
      user: { name: string | null; email: string | null } | null;
      event: { id: string; name: string } | null;
      evaluations: Array<{
        id: string;
        overallScore: number | null;
        confidence: number | null;
        recommendation: string | null;
        overallComments: string | null;
        completedAt: Date | null;
        reviewer: {
          id: string;
          name: string | null;
          email: string | null;
          image: string | null;
          reviewerCompetencies: Array<{
            category: string;
            competencyLevel: number;
            baseWeight: number;
          }> | null;
        };
        scores: Array<{
          id: string;
          score: number;
          reasoning: string | null;
          criteria: {
            id: string;
            name: string;
            weight: number;
            order: number;
          };
        }>;
        comments: Array<{
          id: string;
          comment: string;
          createdAt: Date;
        }>;
      }>;
      consensus: {
        id: string;
        finalDecision: string | null;
        consensusScore: number | null;
        discussionNotes: string | null;
        decidedAt: Date | null;
      } | null;
      responses: Array<{
        id: string;
        answer: string;
        question: {
          id: string;
          questionKey: string;
          questionEn: string;
          order: number;
        };
      }> | null;
    };
  };
}

export default function ConsensusEvaluationView({
  evaluationData,
}: ConsensusEvaluationViewProps) {
  const router = useRouter();
  const [expandedReviewers, setExpandedReviewers] = useState<Set<string>>(
    new Set(),
  );

  const { consensusData } = evaluationData;

  // Early return if no consensus data
  if (!consensusData) {
    return (
      <Container size="xl" py="md">
        <Stack gap="lg">
          <Group justify="space-between">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size="1rem" />}
              onClick={() => router.back()}
            >
              Back to Applications
            </Button>
          </Group>
          <Alert color="yellow" title="No Data Available">
            Consensus data is not available for this evaluation.
          </Alert>
        </Stack>
      </Container>
    );
  }

  const toggleReviewerExpanded = (reviewerId: string) => {
    const newExpanded = new Set(expandedReviewers);
    if (newExpanded.has(reviewerId)) {
      newExpanded.delete(reviewerId);
    } else {
      newExpanded.add(reviewerId);
    }
    setExpandedReviewers(newExpanded);
  };

  // Transform evaluation data to enhanced reviewer scores with competencies
  const reviewerScores: EnhancedReviewerScore[] = consensusData.evaluations.map(
    (evaluation) => ({
      reviewerId: evaluation.reviewer.id,
      reviewerName: evaluation.reviewer.name,
      reviewerEmail: evaluation.reviewer.email ?? "",
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
    <Container size="xl" py="md">
      <Stack gap="lg">
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
                    {weightedScores.map((reviewer) => {
                      // Find the corresponding evaluation data for this reviewer
                      const evaluationForReviewer =
                        consensusData.evaluations.find(
                          (evaluation) =>
                            evaluation.reviewer.id === reviewer.reviewerId,
                        );

                      return (
                        <ReviewerCard
                          key={reviewer.reviewerId}
                          reviewer={reviewer}
                          onExpandToggle={() =>
                            toggleReviewerExpanded(reviewer.reviewerId)
                          }
                          expanded={expandedReviewers.has(reviewer.reviewerId)}
                          evaluationData={evaluationForReviewer}
                        />
                      );
                    })}

                    {weightedScores.length === 0 && (
                      <Text ta="center" c="dimmed" py="xl">
                        No completed reviews yet
                      </Text>
                    )}
                  </Stack>
                </ScrollArea>

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
      </Stack>
    </Container>
  );
}
