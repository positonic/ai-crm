"use client";

import { useState } from "react";
import {
  Paper,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Card,
  Select,
  Loader,
  Alert,
  Title,
} from "@mantine/core";
import { IconAlertCircle, IconUser, IconClock } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { getDisplayName } from "~/utils/userDisplay";

interface ApplicationQueueProps {
  eventId?: string;
}

export function ApplicationQueue({ eventId }: ApplicationQueueProps) {
  const [selectedStage, setSelectedStage] = useState<
    "SCREENING" | "DETAILED_REVIEW" | "VIDEO_REVIEW"
  >("SCREENING");
  const [assigningTo, setAssigningTo] = useState<string | null>(null);

  // Fetch available applications
  const {
    data: applications,
    isLoading,
    error,
    refetch,
  } = api.evaluation.getAvailableApplications.useQuery({
    eventId,
    stage: selectedStage,
    limit: 50,
  });

  // Self-assign mutation
  const selfAssignMutation = api.evaluation.selfAssignToApplication.useMutation(
    {
      onSuccess: (data) => {
        notifications.show({
          title: "Application Assigned",
          message: `Successfully assigned to application. You can now begin your review.`,
          color: "green",
        });
        setAssigningTo(null);
        void refetch();
        // Navigate to the evaluation form
        window.location.href = `/admin/evaluations/${data.evaluation.id}`;
      },
      onError: (error) => {
        notifications.show({
          title: "Assignment Failed",
          message:
            error.message || "Failed to assign application. Please try again.",
          color: "red",
        });
        setAssigningTo(null);
      },
    },
  );

  const handleSelfAssign = async (applicationId: string) => {
    setAssigningTo(applicationId);
    await selfAssignMutation.mutateAsync({
      applicationId,
      stage: selectedStage,
      priority: 0,
      notes: `Self-assigned via queue interface`,
    });
  };

  if (isLoading) {
    return (
      <Paper p="md" className="text-center">
        <Loader size="md" />
        <Text mt="md">Loading available applications...</Text>
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size="1rem" />}
        title="Error Loading Queue"
        color="red"
      >
        {error.message}
      </Alert>
    );
  }

  return (
    <Paper p="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={3}>Review Queue</Title>
          <Select
            label="Review Stage"
            value={selectedStage}
            onChange={(value) =>
              setSelectedStage(value as typeof selectedStage)
            }
            data={[
              { value: "SCREENING", label: "Screening" },
              { value: "DETAILED_REVIEW", label: "Detailed Review" },
              { value: "VIDEO_REVIEW", label: "Video Review" },
            ]}
            w={200}
          />
        </Group>

        {!applications?.length ? (
          <Paper p="xl" className="text-center bg-gray-50">
            <Text c="dimmed" size="lg">
              No applications available for{" "}
              {selectedStage.toLowerCase().replace("_", " ")} stage
            </Text>
            <Text c="dimmed" size="sm" mt="xs">
              Check back later or try a different review stage
            </Text>
          </Paper>
        ) : (
          <Stack gap="sm">
            <Text size="sm" c="dimmed">
              {applications.length} application
              {applications.length !== 1 ? "s" : ""} available for review
            </Text>

            {applications.map((app) => (
              <Card key={app.id} withBorder shadow="sm">
                <Group justify="space-between" align="flex-start">
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Group gap="xs">
                      <Text fw={500} size="md">
                        Application #{app.id.slice(-8).toUpperCase()}
                      </Text>
                      <Badge
                        color={app.status === "SUBMITTED" ? "blue" : "gray"}
                        size="sm"
                      >
                        {app.status}
                      </Badge>
                    </Group>

                    <Group gap="lg">
                      <Group gap="xs" align="center">
                        <IconUser size="1rem" />
                        <Text size="sm" c="dimmed">
                          {getDisplayName(app.user, "Anonymous")}
                        </Text>
                      </Group>

                      <Group gap="xs" align="center">
                        <IconClock size="1rem" />
                        <Text size="sm" c="dimmed">
                          Submitted{" "}
                          {new Date(
                            app.submittedAt ?? app.createdAt,
                          ).toLocaleDateString()}
                        </Text>
                      </Group>
                    </Group>

                    {app.event && (
                      <Text size="sm" c="dimmed">
                        Event: {app.event.name}
                      </Text>
                    )}
                  </Stack>

                  <Button
                    onClick={() => handleSelfAssign(app.id)}
                    loading={assigningTo === app.id}
                    disabled={!!assigningTo}
                    variant="filled"
                    color="blue"
                  >
                    {assigningTo === app.id ? "Assigning..." : "Review This"}
                  </Button>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
