"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Box,
  ThemeIcon,
  Badge,
  Divider,
  Anchor,
  List,
  Progress,
  Button,
  Tooltip,
  Loader,
  Center,
  Accordion,
} from "@mantine/core";
import {
  IconUsers,
  IconBriefcase,
  IconSparkles,
  IconChartBar,
  IconCalendar,
  IconMapPin,
  IconTrendingUp,
  IconMessage,
  IconWorld,
  IconCode,
  IconDownload,
  IconFileTypePdf,
  IconGitBranch,
  IconClock,
  IconRocket,
  IconRefresh,
  IconBrandGithub,
  IconExternalLink,
  IconChartLine,
  IconGitCommit,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { CommitsTimelineChart } from "~/app/_components/CommitsTimelineChart";
import { Hyperboard } from "~/app/_components/Hyperboard";

// Configuration type for residency impact reports
export interface ResidencyReportConfig {
  // Core identifiers
  eventId: string;
  eventSlug: string; // URL path segment for links

  // Header content
  title: string;
  subtitle: string;
  location: string;
  dateRange: string;

  // Stats (can be overridden or fetched dynamically)
  residentCount: string;
  projectCount: string;

  // Program details
  description: string;
  programHighlights: string[];
  keyOutcomes: string[];
  programStructure: {
    phase: string;
    description: string;
    activities: string[];
  }[];

  // Participant profile
  participantProfile: {
    countries: string;
    topCountries: string;
    regionBreakdown: { label: string; percentage: string; color: string }[];
    roleBreakdown: { label: string; percentage: string; color: string }[];
    technicalFocus: { label: string; color: string }[];
  };

  // Engagement stats (optional - can be "TBD" if not available)
  engagementStats?: {
    metricsTrackingPercentage: string;
    projectsWithMetrics: string;
    totalDataPoints: string;
    avgMetricsPerProject: string;
    totalUpdates: string;
    totalLikes: string;
    asksOffers: string;
    updatesPerProject: string;
    totalCommunications: string;
  };
}

interface ResidencyImpactReportProps {
  config: ResidencyReportConfig;
}

export function ResidencyImpactReport({ config }: ResidencyImpactReportProps) {
  const handleDownloadPDF = () => {
    window.print();
  };

  // Fetch focus areas distribution
  const { data: focusAreasData, isLoading: loadingFocusAreas } =
    api.project.getFocusAreasDistribution.useQuery({
      eventId: config.eventId,
    });

  // Fetch GitHub activity stats
  const { data: activityStats, isLoading: loadingActivityStats } =
    api.project.getEventActivityStats.useQuery({
      eventId: config.eventId,
    });

  // Fetch all projects with commit counts and metrics
  const { data: projectsWithMetrics, isLoading: loadingProjects } =
    api.project.getEventProjectsWithMetrics.useQuery({
      eventId: config.eventId,
    });

  // Fetch combined hyperboard (sponsors + residents)
  const { data: combinedHyperboard } =
    api.application.getCombinedHyperboard.useQuery({
      eventId: config.eventId,
    });

  // Stats from config
  const stats = [
    {
      value: config.residentCount,
      label: "Residents",
      subtitle: "Accepted to residency",
      icon: IconUsers,
      color: "violet",
    },
    {
      value: config.projectCount,
      label: "Projects",
      subtitle: "Active projects",
      icon: IconBriefcase,
      color: "blue",
    },
  ];

  const additionalStats = [
    {
      value: config.engagementStats?.projectsWithMetrics ?? "TBD",
      label: "Projects with Metrics",
      subtitle: "Tracking impact",
      icon: IconChartBar,
      color: "cyan",
    },
    {
      value: config.engagementStats?.totalDataPoints ?? "TBD",
      label: "Total Metrics",
      subtitle: "Data points tracked",
      icon: IconTrendingUp,
      color: "grape",
    },
    {
      value: loadingActivityStats
        ? "—"
        : `${activityStats?.percentageActive ?? "—"}%`,
      label: "Projects Still Active",
      subtitle: "% with recent GitHub activity",
      icon: IconGitBranch,
      color: "green",
    },
    {
      value: loadingActivityStats
        ? "—"
        : (activityStats?.avgWeeksActive ?? "—"),
      label: "Avg. Weeks Active",
      subtitle: "GitHub activity duration",
      icon: IconClock,
      color: "blue",
    },
    {
      value: "TBD",
      label: "New Projects",
      subtitle: "Initiated during residency",
      icon: IconRocket,
      color: "violet",
    },
    {
      value: "TBD",
      label: "Existing Projects",
      subtitle: "Continued from before",
      icon: IconRefresh,
      color: "indigo",
    },
  ];

  // Project categories from API data
  const projectCategories =
    focusAreasData?.distribution.map((d) => ({
      category: d.area,
      count: d.count,
    })) ?? [];

  return (
    <Box className="bg-theme-gradient" style={{ minHeight: "100vh" }}>
      <Container size="xl" py={60}>
        {/* Header Section */}
        <Stack gap="xl" mb={60}>
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="sm" tt="uppercase" fw={700} c="dimmed" mb="xs">
                Impact Report
              </Text>
              <Title
                order={1}
                size={56}
                fw={900}
                mb="md"
                style={{ lineHeight: 1.1 }}
              >
                {config.title}
              </Title>
              <Group gap="md" align="center" mb="md">
                <Title order={2} size={32} fw={600} c="dimmed">
                  {config.subtitle}
                </Title>
                <Badge
                  size="lg"
                  variant="light"
                  color="blue"
                  leftSection={<IconMapPin size={14} />}
                >
                  {config.location}
                </Badge>
                <Badge
                  size="lg"
                  variant="light"
                  color="violet"
                  leftSection={<IconCalendar size={14} />}
                >
                  {config.dateRange}
                </Badge>
              </Group>
            </Box>

            {/* PDF Download Button */}
            <Box className="no-print">
              <Tooltip label="Download as PDF" position="left">
                <Button
                  leftSection={<IconFileTypePdf size={20} />}
                  rightSection={<IconDownload size={16} />}
                  variant="filled"
                  color="blue"
                  size="lg"
                  onClick={handleDownloadPDF}
                  style={{
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  Download PDF
                </Button>
              </Tooltip>
            </Box>
          </Group>

          {/* Key Stats Grid */}
          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 4 }}
            spacing="lg"
            className="stats-grid"
          >
            {stats.map((stat, index) => (
              <Paper
                key={index}
                p="xl"
                radius="lg"
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-${stat.color}-0) 0%, var(--mantine-color-${stat.color}-1) 100%)`,
                  border: `2px solid var(--mantine-color-${stat.color}-2)`,
                  transition: "all 0.3s ease",
                }}
                className="hover-lift"
              >
                <Stack gap="md">
                  <Group justify="space-between">
                    <ThemeIcon
                      size={48}
                      radius="md"
                      variant="light"
                      color={stat.color}
                    >
                      <stat.icon size={28} />
                    </ThemeIcon>
                  </Group>
                  <Box>
                    <Text size="3xl" fw={900} lh={1} c={stat.color}>
                      {stat.value}
                    </Text>
                    <Text size="sm" fw={600} mt={8}>
                      {stat.label}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {stat.subtitle}
                    </Text>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>

          {/* Description */}
          <Paper p="xl" radius="lg" withBorder>
            <Text size="lg" fw={500} style={{ lineHeight: 1.6 }}>
              {config.description}
            </Text>
          </Paper>
        </Stack>

        {/* Program Highlights */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Highlights
          </Title>

          <SimpleGrid
            cols={{ base: 1, md: 2 }}
            spacing="xl"
            className="highlights-grid"
          >
            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="blue">
                  <IconSparkles size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Key Features
                </Title>
              </Group>
              <List spacing="md" size="sm">
                {config.programHighlights.map((highlight, index) => (
                  <List.Item key={index}>{highlight}</List.Item>
                ))}
              </List>
            </Paper>

            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="teal">
                  <IconChartBar size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Key Outcomes
                </Title>
              </Group>
              <List spacing="md" size="sm">
                {config.keyOutcomes.map((outcome, index) => (
                  <List.Item key={index}>{outcome}</List.Item>
                ))}
              </List>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Focus Areas */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Focus Areas
          </Title>

          <Paper p="xl" radius="lg" withBorder>
            {loadingFocusAreas ? (
              <Center py="xl">
                <Loader size="lg" />
              </Center>
            ) : projectCategories.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                No focus areas data available yet. Run the categorization script
                to populate this section.
              </Text>
            ) : (
              <>
                <Text size="sm" c="dimmed" mb="xl">
                  Distribution of {focusAreasData?.projectsWithFocusAreas ?? 0}{" "}
                  projects across {projectCategories.length} focus areas
                </Text>
                <Stack gap="lg">
                  {projectCategories.map((cat, index) => (
                    <Box key={index}>
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={500}>
                          {cat.category}
                        </Text>
                        <Badge variant="light" color="blue">
                          {cat.count} {cat.count === 1 ? "project" : "projects"}
                        </Badge>
                      </Group>
                      <Progress
                        value={
                          (cat.count / (focusAreasData?.totalProjects ?? 1)) *
                          100
                        }
                        size="lg"
                        radius="md"
                        striped
                        animated
                        color="blue"
                        styles={{
                          root: {
                            backgroundColor: "var(--mantine-color-gray-2)",
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </>
            )}
          </Paper>
        </Stack>

        {/* Additional Stats */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Metrics
          </Title>

          <SimpleGrid
            cols={{ base: 1, sm: 2, lg: 3 }}
            spacing="lg"
            className="stats-grid"
          >
            {additionalStats.map((stat, index) => (
              <Paper
                key={index}
                p="lg"
                radius="md"
                withBorder
                style={{
                  transition: "all 0.3s ease",
                }}
                className="hover-lift"
              >
                <Stack gap="md" align="center">
                  <ThemeIcon
                    size={56}
                    radius="md"
                    variant="light"
                    color={stat.color}
                  >
                    <stat.icon size={32} />
                  </ThemeIcon>
                  <Box style={{ textAlign: "center" }}>
                    <Text size="2xl" fw={900} c={stat.color}>
                      {stat.value}
                    </Text>
                    <Text size="sm" fw={600} mt={4}>
                      {stat.label}
                    </Text>
                    <Text size="xs" c="dimmed" mt={4}>
                      {stat.subtitle}
                    </Text>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>

        {/* Program Structure */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Program Structure
          </Title>

          <SimpleGrid
            cols={{ base: 1, md: 3 }}
            spacing="lg"
            className="program-grid"
          >
            {config.programStructure.map((phase, index) => (
              <Paper
                key={index}
                p="xl"
                radius="lg"
                style={{
                  background: `linear-gradient(135deg, var(--mantine-color-blue-${6 + index}) 0%, var(--mantine-color-violet-${6 + index}) 100%)`,
                  border: "2px solid var(--mantine-color-blue-5)",
                }}
              >
                <Stack gap="md">
                  <Badge size="lg" variant="filled" color="cyan">
                    {phase.phase}
                  </Badge>
                  <Text size="md" fw={600} c="white">
                    {phase.description}
                  </Text>
                  <Divider color="rgba(255,255,255,0.3)" />
                  <List spacing="xs" size="sm" c="white">
                    {phase.activities.map((activity, actIndex) => (
                      <List.Item key={actIndex}>{activity}</List.Item>
                    ))}
                  </List>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Stack>

        {/* Impact Metrics Detail */}
        {config.engagementStats && (
          <Stack gap="xl" mb={60}>
            <Title order={2} size={32} fw={700}>
              Impact & Engagement
            </Title>

            <SimpleGrid
              cols={{ base: 1, md: 2 }}
              spacing="xl"
              className="highlights-grid"
            >
              <Paper
                p="xl"
                radius="lg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--mantine-color-grape-0) 0%, var(--mantine-color-violet-0) 100%)",
                  border: "2px solid var(--mantine-color-grape-3)",
                }}
              >
                <Stack gap="md">
                  <Group>
                    <ThemeIcon
                      size={48}
                      radius="md"
                      variant="light"
                      color="grape"
                    >
                      <IconChartBar size={28} />
                    </ThemeIcon>
                    <Title order={3} size={20} fw={600}>
                      Metrics Tracking
                    </Title>
                  </Group>
                  <Text size="lg" fw={700} c="grape">
                    {config.engagementStats.metricsTrackingPercentage} of
                    projects tracking metrics
                  </Text>
                  <Text size="sm" c="dimmed">
                    {config.engagementStats.projectsWithMetrics} projects
                    implemented measurable impact metrics to track their
                    progress and outcomes. Teams defined KPIs ranging from user
                    adoption to transaction volume to community growth.
                  </Text>
                  <Divider />
                  <Group gap="xl">
                    <Box>
                      <Text size="xl" fw={900} c="grape">
                        {config.engagementStats.totalDataPoints}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Total data points
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xl" fw={900} c="grape">
                        {config.engagementStats.avgMetricsPerProject}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Avg metrics per project
                      </Text>
                    </Box>
                  </Group>
                </Stack>
              </Paper>

              <Paper
                p="xl"
                radius="lg"
                style={{
                  background:
                    "linear-gradient(135deg, var(--mantine-color-pink-0) 0%, var(--mantine-color-orange-0) 100%)",
                  border: "2px solid var(--mantine-color-pink-3)",
                }}
              >
                <Stack gap="md">
                  <Group>
                    <ThemeIcon
                      size={48}
                      radius="md"
                      variant="light"
                      color="pink"
                    >
                      <IconMessage size={28} />
                    </ThemeIcon>
                    <Title order={3} size={20} fw={600}>
                      Community Activity
                    </Title>
                  </Group>
                  <Text size="lg" fw={700} c="pink">
                    Active collaboration & sharing
                  </Text>
                  <Text size="sm" c="dimmed">
                    Residents actively shared progress through{" "}
                    {config.engagementStats.totalUpdates} project updates,
                    received community feedback via{" "}
                    {config.engagementStats.totalLikes} likes, and facilitated
                    collaboration through {config.engagementStats.asksOffers}{" "}
                    asks & offers posted on the platform.
                  </Text>
                  <Divider />
                  <Group gap="xl">
                    <Box>
                      <Text size="xl" fw={900} c="pink">
                        {config.engagementStats.updatesPerProject}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Updates per project
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xl" fw={900} c="pink">
                        {config.engagementStats.totalCommunications}
                      </Text>
                      <Text size="xs" c="dimmed">
                        Program communications
                      </Text>
                    </Box>
                  </Group>
                </Stack>
              </Paper>
            </SimpleGrid>
          </Stack>
        )}

        {/* Geographic & Demographic Data */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Participant Profile
          </Title>

          <SimpleGrid
            cols={{ base: 1, md: 3 }}
            spacing="xl"
            className="program-grid"
          >
            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="blue">
                  <IconWorld size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Geographic Reach
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Residents from diverse regions globally
              </Text>
              <Badge size="xl" variant="light" color="blue" mb="sm">
                {config.participantProfile.countries} Countries
              </Badge>
              <Stack gap="xs">
                <Group gap="xs">
                  {config.participantProfile.regionBreakdown.map(
                    (region, idx) => (
                      <Badge key={idx} variant="light" color={region.color}>
                        {region.percentage} {region.label}
                      </Badge>
                    ),
                  )}
                </Group>
              </Stack>
              <Text size="xs" c="dimmed" mt="md">
                {config.participantProfile.topCountries}
              </Text>
            </Paper>

            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="violet">
                  <IconUsers size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Participant Roles
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Mix of builders, researchers, and academics
              </Text>
              <Stack gap="xs">
                {config.participantProfile.roleBreakdown.map((role, idx) => (
                  <Badge key={idx} variant="light" color={role.color}>
                    {role.label}: {role.percentage}
                  </Badge>
                ))}
              </Stack>
              <Text size="xs" c="dimmed" mt="md">
                Based on application background analysis
              </Text>
            </Paper>

            <Paper p="xl" radius="lg" withBorder>
              <Group mb="lg">
                <ThemeIcon size={48} radius="md" variant="light" color="teal">
                  <IconCode size={28} />
                </ThemeIcon>
                <Title order={3} size={20} fw={600}>
                  Technical Focus
                </Title>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Primary technical domains
              </Text>
              <Stack gap="xs">
                {config.participantProfile.technicalFocus.map((focus, idx) => (
                  <Badge key={idx} variant="light" color={focus.color}>
                    {focus.label}
                  </Badge>
                ))}
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>

        {/* Residency Projects */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Residency Projects
          </Title>

          <Paper p="xl" radius="lg" withBorder>
            {loadingProjects ? (
              <Center py="xl">
                <Loader size="md" />
              </Center>
            ) : (
              <>
                <Text size="sm" c="dimmed" mb="xl">
                  {projectsWithMetrics?.length ?? 0} projects from the residency
                  — click to view metrics
                </Text>
                <Accordion variant="separated" radius="md">
                  {projectsWithMetrics?.map((project) => (
                    <Accordion.Item key={project.id} value={project.id}>
                      <Accordion.Control>
                        <Group justify="space-between" wrap="wrap" pr="md">
                          <Text size="md" fw={600}>
                            {project.title}
                          </Text>
                          <Group gap="md">
                            <Badge variant="light" color="blue">
                              {project.totalCommits}{" "}
                              {project.totalCommits === 1
                                ? "commit"
                                : "commits"}
                            </Badge>
                            {project.metrics.length > 0 && (
                              <Badge
                                variant="light"
                                color="grape"
                                leftSection={<IconChartLine size={12} />}
                              >
                                {project.metrics.length}{" "}
                                {project.metrics.length === 1
                                  ? "metric"
                                  : "metrics"}
                              </Badge>
                            )}
                          </Group>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="md">
                          {/* Links Row */}
                          <Group gap="md">
                            {project.primaryRepoUrl && (
                              <Anchor
                                href={project.primaryRepoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                size="sm"
                                c="dimmed"
                              >
                                <Group gap="xs">
                                  <IconBrandGithub size={16} />
                                  <Text size="sm">GitHub</Text>
                                </Group>
                              </Anchor>
                            )}
                            <Anchor
                              component={Link}
                              href={`/projects/${project.id}`}
                              size="sm"
                              c="dimmed"
                            >
                              <Group gap="xs">
                                <IconExternalLink size={16} />
                                <Text size="sm">View Project</Text>
                              </Group>
                            </Anchor>
                          </Group>

                          {/* Standard Metrics - GitHub Commits */}
                          {project.primaryRepoId && (
                            <>
                              <Divider />
                              <Box>
                                <Group gap="xs" mb="sm">
                                  <IconGitCommit size={18} />
                                  <Text size="sm" fw={500}>
                                    Standard Metrics
                                  </Text>
                                  <Badge
                                    size="xs"
                                    variant="light"
                                    color="green"
                                  >
                                    automated
                                  </Badge>
                                </Group>
                                <Accordion variant="contained" radius="sm">
                                  <Accordion.Item value="commits">
                                    <Accordion.Control>
                                      <Group gap="xs">
                                        <IconGitCommit size={16} />
                                        <Text size="sm" fw={500}>
                                          GitHub Commits
                                        </Text>
                                      </Group>
                                    </Accordion.Control>
                                    <Accordion.Panel>
                                      <CommitsTimelineChart
                                        repositoryId={project.primaryRepoId}
                                        eventId={config.eventId}
                                      />
                                    </Accordion.Panel>
                                  </Accordion.Item>
                                </Accordion>
                              </Box>
                            </>
                          )}

                          {/* Custom Tracked Metrics */}
                          {project.metrics.length > 0 && (
                            <>
                              <Divider />
                              <Text size="sm" fw={500} c="dimmed">
                                Custom Tracked Metrics
                              </Text>
                              <Stack gap="xs">
                                {project.metrics.map(
                                  (metric: {
                                    id: string;
                                    name: string;
                                    description: string | null;
                                    metricType: string[];
                                    unitOfMetric: string | null;
                                    targetValue: number | null;
                                  }) => (
                                    <Paper
                                      key={metric.id}
                                      p="sm"
                                      withBorder
                                      radius="sm"
                                      bg="gray.0"
                                    >
                                      <Group
                                        justify="space-between"
                                        wrap="nowrap"
                                      >
                                        <Box style={{ flex: 1, minWidth: 0 }}>
                                          <Text
                                            size="sm"
                                            fw={500}
                                            lineClamp={1}
                                          >
                                            {metric.name}
                                          </Text>
                                          {metric.description && (
                                            <Text
                                              size="xs"
                                              c="dimmed"
                                              lineClamp={2}
                                            >
                                              {metric.description}
                                            </Text>
                                          )}
                                        </Box>
                                        <Group gap="xs" wrap="nowrap">
                                          {metric.metricType
                                            .slice(0, 2)
                                            .map((type: string) => (
                                              <Badge
                                                key={type}
                                                size="xs"
                                                variant="light"
                                              >
                                                {type.toLowerCase()}
                                              </Badge>
                                            ))}
                                          {metric.unitOfMetric && (
                                            <Text size="xs" c="dimmed">
                                              {metric.unitOfMetric}
                                            </Text>
                                          )}
                                        </Group>
                                      </Group>
                                    </Paper>
                                  ),
                                )}
                              </Stack>
                            </>
                          )}

                          {/* Show message if no metrics at all */}
                          {!project.primaryRepoId &&
                            project.metrics.length === 0 && (
                              <>
                                <Divider />
                                <Text size="sm" c="dimmed" fs="italic">
                                  No metrics tracked for this project yet.
                                </Text>
                              </>
                            )}
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </>
            )}
          </Paper>
        </Stack>

        {/* Sponsors & Residents Hyperboard */}
        <Stack gap="xl" mb={60}>
          <Title order={2} size={32} fw={700}>
            Sponsors & Residents
          </Title>

          <Paper p="xl" radius="lg" withBorder>
            <Text size="sm" c="dimmed" mb="xl">
              Our community of sponsors and residents — tile size reflects
              contribution level
            </Text>
            {combinedHyperboard && combinedHyperboard.length > 0 ? (
              <Hyperboard
                data={combinedHyperboard}
                height={600}
                label="Sponsors & Residents"
                onClickLabel={() => {
                  // Navigate to hyperboard page
                }}
                grayscaleImages={true}
                borderColor="#000000"
                borderWidth={1}
                logoSize="50%"
              />
            ) : (
              <Center py="xl">
                <Loader size="md" />
              </Center>
            )}
          </Paper>
        </Stack>

        {/* Call to Action */}
        <Paper
          p={60}
          radius="lg"
          mb={60}
          style={{
            background:
              "linear-gradient(135deg, var(--mantine-color-indigo-6) 0%, var(--mantine-color-violet-6) 100%)",
          }}
        >
          <Stack gap="lg">
            <Title order={2} size={36} fw={700} c="white">
              Explore the Impact
            </Title>
            <Text size="lg" c="white" style={{ lineHeight: 1.6 }}>
              Dive deeper into the projects, metrics, and community activities
              from the {config.title} {config.subtitle}. Visit the interactive
              impact dashboard to see real-time updates, browse resident
              profiles, and explore the hyperboards showcasing our community.
            </Text>
            <Group gap="xl" mt="md">
              <Anchor
                component={Link}
                href={`/events/${config.eventSlug}/impact`}
                c="white"
                fw={600}
                size="lg"
                style={{ textDecoration: "underline" }}
              >
                View Interactive Dashboard →
              </Anchor>
              <Anchor
                component={Link}
                href={`/events/${config.eventSlug}/projects`}
                c="white"
                fw={600}
                size="lg"
                style={{ textDecoration: "underline" }}
              >
                Browse Projects →
              </Anchor>
            </Group>
          </Stack>
        </Paper>

        {/* Footer Note */}
        <Paper p="lg" radius="md" withBorder>
          <Text size="sm" c="dimmed" ta="center">
            <strong>Note:</strong> This impact report reflects data collected
            during and immediately after the residency program. Some metrics
            marked with &ldquo;TBD&rdquo; are still being compiled and will be
            updated as comprehensive analysis continues. For the most current
            statistics, please visit the{" "}
            <Anchor
              component={Link}
              href={`/events/${config.eventSlug}/impact`}
            >
              live impact dashboard
            </Anchor>
            .
          </Text>
        </Paper>

        {/* Custom Styles */}
        <style jsx>{`
          :global(.hover-lift) {
            transition: transform 0.3s ease, box-shadow 0.3s ease;
          }
          :global(.hover-lift:hover) {
            transform: translateY(-4px);
            box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          }

          /* Print Styles for PDF Export */
          @media print {
            :global(.no-print) {
              display: none !important;
            }
            :global(body) {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
            :global(.hover-lift) {
              box-shadow: none !important;
              transform: none !important;
            }

            /* Force grid layouts to maintain structure in print */
            :global(.stats-grid) {
              display: grid !important;
              grid-template-columns: repeat(4, 1fr) !important;
              gap: 1rem !important;
            }

            :global(.program-grid) {
              display: grid !important;
              grid-template-columns: repeat(3, 1fr) !important;
              gap: 1rem !important;
            }

            :global(.highlights-grid) {
              display: grid !important;
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 1.5rem !important;
            }

            /* Prevent page breaks inside cards */
            :global(.hover-lift),
            :global([class*="Paper"]) {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Optimize page layout */
            :global(h1),
            :global(h2),
            :global(h3) {
              page-break-after: avoid;
              break-after: avoid;
            }
          }
        `}</style>
      </Container>
    </Box>
  );
}
