"use client";

import React, { useState, useEffect } from "react";
import {
  Container,
  Text,
  Paper,
  Loader,
  Alert,
  Button,
  Group,
  Stack,
  Badge,
  Tabs,
} from "@mantine/core";
import { IconAlertCircle, IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import ApplicationEvaluationForm from "~/app/_components/ApplicationEvaluationForm";
import ConsensusEvaluationView from "~/app/_components/ConsensusEvaluationView";

interface EvaluationPageClientProps {
  evaluationId: string;
}

type EvaluationData = {
  id: string;
  applicationId: string;
  stage:
    | "SCREENING"
    | "DETAILED_REVIEW"
    | "VIDEO_REVIEW"
    | "CONSENSUS"
    | "FINAL_DECISION";
  status: string;
  consensusData?: {
    id: string;
    user: { name: string | null; email: string | null } | null;
    event: { name: string } | null;
    evaluations: Array<{
      id: string;
      overallScore: number | null;
      confidence: number | null;
      recommendation: string | null;
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

export default function EvaluationPageClient({
  evaluationId,
}: EvaluationPageClientProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"individual" | "consensus">(
    "individual",
  );

  // URL hash-based tab linking
  const validTabs = ["individual", "consensus"];
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && validTabs.includes(hash)) {
      setViewMode(hash as "individual" | "consensus");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewModeChange = (value: string | null) => {
    if (value) {
      setViewMode(value as "individual" | "consensus");
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  // Fetch evaluation details by ID
  const evaluationQuery = api.evaluation.getEvaluationById.useQuery({
    evaluationId: evaluationId,
  });

  // Fetch consensus data for the application (to enable consensus view)
  const { data: consensusData } = api.evaluation.getConsensusData.useQuery(
    {
      applicationId: evaluationQuery.data?.applicationId ?? "",
    },
    {
      enabled: !!evaluationQuery.data?.applicationId,
    },
  );

  const handleEvaluationComplete = () => {
    // Navigate back to applications page
    router.back();
  };

  if (evaluationQuery.isLoading) {
    return (
      <Container size="xl" py="md">
        <Paper p="xl" className="text-center">
          <Loader size="md" />
          <Text mt="md">Loading evaluation...</Text>
        </Paper>
      </Container>
    );
  }

  if (evaluationQuery.error) {
    return (
      <Container size="xl" py="md">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Error Loading Evaluation"
          color="red"
        >
          <Stack gap="md">
            <Text>
              {String(evaluationQuery.error.message ?? "An error occurred")}
            </Text>
            <Group>
              <Button
                variant="outline"
                leftSection={<IconArrowLeft size="1rem" />}
                onClick={() => router.back()}
              >
                Back to Applications
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Container>
    );
  }

  const evaluationData = evaluationQuery.data as EvaluationData | undefined;

  if (!evaluationData) {
    return (
      <Container size="xl" py="md">
        <Alert
          icon={<IconAlertCircle size="1rem" />}
          title="Evaluation Not Found"
          color="yellow"
        >
          <Stack gap="md">
            <Text>
              The evaluation you&rsquo;re looking for doesn&rsquo;t exist or you
              don&rsquo;t have permission to view it.
            </Text>
            <Group>
              <Button
                variant="outline"
                leftSection={<IconArrowLeft size="1rem" />}
                onClick={() => router.back()}
              >
                Back to Applications
              </Button>
            </Group>
          </Stack>
        </Alert>
      </Container>
    );
  }

  // Determine if consensus view is available
  const hasConsensusData =
    consensusData?.evaluations && consensusData.evaluations.length > 0;

  // Create consensus evaluation data structure with type-safe transformation
  const consensusEvaluationData = {
    id: evaluationData.id,
    applicationId: evaluationData.applicationId,
    stage: evaluationData.stage,
    status: evaluationData.status,
    consensusData: consensusData
      ? {
          ...consensusData,
          user: consensusData.user
            ? {
                name: consensusData.user.name,
                email: consensusData.user.email ?? "", // Transform null to empty string
              }
            : null,
          evaluations: consensusData.evaluations.map((evaluation) => ({
            ...evaluation,
            reviewer: {
              ...evaluation.reviewer,
              email: evaluation.reviewer.email ?? "", // Transform null to empty string
            },
          })),
        }
      : undefined,
  };

  return (
    <Container size="xl" py="md">
      <Stack gap="lg">
        {/* Header with navigation */}
        <Group justify="space-between">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size="1rem" />}
            onClick={() =>
              router.push(
                "/admin/events/funding-commons-residency-2025/applications",
              )
            }
          >
            Back to Applications
          </Button>

          <Badge color="gray" variant="light">
            {evaluationData.stage.replace("_", " ")}
          </Badge>
        </Group>

        {/* Tabs for Individual Review and Consensus View */}
        <Tabs value={viewMode} onChange={handleViewModeChange}>
          <Tabs.List>
            <Tabs.Tab value="individual">Individual Review</Tabs.Tab>
            <Tabs.Tab value="consensus" disabled={!hasConsensusData}>
              Consensus View
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="individual" pt="md">
            <ApplicationEvaluationForm
              applicationId={evaluationData.applicationId}
              stage={evaluationData.stage}
              onEvaluationComplete={handleEvaluationComplete}
            />
          </Tabs.Panel>

          <Tabs.Panel value="consensus" pt="md">
            {hasConsensusData ? (
              <ConsensusEvaluationView
                evaluationData={consensusEvaluationData}
              />
            ) : (
              <Alert color="yellow" title="No Data Available">
                Consensus data is not available for this evaluation.
              </Alert>
            )}
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Container>
  );
}
