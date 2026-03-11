"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Text,
  Title,
  Group,
  Badge,
  Stack,
  Button,
  Textarea,
  NumberInput,
  Select,
  Divider,
  Alert,
  Progress,
  ActionIcon,
  Box,
  Paper,
  Grid,
  Anchor,
} from "@mantine/core";
import TelegramMessageButton from "./TelegramMessageButton";
import EditApplicationDrawer from "./EditApplicationDrawer";
import {
  IconStarFilled,
  IconStar,
  IconVideo,
  IconNotes,
  IconClock,
  IconCheck,
  IconUsers,
  IconBrandX,
  IconBrandGithub,
  IconBrandLinkedin,
  IconBrandTelegram,
  IconExternalLink,
  IconEdit,
  IconRobot,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import type {
  EvaluationCriteria,
  EvaluationScore,
  Application,
  User,
} from "@prisma/client";

// Helper functions for each social media platform
function renderTelegramLink(
  answer: string,
  application?: {
    responses: Array<{
      answer: string;
      question: {
        questionKey: string;
        questionEn: string;
        order: number;
      };
    }>;
    user: {
      name: string | null;
      email: string | null;
    } | null;
  },
) {
  // Extract telegram handle
  let handle = answer;
  if (handle.includes("t.me/")) {
    const regex = /t\.me\/([^/?]+)/;
    const match = regex.exec(handle);
    if (match?.[1]) {
      handle = match[1];
    }
  }
  handle = handle.replace(/^@/, "");

  return (
    <Group gap="xs">
      <IconBrandTelegram size={16} />
      <Text>@{handle}</Text>
      {application && (
        <TelegramMessageButton
          application={application}
          customMessage="Hey "
          size={16}
          variant="subtle"
          color="blue"
        />
      )}
    </Group>
  );
}

function renderTwitterLink(answer: string) {
  let url = answer;
  if (answer.startsWith("@")) {
    url = `https://x.com/${answer.substring(1)}`;
  } else if (answer.startsWith("http")) {
    // Convert twitter.com URLs to x.com
    url = answer.replace(/twitter\.com/g, "x.com");
  } else if (!answer.startsWith("http")) {
    url = `https://x.com/${answer}`;
  }

  return (
    <Anchor href={url} target="_blank" rel="noopener noreferrer">
      <Group gap="xs">
        <IconBrandX size={16} />
        <Text>{answer}</Text>
        <IconExternalLink size={12} />
      </Group>
    </Anchor>
  );
}

function renderGitHubLink(answer: string) {
  let url = answer;
  if (answer.startsWith("@")) {
    url = `https://github.com/${answer.substring(1)}`;
  } else if (answer.startsWith("http")) {
    url = answer;
  } else {
    url = `https://github.com/${answer}`;
  }

  return (
    <Anchor href={url} target="_blank" rel="noopener noreferrer">
      <Group gap="xs">
        <IconBrandGithub size={16} />
        <Text>{answer}</Text>
        <IconExternalLink size={12} />
      </Group>
    </Anchor>
  );
}

function renderLinkedInLink(answer: string) {
  let url = answer;
  if (answer.startsWith("http")) {
    url = answer;
  } else {
    url = `https://linkedin.com/in/${answer}`;
  }

  return (
    <Anchor href={url} target="_blank" rel="noopener noreferrer">
      <Group gap="xs">
        <IconBrandLinkedin size={16} />
        <Text>{answer}</Text>
        <IconExternalLink size={12} />
      </Group>
    </Anchor>
  );
}

// Main function to render social media links based on questionKey
function renderSocialMediaLink(
  answer: string,
  questionKey: string,
  application?: {
    responses: Array<{
      answer: string;
      question: {
        questionKey: string;
        questionEn: string;
        order: number;
      };
    }>;
    user: {
      name: string | null;
      email: string | null;
    } | null;
  },
) {
  const trimmedAnswer = answer.trim();
  if (!trimmedAnswer) return null;

  // Use exact questionKey matching for deterministic rendering
  switch (questionKey.toLowerCase()) {
    case "telegram":
      return renderTelegramLink(trimmedAnswer, application);

    case "twitter":
    case "x":
      return renderTwitterLink(trimmedAnswer);

    case "github":
      return renderGitHubLink(trimmedAnswer);

    case "linkedin":
      return renderLinkedInLink(trimmedAnswer);

    default:
      // Not a social media question key, return null
      return null;
  }
}

interface SelfAssignmentPromptProps {
  applicationId: string;
  stage:
    | "SCREENING"
    | "DETAILED_REVIEW"
    | "VIDEO_REVIEW"
    | "CONSENSUS"
    | "FINAL_DECISION";
}

function SelfAssignmentPrompt({
  applicationId,
  stage,
}: SelfAssignmentPromptProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  // Self-assign mutation
  const selfAssignMutation = api.evaluation.selfAssignToApplication.useMutation(
    {
      onSuccess: () => {
        notifications.show({
          title: "Application Assigned",
          message: `Successfully assigned to application. You can now begin your review.`,
          color: "green",
        });
        // Reload the page to show the evaluation form
        window.location.reload();
      },
      onError: (error) => {
        notifications.show({
          title: "Assignment Failed",
          message:
            error.message || "Failed to assign application. Please try again.",
          color: "red",
        });
        setIsAssigning(false);
      },
    },
  );

  const handleSelfAssign = async () => {
    setIsAssigning(true);
    await selfAssignMutation.mutateAsync({
      applicationId,
      stage: stage as "SCREENING" | "DETAILED_REVIEW" | "VIDEO_REVIEW",
      priority: 0,
      notes: `Self-assigned via evaluation form`,
    });
  };

  return (
    <Paper p="xl" className="text-center">
      <Stack align="center" gap="md">
        <Alert color="blue" icon={<IconUsers size="1rem" />}>
          <Text fw={500}>
            No evaluation found for this application and stage
          </Text>
          <Text size="sm" mt="xs">
            You can assign yourself to review this application, or wait for an
            admin to assign it to you.
          </Text>
        </Alert>

        <Group gap="md">
          <Button
            onClick={handleSelfAssign}
            loading={isAssigning}
            disabled={isAssigning}
            variant="filled"
            color="blue"
            leftSection={<IconCheck size="1rem" />}
          >
            {isAssigning ? "Assigning..." : "Assign to Me"}
          </Button>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            color="gray"
          >
            Go Back
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

interface ApplicationWithDetails extends Application {
  user: Pick<
    User,
    | "id"
    | "name"
    | "email"
    | "adminNotes"
    | "adminWorkExperience"
    | "adminLabels"
  > | null;
  responses: Array<{
    answer: string;
    question: {
      questionKey: string;
      questionEn: string;
      order: number;
    };
  }>;
}

interface EvaluationFormProps {
  applicationId: string;
  stage:
    | "SCREENING"
    | "DETAILED_REVIEW"
    | "VIDEO_REVIEW"
    | "CONSENSUS"
    | "FINAL_DECISION";
  onEvaluationComplete?: () => void;
}

// Utility function to extract YouTube video ID from various YouTube URL formats
function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    // YouTube Shorts: youtube.com/shorts/VIDEO_ID
    /youtube\.com\/shorts\/([^&\n?#]+)/,
    // Standard YouTube: youtube.com/watch?v=VIDEO_ID
    /youtube\.com\/watch\?v=([^&\n?#]+)/,
    // Short URL: youtu.be/VIDEO_ID
    /youtu\.be\/([^&\n?#]+)/,
    // Embed URL: youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^&\n?#]+)/,
    // Legacy URL: youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^&\n?#]+)/,
    // Watch URL with additional parameters: youtube.com/watch?.*v=VIDEO_ID
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

// Component to render YouTube embed or regular link
function VideoLinkRenderer({
  url,
  questionText,
}: {
  url: string;
  questionText: string;
}) {
  const videoId = extractYouTubeVideoId(url);

  if (videoId) {
    return (
      <Stack gap="md">
        <Text>
          <Anchor href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </Anchor>
        </Text>
        <Box
          style={{
            position: "relative",
            width: "100%",
            height: 0,
            paddingBottom: "56.25%", // 16:9 aspect ratio
            overflow: "hidden",
            borderRadius: "8px",
            border: "1px solid var(--mantine-color-gray-3)",
          }}
        >
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            title={questionText}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              border: 0,
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </Box>
      </Stack>
    );
  }

  // For non-YouTube links, show as regular link
  return (
    <Text>
      <Anchor href={url} target="_blank" rel="noopener noreferrer">
        {url}
      </Anchor>
    </Text>
  );
}

interface CriteriaScoreProps {
  criteria: EvaluationCriteria;
  score?: EvaluationScore;
  onScoreChange: (
    criteriaId: string,
    score: number,
    reasoning?: string,
  ) => void;
  readonly?: boolean;
  application?: ApplicationWithDetails;
}

function CriteriaScore({
  criteria,
  score,
  onScoreChange,
  readonly = false,
  application,
}: CriteriaScoreProps) {
  const [currentScore, setCurrentScore] = useState(score?.score ?? 0);
  const [reasoning, setReasoning] = useState(score?.reasoning ?? "");
  const [showReasoning, setShowReasoning] = useState(false);

  // Sync local state with prop changes (e.g., after autoscore database refetch)
  useEffect(() => {
    setCurrentScore(score?.score ?? 0);
    setReasoning(score?.reasoning ?? "");
  }, [score?.score, score?.reasoning]);

  const handleScoreChange = (newScore: number) => {
    setCurrentScore(newScore);
    onScoreChange(criteria.id, newScore, reasoning);
  };

  const handleReasoningChange = (newReasoning: string) => {
    setReasoning(newReasoning);
    onScoreChange(criteria.id, currentScore, newReasoning);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "green";
    if (score >= 6) return "yellow";
    if (score >= 4) return "orange";
    return "red";
  };

  return (
    <Card withBorder p="md">
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Group gap="xs" mb="xs">
              <Badge
                color={
                  criteria.category === "TECHNICAL"
                    ? "blue"
                    : criteria.category === "PROJECT"
                      ? "green"
                      : criteria.category === "COMMUNITY_FIT"
                        ? "purple"
                        : criteria.category === "VIDEO"
                          ? "orange"
                          : criteria.category === "ENTREPRENEURIAL"
                            ? "teal"
                            : "gray"
                }
                size="sm"
              >
                {criteria.category.replace("_", " ")}
              </Badge>
              <Text size="sm" c="dimmed">
                Weight: {(criteria.weight * 100).toFixed(1)}%
              </Text>
            </Group>

            <Title order={5} mb="xs">
              {criteria.name}
            </Title>
            <Text size="sm" c="dimmed" mb="md">
              {criteria.description}
            </Text>
          </Box>

          <Box ta="center">
            <Text size="xl" fw={700} c={getScoreColor(currentScore)}>
              {currentScore.toFixed(1)}
            </Text>
            <Text size="xs" c="dimmed">
              /{criteria.maxScore}
            </Text>
          </Box>
        </Group>

        {/* Star Rating */}
        <Group gap="xs" justify="center">
          {Array.from({ length: criteria.maxScore }, (_, i) => i + 1).map(
            (star) => (
              <ActionIcon
                key={star}
                variant={currentScore >= star ? "filled" : "outline"}
                color={getScoreColor(currentScore)}
                size="sm"
                disabled={readonly}
                onClick={() => !readonly && handleScoreChange(star)}
              >
                {currentScore >= star ? (
                  <IconStarFilled size={16} />
                ) : (
                  <IconStar size={16} />
                )}
              </ActionIcon>
            ),
          )}
        </Group>

        {/* Number Input for precise scoring */}
        <NumberInput
          label="Score"
          min={criteria.minScore}
          max={criteria.maxScore}
          step={0.1}
          decimalScale={1}
          value={currentScore}
          onChange={(value) =>
            !readonly && handleScoreChange(Number(value) || 0)
          }
          disabled={readonly}
          size="sm"
        />

        {/* Reasoning toggle and textarea */}
        <Group justify="space-between">
          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconNotes size={14} />}
            onClick={() => setShowReasoning(!showReasoning)}
          >
            {showReasoning ? "Hide" : "Add"} Reasoning
          </Button>

          {/* Telegram message button */}
          {application && (
            <TelegramMessageButton
              application={application}
              customMessage={`Hi! I'm reviewing your application for the Funding the Commons residency and have a question about your ${criteria.name.toLowerCase()}. Could you please tell me more about your skills and experience in this area?`}
              size={16}
              variant="subtle"
              color="blue"
            />
          )}
        </Group>

        {showReasoning && (
          <Textarea
            placeholder={`Explain your ${criteria.name.toLowerCase()} score...`}
            value={reasoning}
            onChange={(e) => !readonly && handleReasoningChange(e.target.value)}
            disabled={readonly}
            autosize
            minRows={2}
            maxRows={4}
          />
        )}
      </Stack>
    </Card>
  );
}

export default function ApplicationEvaluationForm({
  applicationId,
  stage,
  onEvaluationComplete,
}: EvaluationFormProps) {
  // ✅ ALL hooks at the top - no exceptions
  const [overallComments, setOverallComments] = useState("");
  const [recommendation, setRecommendation] = useState<string>("");
  const [confidence, setConfidence] = useState<number>(3);
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const [startTime] = useState(Date.now());

  // Edit mode state management for completed evaluations
  const [editMode, setEditMode] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Optimistic local state for scores to handle async updates
  const [localCompletedScores, setLocalCompletedScores] = useState<Set<string>>(
    new Set(),
  );

  // Track pending score updates to prevent race conditions
  const [pendingScoreUpdates, setPendingScoreUpdates] = useState<Set<string>>(
    new Set(),
  );

  // Edit application drawer state
  const [drawerOpened, setDrawerOpened] = useState(false);

  // tRPC queries and utils
  const utils = api.useUtils();
  const { data: criteria } = api.evaluation.getCriteria.useQuery();
  const { data: evaluation, refetch: refetchEvaluation } =
    api.evaluation.getEvaluation.useQuery({
      applicationId,
      stage,
    });

  // Mutations
  const upsertScoreMutation = api.evaluation.upsertScore.useMutation();
  const updateEvaluationMutation =
    api.evaluation.updateEvaluation.useMutation();
  const autoScoreMutation = api.evaluation.autoScoreApplication.useMutation();

  // Calculate progress using both server data and optimistic local state (safe for hooks)
  const serverCompletedCount = evaluation?.scores?.length ?? 0;
  const localCompletedCount = localCompletedScores.size;
  const completedScores = Math.max(serverCompletedCount, localCompletedCount);
  const totalCriteria = criteria?.length ?? 0;
  const progress =
    totalCriteria > 0 ? (completedScores / totalCriteria) * 100 : 0;
  const isCompleted = evaluation?.status === "COMPLETED";
  const isReadonly = isCompleted && !editMode;

  // Robust button validation logic (moved before early returns)
  const isCompleteEvaluationReady = useMemo(() => {
    if (!evaluation || !criteria) return false;
    const hasAllScores = progress >= 100;
    const hasRecommendation = !!recommendation && recommendation.length > 0;
    const notSaving =
      !upsertScoreMutation.isPending && !updateEvaluationMutation.isPending;
    const notAlreadyCompleted = !isCompleted || editMode;

    return (
      hasAllScores && hasRecommendation && notSaving && notAlreadyCompleted
    );
  }, [
    evaluation,
    criteria,
    progress,
    recommendation,
    upsertScoreMutation.isPending,
    updateEvaluationMutation.isPending,
    isCompleted,
    editMode,
  ]);

  // ✅ Unconditional useEffect - conditional logic inside is fine
  useEffect(() => {
    // Initialize form with existing evaluation data
    if (evaluation) {
      setOverallComments(evaluation.overallComments ?? "");
      setRecommendation(evaluation.recommendation ?? "");
      setConfidence(evaluation.confidence ?? 3);
      setTimeSpent(evaluation.timeSpentMinutes ?? 0);

      // Initialize local completed scores from server data
      const completedCriteriaIds = new Set(
        evaluation.scores?.map((score) => score.criteriaId) ?? [],
      );
      setLocalCompletedScores(completedCriteriaIds);
    }
  }, [evaluation]);

  const handleScoreChange = async (
    criteriaId: string,
    score: number,
    reasoning?: string,
  ) => {
    if (!evaluation) return;

    // Prevent duplicate submissions for the same criteria
    if (pendingScoreUpdates.has(criteriaId)) {
      return;
    }

    // Mark as having unsaved changes if in edit mode
    if (editMode) {
      setHasUnsavedChanges(true);
    }

    try {
      // Mark this criteria as having a pending update
      setPendingScoreUpdates((prev) => new Set([...prev, criteriaId]));

      // Optimistic update - immediately mark criteria as completed locally
      setLocalCompletedScores((prev) => new Set([...prev, criteriaId]));

      await upsertScoreMutation.mutateAsync({
        evaluationId: evaluation.id,
        criteriaId,
        score,
        reasoning,
      });

      // Invalidate and refetch the evaluation query for proper cache management
      await utils.evaluation.getEvaluation.invalidate({
        applicationId,
        stage,
      });
    } catch {
      // Revert optimistic update on error
      setLocalCompletedScores((prev) => {
        const newSet = new Set(prev);
        newSet.delete(criteriaId);
        return newSet;
      });

      notifications.show({
        title: "Error",
        message: "Failed to save score",
        color: "red",
      });
    } finally {
      // Always remove from pending updates when done
      setPendingScoreUpdates((prev) => {
        const newSet = new Set(prev);
        newSet.delete(criteriaId);
        return newSet;
      });
    }
  };

  const handleSaveEvaluation = async (status: "IN_PROGRESS" | "COMPLETED") => {
    if (!evaluation) return;

    const currentTimeSpent =
      Math.round((Date.now() - startTime) / 60000) + timeSpent;

    try {
      await updateEvaluationMutation.mutateAsync({
        evaluationId: evaluation.id,
        status,
        overallComments,
        recommendation: recommendation as
          | "ACCEPT"
          | "REJECT"
          | "WAITLIST"
          | "NEEDS_MORE_INFO"
          | undefined,
        confidence,
        timeSpentMinutes: currentTimeSpent,
      });

      await refetchEvaluation();

      // Reset edit mode and unsaved changes state
      if (editMode && status === "COMPLETED") {
        setEditMode(false);
        setHasUnsavedChanges(false);
      }

      notifications.show({
        title: "Success",
        message: `Evaluation ${status === "COMPLETED" ? "completed" : "saved"}`,
        color: "green",
      });

      if (status === "COMPLETED" && onEvaluationComplete) {
        onEvaluationComplete();
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save evaluation",
        color: "red",
      });
    }
  };

  const handleEditToggle = () => {
    if (editMode && hasUnsavedChanges) {
      // Show confirmation dialog for unsaved changes
      const confirmed = window.confirm(
        "You have unsaved changes. Are you sure you want to cancel editing?",
      );
      if (!confirmed) return;

      // Reset form to original values
      if (evaluation) {
        setOverallComments(evaluation.overallComments ?? "");
        setRecommendation(evaluation.recommendation ?? "");
        setConfidence(evaluation.confidence ?? 3);
        setHasUnsavedChanges(false);
      }
    }

    setEditMode(!editMode);
  };

  // Track form changes for unsaved changes detection
  const handleFormChange = () => {
    if (editMode) {
      setHasUnsavedChanges(true);
    }
  };

  // AutoScore handler
  const handleAutoScore = async () => {
    if (!evaluation) return;

    try {
      notifications.show({
        title: "AutoScore Started",
        message: "AI is analyzing the application...",
        color: "blue",
        autoClose: 3000,
      });

      const autoScoreResult = await autoScoreMutation.mutateAsync({
        applicationId,
        stage,
      });

      // Pre-populate form fields with AI suggestions
      setOverallComments(autoScoreResult.overallComments);
      setRecommendation(autoScoreResult.recommendation);
      setConfidence(autoScoreResult.confidence);

      // Show progress notification
      notifications.show({
        id: "autoscore-progress",
        title: "Populating Scores",
        message: `Applying AI scores to ${autoScoreResult.scores.length} criteria...`,
        color: "blue",
        loading: true,
        autoClose: false,
      });

      // Pre-populate individual criteria scores with visual feedback
      for (let i = 0; i < autoScoreResult.scores.length; i++) {
        const aiScore = autoScoreResult.scores[i];

        // Update progress notification
        notifications.update({
          id: "autoscore-progress",
          title: "Populating Scores",
          message: `Applying score ${i + 1} of ${autoScoreResult.scores.length}...`,
          color: "blue",
          loading: true,
        });

        if (
          aiScore?.criteriaId &&
          aiScore?.score !== undefined &&
          aiScore?.reasoning
        ) {
          await handleScoreChange(
            aiScore.criteriaId,
            aiScore.score,
            aiScore.reasoning,
          );
        }

        // Small delay to make the visual feedback visible
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Clear progress notification
      notifications.hide("autoscore-progress");

      // Re-apply Overall Assessment values after all score changes complete
      // This prevents them from being reset by the database refetches
      setOverallComments(autoScoreResult.overallComments);
      setRecommendation(autoScoreResult.recommendation);
      setConfidence(autoScoreResult.confidence);

      // Mark as having changes if in edit mode
      if (editMode) {
        setHasUnsavedChanges(true);
      }

      notifications.show({
        title: "AutoScore Complete",
        message:
          "AI evaluation has been applied. Please review and adjust as needed before saving.",
        color: "blue",
      });
    } catch {
      notifications.show({
        title: "AutoScore Failed",
        message:
          "Failed to generate AI evaluation. Please try again or evaluate manually.",
        color: "red",
      });
    }
  };

  // ✅ Early returns only AFTER all hooks are declared
  if (!criteria) {
    return <Text>Loading evaluation criteria...</Text>;
  }

  if (!evaluation) {
    return <SelfAssignmentPrompt applicationId={applicationId} stage={stage} />;
  }

  const application = evaluation.application as ApplicationWithDetails;
  // Group criteria by category
  const criteriaByCategory = criteria.reduce(
    (acc, criteria) => {
      acc[criteria.category] ??= [];
      acc[criteria.category]!.push(criteria);
      return acc;
    },
    {} as Record<string, EvaluationCriteria[]>,
  );

  return (
    <Stack gap="lg">
      {/* Header with progress */}
      <Paper p="md" withBorder>
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3}>
              {stage
                .replace("_", " ")
                .toLowerCase()
                .replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
              Evaluation
            </Title>
            <Group gap="sm" align="center">
              <Text c="dimmed">
                {application.user?.name} ({application.user?.email})
              </Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={<IconEdit size={14} />}
                onClick={() => setDrawerOpened(true)}
              >
                About this person
              </Button>
            </Group>
          </div>

          <Group>
            {isCompleted && (
              <Badge color={editMode ? "orange" : "green"} variant="filled">
                {editMode ? "EDITING" : "COMPLETED"}
              </Badge>
            )}
            {!isCompleted && (
              <Badge
                color={evaluation.status === "IN_PROGRESS" ? "blue" : "gray"}
              >
                {evaluation.status.replace("_", " ")}
              </Badge>
            )}
            {evaluation.overallScore && (
              <Badge color="yellow" size="lg">
                {evaluation.overallScore.toFixed(1)}/10
              </Badge>
            )}
          </Group>
        </Group>

        <Progress value={progress} mb="sm" />
        <Text size="sm" c="dimmed">
          {completedScores}/{totalCriteria} criteria evaluated (
          {progress.toFixed(0)}% complete)
        </Text>

        {hasUnsavedChanges && editMode && (
          <Alert color="orange" mt="sm">
            You have unsaved changes. Remember to save your evaluation.
          </Alert>
        )}
      </Paper>

      <Grid gutter="lg">
        {/* Left Column - Application Details */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md" h="100%">
            <Group>
              <IconUsers size={20} />
              <Title order={4}>Application Details</Title>
            </Group>
            <Box style={{ flex: 1, overflowY: "auto", maxHeight: "70vh" }}>
              <Stack gap="md">
                {application.responses
                  ?.sort((a, b) => a.question.order - b.question.order)
                  .map((response) => (
                    <Card key={response.question.questionKey} withBorder p="md">
                      <Title order={6} mb="xs">
                        {response.question.questionEn}
                      </Title>
                      {response.answer ? (
                        // Check if this is a video link question and the answer looks like a URL
                        (response.question.questionKey === "intro_video_link" ||
                          response.question.questionEn
                            .toLowerCase()
                            .includes("video")) &&
                        (response.answer.startsWith("http://") ||
                          response.answer.startsWith("https://")) ? (
                          <VideoLinkRenderer
                            url={response.answer}
                            questionText={response.question.questionEn}
                          />
                        ) : (
                          // Check if this is a social media link
                          (renderSocialMediaLink(
                            response.answer,
                            response.question.questionKey,
                            application,
                          ) ?? <Text>{response.answer}</Text>)
                        )
                      ) : (
                        <Text c="dimmed" fs="italic">
                          No answer provided
                        </Text>
                      )}
                    </Card>
                  ))}
              </Stack>
            </Box>
          </Stack>
        </Grid.Col>

        {/* Right Column - Evaluation */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper bg="gray.0" p="md" radius="md" h="100%">
            <Stack gap="lg" h="100%">
              <Group>
                <IconStarFilled size={20} />
                <Title order={4}>
                  Evaluation ({completedScores}/{totalCriteria})
                </Title>
              </Group>

              <Box style={{ flex: 1, overflowY: "auto", maxHeight: "70vh" }}>
                <Stack gap="lg">
                  {Object.entries(criteriaByCategory).map(
                    ([category, categoryItems]) => (
                      <div key={category}>
                        <Title order={5} mb="md" c="blue">
                          {category.replace("_", " ")} Criteria
                        </Title>
                        <Stack gap="md">
                          {categoryItems.map((criteria) => {
                            const existingScore = evaluation.scores?.find(
                              (s) => s.criteriaId === criteria.id,
                            );
                            return (
                              <CriteriaScore
                                key={criteria.id}
                                criteria={criteria}
                                score={existingScore}
                                onScoreChange={(
                                  criteriaId,
                                  score,
                                  reasoning,
                                ) => {
                                  void handleScoreChange(
                                    criteriaId,
                                    score,
                                    reasoning,
                                  );
                                  handleFormChange();
                                }}
                                readonly={isReadonly}
                                application={application}
                              />
                            );
                          })}
                        </Stack>
                      </div>
                    ),
                  )}

                  <Divider />

                  {/* Overall Assessment */}
                  <Card withBorder p="md">
                    <Title order={5} mb="md">
                      Overall Assessment
                    </Title>
                    <Stack gap="md">
                      <Textarea
                        label="Overall Comments"
                        placeholder="Provide your overall assessment of this application..."
                        value={overallComments}
                        onChange={(e) => {
                          setOverallComments(e.target.value);
                          handleFormChange();
                        }}
                        disabled={isReadonly}
                        autosize
                        minRows={3}
                        maxRows={6}
                      />

                      <Group grow>
                        <Select
                          label="Recommendation"
                          placeholder="Select recommendation"
                          value={recommendation}
                          onChange={(value) => {
                            setRecommendation(value ?? "");
                            handleFormChange();
                          }}
                          disabled={isReadonly}
                          data={[
                            { value: "ACCEPT", label: "Accept" },
                            { value: "REJECT", label: "Reject" },
                            { value: "WAITLIST", label: "Waitlist" },
                            {
                              value: "NEEDS_MORE_INFO",
                              label: "Needs More Info",
                            },
                          ]}
                        />

                        <NumberInput
                          label="Confidence Level"
                          description="How confident are you in this assessment? (1-5)"
                          min={1}
                          max={5}
                          value={confidence}
                          onChange={(value) => {
                            setConfidence(Number(value) || 3);
                            handleFormChange();
                          }}
                          disabled={isReadonly}
                        />
                      </Group>
                    </Stack>
                  </Card>

                  {/* Action buttons */}
                  {!isCompleted && (
                    <Stack gap="sm">
                      {/* AutoScore button - allow re-running even with existing scores */}
                      <Button
                        variant="light"
                        color="blue"
                        leftSection={<IconRobot size={16} />}
                        onClick={handleAutoScore}
                        loading={autoScoreMutation.isPending}
                        disabled={
                          upsertScoreMutation.isPending ||
                          updateEvaluationMutation.isPending
                        }
                        fullWidth
                      >
                        {autoScoreMutation.isPending
                          ? "Generating AI Evaluation..."
                          : completedScores > 0
                            ? "Re-run AutoScore"
                            : "AutoScore with AI"}
                      </Button>

                      <Group justify="flex-end">
                        <Button
                          variant="outline"
                          leftSection={<IconClock size={16} />}
                          onClick={() => handleSaveEvaluation("IN_PROGRESS")}
                          loading={updateEvaluationMutation.isPending}
                          disabled={upsertScoreMutation.isPending}
                        >
                          {upsertScoreMutation.isPending
                            ? "Saving Score..."
                            : "Save Progress"}
                        </Button>
                        <Button
                          leftSection={<IconCheck size={16} />}
                          onClick={() => handleSaveEvaluation("COMPLETED")}
                          loading={updateEvaluationMutation.isPending}
                          disabled={!isCompleteEvaluationReady}
                        >
                          Complete Evaluation
                        </Button>
                      </Group>
                    </Stack>
                  )}

                  {/* Edit mode action buttons for completed evaluations */}
                  {isCompleted && (
                    <Group justify="flex-end">
                      {!editMode ? (
                        <Button variant="outline" onClick={handleEditToggle}>
                          Edit Evaluation
                        </Button>
                      ) : (
                        <Group>
                          <Button
                            variant="outline"
                            onClick={handleEditToggle}
                            color="gray"
                          >
                            Cancel
                          </Button>
                          <Button
                            leftSection={<IconCheck size={16} />}
                            onClick={() => handleSaveEvaluation("COMPLETED")}
                            loading={updateEvaluationMutation.isPending}
                            disabled={!isCompleteEvaluationReady}
                          >
                            Save Changes
                          </Button>
                        </Group>
                      )}
                    </Group>
                  )}

                  {/* Enhanced feedback for button state */}
                  {!isCompleted && !isCompleteEvaluationReady && (
                    <Alert color="blue" variant="light">
                      <Text size="sm">
                        To complete the evaluation, please ensure:
                        {progress < 100 && (
                          <Text component="div" size="sm">
                            • All {totalCriteria} criteria are evaluated (
                            {completedScores}/{totalCriteria} completed)
                          </Text>
                        )}
                        {(!recommendation || recommendation.length === 0) && (
                          <Text component="div" size="sm">
                            • A recommendation is selected
                          </Text>
                        )}
                        {(upsertScoreMutation.isPending ||
                          updateEvaluationMutation.isPending) && (
                          <Text component="div" size="sm">
                            • Current save operation completes
                          </Text>
                        )}
                      </Text>
                    </Alert>
                  )}

                  {isCompleted && !editMode && (
                    <Alert
                      icon={<IconCheck size={16} />}
                      color="green"
                      title="Evaluation Completed"
                    >
                      This evaluation was completed on{" "}
                      {evaluation.completedAt
                        ? new Date(evaluation.completedAt).toLocaleDateString()
                        : "Unknown date"}
                      . Time spent: {evaluation.timeSpentMinutes ?? 0} minutes.
                    </Alert>
                  )}

                  {editMode && isCompleteEvaluationReady && (
                    <Alert color="blue" variant="light">
                      <Text size="sm">
                        You can now save your changes to update this completed
                        evaluation.
                      </Text>
                    </Alert>
                  )}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Video Review Section - Full Width when applicable */}
        {stage === "VIDEO_REVIEW" && (
          <Grid.Col span={12}>
            <Card withBorder p="md">
              <Group mb="md">
                <IconVideo size={20} />
                <Title order={4}>Video Review</Title>
              </Group>
              <Text c="dimmed" mb="md">
                Review the applicant&apos;s 1-minute introduction video and
                assess their communication skills, passion, and presentation
                quality.
              </Text>

              {/* Video URL from application */}
              {(() => {
                const videoResponse = application.responses?.find(
                  (r) => r.question.questionKey === "intro_video_link",
                );
                return videoResponse?.answer ? (
                  <Box mb="md">
                    <VideoLinkRenderer
                      url={videoResponse.answer}
                      questionText="Introduction Video"
                    />
                  </Box>
                ) : (
                  <Alert color="yellow" mb="md">
                    No video link provided by applicant
                  </Alert>
                );
              })()}

              <Textarea
                label="Video Review Notes"
                placeholder="Add timestamped notes, observations about communication style, authenticity, etc..."
                value={evaluation.videoTimestamp ?? ""}
                onChange={(_e) => {
                  // This would integrate with video timestamp functionality
                }}
                disabled={isReadonly}
                autosize
                minRows={4}
              />
            </Card>
          </Grid.Col>
        )}
      </Grid>

      {/* Edit Application Drawer */}
      <EditApplicationDrawer
        opened={drawerOpened}
        onClose={() => setDrawerOpened(false)}
        user={
          application.user
            ? {
                id: application.user.id,
                name: application.user.name,
                email: application.user.email,
                adminNotes: application.user.adminNotes,
                adminWorkExperience: application.user.adminWorkExperience,
                adminLabels: application.user.adminLabels ?? [],
              }
            : null
        }
        eventId={application.eventId}
      />
    </Stack>
  );
}
