"use client";

import {
  Card,
  Text,
  Title,
  Group,
  Stack,
  Progress,
  Grid,
  Badge,
  Alert,
  Paper,
  Box,
  Tooltip,
  ActionIcon,
  Divider,
} from "@mantine/core";
import {
  IconTarget,
  IconTrendingUp,
  IconTrendingDown,
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconDownload,
} from "@tabler/icons-react";
import {
  type ExtendedDemographicStats,
  type ProfessionalRole,
  CURATION_TARGETS,
  calculateTargetDifference,
} from "~/utils/demographics";

interface CurationSpecDashboardProps {
  demographicStats: ExtendedDemographicStats;
  isLoading?: boolean;
}

interface BalanceIndicatorProps {
  label: string;
  current: number;
  target: number;
  total: number;
  color?: string;
}

function BalanceIndicator({
  label,
  current,
  target,
  total,
  color = "blue",
}: BalanceIndicatorProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const difference = calculateTargetDifference(percentage, target);

  // Determine status color based on how close to target
  const getStatusColor = () => {
    const absDiff = Math.abs(difference);
    if (absDiff <= 5) return "green"; // Within 5% is good
    if (absDiff <= 15) return "yellow"; // Within 15% is warning
    return "red"; // Over 15% is critical
  };

  const statusColor = getStatusColor();
  const isOverTarget = difference > 0;

  return (
    <Card withBorder p="md">
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            <Text fw={600} size="sm">
              {label}
            </Text>
            <Text size="xs" c="dimmed">
              Target: {target}%
            </Text>
          </Box>
          <Group gap="xs" align="center">
            <Text fw={700} size="lg">
              {percentage.toFixed(1)}%
            </Text>
            <Tooltip
              label={`${difference > 0 ? "+" : ""}${difference.toFixed(1)}% from target`}
            >
              <Badge
                color={statusColor}
                variant="light"
                size="sm"
                leftSection={
                  statusColor === "green" ? (
                    <IconCheck size={12} />
                  ) : isOverTarget ? (
                    <IconTrendingUp size={12} />
                  ) : (
                    <IconTrendingDown size={12} />
                  )
                }
              >
                {difference > 0 ? "+" : ""}
                {difference.toFixed(1)}%
              </Badge>
            </Tooltip>
          </Group>
        </Group>

        <Progress
          value={percentage}
          color={color}
          size="lg"
          radius="md"
          style={{ position: "relative" }}
        />

        {/* Target line indicator */}
        <Box style={{ position: "relative", marginTop: -20, marginBottom: 12 }}>
          <div
            style={{
              position: "absolute",
              left: `${target}%`,
              top: 0,
              width: 2,
              height: 20,
              backgroundColor: "var(--mantine-color-gray-7)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: `${Math.max(0, target - 5)}%`,
              top: -2,
              fontSize: "10px",
              color: "var(--mantine-color-gray-6)",
            }}
          >
            {target}%
          </div>
        </Box>

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            {current} of {total} applicants
          </Text>
          <Text size="xs" fw={500} c={statusColor}>
            {statusColor === "green"
              ? "On Target"
              : statusColor === "yellow"
                ? "Needs Attention"
                : "Critical"}
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}

interface AlertPanelProps {
  demographicStats: ExtendedDemographicStats;
}

function AlertPanel({ demographicStats }: AlertPanelProps) {
  const alerts = [];

  // Check regional balance
  const regionBalance = demographicStats.curationBalance.region;
  if (Math.abs(regionBalance.latamDifference) > 15) {
    alerts.push({
      type: "critical" as const,
      message: `LATAM representation is ${regionBalance.latamDifference > 0 ? "over" : "under"} target by ${Math.abs(regionBalance.latamDifference).toFixed(1)}%`,
      suggestion:
        regionBalance.latamDifference > 0
          ? "Consider prioritizing Global applicants"
          : "Consider prioritizing LATAM applicants",
    });
  }

  // Check role balance
  const roleBalance = demographicStats.curationBalance.roles;
  Object.entries(roleBalance).forEach(([role, balance]) => {
    if (role !== "unspecified" && Math.abs(balance.difference) > 10) {
      const roleLabel = role
        .replace("_", " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      alerts.push({
        type:
          Math.abs(balance.difference) > 20
            ? ("critical" as const)
            : ("warning" as const),
        message: `${roleLabel} representation is ${balance.difference > 0 ? "over" : "under"} target by ${Math.abs(balance.difference).toFixed(1)}%`,
        suggestion:
          balance.difference > 0
            ? `Consider deprioritizing ${roleLabel.toLowerCase()} applicants`
            : `Consider prioritizing ${roleLabel.toLowerCase()} applicants`,
      });
    }
  });

  if (alerts.length === 0) {
    return (
      <Alert
        icon={<IconCheck size={16} />}
        color="green"
        title="Curation Balance Healthy"
      >
        All demographic targets are within acceptable ranges. Continue current
        review patterns.
      </Alert>
    );
  }

  return (
    <Stack gap="sm">
      {alerts.map((alert, index) => (
        <Alert
          key={index}
          icon={<IconAlertTriangle size={16} />}
          color={alert.type === "critical" ? "red" : "yellow"}
          title={
            alert.type === "critical"
              ? "Critical Balance Issue"
              : "Balance Warning"
          }
        >
          <Text size="sm" mb="xs">
            {alert.message}
          </Text>
          <Text size="xs" c="dimmed" fs="italic">
            {alert.suggestion}
          </Text>
        </Alert>
      ))}
    </Stack>
  );
}

export default function CurationSpecDashboard({
  demographicStats,
  isLoading,
}: CurationSpecDashboardProps) {
  if (isLoading) {
    return (
      <Stack gap="lg">
        <Title order={3}>Curation Balance</Title>
        <Text c="dimmed">Loading demographic statistics...</Text>
      </Stack>
    );
  }

  const roleLabels: Record<ProfessionalRole, string> = {
    entrepreneur: "Entrepreneurs",
    developer: "Developers",
    academic: "Academics",
    designer: "Designers",
    product_manager: "Product Managers",
    solo_builder: "Solo Builders",
    unspecified: "Unspecified",
  };

  const roleColors: Record<ProfessionalRole, string> = {
    entrepreneur: "blue",
    developer: "green",
    academic: "purple",
    designer: "pink",
    product_manager: "orange",
    solo_builder: "teal",
    unspecified: "gray",
  };

  return (
    <Stack gap="lg">
      {/* Header */}
      <Group justify="space-between" align="flex-start">
        <Box>
          <Title order={3}>Residency Curation Balance</Title>
          <Text c="dimmed" size="sm">
            Track demographic balance against target quotas for the residency
            program
          </Text>
        </Box>

        <Group>
          <Tooltip label="Export balance report">
            <ActionIcon variant="light" size="lg">
              <IconDownload size={18} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Curation spec information">
            <ActionIcon variant="light" size="lg">
              <IconInfoCircle size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* Alert Panel */}
      <AlertPanel demographicStats={demographicStats} />

      {/* Regional Balance */}
      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <IconTarget size={20} />
            <Title order={4}>Regional Balance</Title>
          </Group>

          <Grid>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <BalanceIndicator
                label="Latin America"
                current={demographicStats.region.latam}
                target={CURATION_TARGETS.region.latam}
                total={demographicStats.total}
                color="blue"
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <BalanceIndicator
                label="Global (Non-LATAM)"
                current={demographicStats.region.non_latam}
                target={CURATION_TARGETS.region.global}
                total={demographicStats.total}
                color="teal"
              />
            </Grid.Col>
          </Grid>
        </Stack>
      </Paper>

      {/* Role/Background Balance */}
      <Paper p="lg" withBorder>
        <Stack gap="md">
          <Group gap="xs">
            <IconTarget size={20} />
            <Title order={4}>Professional Background Balance</Title>
          </Group>

          <Grid>
            {(
              Object.entries(CURATION_TARGETS.roles) as Array<
                [ProfessionalRole, number]
              >
            ).map(([role, target]) => (
              <Grid.Col key={role} span={{ base: 12, sm: 6, md: 4 }}>
                <BalanceIndicator
                  label={roleLabels[role]}
                  current={demographicStats.roleStats.roles[role]}
                  target={target}
                  total={demographicStats.total}
                  color={roleColors[role]}
                />
              </Grid.Col>
            ))}
          </Grid>

          {demographicStats.roleStats.roles.unspecified > 0 && (
            <>
              <Divider label="Unspecified Roles" labelPosition="center" />
              <Grid>
                <Grid.Col span={{ base: 12, sm: 6, md: 4 }}>
                  <Card withBorder p="md">
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text fw={600} size="sm">
                          Unspecified
                        </Text>
                        <Badge color="gray" variant="light" size="sm">
                          {demographicStats.roleStats.roles.percentages.unspecified.toFixed(
                            1,
                          )}
                          %
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {demographicStats.roleStats.roles.unspecified}{" "}
                        applicants need role classification
                      </Text>
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>
            </>
          )}
        </Stack>
      </Paper>

      {/* Summary Statistics */}
      <Paper p="md" withBorder>
        <Group justify="space-between" wrap="wrap">
          <Group gap="xl">
            <Box ta="center">
              <Text fw={700} size="xl">
                {demographicStats.total}
              </Text>
              <Text size="xs" c="dimmed">
                Total Applicants
              </Text>
            </Box>
            <Box ta="center">
              <Text fw={700} size="xl" c="green">
                {
                  Object.values(demographicStats.curationBalance.region)
                    .concat(
                      Object.values(demographicStats.curationBalance.roles).map(
                        (r) => r.difference,
                      ),
                    )
                    .filter((diff) => Math.abs(diff) <= 5).length
                }
              </Text>
              <Text size="xs" c="dimmed">
                Targets On Track
              </Text>
            </Box>
            <Box ta="center">
              <Text fw={700} size="xl" c="red">
                {
                  Object.values(demographicStats.curationBalance.region)
                    .concat(
                      Object.values(demographicStats.curationBalance.roles).map(
                        (r) => r.difference,
                      ),
                    )
                    .filter((diff) => Math.abs(diff) > 15).length
                }
              </Text>
              <Text size="xs" c="dimmed">
                Critical Issues
              </Text>
            </Box>
          </Group>

          <Text size="xs" c="dimmed" style={{ maxWidth: 200 }}>
            Last updated: {new Date().toLocaleString()}
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
