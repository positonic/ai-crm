"use client";

import { useState } from "react";
import {
  Stack,
  Button,
  Text,
  Group,
  Badge,
  Modal,
  TextInput,
  Select,
  Paper,
  Title,
  Divider,
  Loader,
  Center,
  Box,
  Textarea,
  MultiSelect,
  Tooltip,
  Progress,
  Checkbox,
  Accordion,
  Alert,
  Image,
} from "@mantine/core";
import {
  IconPlus,
  IconSearch,
  IconTrash,
  IconChartLine,
  IconFilter,
  IconSparkles,
  IconInfoCircle,
  IconCheck,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { type MetricType, type CollectionMethod } from "@prisma/client";

interface MetricsTabProps {
  projectId: string;
  canEdit: boolean;
  projectTitle?: string;
  projectImageUrl?: string | null;
}

// Modal for searching and adding metrics from the metrics garden
function AddMetricModal({
  opened,
  onClose,
  projectId,
  existingMetricIds,
  onMetricAdded,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  existingMetricIds: string[];
  onMetricAdded: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);

  const { data: metricsData, isLoading } = api.metric.list.useQuery({
    search: searchQuery || undefined,
    metricType: typeFilter as MetricType | undefined,
    collectionMethod: collectionFilter as CollectionMethod | undefined,
    limit: 50,
  });

  const addMetricMutation = api.metric.addToProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Metric added to project",
        color: "green",
      });
      onMetricAdded();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleAddMetric = (metricId: string) => {
    addMetricMutation.mutate({
      projectId,
      metricId,
    });
  };

  const availableMetrics = metricsData?.metrics.filter(
    (m) => !existingMetricIds.includes(m.id),
  );

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Add Metrics from Metrics Garden"
      size="xl"
    >
      <Stack gap="md">
        <TextInput
          placeholder="Search metrics..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
        />

        <Group>
          <Select
            placeholder="Filter by type"
            data={[
              { value: "BUILDER", label: "Builder" },
              { value: "ENVIRONMENTAL", label: "Environmental" },
              { value: "GIT", label: "Git" },
              { value: "ONCHAIN", label: "On-chain" },
              { value: "OFFCHAIN", label: "Off-chain" },
              { value: "CUSTOM", label: "Custom" },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
            clearable
            leftSection={<IconFilter size={16} />}
          />

          <Select
            placeholder="Filter by collection"
            data={[
              { value: "ONCHAIN", label: "On-chain" },
              { value: "OFFCHAIN_API", label: "API" },
              { value: "SELF_REPORTING", label: "Self-reported" },
              { value: "MANUAL", label: "Manual" },
              { value: "AUTOMATED", label: "Automated" },
            ]}
            value={collectionFilter}
            onChange={setCollectionFilter}
            clearable
            leftSection={<IconFilter size={16} />}
          />
        </Group>

        {isLoading ? (
          <Center py="xl">
            <Loader size="md" />
          </Center>
        ) : availableMetrics && availableMetrics.length > 0 ? (
          <Stack gap="xs" mah={500} style={{ overflowY: "auto" }}>
            {availableMetrics.map((metric) => (
              <Paper key={metric.id} p="md" withBorder>
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} size="sm" lineClamp={1} mb="xs">
                      {metric.name}
                    </Text>
                    {metric.description && (
                      <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                        {metric.description}
                      </Text>
                    )}
                    <Group gap="xs">
                      {metric.metricType.slice(0, 3).map((type) => (
                        <Badge key={type} size="xs">
                          {type.toLowerCase()}
                        </Badge>
                      ))}
                      {metric.unitOfMetric && (
                        <Text size="xs" c="dimmed">
                          • {metric.unitOfMetric}
                        </Text>
                      )}
                    </Group>
                  </Box>
                  <Button
                    size="xs"
                    leftSection={<IconPlus size={14} />}
                    onClick={() => handleAddMetric(metric.id)}
                    loading={addMetricMutation.isPending}
                  >
                    Add
                  </Button>
                </Group>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Center py="xl">
            <Text c="dimmed" size="sm">
              {searchQuery || typeFilter || collectionFilter
                ? "No metrics found matching your filters"
                : "No metrics available"}
            </Text>
          </Center>
        )}

        {metricsData &&
          availableMetrics &&
          availableMetrics.length === 0 &&
          metricsData.total > 0 && (
            <Text size="xs" c="dimmed" ta="center">
              All metrics from the garden have been added to this project
            </Text>
          )}
      </Stack>
    </Modal>
  );
}

// Modal for creating a new custom metric
function CreateMetricModal({
  opened,
  onClose,
  projectId,
  onMetricCreated,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  onMetricCreated: () => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    metricType: [] as string[],
    unitOfMetric: "",
    collectionMethod: "" as CollectionMethod | "",
  });

  const createMetricMutation = api.metric.create.useMutation({
    onSuccess: async (newMetric) => {
      // Add the newly created metric to the project
      await addToProjectMutation.mutateAsync({
        projectId,
        metricId: newMetric.id,
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const addToProjectMutation = api.metric.addToProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Custom metric created and added to project",
        color: "green",
      });
      setFormData({
        name: "",
        description: "",
        metricType: [],
        unitOfMetric: "",
        collectionMethod: "",
      });
      onMetricCreated();
      onClose();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = () => {
    if (
      !formData.name ||
      formData.metricType.length === 0 ||
      !formData.collectionMethod
    ) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    createMetricMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      metricType: formData.metricType as MetricType[],
      unitOfMetric: formData.unitOfMetric || undefined,
      collectionMethod: formData.collectionMethod,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Custom Metric"
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Metric Name"
          placeholder="e.g., Resident onboarding rate"
          required
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.currentTarget.value })
          }
        />

        <Textarea
          label="Description"
          placeholder="How many residents actively create a project and log in at least once."
          rows={3}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.currentTarget.value })
          }
        />

        <MultiSelect
          label="Metric Type"
          placeholder="Select one or more types"
          required
          data={[
            { value: "BUILDER", label: "Builder" },
            { value: "ENVIRONMENTAL", label: "Environmental" },
            { value: "GIT", label: "Git" },
            { value: "ONCHAIN", label: "On-chain" },
            { value: "OFFCHAIN", label: "Off-chain" },
            { value: "CUSTOM", label: "Custom" },
          ]}
          value={formData.metricType}
          onChange={(value) => setFormData({ ...formData, metricType: value })}
        />

        <Select
          label="Collection Method"
          placeholder="How is this metric collected?"
          required
          data={[
            { value: "ONCHAIN", label: "On-chain" },
            { value: "OFFCHAIN_API", label: "API" },
            { value: "SELF_REPORTING", label: "Self-reported" },
            { value: "MANUAL", label: "Manual" },
            { value: "AUTOMATED", label: "Automated" },
          ]}
          value={formData.collectionMethod}
          onChange={(value) =>
            setFormData({
              ...formData,
              collectionMethod: value as CollectionMethod,
            })
          }
        />

        <TextInput
          label="Unit of Metric"
          placeholder="e.g., percentage, count, USD"
          value={formData.unitOfMetric}
          onChange={(e) =>
            setFormData({ ...formData, unitOfMetric: e.currentTarget.value })
          }
        />

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={handleSubmit}
            loading={
              createMetricMutation.isPending || addToProjectMutation.isPending
            }
          >
            Create & Add to Project
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// Modal for AI-powered metric suggestions
function SuggestMetricsModal({
  opened,
  onClose,
  projectId,
  onMetricsAdded,
}: {
  opened: boolean;
  onClose: () => void;
  projectId: string;
  onMetricsAdded: () => void;
}) {
  const [selectedExistingMetrics, setSelectedExistingMetrics] = useState<
    string[]
  >([]);
  const [selectedCustomMetrics, setSelectedCustomMetrics] = useState<number[]>(
    [],
  );

  const suggestMetricsMutation = api.metric.suggestMetrics.useMutation({
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const addMetricMutation = api.metric.addToProject.useMutation();
  const createMetricMutation = api.metric.create.useMutation();

  const handleGetSuggestions = () => {
    setSelectedExistingMetrics([]);
    setSelectedCustomMetrics([]);
    suggestMetricsMutation.mutate({ projectId });
  };

  const handleAddSelectedExisting = async () => {
    try {
      for (const metricId of selectedExistingMetrics) {
        await addMetricMutation.mutateAsync({
          projectId,
          metricId,
        });
      }
      notifications.show({
        title: "Success",
        message: `Added ${selectedExistingMetrics.length} metric${selectedExistingMetrics.length > 1 ? "s" : ""} to project`,
        color: "green",
      });
      setSelectedExistingMetrics([]);
      onMetricsAdded();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to add some metrics",
        color: "red",
      });
    }
  };

  const handleCreateAndAddCustom = async () => {
    if (!suggestMetricsMutation.data?.customMetrics) return;

    try {
      for (const index of selectedCustomMetrics) {
        const customMetric = suggestMetricsMutation.data.customMetrics[index];
        if (!customMetric) continue;

        const newMetric = await createMetricMutation.mutateAsync({
          name: customMetric.name,
          description: customMetric.description,
          metricType: customMetric.metricType,
          unitOfMetric: customMetric.unitOfMetric,
          collectionMethod: customMetric.collectionMethod,
        });

        await addMetricMutation.mutateAsync({
          projectId,
          metricId: newMetric.id,
        });
      }
      notifications.show({
        title: "Success",
        message: `Created and added ${selectedCustomMetrics.length} custom metric${selectedCustomMetrics.length > 1 ? "s" : ""}`,
        color: "green",
      });
      setSelectedCustomMetrics([]);
      onMetricsAdded();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to create some metrics",
        color: "red",
      });
    }
  };

  const suggestions = suggestMetricsMutation.data;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSparkles size={20} />
          <Text fw={600}>AI Metric Suggestions</Text>
        </Group>
      }
      size="xl"
    >
      <Stack gap="md">
        {!suggestions ? (
          <Stack gap="md" align="center" py="xl">
            <Text c="dimmed" ta="center">
              Get AI-powered metric suggestions based on your project&apos;s
              name, description, technologies, and updates.
            </Text>
            <Button
              size="lg"
              leftSection={<IconSparkles size={20} />}
              onClick={handleGetSuggestions}
              loading={suggestMetricsMutation.isPending}
              gradient={{ from: "blue", to: "cyan", deg: 90 }}
              variant="gradient"
            >
              Generate Suggestions
            </Button>
          </Stack>
        ) : (
          <Stack gap="lg">
            {/* Analysis Context */}
            {suggestions.analysisContext && (
              <Alert
                icon={<IconInfoCircle size={16} />}
                title="AI Analysis"
                color="blue"
                variant="light"
              >
                <Stack gap="xs">
                  <Text size="sm">
                    <strong>Project Type:</strong>{" "}
                    {suggestions.analysisContext.projectType}
                  </Text>
                  {suggestions.analysisContext.primaryFocus.length > 0 && (
                    <Group gap="xs">
                      <Text size="sm">
                        <strong>Focus Areas:</strong>
                      </Text>
                      {suggestions.analysisContext.primaryFocus.map(
                        (focus, i) => (
                          <Badge key={i} size="sm" variant="light">
                            {focus}
                          </Badge>
                        ),
                      )}
                    </Group>
                  )}
                  <Text size="xs" c="dimmed">
                    Confidence: {Math.round(suggestions.confidence * 100)}%
                  </Text>
                </Stack>
              </Alert>
            )}

            {/* Existing Metrics Suggestions */}
            {suggestions.existingMetrics.length > 0 && (
              <Box>
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <Text fw={600} size="sm">
                      Recommended from Metrics Garden
                    </Text>
                    <Badge size="sm" variant="light">
                      {suggestions.existingMetrics.length}
                    </Badge>
                  </Group>
                  {selectedExistingMetrics.length > 0 && (
                    <Button
                      size="xs"
                      onClick={handleAddSelectedExisting}
                      loading={addMetricMutation.isPending}
                      leftSection={<IconCheck size={14} />}
                    >
                      Add Selected ({selectedExistingMetrics.length})
                    </Button>
                  )}
                </Group>
                <Stack gap="xs" mah={400} style={{ overflowY: "auto" }}>
                  {suggestions.existingMetrics.map((suggestion) => (
                    <Paper
                      key={suggestion.metricId}
                      p="md"
                      withBorder
                      bg="blue.0"
                    >
                      <Group align="flex-start" wrap="nowrap">
                        <Checkbox
                          checked={selectedExistingMetrics.includes(
                            suggestion.metricId,
                          )}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setSelectedExistingMetrics([
                                ...selectedExistingMetrics,
                                suggestion.metricId,
                              ]);
                            } else {
                              setSelectedExistingMetrics(
                                selectedExistingMetrics.filter(
                                  (id) => id !== suggestion.metricId,
                                ),
                              );
                            }
                          }}
                          mt={4}
                        />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={500} size="sm" mb="xs">
                            {suggestion.metricName}
                          </Text>
                          {suggestion.metricDescription && (
                            <Text size="xs" c="dimmed" mb="xs">
                              {suggestion.metricDescription}
                            </Text>
                          )}
                          <Box mb="xs">
                            <Group gap="xs" mb={4}>
                              <Text size="xs" c="dimmed">
                                Relevance:
                              </Text>
                              <Text size="xs" fw={600}>
                                {suggestion.relevanceScore}/10
                              </Text>
                            </Group>
                            <Progress
                              value={suggestion.relevanceScore * 10}
                              size="sm"
                              color={
                                suggestion.relevanceScore >= 7
                                  ? "green"
                                  : suggestion.relevanceScore >= 5
                                    ? "yellow"
                                    : "gray"
                              }
                            />
                          </Box>
                          <Accordion variant="contained" chevronPosition="left">
                            <Accordion.Item value="reasoning">
                              <Accordion.Control>
                                <Text size="xs" fw={500}>
                                  Why this metric?
                                </Text>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Text size="xs" c="dimmed">
                                  {suggestion.reasoning}
                                </Text>
                                {suggestion.matchedKeywords.length > 0 && (
                                  <Group gap="xs" mt="xs">
                                    <Text size="xs" c="dimmed">
                                      Matched:
                                    </Text>
                                    {suggestion.matchedKeywords.map(
                                      (keyword, i) => (
                                        <Badge key={i} size="xs" variant="dot">
                                          {keyword}
                                        </Badge>
                                      ),
                                    )}
                                  </Group>
                                )}
                              </Accordion.Panel>
                            </Accordion.Item>
                          </Accordion>
                        </Box>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Custom Metrics Suggestions */}
            {suggestions.customMetrics.length > 0 && (
              <Box>
                <Group justify="space-between" mb="md">
                  <Group gap="xs">
                    <Text fw={600} size="sm">
                      Suggested Custom Metrics
                    </Text>
                    <Badge size="sm" variant="light" color="teal">
                      {suggestions.customMetrics.length}
                    </Badge>
                  </Group>
                  {selectedCustomMetrics.length > 0 && (
                    <Button
                      size="xs"
                      color="teal"
                      onClick={handleCreateAndAddCustom}
                      loading={
                        createMetricMutation.isPending ||
                        addMetricMutation.isPending
                      }
                      leftSection={<IconPlus size={14} />}
                    >
                      Create Selected ({selectedCustomMetrics.length})
                    </Button>
                  )}
                </Group>
                <Stack gap="xs" mah={400} style={{ overflowY: "auto" }}>
                  {suggestions.customMetrics.map((suggestion, index) => (
                    <Paper key={index} p="md" withBorder bg="teal.0">
                      <Group align="flex-start" wrap="nowrap">
                        <Checkbox
                          checked={selectedCustomMetrics.includes(index)}
                          onChange={(e) => {
                            if (e.currentTarget.checked) {
                              setSelectedCustomMetrics([
                                ...selectedCustomMetrics,
                                index,
                              ]);
                            } else {
                              setSelectedCustomMetrics(
                                selectedCustomMetrics.filter(
                                  (i) => i !== index,
                                ),
                              );
                            }
                          }}
                          mt={4}
                        />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" mb="xs">
                            <Text fw={500} size="sm">
                              {suggestion.name}
                            </Text>
                            <Badge size="xs" color="teal">
                              New
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed" mb="xs">
                            {suggestion.description}
                          </Text>
                          <Group gap="xs" mb="xs">
                            {suggestion.metricType.map((type) => (
                              <Badge key={type} size="xs">
                                {type.toLowerCase()}
                              </Badge>
                            ))}
                            <Badge size="xs" variant="light" color="gray">
                              {suggestion.collectionMethod}
                            </Badge>
                            {suggestion.unitOfMetric && (
                              <Text size="xs" c="dimmed">
                                • {suggestion.unitOfMetric}
                              </Text>
                            )}
                            <Badge
                              size="xs"
                              color={
                                suggestion.estimatedEffort === "low"
                                  ? "green"
                                  : suggestion.estimatedEffort === "medium"
                                    ? "yellow"
                                    : "orange"
                              }
                            >
                              {suggestion.estimatedEffort} effort
                            </Badge>
                          </Group>
                          <Accordion variant="contained" chevronPosition="left">
                            <Accordion.Item value="reasoning">
                              <Accordion.Control>
                                <Text size="xs" fw={500}>
                                  Why this metric?
                                </Text>
                              </Accordion.Control>
                              <Accordion.Panel>
                                <Text size="xs" c="dimmed">
                                  {suggestion.reasoning}
                                </Text>
                                {suggestion.recommendedCadence && (
                                  <Text size="xs" c="dimmed" mt="xs">
                                    <strong>Recommended cadence:</strong>{" "}
                                    {suggestion.recommendedCadence}
                                  </Text>
                                )}
                              </Accordion.Panel>
                            </Accordion.Item>
                          </Accordion>
                        </Box>
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            {suggestions.existingMetrics.length === 0 &&
              suggestions.customMetrics.length === 0 && (
                <Center py="xl">
                  <Text c="dimmed" size="sm" ta="center">
                    No suggestions generated. Try adding more project details or
                    updates.
                  </Text>
                </Center>
              )}

            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="light"
                leftSection={<IconSparkles size={16} />}
                onClick={handleGetSuggestions}
                loading={suggestMetricsMutation.isPending}
              >
                Regenerate Suggestions
              </Button>
            </Group>
          </Stack>
        )}
      </Stack>
    </Modal>
  );
}

export default function MetricsTab({
  projectId,
  canEdit,
  projectTitle,
  projectImageUrl,
}: MetricsTabProps) {
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);
  const [suggestModalOpened, setSuggestModalOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);

  const {
    data: projectMetrics,
    isLoading,
    refetch,
  } = api.metric.getProjectMetrics.useQuery({
    projectId,
  });

  const { data: allMetrics, isLoading: isLoadingAllMetrics } =
    api.metric.list.useQuery({
      search: searchQuery || undefined,
      metricType: typeFilter as MetricType | undefined,
      collectionMethod: collectionFilter as CollectionMethod | undefined,
      limit: 100,
    });

  const addMetricMutation = api.metric.addToProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Metric added to project",
        color: "green",
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const removeMetricMutation = api.metric.removeFromProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Metric removed from project",
        color: "green",
      });
      void refetch();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleAddMetric = (metricId: string) => {
    addMetricMutation.mutate({
      projectId,
      metricId,
    });
  };

  const handleRemoveMetric = (metricId: string) => {
    removeMetricMutation.mutate({
      projectId,
      metricId,
    });
  };

  const existingMetricIds = projectMetrics?.map((pm) => pm.metric.id) ?? [];

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="md" />
      </Center>
    );
  }

  const getMetricTypeColor = (type: MetricType) => {
    const colors: Record<MetricType, string> = {
      BUILDER: "blue",
      ENVIRONMENTAL: "green",
      GIT: "grape",
      ONCHAIN: "violet",
      OFFCHAIN: "cyan",
      CUSTOM: "gray",
    };
    return colors[type];
  };

  const getCollectionMethodBadge = (method: CollectionMethod) => {
    const labels: Record<CollectionMethod, string> = {
      ONCHAIN: "On-chain",
      OFFCHAIN_API: "API",
      SELF_REPORTING: "Self-reported",
      MANUAL: "Manual",
      AUTOMATED: "Automated",
    };
    return labels[method];
  };

  return (
    <Stack gap="lg">
      {/* Project Header with Logo */}
      {(projectImageUrl ?? projectTitle) && (
        <Paper p="xl" radius="md" withBorder>
          <Group gap="md" align="center">
            {projectImageUrl && (
              <Box
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 8,
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "1px solid var(--mantine-color-gray-3)",
                }}
              >
                <Image
                  src={projectImageUrl}
                  alt={projectTitle ?? "Project logo"}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
            )}
            <Box>
              {projectTitle && (
                <Title order={2} size="h3">
                  {projectTitle}
                </Title>
              )}
              <Text size="sm" c="dimmed">
                Metrics tracking and impact measurement
              </Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* Selected Metrics Section */}
      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Group gap="xs" mb="xs">
                <IconChartLine size={24} />
                <Title order={2}>Selected Metrics</Title>
              </Group>
              <Text c="dimmed" size="sm">
                Browse and add metrics from the Metrics Garden (
                {allMetrics?.total ?? 92} available)
              </Text>
            </Box>
            {canEdit && (
              <Group gap="sm">
                <Tooltip
                  label="AI analyzes your project name, description, technologies, and updates to suggest relevant metrics from the garden and recommend custom metrics to create"
                  multiline
                  w={300}
                  withArrow
                >
                  <Button
                    leftSection={<IconSparkles size={16} />}
                    rightSection={<IconInfoCircle size={14} opacity={0.6} />}
                    onClick={() => setSuggestModalOpened(true)}
                    variant="gradient"
                    gradient={{ from: "blue", to: "cyan", deg: 90 }}
                  >
                    Suggest metrics
                  </Button>
                </Tooltip>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setCreateModalOpened(true)}
                  variant="light"
                >
                  Create Custom Metric
                </Button>
              </Group>
            )}
          </Group>

          {/* Selected Project Metrics */}
          {projectMetrics && projectMetrics.length > 0 && (
            <>
              <Divider />
              <Box>
                <Text fw={500} size="sm" mb="md">
                  Selected Metrics ({projectMetrics.length})
                </Text>
                <Stack gap="xs">
                  {projectMetrics.map((pm) => (
                    <Paper key={pm.id} p="md" withBorder bg="blue.0">
                      <Group justify="space-between" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text fw={500} size="sm" lineClamp={1} mb="xs">
                            {pm.metric.name}
                          </Text>
                          {pm.metric.description && (
                            <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                              {pm.metric.description}
                            </Text>
                          )}
                          <Group gap="xs">
                            {pm.metric.metricType.slice(0, 3).map((type) => (
                              <Badge
                                key={type}
                                size="xs"
                                color={getMetricTypeColor(type)}
                              >
                                {type.toLowerCase()}
                              </Badge>
                            ))}
                            <Badge size="xs" variant="light" color="gray">
                              {getCollectionMethodBadge(
                                pm.metric.collectionMethod,
                              )}
                            </Badge>
                            {pm.metric.unitOfMetric && (
                              <Text size="xs" c="dimmed">
                                • {pm.metric.unitOfMetric}
                              </Text>
                            )}
                          </Group>
                        </Box>
                        {canEdit && (
                          <Button
                            size="xs"
                            variant="light"
                            color="red"
                            leftSection={<IconTrash size={14} />}
                            onClick={() => handleRemoveMetric(pm.metric.id)}
                            loading={removeMetricMutation.isPending}
                          >
                            Remove
                          </Button>
                        )}
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}

          <Divider />

          {/* Search and Filters */}
          <Box>
            <Text fw={500} size="sm" mb="md">
              Browse Available Metrics
            </Text>
            <Stack gap="md">
              <TextInput
                placeholder="Search metrics..."
                leftSection={<IconSearch size={16} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
              />

              <Group mb="md">
                <Select
                  placeholder="Filter by type"
                  data={[
                    { value: "BUILDER", label: "Builder" },
                    { value: "ENVIRONMENTAL", label: "Environmental" },
                    { value: "GIT", label: "Git" },
                    { value: "ONCHAIN", label: "On-chain" },
                    { value: "OFFCHAIN", label: "Off-chain" },
                    { value: "CUSTOM", label: "Custom" },
                  ]}
                  value={typeFilter}
                  onChange={setTypeFilter}
                  clearable
                  leftSection={<IconFilter size={16} />}
                />

                <Select
                  placeholder="Filter by collection"
                  data={[
                    { value: "ONCHAIN", label: "On-chain" },
                    { value: "OFFCHAIN_API", label: "API" },
                    { value: "SELF_REPORTING", label: "Self-reported" },
                    { value: "MANUAL", label: "Manual" },
                    { value: "AUTOMATED", label: "Automated" },
                  ]}
                  value={collectionFilter}
                  onChange={setCollectionFilter}
                  clearable
                  leftSection={<IconFilter size={16} />}
                />
              </Group>
            </Stack>

            {isLoadingAllMetrics ? (
              <Center py="xl">
                <Loader size="md" />
              </Center>
            ) : allMetrics && allMetrics.metrics.length > 0 ? (
              <Stack gap="xs" mah={600} style={{ overflowY: "auto" }}>
                {allMetrics.metrics.map((metric) => {
                  const isAdded = existingMetricIds.includes(metric.id);
                  return (
                    <Paper
                      key={metric.id}
                      p="md"
                      withBorder
                      bg={isAdded ? "green.0" : undefined}
                      style={
                        isAdded
                          ? { borderColor: "var(--mantine-color-green-3)" }
                          : undefined
                      }
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group gap="xs" mb="xs">
                            <Text fw={500} size="sm" lineClamp={1}>
                              {metric.name}
                            </Text>
                            {isAdded && (
                              <Badge size="xs" color="green" variant="light">
                                ✓ Added
                              </Badge>
                            )}
                          </Group>
                          {metric.description && (
                            <Text size="xs" c="dimmed" lineClamp={2} mb="xs">
                              {metric.description}
                            </Text>
                          )}
                          <Group gap="xs">
                            {metric.metricType.slice(0, 3).map((type) => (
                              <Badge
                                key={type}
                                size="xs"
                                color={getMetricTypeColor(type)}
                              >
                                {type.toLowerCase()}
                              </Badge>
                            ))}
                            <Badge size="xs" variant="light" color="gray">
                              {getCollectionMethodBadge(
                                metric.collectionMethod,
                              )}
                            </Badge>
                            {metric.unitOfMetric && (
                              <Text size="xs" c="dimmed">
                                • {metric.unitOfMetric}
                              </Text>
                            )}
                          </Group>
                        </Box>
                        {canEdit && (
                          <Button
                            size="xs"
                            variant={isAdded ? "light" : "filled"}
                            color={isAdded ? "red" : "blue"}
                            leftSection={
                              isAdded ? (
                                <IconTrash size={14} />
                              ) : (
                                <IconPlus size={14} />
                              )
                            }
                            onClick={() =>
                              isAdded
                                ? handleRemoveMetric(metric.id)
                                : handleAddMetric(metric.id)
                            }
                            loading={
                              addMetricMutation.isPending ||
                              removeMetricMutation.isPending
                            }
                          >
                            {isAdded ? "Remove" : "Add"}
                          </Button>
                        )}
                      </Group>
                    </Paper>
                  );
                })}
              </Stack>
            ) : (
              <Center py="xl">
                <Text c="dimmed" size="sm">
                  {searchQuery || typeFilter || collectionFilter
                    ? "No metrics found matching your filters"
                    : "No metrics available"}
                </Text>
              </Center>
            )}
          </Box>
        </Stack>
      </Paper>

      <AddMetricModal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        projectId={projectId}
        existingMetricIds={existingMetricIds}
        onMetricAdded={() => {
          void refetch();
          setAddModalOpened(false);
        }}
      />

      <CreateMetricModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        projectId={projectId}
        onMetricCreated={() => {
          void refetch();
        }}
      />

      <SuggestMetricsModal
        opened={suggestModalOpened}
        onClose={() => setSuggestModalOpened(false)}
        projectId={projectId}
        onMetricsAdded={() => {
          void refetch();
        }}
      />
    </Stack>
  );
}
