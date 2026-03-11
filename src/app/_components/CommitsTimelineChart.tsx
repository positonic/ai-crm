"use client";

import { AreaChart } from "@mantine/charts";
import { Text, Loader, Stack, Group, Badge, Switch } from "@mantine/core";
import { useState } from "react";
import { api } from "~/trpc/react";

interface CommitsTimelineChartProps {
  repositoryId: string;
  eventId?: string;
}

export function CommitsTimelineChart({
  repositoryId,
  eventId,
}: CommitsTimelineChartProps) {
  // Default to residency-only view when eventId is provided, otherwise show all time
  const [showResidencyOnly, setShowResidencyOnly] = useState(!!eventId);

  const { data, isLoading, error } = api.project.getRepositoryMetrics.useQuery({
    repositoryId,
    eventId,
  });

  if (isLoading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="md" />
        <Text size="sm" c="dimmed">
          Loading commit data...
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Text size="sm" c="red">
        Failed to load commit data: {error.message}
      </Text>
    );
  }

  if (!data) {
    return (
      <Text size="sm" c="dimmed">
        No repository data available
      </Text>
    );
  }

  // Get appropriate commits data based on filter
  const residencyMetrics = data.residencyMetrics?.[0];
  const hasResidencyData =
    residencyMetrics && Array.isArray(residencyMetrics.commitsData);
  const hasLifetimeData = data.commitsData && Array.isArray(data.commitsData);

  let commitsData: Array<{ date: string; count: number }> = [];
  let totalCommits = 0;
  let dataLabel = "All Time";

  if (showResidencyOnly && hasResidencyData) {
    commitsData = residencyMetrics.commitsData as Array<{
      date: string;
      count: number;
    }>;
    totalCommits = residencyMetrics.residencyCommits ?? 0;
    dataLabel = "During Residency";
  } else if (hasLifetimeData) {
    commitsData = data.commitsData as Array<{ date: string; count: number }>;
    totalCommits = data.totalCommits ?? 0;
    dataLabel = "All Time";
  }

  if (commitsData.length === 0) {
    return (
      <Stack gap="md">
        {hasResidencyData && (
          <Group justify="space-between">
            <Switch
              label="Show residency period only"
              checked={showResidencyOnly}
              onChange={(e) => setShowResidencyOnly(e.currentTarget.checked)}
            />
          </Group>
        )}
        <Text size="sm" c="dimmed" ta="center" py="xl">
          No commit data available for this period
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Group gap="md">
          <Badge size="lg" variant="light" color="blue">
            {totalCommits} commits
          </Badge>
          <Badge size="lg" variant="light" color="gray">
            {dataLabel}
          </Badge>
        </Group>

        {hasResidencyData && (
          <Switch
            label="Show residency period only"
            checked={showResidencyOnly}
            onChange={(e) => setShowResidencyOnly(e.currentTarget.checked)}
          />
        )}
      </Group>

      <AreaChart
        h={300}
        data={commitsData}
        dataKey="date"
        series={[{ name: "count", label: "Commits", color: "blue.6" }]}
        curveType="monotone"
        withLegend={false}
        withDots={false}
        gridAxis="xy"
        tickLine="xy"
        withTooltip
        tooltipAnimationDuration={200}
      />

      {data.lastSyncedAt && (
        <Text size="xs" c="dimmed" ta="right">
          Last synced: {new Date(data.lastSyncedAt).toLocaleDateString()}
        </Text>
      )}
    </Stack>
  );
}
