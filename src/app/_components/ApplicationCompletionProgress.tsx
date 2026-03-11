"use client";

import { Progress, Tooltip, Text, Group, Stack } from "@mantine/core";

interface ApplicationCompletionProgressProps {
  completionPercentage: number;
  completedFields?: number;
  totalFields?: number;
  size?: "xs" | "sm" | "md" | "lg";
  showLabel?: boolean;
  showTooltip?: boolean;
}

function getProgressColor(percentage: number): string {
  if (percentage >= 80) return "green";
  if (percentage >= 60) return "yellow";
  if (percentage >= 40) return "orange";
  return "red";
}

export default function ApplicationCompletionProgress({
  completionPercentage,
  completedFields,
  totalFields,
  size = "sm",
  showLabel = false,
  showTooltip = true,
}: ApplicationCompletionProgressProps) {
  const color = getProgressColor(completionPercentage);

  const progressBar = (
    <Group gap="xs" style={{ minWidth: showLabel ? 100 : 80 }}>
      <Progress
        value={completionPercentage}
        color={color}
        size={size}
        radius="sm"
        style={{ flex: 1 }}
      />
      {showLabel && (
        <Text size="xs" c="dimmed" style={{ minWidth: 35, textAlign: "right" }}>
          {completionPercentage}%
        </Text>
      )}
    </Group>
  );

  if (!showTooltip) {
    return progressBar;
  }

  const tooltipContent = (
    <Stack gap={2}>
      <Text size="sm" fw={500}>
        Application Progress
      </Text>
      <Text size="xs" c="dimmed">
        {completedFields !== undefined && totalFields !== undefined
          ? `${completedFields} of ${totalFields} required fields completed`
          : `${completionPercentage}% complete`}
      </Text>
      {completionPercentage === 100 ? (
        <Text size="xs" c="green">
          ✓ All required fields completed
        </Text>
      ) : (
        <Text size="xs" c={color === "red" ? "red" : "orange"}>
          {totalFields !== undefined && completedFields !== undefined
            ? `${totalFields - completedFields} field${totalFields - completedFields !== 1 ? "s" : ""} remaining`
            : "Missing required information"}
        </Text>
      )}
    </Stack>
  );

  return (
    <Tooltip label={tooltipContent} position="top" withArrow multiline w={220}>
      {progressBar}
    </Tooltip>
  );
}
