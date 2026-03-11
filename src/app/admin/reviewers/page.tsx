"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Card,
  Table,
  Badge,
  Button,
  Group,
  Text,
  Modal,
  Stack,
  Slider,
  Rating,
  Textarea,
  ActionIcon,
  Tooltip,
  Alert,
  LoadingOverlay,
  Grid,
  Divider,
  RingProgress,
  Center,
  ThemeIcon,
} from "@mantine/core";
import {
  IconUsers,
  IconEdit,
  IconTrash,
  IconPlus,
  IconStar,
  IconStarFilled,
  IconInfoCircle,
  IconBolt,
  IconTarget,
  IconHeart,
  IconVideo,
  IconRocket,
  IconSparkles,
  IconUserPlus,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import {
  getCompetencyColor,
  getCompetencyLabel,
  getCategoryDisplayName,
} from "~/utils/confidenceWeighting";

type CriteriaCategory =
  | "TECHNICAL"
  | "PROJECT"
  | "COMMUNITY_FIT"
  | "VIDEO"
  | "ENTREPRENEURIAL"
  | "OVERALL";

interface ReviewerCompetency {
  id: string;
  category: CriteriaCategory;
  competencyLevel: number;
  baseWeight: number;
  notes: string | null;
  assignedByUser?: {
    name: string | null;
    email: string | null;
  } | null;
}

interface Reviewer {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  reviewerCompetencies: ReviewerCompetency[];
  _count: {
    reviewerAssignments: number;
    applicationEvaluations: number;
  };
}

function getCategoryIcon(category: string) {
  switch (category) {
    case "TECHNICAL":
      return <IconBolt size={14} />;
    case "PROJECT":
      return <IconTarget size={14} />;
    case "COMMUNITY_FIT":
      return <IconHeart size={14} />;
    case "VIDEO":
      return <IconVideo size={14} />;
    case "ENTREPRENEURIAL":
      return <IconRocket size={14} />;
    case "OVERALL":
      return <IconSparkles size={14} />;
    default:
      return <IconStar size={14} />;
  }
}

interface CompetencyModalProps {
  opened: boolean;
  onClose: () => void;
  reviewerId: string | null;
  reviewerName: string | null;
  existingCompetencies: ReviewerCompetency[];
  onSuccess: () => void;
}

const COMPETENCY_CATEGORIES = [
  { value: "TECHNICAL" as const, label: "Technical" },
  { value: "PROJECT" as const, label: "Project" },
  { value: "COMMUNITY_FIT" as const, label: "Community Fit" },
  { value: "VIDEO" as const, label: "Video Assessment" },
  { value: "ENTREPRENEURIAL" as const, label: "Entrepreneurial" },
  { value: "OVERALL" as const, label: "Overall" },
];

function CompetencyModal({
  opened,
  onClose,
  reviewerId,
  reviewerName,
  existingCompetencies,
  onSuccess,
}: CompetencyModalProps) {
  const [competencies, setCompetencies] = useState<
    Record<string, { level: number; weight: number; notes: string }>
  >(() => {
    const initial: Record<
      string,
      { level: number; weight: number; notes: string }
    > = {};
    existingCompetencies.forEach((comp) => {
      initial[comp.category] = {
        level: comp.competencyLevel,
        weight: comp.baseWeight,
        notes: comp.notes ?? "",
      };
    });
    return initial;
  });

  const bulkSetMutation =
    api.evaluation.bulkSetReviewerCompetencies.useMutation({
      onSuccess: () => {
        notifications.show({
          title: "Success",
          message: "Reviewer competencies updated successfully",
          color: "green",
        });
        onSuccess();
        onClose();
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error.message ?? "Failed to update competencies",
          color: "red",
        });
      },
    });

  const handleSave = () => {
    if (!reviewerId) return;

    const competenciesToSet = Object.entries(competencies).map(
      ([category, data]) => ({
        category: category as CriteriaCategory,
        competencyLevel: data.level,
        baseWeight: data.weight,
        notes: data.notes || undefined,
      }),
    );

    bulkSetMutation.mutate({
      reviewerId,
      competencies: competenciesToSet,
    });
  };

  const updateCompetency = (
    category: string,
    field: "level" | "weight" | "notes",
    value: string | number,
  ) => {
    setCompetencies((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] ?? { level: 3, weight: 1.0, notes: "" }),
        [field]: value,
      },
    }));
  };

  const removeCompetency = (category: string) => {
    setCompetencies((prev) => {
      const updated = { ...prev };
      delete updated[category];
      return updated;
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <IconUserPlus size={20} />
          <Text>Manage Competencies: {reviewerName}</Text>
        </Group>
      }
      size="xl"
    >
      <LoadingOverlay visible={bulkSetMutation.isPending} />

      <Alert icon={<IconInfoCircle />} mb="md" color="blue">
        <Text size="sm" fw={500}>
          Interactive Competency Management
        </Text>
        <Text size="xs" mt={4}>
          Use sliders and dials to set competency levels. Level 3 is neutral
          (1.0x weight). Experts get higher influence, novices get reduced
          influence.
        </Text>
      </Alert>

      <Stack gap="md">
        {COMPETENCY_CATEGORIES.map((category) => {
          const existing = competencies[category.value];
          const isSet = !!existing;

          return (
            <Card key={category.value} withBorder p="md">
              <Grid align="center">
                <Grid.Col span={{ base: 12, md: 3 }}>
                  <Group gap="xs" align="center">
                    <ThemeIcon
                      color={
                        isSet ? getCompetencyColor(existing.level) : "gray"
                      }
                      variant="light"
                      size="sm"
                    >
                      {getCategoryIcon(category.value)}
                    </ThemeIcon>
                    <Stack gap={2}>
                      <Text fw={500} size="sm">
                        {category.label}
                      </Text>
                      {isSet && (
                        <Badge
                          color={getCompetencyColor(existing.level)}
                          size="xs"
                          variant="light"
                        >
                          {getCompetencyLabel(existing.level)} (
                          {existing.weight}x)
                        </Badge>
                      )}
                    </Stack>
                  </Group>
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 7 }}>
                  {isSet ? (
                    <Stack gap="md">
                      <Grid>
                        <Grid.Col span={6}>
                          <Stack gap="xs">
                            <Text size="sm" fw={500}>
                              Competency Level
                            </Text>
                            <Slider
                              value={existing.level}
                              onChange={(value) =>
                                updateCompetency(category.value, "level", value)
                              }
                              min={1}
                              max={5}
                              step={1}
                              marks={[
                                { value: 1, label: "Novice" },
                                { value: 2, label: "Dev" },
                                { value: 3, label: "Comp" },
                                { value: 4, label: "Adv" },
                                { value: 5, label: "Expert" },
                              ]}
                              size="lg"
                              color={getCompetencyColor(existing.level)}
                            />
                            <Group gap="xs" justify="center">
                              <Rating
                                value={existing.level}
                                onChange={(value) =>
                                  updateCompetency(
                                    category.value,
                                    "level",
                                    value ?? 3,
                                  )
                                }
                                count={5}
                                size="sm"
                                color={getCompetencyColor(existing.level)}
                              />
                              <Text size="xs" c="dimmed">
                                {getCompetencyLabel(existing.level)}
                              </Text>
                            </Group>
                          </Stack>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Stack gap="xs" align="center">
                            <Text size="sm" fw={500}>
                              Weight Multiplier
                            </Text>
                            <RingProgress
                              size={80}
                              thickness={8}
                              sections={[
                                {
                                  value: (existing.weight / 2.0) * 100,
                                  color:
                                    existing.weight > 1.0
                                      ? "green"
                                      : existing.weight < 1.0
                                        ? "orange"
                                        : "blue",
                                },
                              ]}
                              label={
                                <Center>
                                  <Text size="lg" fw={700}>
                                    {existing.weight.toFixed(1)}x
                                  </Text>
                                </Center>
                              }
                            />
                            <Slider
                              value={existing.weight}
                              onChange={(value) =>
                                updateCompetency(
                                  category.value,
                                  "weight",
                                  value,
                                )
                              }
                              min={0.5}
                              max={2.0}
                              step={0.1}
                              size="sm"
                              color={
                                existing.weight > 1.0
                                  ? "green"
                                  : existing.weight < 1.0
                                    ? "orange"
                                    : "blue"
                              }
                              marks={[
                                { value: 0.5, label: "0.5x" },
                                { value: 1.0, label: "1.0x" },
                                { value: 1.5, label: "1.5x" },
                                { value: 2.0, label: "2.0x" },
                              ]}
                            />
                          </Stack>
                        </Grid.Col>
                      </Grid>
                      <Textarea
                        placeholder="Notes about this competency..."
                        value={existing.notes}
                        onChange={(e) =>
                          updateCompetency(
                            category.value,
                            "notes",
                            e.target.value,
                          )
                        }
                        size="sm"
                        rows={2}
                        autosize
                      />
                    </Stack>
                  ) : (
                    <Text size="sm" c="dimmed">
                      No competency set
                    </Text>
                  )}
                </Grid.Col>

                <Grid.Col span={{ base: 12, md: 2 }}>
                  <Group gap="xs" justify="flex-end">
                    {!isSet ? (
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconPlus size={14} />}
                        onClick={() =>
                          updateCompetency(category.value, "level", 3)
                        }
                      >
                        Add
                      </Button>
                    ) : (
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        onClick={() => removeCompetency(category.value)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    )}
                  </Group>
                </Grid.Col>
              </Grid>
            </Card>
          );
        })}

        <Divider />

        <Group justify="flex-end">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={bulkSetMutation.isPending}>
            Save Competencies
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

export default function ReviewerManagementPage() {
  const [selectedReviewer, setSelectedReviewer] = useState<{
    id: string;
    name: string;
    competencies: ReviewerCompetency[];
  } | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const {
    data: allReviewers,
    isLoading,
    refetch,
  } = api.evaluation.getAllReviewersWithCompetencies.useQuery();

  // Filter to show only admin/staff users
  const reviewers = allReviewers?.filter(
    (reviewer) => reviewer.role === "admin" || reviewer.role === "staff",
  );

  const handleEditCompetencies = (reviewer: Reviewer) => {
    setSelectedReviewer({
      id: reviewer.id,
      name: reviewer.name ?? reviewer.email ?? "Unknown",
      competencies: reviewer.reviewerCompetencies ?? [],
    });
    setModalOpened(true);
  };

  const renderCompetencyStars = (level: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <ActionIcon
        key={i}
        size="xs"
        variant="transparent"
        c={getCompetencyColor(level)}
      >
        {level > i ? <IconStarFilled size={10} /> : <IconStar size={10} />}
      </ActionIcon>
    ));
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="md">
        <div>
          <Title order={2} mb="xs">
            <Group gap="sm">
              <IconUsers size={28} />
              Reviewer Competency Management
            </Group>
          </Title>
          <Text c="dimmed">
            Manage reviewer competency levels across different evaluation
            categories to ensure appropriate weighting in consensus decisions.
          </Text>
        </div>
      </Group>

      <Card withBorder>
        <LoadingOverlay visible={isLoading} />

        {reviewers && reviewers.length === 0 ? (
          <Text ta="center" c="dimmed" py="xl">
            No reviewers found. Reviewers appear here once they have assignments
            or completed evaluations.
          </Text>
        ) : (
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Reviewer</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Reviews Completed</Table.Th>
                <Table.Th>Competencies</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {reviewers?.map((reviewer) => (
                <Table.Tr key={reviewer.id}>
                  <Table.Td>
                    <div>
                      <Text fw={500}>{reviewer.name ?? "Unknown"}</Text>
                      <Text size="xs" c="dimmed">
                        {reviewer.email ?? "No email"}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      variant="light"
                      color={reviewer.role?.includes("admin") ? "blue" : "gray"}
                    >
                      {reviewer.role ?? "reviewer"}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm">
                      <Text size="sm">
                        {reviewer._count.applicationEvaluations}
                      </Text>
                      <Text size="xs" c="dimmed">
                        completed
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    {reviewer.reviewerCompetencies.length > 0 ? (
                      <Stack gap="xs">
                        {reviewer.reviewerCompetencies.map((comp) => (
                          <Group key={comp.category} gap="xs">
                            <Badge
                              color={getCompetencyColor(comp.competencyLevel)}
                              variant="light"
                              size="sm"
                            >
                              {getCategoryDisplayName(comp.category)}
                            </Badge>
                            <Group gap={1}>
                              {renderCompetencyStars(comp.competencyLevel)}
                            </Group>
                            <Text size="xs" c="dimmed">
                              ({getCompetencyLabel(comp.competencyLevel)})
                            </Text>
                          </Group>
                        ))}
                      </Stack>
                    ) : (
                      <Text size="sm" c="dimmed">
                        No competencies set
                      </Text>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Edit competencies">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleEditCompetencies(reviewer)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      <CompetencyModal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        reviewerId={selectedReviewer?.id ?? null}
        reviewerName={selectedReviewer?.name ?? null}
        existingCompetencies={selectedReviewer?.competencies ?? []}
        onSuccess={() => void refetch()}
      />
    </Container>
  );
}
