"use client";

import {
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Box,
  ThemeIcon,
  Badge,
  Loader,
  Center,
  Accordion,
  Group,
  Anchor,
  SimpleGrid,
} from "@mantine/core";
import {
  IconChartBar,
  IconExternalLink,
  IconTarget,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";

export default function MetricsPage() {
  const { data: metricsData, isLoading } =
    api.project.getEventMetricsWithProjects.useQuery({
      eventId: "funding-commons-residency-2025",
    });

  return (
    <Box className="bg-theme-gradient" style={{ minHeight: "100vh" }}>
      <Container size="xl" py={60}>
        {/* Header Section */}
        <Stack gap="xl" mb={60}>
          <Box>
            <Text size="sm" tt="uppercase" fw={700} c="dimmed" mb="xs">
              Impact Report
            </Text>
            <Title
              order={1}
              size={40}
              fw={900}
              mb="md"
              style={{ lineHeight: 1.1 }}
            >
              Residency Metrics
            </Title>
            <Text size="lg" c="dimmed" maw={700}>
              All metrics tracked across projects in the Funding the Commons
              Residency 2025. Click on a metric to see which projects are
              tracking it.
            </Text>
          </Box>

          {/* Summary Stats */}
          {!isLoading && metricsData && (
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg" maw={500}>
              <Paper
                p="lg"
                radius="md"
                style={{
                  background:
                    "linear-gradient(135deg, var(--mantine-color-grape-0) 0%, var(--mantine-color-violet-0) 100%)",
                  border: "2px solid var(--mantine-color-grape-3)",
                }}
              >
                <Stack gap="xs" align="center">
                  <ThemeIcon
                    size={48}
                    radius="md"
                    variant="light"
                    color="grape"
                  >
                    <IconChartBar size={28} />
                  </ThemeIcon>
                  <Text size="2xl" fw={900} c="grape">
                    {metricsData.totalMetrics}
                  </Text>
                  <Text size="sm" fw={500}>
                    Unique Metrics
                  </Text>
                </Stack>
              </Paper>
              <Paper
                p="lg"
                radius="md"
                style={{
                  background:
                    "linear-gradient(135deg, var(--mantine-color-blue-0) 0%, var(--mantine-color-cyan-0) 100%)",
                  border: "2px solid var(--mantine-color-blue-3)",
                }}
              >
                <Stack gap="xs" align="center">
                  <ThemeIcon size={48} radius="md" variant="light" color="blue">
                    <IconTarget size={28} />
                  </ThemeIcon>
                  <Text size="2xl" fw={900} c="blue">
                    {metricsData.metrics.reduce(
                      (sum, m) => sum + m.projects.length,
                      0,
                    )}
                  </Text>
                  <Text size="sm" fw={500}>
                    Total Trackings
                  </Text>
                </Stack>
              </Paper>
            </SimpleGrid>
          )}
        </Stack>

        {/* Metrics List */}
        <Paper p="xl" radius="lg" withBorder>
          {isLoading ? (
            <Center py="xl">
              <Loader size="lg" />
            </Center>
          ) : !metricsData?.metrics.length ? (
            <Text size="sm" c="dimmed" ta="center" py="xl">
              No metrics tracked yet.
            </Text>
          ) : (
            <>
              <Text size="sm" c="dimmed" mb="xl">
                {metricsData.metrics.length} unique metrics tracked across
                residency projects
              </Text>
              <Accordion variant="separated" radius="md">
                {metricsData.metrics.map((metric) => (
                  <Accordion.Item key={metric.id} value={metric.id}>
                    <Accordion.Control>
                      <Group justify="space-between" wrap="wrap" pr="md">
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Text size="md" fw={600} lineClamp={1}>
                            {metric.name}
                          </Text>
                          {metric.description && (
                            <Text size="xs" c="dimmed" lineClamp={1}>
                              {metric.description}
                            </Text>
                          )}
                        </Box>
                        <Group gap="md" wrap="nowrap">
                          <Badge variant="light" color="grape">
                            {metric.projects.length}{" "}
                            {metric.projects.length === 1
                              ? "project"
                              : "projects"}
                          </Badge>
                          {metric.unitOfMetric && (
                            <Badge variant="outline" color="gray" size="sm">
                              {metric.unitOfMetric}
                            </Badge>
                          )}
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="md">
                        {/* Metric Details */}
                        <Group gap="xs" wrap="wrap">
                          {metric.metricType.map((type) => (
                            <Badge
                              key={type}
                              size="sm"
                              variant="light"
                              color="blue"
                            >
                              {type.toLowerCase().replace(/_/g, " ")}
                            </Badge>
                          ))}
                          <Badge size="sm" variant="light" color="teal">
                            {metric.collectionMethod
                              .toLowerCase()
                              .replace(/_/g, " ")}
                          </Badge>
                          {metric.category && (
                            <Badge size="sm" variant="outline" color="gray">
                              {metric.category}
                            </Badge>
                          )}
                        </Group>

                        {metric.description && (
                          <Text size="sm" c="dimmed">
                            {metric.description}
                          </Text>
                        )}

                        {/* Projects tracking this metric */}
                        <Box>
                          <Text size="sm" fw={500} mb="sm">
                            Projects tracking this metric:
                          </Text>
                          <Stack gap="xs">
                            {metric.projects.map((project) => (
                              <Paper
                                key={project.id}
                                p="sm"
                                withBorder
                                radius="sm"
                                bg="gray.0"
                              >
                                <Group justify="space-between" wrap="nowrap">
                                  <Text
                                    size="sm"
                                    fw={500}
                                    lineClamp={1}
                                    style={{ flex: 1 }}
                                  >
                                    {project.title}
                                  </Text>
                                  <Group gap="sm" wrap="nowrap">
                                    {project.targetValue !== null && (
                                      <Badge
                                        size="xs"
                                        variant="light"
                                        color="green"
                                      >
                                        Target: {project.targetValue}
                                        {metric.unitOfMetric
                                          ? ` ${metric.unitOfMetric}`
                                          : ""}
                                      </Badge>
                                    )}
                                    <Anchor
                                      component={Link}
                                      href={`/projects/${project.id}`}
                                      size="xs"
                                      c="dimmed"
                                    >
                                      <Group gap={4}>
                                        <IconExternalLink size={14} />
                                        <Text size="xs">View</Text>
                                      </Group>
                                    </Anchor>
                                  </Group>
                                </Group>
                              </Paper>
                            ))}
                          </Stack>
                        </Box>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            </>
          )}
        </Paper>

        {/* Back Link */}
        <Box mt="xl">
          <Anchor
            component={Link}
            href="/impact-reports/funding-commons-residency-2025"
            c="dimmed"
            size="sm"
          >
            &larr; Back to Impact Report
          </Anchor>
        </Box>
      </Container>
    </Box>
  );
}
