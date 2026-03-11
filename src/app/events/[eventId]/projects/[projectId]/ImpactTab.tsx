"use client";

import {
  Stack,
  Text,
  Group,
  Badge,
  Paper,
  Title,
  Loader,
  Center,
  Box,
  Accordion,
  Anchor,
  Table,
  ThemeIcon,
} from "@mantine/core";
import {
  IconChartLine,
  IconGitCommit,
  IconLink,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { type MetricType, type CollectionMethod } from "@prisma/client";
import { CommitsTimelineChart } from "~/app/_components/CommitsTimelineChart";

interface ImpactTabProps {
  projectId: string;
  eventId?: string;
  repositoryId?: string;
}

export default function ImpactTab({
  projectId,
  eventId,
  repositoryId,
}: ImpactTabProps) {
  const { data: projectMetrics, isLoading } =
    api.metric.getProjectMetrics.useQuery({
      projectId,
    });

  const { data: attestationsData, isLoading: attestationsLoading } =
    api.project.getProjectAttestations.useQuery({
      projectId,
    });

  if (isLoading) {
    return (
      <Center py="xl">
        <Loader size="md" />
      </Center>
    );
  }

  // Helper to get EAS explorer URL for an attestation
  // Note: chain "optimism" without "-sepolia" suffix could be either network
  // Default to testnet (Sepolia) unless explicitly "optimism-mainnet"
  const getEASExplorerUrl = (uid: string, chain: string) => {
    const isMainnet = chain === "optimism-mainnet";
    const baseUrl = isMainnet
      ? "https://optimism.easscan.org/attestation/view"
      : "https://optimism-sepolia.easscan.org/attestation/view";
    return `${baseUrl}/${uid}`;
  };

  // Format attestation date
  const formatAttestationDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  // Parse attestation data to extract metrics
  const parseAttestationData = (
    data: unknown,
  ): { totalCommits?: number; weeksActive?: number } => {
    if (typeof data === "object" && data !== null) {
      const d = data as Record<string, unknown>;
      return {
        totalCommits:
          typeof d.totalCommits === "number" ? d.totalCommits : undefined,
        weeksActive:
          typeof d.weeksActive === "number" ? d.weeksActive : undefined,
      };
    }
    return {};
  };

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
      {/* Standard Metrics Section */}
      {repositoryId && (
        <Paper p="xl" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="xs">
              <IconGitCommit size={24} />
              <Title order={2}>Standard Metrics</Title>
              <Badge color="green" variant="light" size="sm">
                automated
              </Badge>
            </Group>
            <Text c="dimmed" size="sm" mb="md">
              Automated metrics tracked for all projects
            </Text>

            <Accordion variant="separated">
              <Accordion.Item value="commits">
                <Accordion.Control>
                  <Group>
                    <IconGitCommit size={20} />
                    <Box>
                      <Text fw={600}>GitHub Commits</Text>
                      <Text size="sm" c="dimmed">
                        Commit activity over time
                      </Text>
                    </Box>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <CommitsTimelineChart
                    repositoryId={repositoryId}
                    eventId={eventId}
                  />
                </Accordion.Panel>
              </Accordion.Item>

              {/* On-chain Attestations */}
              {attestationsData && attestationsData.attestations.length > 0 && (
                <Accordion.Item value="attestations">
                  <Accordion.Control>
                    <Group>
                      <ThemeIcon variant="light" color="violet" size="md">
                        <IconLink size={20} />
                      </ThemeIcon>
                      <Box>
                        <Group gap="xs">
                          <Text fw={600}>On-chain Attestations</Text>
                          <Badge size="xs" color="violet" variant="light">
                            {attestationsData.totalCount}
                          </Badge>
                        </Group>
                        <Text size="sm" c="dimmed">
                          Verified activity records on Ethereum Attestation
                          Service
                        </Text>
                      </Box>
                    </Group>
                  </Accordion.Control>
                  <Accordion.Panel>
                    {attestationsLoading ? (
                      <Center py="md">
                        <Loader size="sm" />
                      </Center>
                    ) : (
                      <Stack gap="md">
                        <Text size="sm" c="dimmed">
                          These attestations are immutable on-chain records of
                          this project&apos;s GitHub activity, created using the
                          Ethereum Attestation Service (EAS) on Optimism.
                        </Text>
                        <Table striped highlightOnHover>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Date</Table.Th>
                              <Table.Th>Repository</Table.Th>
                              <Table.Th>Total Commits</Table.Th>
                              <Table.Th>Weeks Active</Table.Th>
                              <Table.Th>Type</Table.Th>
                              <Table.Th>Attestation</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {attestationsData.attestations.map(
                              (attestation) => {
                                const parsedData = parseAttestationData(
                                  attestation.data,
                                );
                                return (
                                  <Table.Tr key={attestation.id}>
                                    <Table.Td>
                                      <Text size="sm">
                                        {formatAttestationDate(
                                          attestation.snapshotDate,
                                        )}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm" fw={500}>
                                        {attestation.repository.name ??
                                          "Repository"}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      {parsedData.totalCommits !== undefined ? (
                                        <Badge
                                          color="blue"
                                          variant="light"
                                          size="sm"
                                        >
                                          {parsedData.totalCommits}
                                        </Badge>
                                      ) : (
                                        <Text size="sm" c="dimmed">
                                          —
                                        </Text>
                                      )}
                                    </Table.Td>
                                    <Table.Td>
                                      {parsedData.weeksActive !== undefined ? (
                                        <Text size="sm">
                                          {parsedData.weeksActive}
                                        </Text>
                                      ) : (
                                        <Text size="sm" c="dimmed">
                                          —
                                        </Text>
                                      )}
                                    </Table.Td>
                                    <Table.Td>
                                      <Badge
                                        size="xs"
                                        color={
                                          attestation.isRetroactive
                                            ? "orange"
                                            : "green"
                                        }
                                        variant="light"
                                      >
                                        {attestation.isRetroactive
                                          ? "Historical"
                                          : "Live"}
                                      </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                      <Anchor
                                        href={getEASExplorerUrl(
                                          attestation.uid,
                                          attestation.chain,
                                        )}
                                        target="_blank"
                                        size="xs"
                                        c="violet"
                                        style={{ whiteSpace: "nowrap" }}
                                      >
                                        {attestation.uid.slice(0, 8)}...
                                        {attestation.uid.slice(-6)}
                                        <IconExternalLink
                                          size={12}
                                          style={{
                                            marginLeft: 4,
                                            verticalAlign: "middle",
                                          }}
                                        />
                                      </Anchor>
                                    </Table.Td>
                                  </Table.Tr>
                                );
                              },
                            )}
                          </Table.Tbody>
                        </Table>
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            View all attestations on
                          </Text>
                          <Anchor
                            href="https://optimism-sepolia.easscan.org/schema/view/0x2a6c47616c877586c9b94bfee775d192e0017e0c454c1a300392a2375d0e5490"
                            target="_blank"
                            size="xs"
                          >
                            EAS Explorer
                            <IconExternalLink
                              size={10}
                              style={{ marginLeft: 2, verticalAlign: "middle" }}
                            />
                          </Anchor>
                        </Group>
                      </Stack>
                    )}
                  </Accordion.Panel>
                </Accordion.Item>
              )}
            </Accordion>
          </Stack>
        </Paper>
      )}

      <Paper p="xl" radius="md" withBorder>
        <Stack gap="lg">
          <Box>
            <Group gap="xs" mb="xs">
              <IconChartLine size={24} />
              <Title order={2}>Project Impact Metrics</Title>
            </Group>
            <Text c="dimmed" size="sm">
              Tracking {projectMetrics?.length ?? 0} impact metrics for this
              project
            </Text>
          </Box>

          {projectMetrics && projectMetrics.length > 0 ? (
            <Stack gap="xs">
              {projectMetrics.map((pm) => (
                <Paper key={pm.id} p="md" withBorder bg="blue.0">
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={500} size="sm" mb="xs">
                      {pm.metric.name}
                    </Text>
                    {pm.metric.description && (
                      <Text size="xs" c="dimmed" mb="xs">
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
                        {getCollectionMethodBadge(pm.metric.collectionMethod)}
                      </Badge>
                      {pm.metric.unitOfMetric && (
                        <Text size="xs" c="dimmed">
                          • {pm.metric.unitOfMetric}
                        </Text>
                      )}
                    </Group>
                  </Box>
                </Paper>
              ))}
            </Stack>
          ) : (
            <Center py="xl">
              <Stack gap="md" align="center">
                <IconChartLine size={48} opacity={0.3} />
                <Text c="dimmed" size="sm" ta="center">
                  No impact metrics have been added to this project yet.
                </Text>
                <Text c="dimmed" size="xs" ta="center">
                  Visit the &quot;Manage metrics&quot; tab to add metrics to
                  track your project&apos;s impact.
                </Text>
              </Stack>
            </Center>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
