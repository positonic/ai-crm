"use client";

import { useState, useEffect } from "react";
import {
  Card,
  Text,
  Title,
  Group,
  Badge,
  Stack,
  Button,
  Grid,
  ActionIcon,
  Modal,
  Select,
  Tabs,
  Alert,
  Paper,
  Box,
  ScrollArea,
  Menu,
  UnstyledButton,
  Center,
  Tooltip,
} from "@mantine/core";
import {
  IconUsers,
  IconMessageCircle,
  IconCheck,
  IconArrowRight,
  IconPlus,
  IconSettings,
  IconStar,
  IconAlertTriangle,
  IconExternalLink,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import ApplicationEvaluationForm from "./ApplicationEvaluationForm";
import ConsensusModal from "./ConsensusModal";
import CurationSpecDashboard from "./CurationSpecDashboard";
import type { User } from "@prisma/client";
import {
  type ProfessionalRole,
  type ApplicationForDemographics,
  calculateExtendedDemographicStats,
  normalizeProfessionalRole,
  isLatamCountry,
} from "~/utils/demographics";
import { getDisplayName } from "~/utils/userDisplay";

interface PipelineApplication {
  id: string;
  user: Pick<User, "name" | "email"> | null;
  evaluations: Array<{
    stage: string;
    status: string;
    overallScore?: number | null;
    recommendation?: string | null;
    reviewer: { name: string | null };
  }>;
  responses?: Array<{
    question: {
      questionKey: string;
    };
    answer: string;
  }>;
  demographics?: {
    region: "latam" | "global" | "unspecified";
    role: ProfessionalRole;
  };
}

interface PipelineStageProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  count: number;
  applications: PipelineApplication[];
  stage:
    | "SCREENING"
    | "DETAILED_REVIEW"
    | "VIDEO_REVIEW"
    | "CONSENSUS"
    | "FINAL_DECISION";
  onApplicationClick: (applicationId: string, stage: string) => void;
  onAssignReviewer?: (applicationId: string) => void;
}

function PipelineStage({
  title,
  icon,
  color,
  count,
  applications,
  stage,
  onApplicationClick,
  onAssignReviewer,
}: PipelineStageProps) {
  const getStatusColor = (evaluations: PipelineApplication["evaluations"]) => {
    const stageEvaluations = evaluations.filter((e) => e.stage === stage);
    if (stageEvaluations.length === 0) return "gray";

    const completed = stageEvaluations.filter(
      (e) => e.status === "COMPLETED",
    ).length;
    const total = stageEvaluations.length;

    if (completed === total) return "green";
    if (completed > 0) return "yellow";
    return "red";
  };

  const getRecommendationBadge = (
    evaluations: PipelineApplication["evaluations"],
  ) => {
    const recommendations = evaluations
      .filter((e) => e.stage === stage && e.recommendation)
      .map((e) => e.recommendation);

    if (recommendations.length === 0) return null;

    const accepts = recommendations.filter((r) => r === "ACCEPT").length;
    const rejects = recommendations.filter((r) => r === "REJECT").length;
    const waitlists = recommendations.filter((r) => r === "WAITLIST").length;

    if (accepts > rejects + waitlists)
      return (
        <Badge color="green" size="xs">
          Lean Accept
        </Badge>
      );
    if (rejects > accepts + waitlists)
      return (
        <Badge color="red" size="xs">
          Lean Reject
        </Badge>
      );
    if (waitlists > accepts + rejects)
      return (
        <Badge color="yellow" size="xs">
          Lean Waitlist
        </Badge>
      );
    return (
      <Badge color="gray" size="xs">
        Mixed
      </Badge>
    );
  };

  return (
    <Card
      withBorder
      p="md"
      h="600px"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          {icon}
          <div>
            <Text fw={600}>{title}</Text>
            <Badge color={color} variant="light" size="sm">
              {count} applications
            </Badge>
          </div>
        </Group>

        {onAssignReviewer && (
          <Menu shadow="md" width={200}>
            <Menu.Target>
              <ActionIcon variant="light" color={color}>
                <IconPlus size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Assign Reviewer</Menu.Label>
              {applications.length > 0 ? (
                applications.map((app) => (
                  <Menu.Item
                    key={app.id}
                    onClick={() => onAssignReviewer(app.id)}
                  >
                    {getDisplayName(app.user, "Unknown")} ({app.user?.email})
                  </Menu.Item>
                ))
              ) : (
                <Menu.Item disabled>No applications in this stage</Menu.Item>
              )}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>

      <ScrollArea style={{ flex: 1 }} type="auto">
        <Stack gap="xs">
          {applications.map((app) => (
            <UnstyledButton
              key={app.id}
              onClick={() => onApplicationClick(app.id, stage)}
              style={{ width: "100%" }}
            >
              <Paper
                p="sm"
                withBorder
                style={{
                  transition: "transform 0.2s, box-shadow 0.2s",
                  cursor: "pointer",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  },
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} size="sm" truncate>
                      {getDisplayName(app.user, "Unknown")}
                    </Text>
                    <Text size="xs" c="dimmed" truncate>
                      {app.user?.email}
                    </Text>

                    {/* Demographic badges */}
                    {(app.demographics ?? app.responses) && (
                      <Group mt="xs" gap="xs">
                        {/* Regional badge */}
                        {(() => {
                          let region: "latam" | "global" | "unspecified" =
                            "unspecified";
                          if (app.demographics) {
                            region = app.demographics.region;
                          } else if (app.responses) {
                            const nationalityResponse = app.responses.find(
                              (r) =>
                                r.question.questionKey === "nationality" ||
                                r.question.questionKey === "country",
                            );
                            if (nationalityResponse?.answer) {
                              region = isLatamCountry(
                                nationalityResponse.answer,
                              )
                                ? "latam"
                                : "global";
                            }
                          }

                          if (region !== "unspecified") {
                            return (
                              <Tooltip
                                label={`${region === "latam" ? "Latin America" : "Global (Non-LATAM)"}`}
                              >
                                <Badge
                                  color={region === "latam" ? "blue" : "teal"}
                                  size="xs"
                                  variant="filled"
                                  style={{ fontSize: "8px" }}
                                >
                                  {region === "latam" ? "LATAM" : "Global"}
                                </Badge>
                              </Tooltip>
                            );
                          }
                          return null;
                        })()}

                        {/* Role badge */}
                        {(() => {
                          let role: ProfessionalRole = "unspecified";
                          if (app.demographics) {
                            role = app.demographics.role;
                          } else if (app.responses) {
                            const backgroundResponse = app.responses.find(
                              (r) =>
                                r.question.questionKey === "background" ||
                                r.question.questionKey === "profession" ||
                                r.question.questionKey === "role" ||
                                r.question.questionKey === "occupation",
                            );
                            if (backgroundResponse?.answer) {
                              role = normalizeProfessionalRole(
                                backgroundResponse.answer,
                              );
                            }
                          }

                          if (role !== "unspecified") {
                            const roleColors: Record<ProfessionalRole, string> =
                              {
                                entrepreneur: "green",
                                developer: "purple",
                                academic: "orange",
                                designer: "pink",
                                product_manager: "yellow",
                                solo_builder: "cyan",
                                unspecified: "gray",
                              };

                            const roleLabels: Record<ProfessionalRole, string> =
                              {
                                entrepreneur: "Entrepreneur",
                                developer: "Developer",
                                academic: "Academic",
                                designer: "Designer",
                                product_manager: "PM",
                                solo_builder: "Solo Builder",
                                unspecified: "Unknown",
                              };

                            return (
                              <Tooltip label={roleLabels[role]}>
                                <Badge
                                  color={roleColors[role]}
                                  size="xs"
                                  variant="light"
                                  style={{ fontSize: "8px" }}
                                >
                                  {roleLabels[role]}
                                </Badge>
                              </Tooltip>
                            );
                          }
                          return null;
                        })()}
                      </Group>
                    )}

                    {/* Evaluation progress */}
                    {app.evaluations && app.evaluations.length > 0 && (
                      <Group mt="xs" gap="xs">
                        <Badge
                          color={getStatusColor(app.evaluations)}
                          size="xs"
                          variant="light"
                        >
                          {
                            app.evaluations.filter(
                              (e) =>
                                e.stage === stage && e.status === "COMPLETED",
                            ).length
                          }
                          /
                          {
                            app.evaluations.filter((e) => e.stage === stage)
                              .length
                          }{" "}
                          Complete
                        </Badge>
                        {getRecommendationBadge(app.evaluations)}
                      </Group>
                    )}

                    {/* Overall score if available */}
                    {app.evaluations?.some((e) => e.overallScore) && (
                      <Group mt="xs" gap="xs">
                        <IconStar size={12} />
                        <Text size="xs" fw={600}>
                          {(
                            app.evaluations
                              .filter((e) => e.overallScore)
                              .reduce(
                                (sum, e) => sum + (e.overallScore ?? 0),
                                0,
                              ) /
                            app.evaluations.filter((e) => e.overallScore).length
                          ).toFixed(1)}
                        </Text>
                      </Group>
                    )}
                  </Box>

                  <IconArrowRight
                    size={14}
                    color="var(--mantine-color-dimmed)"
                  />
                </Group>
              </Paper>
            </UnstyledButton>
          ))}

          {applications.length === 0 && (
            <Center py="xl">
              <Text c="dimmed" ta="center">
                No applications in this stage
              </Text>
            </Center>
          )}
        </Stack>
      </ScrollArea>
    </Card>
  );
}

interface AssignReviewerModalProps {
  opened: boolean;
  onClose: () => void;
  applicationId: string;
  stage: string;
}

function AssignReviewerModal({
  opened,
  onClose,
  applicationId,
  stage,
}: AssignReviewerModalProps) {
  const [selectedReviewer, setSelectedReviewer] = useState<string>("");
  const [priority, setPriority] = useState<string>("0");

  const { data: users, error } = api.user.getAdmins.useQuery();
  const createAssignmentMutation = api.evaluation.createAssignment.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Reviewer assigned successfully",
        color: "green",
      });
      onClose();
    },
    onError: () => {
      notifications.show({
        title: "Error",
        message: "Failed to assign reviewer",
        color: "red",
      });
    },
  });

  const handleAssign = async () => {
    if (!selectedReviewer) return;

    await createAssignmentMutation.mutateAsync({
      applicationId,
      reviewerId: selectedReviewer,
      stage: stage as
        | "SCREENING"
        | "DETAILED_REVIEW"
        | "VIDEO_REVIEW"
        | "CONSENSUS"
        | "FINAL_DECISION",
      priority: parseInt(priority),
      notes: `Assigned for ${stage.replace("_", " ").toLowerCase()} review`,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Assign Reviewer">
      <Stack gap="md">
        <Select
          label="Reviewer"
          placeholder={error ? "Error loading reviewers" : "Select a reviewer"}
          value={selectedReviewer}
          onChange={(value) => setSelectedReviewer(value ?? "")}
          data={
            users?.map((user) => ({
              value: user.id,
              label: `${getDisplayName(user)} (${user.email})`,
            })) ?? []
          }
          disabled={!!error}
        />

        <Select
          label="Priority"
          value={priority}
          onChange={(value) => setPriority(value ?? "0")}
          data={[
            { value: "0", label: "Normal" },
            { value: "1", label: "High" },
            { value: "2", label: "Urgent" },
          ]}
        />

        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            loading={createAssignmentMutation.isPending}
            disabled={!selectedReviewer}
          >
            Assign Reviewer
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Convert PipelineApplication to ApplicationForDemographics for shared calculation
function convertToApplicationForDemographics(
  applications: PipelineApplication[],
): ApplicationForDemographics[] {
  return applications.map((app) => ({
    id: app.id,
    responses: app.responses,
    demographics: app.demographics,
  }));
}

export default function ReviewPipelineDashboard() {
  const [selectedApplication, setSelectedApplication] = useState<string | null>(
    null,
  );
  const [selectedStage, setSelectedStage] = useState<string>("SCREENING");
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignApplicationId, setAssignApplicationId] = useState<string>("");
  const [assignStage, setAssignStage] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("pipeline");
  const [selectedReviewer, setSelectedReviewer] = useState<string | null>(null);

  // Get current user session
  const { data: session } = useSession();

  // Fetch reviewers for filter dropdown
  const { data: reviewers } = api.user.getAdmins.useQuery();

  // Set default filter to current user when reviewers load
  useEffect(() => {
    if (reviewers && session?.user?.id && selectedReviewer === null) {
      const currentUserIsReviewer = reviewers.some(
        (reviewer) => reviewer.id === session.user.id,
      );
      if (currentUserIsReviewer) {
        setSelectedReviewer(session.user.id);
      }
    }
  }, [reviewers, session?.user?.id, selectedReviewer]);

  // Fetch pipeline data (with optional reviewer filter)
  const { data: pipeline, refetch: refetchPipeline } =
    api.evaluation.getReviewPipeline.useQuery({
      reviewerId: selectedReviewer ?? undefined,
    });

  // Get current user's evaluation for the selected application and stage (for direct link)
  const { data: currentEvaluation } = api.evaluation.getEvaluation.useQuery(
    {
      applicationId: selectedApplication ?? "",
      stage: selectedStage as
        | "SCREENING"
        | "DETAILED_REVIEW"
        | "VIDEO_REVIEW"
        | "CONSENSUS"
        | "FINAL_DECISION",
    },
    {
      enabled: !!selectedApplication && !!selectedStage,
    },
  );

  const handleApplicationClick = (applicationId: string, stage: string) => {
    setSelectedApplication(applicationId);
    setSelectedStage(stage);
  };

  const handleAssignReviewer = (applicationId: string, stage: string) => {
    setAssignApplicationId(applicationId);
    setAssignStage(stage);
    setAssignModalOpen(true);
  };

  const handleEvaluationComplete = () => {
    void refetchPipeline();
    setSelectedApplication(null);
  };

  if (!pipeline) {
    return <Text>Loading pipeline...</Text>;
  }

  const stages = [
    {
      key: "applicationReview",
      title: "Application Review",
      icon: <IconUsers size={20} />,
      color: "blue",
      applications: pipeline.applicationReview,
      stage: "SCREENING" as const, // Keep SCREENING as the stage for evaluations
      description: "Comprehensive review and evaluation of applications",
    },
    {
      key: "consensus",
      title: "Consensus",
      icon: <IconMessageCircle size={20} />,
      color: "purple",
      applications: pipeline.consensus,
      stage: "CONSENSUS" as const,
      description: "Final decision making with all reviewer input",
    },
    {
      key: "finalDecision",
      title: "Final Decision",
      icon: <IconCheck size={20} />,
      color: "teal",
      applications: pipeline.finalDecision,
      stage: "FINAL_DECISION" as const,
      description: "Applications with final acceptance/rejection decisions",
    },
  ];

  const totalApplications = Object.values(pipeline).flat().length;

  // Calculate demographic statistics for curation tracking
  const allApplications = Object.values(pipeline).flat();
  const demographicStats = calculateExtendedDemographicStats(
    convertToApplicationForDemographics(allApplications),
  );

  return (
    <>
      <Stack gap="lg">
        {/* Header */}
        <Paper p="md" withBorder>
          <Group justify="space-between" align="flex-start">
            <div>
              <Title order={2}>Review Pipeline</Title>
              <Text c="dimmed">
                Manage application reviews through each stage of the evaluation
                process
              </Text>
            </div>
            <Group>
              <Select
                label="Reviewer Assigned:"
                placeholder="All Reviewers"
                value={selectedReviewer}
                onChange={setSelectedReviewer}
                data={[
                  { value: "", label: "All Reviewers" },
                  ...(reviewers?.map((reviewer) => ({
                    value: reviewer.id,
                    label:
                      reviewer.id === session?.user?.id
                        ? "Assigned to me"
                        : `${reviewer.name ?? "Unknown"} (${reviewer.email})`,
                  })) ?? []),
                ]}
                clearable
                style={{ minWidth: 200 }}
              />
              <Badge size="lg" variant="light">
                {totalApplications} Applications
              </Badge>
              <Button
                leftSection={<IconSettings size={16} />}
                variant="outline"
                size="sm"
              >
                Settings
              </Button>
            </Group>
          </Group>
        </Paper>

        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value ?? "pipeline")}
        >
          <Tabs.List>
            <Tabs.Tab value="pipeline">Pipeline Overview</Tabs.Tab>
            <Tabs.Tab value="curation">Curation Balance</Tabs.Tab>
            <Tabs.Tab value="assignments">Reviewer Assignments</Tabs.Tab>
            <Tabs.Tab value="analytics">Analytics</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="curation" pt="lg">
            <CurationSpecDashboard
              demographicStats={demographicStats}
              isLoading={!pipeline}
            />
          </Tabs.Panel>

          <Tabs.Panel value="pipeline" pt="lg">
            {/* Pipeline stages */}
            <Grid>
              {stages.map((stage) => (
                <Grid.Col key={stage.key} span={{ base: 12, sm: 6, lg: 4 }}>
                  <PipelineStage
                    title={stage.title}
                    icon={stage.icon}
                    color={stage.color}
                    count={stage.applications.length}
                    applications={stage.applications}
                    stage={stage.stage}
                    onApplicationClick={handleApplicationClick}
                    onAssignReviewer={(appId) =>
                      handleAssignReviewer(appId, stage.stage)
                    }
                  />
                </Grid.Col>
              ))}
            </Grid>

            {/* Stage descriptions */}
            <Paper p="md" withBorder mt="xl">
              <Title order={4} mb="md">
                Review Process
              </Title>
              <Grid>
                {stages.map((stage, index) => (
                  <Grid.Col key={stage.key} span={{ base: 12, md: 6, lg: 4 }}>
                    <Group align="flex-start" gap="sm">
                      <Badge color={stage.color} variant="light" size="lg">
                        {index + 1}
                      </Badge>
                      <div>
                        <Text fw={600} size="sm">
                          {stage.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {stage.description}
                        </Text>
                      </div>
                    </Group>
                  </Grid.Col>
                ))}
              </Grid>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="assignments" pt="lg">
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="Feature Coming Soon"
            >
              Reviewer assignment management interface is being developed.
            </Alert>
          </Tabs.Panel>

          <Tabs.Panel value="analytics" pt="lg">
            <Alert
              icon={<IconAlertTriangle size={16} />}
              title="Feature Coming Soon"
            >
              Analytics dashboard with evaluation metrics and insights is being
              developed.
            </Alert>
          </Tabs.Panel>
        </Tabs>
      </Stack>

      {/* Evaluation/Consensus Modal */}
      {selectedStage === "CONSENSUS" || selectedStage === "FINAL_DECISION" ? (
        <ConsensusModal
          opened={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
          applicationId={selectedApplication ?? ""}
          onStatusUpdate={handleEvaluationComplete}
        />
      ) : (
        <Modal
          opened={!!selectedApplication}
          onClose={() => setSelectedApplication(null)}
          title={
            <Group justify="space-between" style={{ width: "100%" }}>
              <Text fw={600}>Application Evaluation</Text>
              {selectedApplication && currentEvaluation && (
                <Button
                  component="a"
                  href={`/admin/evaluations/${currentEvaluation.id}`}
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
          scrollAreaComponent={ScrollArea.Autosize}
          styles={{
            body: { padding: 0 },
            content: { height: "90vh" },
          }}
        >
          {selectedApplication && (
            <Box p="md">
              <ApplicationEvaluationForm
                applicationId={selectedApplication}
                stage={
                  selectedStage as
                    | "SCREENING"
                    | "DETAILED_REVIEW"
                    | "VIDEO_REVIEW"
                    | "CONSENSUS"
                    | "FINAL_DECISION"
                }
                onEvaluationComplete={handleEvaluationComplete}
              />
            </Box>
          )}
        </Modal>
      )}

      {/* Assign Reviewer Modal */}
      <AssignReviewerModal
        opened={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        applicationId={assignApplicationId}
        stage={assignStage}
      />
    </>
  );
}
