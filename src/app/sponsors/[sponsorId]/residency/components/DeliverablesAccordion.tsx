"use client";

import React from "react";
import {
  Card,
  Stack,
  Title,
  Text,
  Accordion,
  Badge,
  Group,
  Progress,
  Paper,
  ThemeIcon,
  Timeline,
  ActionIcon,
} from "@mantine/core";
import {
  IconCode,
  IconUsers,
  IconBroadcast,
  IconRocket,
  IconCheck,
  IconClock,
  IconX,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface DeliverablesAccordionProps {
  deliverables: Array<{
    id: string;
    category: string;
    title: string;
    description: string;
    status: string;
    estimatedHours?: number | null;
    actualHours?: number | null;
    dueDate?: Date | null;
    completedAt?: Date | null;
    notes?: string | null;
  }>;
  eventSponsorId: string;
}

const categoryConfig = {
  TECHNICAL: {
    label: "Technical Mentorship & Knowledge Transfer",
    description:
      "Deep-dive workshops, office hours, and technical guidance for resident builders",
    icon: IconCode,
    color: "blue",
  },
  SUPPORT: {
    label: "Builder Support & Resources",
    description:
      "Code examples, templates, and reference materials to accelerate development",
    icon: IconUsers,
    color: "green",
  },
  PATHWAYS: {
    label: "Ecosystem Pathways",
    description:
      "Integration guidance and next-step opportunities within your ecosystem",
    icon: IconRocket,
    color: "violet",
  },
  VISIBILITY: {
    label: "Visibility and Storytelling",
    description:
      "Demo day participation, feedback provision, and project amplification",
    icon: IconBroadcast,
    color: "orange",
  },
};

export default function DeliverablesAccordion({
  deliverables,
  eventSponsorId,
}: DeliverablesAccordionProps) {
  const utils = api.useUtils();

  const updateDeliverableStatus =
    api.sponsor.updateDeliverableStatus.useMutation({
      onSuccess: () => {
        void utils.sponsor.getSponsorResidencyData.invalidate({
          eventSponsorId,
        });
        notifications.show({
          title: "Status updated",
          message: "Deliverable status has been updated successfully",
          color: "green",
          icon: <IconCheck size={16} />,
        });
      },
      onError: (error) => {
        notifications.show({
          title: "Error updating status",
          message: error.message,
          color: "red",
        });
      },
    });

  const handleStatusChange = (deliverableId: string, newStatus: string) => {
    updateDeliverableStatus.mutate({
      deliverableId,
      status: newStatus as
        | "PLANNED"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "CANCELLED",
    });
  };

  // Group deliverables by category
  const groupedDeliverables = deliverables.reduce(
    (acc, deliverable) => {
      const category = deliverable.category as keyof typeof categoryConfig;
      acc[category] ??= [];
      acc[category].push(deliverable);
      return acc;
    },
    {} as Record<string, typeof deliverables>,
  );

  // Calculate overall progress
  const totalDeliverables = deliverables.length;
  const completedDeliverables = deliverables.filter(
    (d) => d.status === "COMPLETED",
  ).length;
  const progressPercentage =
    totalDeliverables > 0
      ? (completedDeliverables / totalDeliverables) * 100
      : 0;

  const totalEstimatedHours = deliverables.reduce(
    (sum, d) => sum + (d.estimatedHours ?? 0),
    0,
  );
  const completedHours = deliverables
    .filter((d) => d.status === "COMPLETED")
    .reduce((sum, d) => sum + (d.actualHours ?? d.estimatedHours ?? 0), 0);

  return (
    <Card withBorder radius="md" p="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Title order={3}>Deliverables</Title>
          <Badge color="blue" variant="light" size="lg">
            {completedDeliverables}/{totalDeliverables} Complete
          </Badge>
        </Group>

        <Text>
          These are the commitments we&apos;ve agreed to deliver as part of your
          sponsorship. Track progress and update status as work is completed.
        </Text>

        {/* Overall Progress */}
        <Paper p="md" withBorder>
          <Stack gap="xs">
            <Group justify="space-between">
              <Text fw={500}>Overall Progress</Text>
              <Text size="sm" c="dimmed">
                {Math.round(progressPercentage)}% complete
              </Text>
            </Group>
            <Progress value={progressPercentage} color="blue" size="lg" />
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Estimated: {totalEstimatedHours} hours
              </Text>
              <Text size="sm" c="dimmed">
                Completed: {completedHours} hours
              </Text>
            </Group>
          </Stack>
        </Paper>

        {/* Deliverables by Category */}
        <Accordion variant="separated" radius="md">
          {Object.entries(groupedDeliverables).map(
            ([category, categoryDeliverables]) => {
              const config =
                categoryConfig[category as keyof typeof categoryConfig];
              const categoryCompleted = categoryDeliverables.filter(
                (d) => d.status === "COMPLETED",
              ).length;
              const categoryTotal = categoryDeliverables.length;
              const categoryProgress =
                categoryTotal > 0
                  ? (categoryCompleted / categoryTotal) * 100
                  : 0;

              return (
                <Accordion.Item key={category} value={category}>
                  <Accordion.Control>
                    <Group justify="space-between" pr="md">
                      <Group gap="md">
                        <ThemeIcon
                          size="lg"
                          color={config.color}
                          variant="light"
                        >
                          <config.icon size={20} />
                        </ThemeIcon>
                        <Stack gap={0}>
                          <Text fw={500}>{config.label}</Text>
                          <Text size="sm" c="dimmed">
                            {config.description}
                          </Text>
                        </Stack>
                      </Group>
                      <Badge color={config.color} variant="light">
                        {categoryCompleted}/{categoryTotal}
                      </Badge>
                    </Group>
                  </Accordion.Control>

                  <Accordion.Panel>
                    <Stack gap="md">
                      <Progress
                        value={categoryProgress}
                        color={config.color}
                        size="sm"
                      />

                      <Timeline bulletSize={24} lineWidth={2}>
                        {categoryDeliverables.map((deliverable) => (
                          <Timeline.Item
                            key={deliverable.id}
                            bullet={getStatusIcon(deliverable.status)}
                            title={
                              <Group justify="space-between" align="center">
                                <Text fw={500}>{deliverable.title}</Text>
                                <Group gap="xs">
                                  {deliverable.status !== "COMPLETED" && (
                                    <>
                                      {deliverable.status === "PLANNED" && (
                                        <ActionIcon
                                          size="sm"
                                          color="blue"
                                          variant="light"
                                          onClick={() =>
                                            handleStatusChange(
                                              deliverable.id,
                                              "IN_PROGRESS",
                                            )
                                          }
                                          loading={
                                            updateDeliverableStatus.isPending
                                          }
                                        >
                                          <IconPlayerPlay size={12} />
                                        </ActionIcon>
                                      )}
                                      <ActionIcon
                                        size="sm"
                                        color="green"
                                        variant="light"
                                        onClick={() =>
                                          handleStatusChange(
                                            deliverable.id,
                                            "COMPLETED",
                                          )
                                        }
                                        loading={
                                          updateDeliverableStatus.isPending
                                        }
                                      >
                                        <IconCheck size={12} />
                                      </ActionIcon>
                                    </>
                                  )}
                                  <Badge
                                    size="xs"
                                    color={getStatusColor(deliverable.status)}
                                    variant="light"
                                  >
                                    {deliverable.status
                                      .replace("_", " ")
                                      .toLowerCase()
                                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                                  </Badge>
                                </Group>
                              </Group>
                            }
                          >
                            <Stack gap="xs" mt="xs">
                              <Text size="sm" c="dimmed">
                                {deliverable.description}
                              </Text>

                              <Group gap="lg">
                                {deliverable.estimatedHours && (
                                  <Text size="xs" c="dimmed">
                                    Estimated: {deliverable.estimatedHours}h
                                  </Text>
                                )}
                                {deliverable.actualHours && (
                                  <Text size="xs" c="dimmed">
                                    Actual: {deliverable.actualHours}h
                                  </Text>
                                )}
                                {deliverable.dueDate && (
                                  <Text size="xs" c="dimmed">
                                    Due:{" "}
                                    {new Date(
                                      deliverable.dueDate,
                                    ).toLocaleDateString()}
                                  </Text>
                                )}
                                {deliverable.completedAt && (
                                  <Text size="xs" c="dimmed">
                                    Completed:{" "}
                                    {new Date(
                                      deliverable.completedAt,
                                    ).toLocaleDateString()}
                                  </Text>
                                )}
                              </Group>

                              {deliverable.notes && (
                                <Text size="xs" c="dimmed" fs="italic">
                                  Notes: {deliverable.notes}
                                </Text>
                              )}
                            </Stack>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    </Stack>
                  </Accordion.Panel>
                </Accordion.Item>
              );
            },
          )}
        </Accordion>
      </Stack>
    </Card>
  );
}

function getStatusIcon(status: string) {
  switch (status) {
    case "COMPLETED":
      return <IconCheck size={16} color="green" />;
    case "IN_PROGRESS":
      return <IconPlayerPlay size={16} color="blue" />;
    case "CANCELLED":
      return <IconX size={16} color="red" />;
    default:
      return <IconClock size={16} color="gray" />;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "green";
    case "IN_PROGRESS":
      return "blue";
    case "CANCELLED":
      return "red";
    default:
      return "gray";
  }
}
