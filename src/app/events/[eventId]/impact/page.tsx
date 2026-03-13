"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Container,
  Title,
  Text,
  Group,
  Paper,
  Loader,
  Center,
  Tabs,
  Timeline,
  Badge,
  Divider,
  Card,
  Table,
  Box,
  ThemeIcon,
  SimpleGrid,
  Stack,
  RingProgress,
  Anchor,
} from "@mantine/core";
import {
  IconChartBar,
  IconActivity,
  IconUsers,
  IconSparkles,
  IconMessage,
  IconThumbUp,
  IconQuestionMark,
  IconBriefcase,
  IconArrowUp,
  IconArrowDown,
  IconLayoutGrid,
  IconWorld,
  IconExternalLink,
  IconAlertTriangle,
  IconCoin,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { api } from "~/trpc/react";
import { Hyperboard } from "~/app/_components/Hyperboard";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";
import Link from "next/link";
import { getKudosTier, KUDOS_CONSTANTS } from "~/utils/kudosCalculation";
import { normalizeEventType } from "~/types/event";

type SortField =
  | "projects"
  | "projectsWithMetrics"
  | "updates"
  | "praiseSent"
  | "praiseReceived"
  | "kudos";
type SortDirection = "asc" | "desc";

interface ImpactPageProps {
  params: Promise<{ eventId: string }>;
}

export default function ImpactPage({ params }: ImpactPageProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const searchParams = useSearchParams();
  const [eventId, setEventId] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("kudos");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Get event details
  const { data: event, isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  const isConference = normalizeEventType(event?.type) === "CONFERENCE";

  // Set default tab once event loads
  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab) {
      setActiveTab(urlTab);
    } else if (event && !activeTab) {
      setActiveTab(isConference ? "hypersphere" : "stats");
    }
  }, [searchParams, event, activeTab, isConference]);

  // Update URL when tab changes
  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      router.push(`?tab=${value}`, { scroll: false });
    }
  };

  // Get resident projects (residency only)
  const { data: residentProjects } =
    api.application.getResidentProjects.useQuery(
      { eventId },
      { enabled: !!eventId && !isConference },
    );

  // Get accepted residents (residency only)
  const { data: residentsData } = api.application.getAcceptedResidents.useQuery(
    { eventId },
    { enabled: !!eventId && !isConference },
  );

  // Get sponsors for hyperboard (residency only)
  const { data: sponsors } = api.sponsor.getSponsorsForHyperboard.useQuery(
    { eventId },
    { enabled: !!eventId && !isConference },
  );

  // Get residents for kudosboard / hyperboard
  const { data: residentsKudosboard } =
    api.application.getResidentsForKudosboard.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  // Get projects for hyperboard (residency only)
  const { data: projectsHyperboard } =
    api.application.getProjectsForHyperboard.useQuery(
      { eventId },
      { enabled: !!eventId && !isConference },
    );

  // Get combined hyperboard (residency only)
  const { data: combinedHyperboard } =
    api.application.getCombinedHyperboard.useQuery(
      { eventId },
      { enabled: !!eventId && !isConference },
    );

  // Get activity timeline (residency only)
  const { data: activityTimeline, isLoading: activityLoading } =
    api.kudos.getActivityTimeline.useQuery(
      { limit: 50 },
      { enabled: !isConference },
    );

  // Get praise transactions for residency leaderboard (residency only)
  const { data: transactions } = api.praise.getAllTransactions.useQuery(
    { limit: 100 },
    { enabled: !isConference },
  );

  // Get Hypersphere data (AT Protocol records + network stats)
  const { data: hypersphereData, isLoading: hypersphereLoading } =
    api.hypercerts.getEventHypersphereData.useQuery(
      { eventId },
      { enabled: !!eventId, staleTime: 5 * 60 * 1000 },
    );

  // Get all project updates count
  const totalUpdates = useMemo(() => {
    if (!residentProjects) return 0;
    return residentProjects.reduce((sum: number, project) => {
      return sum + (project.updates?.length ?? 0);
    }, 0);
  }, [residentProjects]);

  // Get total likes across all projects (count likes on all updates)
  const totalLikes = useMemo(() => {
    if (!residentProjects) return 0;
    return residentProjects.reduce((sum: number, project) => {
      const projectLikes =
        project.updates?.reduce((updateSum: number, update) => {
          return updateSum + (update.likes?.length ?? 0);
        }, 0) ?? 0;
      return sum + projectLikes;
    }, 0);
  }, [residentProjects]);

  // Get total praise count
  const totalPraise = useMemo(() => {
    return transactions?.length ?? 0;
  }, [transactions]);

  // Build resident statistics for leaderboard
  const residentStats = useMemo(() => {
    if (!residentsData?.residents) return [];

    return residentsData.residents
      .map((resident) => {
        const userId = resident.user?.id;
        if (!userId) return null;

        const userProjects =
          residentProjects?.filter((p) => p.profile?.user?.id === userId) ?? [];

        const totalProjects = userProjects.length;

        const projectsWithMetrics = userProjects.filter(
          (p) => p.metrics && p.metrics.length > 0,
        ).length;

        const updateCount = userProjects.reduce(
          (sum: number, p) => sum + (p.updates?.length ?? 0),
          0,
        );

        const praiseSentCount =
          transactions?.filter((t) => t.senderId === userId).length ?? 0;

        const praiseReceivedCount =
          transactions?.filter((t) => t.recipientId === userId).length ?? 0;

        const actualKudos = resident.user?.kudos ?? KUDOS_CONSTANTS.BASE_KUDOS;

        return {
          userId,
          name: resident.user?.name,
          image: resident.user?.image,
          customAvatarUrl: resident.user?.profile?.avatarUrl,
          firstName: resident.user?.firstName,
          surname: resident.user?.surname,
          projects: totalProjects,
          projectsWithMetrics,
          updates: updateCount,
          praiseSent: praiseSentCount,
          praiseReceived: praiseReceivedCount,
          kudos: actualKudos,
        };
      })
      .filter(Boolean);
  }, [residentsData, residentProjects, transactions]);

  // Sort resident stats
  const sortedResidentStats = useMemo(() => {
    return [...residentStats].sort((a, b) => {
      const aVal = a![sortField];
      const bVal = b![sortField];
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
  }, [residentStats, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <IconArrowUp size={14} />
    ) : (
      <IconArrowDown size={14} />
    );
  };

  const isAdmin =
    session?.user?.role === "admin" || session?.user?.role === "staff";

  if (sessionStatus === "loading" || eventLoading || !eventId || !activeTab) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Text c="dimmed">You do not have permission to view this page.</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        {isConference ? "Impact" : "Residency Impact"}
      </Title>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="hypersphere" leftSection={<IconWorld size={16} />}>
            Hypersphere
          </Tabs.Tab>
          {!isConference && (
            <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
              Statistics
            </Tabs.Tab>
          )}
          {!isConference && (
            <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>
              Activity Timeline
            </Tabs.Tab>
          )}
          {!isConference && (
            <Tabs.Tab value="leaderboard" leftSection={<IconUsers size={16} />}>
              Residency Leaderboard
            </Tabs.Tab>
          )}
          {!isConference && (
            <Tabs.Tab
              value="sponsor-hyperboard"
              leftSection={<IconSparkles size={16} />}
            >
              Sponsor Hyperboard
            </Tabs.Tab>
          )}
          <Tabs.Tab value="kudosboard" leftSection={<IconSparkles size={16} />}>
            {isConference ? "Hyperboard" : "Residents Hyperboard"}
          </Tabs.Tab>
          {!isConference && (
            <Tabs.Tab
              value="projects-hyperboard"
              leftSection={<IconBriefcase size={16} />}
            >
              Projects Hyperboard
            </Tabs.Tab>
          )}
          {!isConference && (
            <Tabs.Tab
              value="combined-hyperboard"
              leftSection={<IconLayoutGrid size={16} />}
            >
              Combined Hyperboard
            </Tabs.Tab>
          )}
        </Tabs.List>

        {!isConference && (
        <Tabs.Panel value="stats" pt="xl">
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3, xl: 5 }} spacing="lg">
            {/* Residents Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(103, 58, 183, 0.1) 0%, rgba(103, 58, 183, 0.05) 100%)",
                border: "1px solid rgba(103, 58, 183, 0.2)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              className="stat-card"
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon
                    size={56}
                    radius="md"
                    variant="light"
                    color="violet"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(103, 58, 183, 0.2) 0%, rgba(103, 58, 183, 0.1) 100%)",
                    }}
                  >
                    <IconUsers size={32} />
                  </ThemeIcon>
                  <Badge variant="light" color="violet" size="sm">
                    Active
                  </Badge>
                </Group>
                <Box>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                    Residents
                  </Text>
                  <Text
                    size="3rem"
                    fw={900}
                    lh={1}
                    style={{ color: "rgba(103, 58, 183, 1)" }}
                  >
                    {residentsData?.visibleResidents ?? 0}
                  </Text>
                </Box>
              </Stack>
            </Paper>

            {/* Projects Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)",
                border: "1px solid rgba(37, 99, 235, 0.2)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              className="stat-card"
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon
                    size={56}
                    radius="md"
                    variant="light"
                    color="blue"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(37, 99, 235, 0.2) 0%, rgba(37, 99, 235, 0.1) 100%)",
                    }}
                  >
                    <IconBriefcase size={32} />
                  </ThemeIcon>
                  <RingProgress
                    size={50}
                    thickness={4}
                    sections={[{ value: 100, color: "blue" }]}
                    label={
                      <Center>
                        <Text size="xs" fw={700} c="blue">
                          100%
                        </Text>
                      </Center>
                    }
                  />
                </Group>
                <Box>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                    Projects
                  </Text>
                  <Text
                    size="3rem"
                    fw={900}
                    lh={1}
                    style={{ color: "rgba(37, 99, 235, 1)" }}
                  >
                    {residentProjects?.length ?? 0}
                  </Text>
                </Box>
              </Stack>
            </Paper>

            {/* Project Updates Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              className="stat-card"
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon
                    size={56}
                    radius="md"
                    variant="light"
                    color="teal"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)",
                    }}
                  >
                    <IconActivity size={32} />
                  </ThemeIcon>
                  <Badge variant="light" color="teal" size="sm">
                    Live
                  </Badge>
                </Group>
                <Box>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                    Project Updates
                  </Text>
                  <Text
                    size="3rem"
                    fw={900}
                    lh={1}
                    style={{ color: "rgba(16, 185, 129, 1)" }}
                  >
                    {totalUpdates}
                  </Text>
                </Box>
              </Stack>
            </Paper>

            {/* Total Likes Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(236, 72, 153, 0.05) 100%)",
                border: "1px solid rgba(236, 72, 153, 0.2)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              className="stat-card"
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon
                    size={56}
                    radius="md"
                    variant="light"
                    color="pink"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(236, 72, 153, 0.2) 0%, rgba(236, 72, 153, 0.1) 100%)",
                    }}
                  >
                    <IconThumbUp size={32} />
                  </ThemeIcon>
                  <Badge variant="light" color="pink" size="sm">
                    Total
                  </Badge>
                </Group>
                <Box>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                    Total Likes
                  </Text>
                  <Text
                    size="3rem"
                    fw={900}
                    lh={1}
                    style={{ color: "rgba(236, 72, 153, 1)" }}
                  >
                    {totalLikes}
                  </Text>
                </Box>
              </Stack>
            </Paper>

            {/* Total Praise Card */}
            <Paper
              p="xl"
              radius="md"
              style={{
                background:
                  "linear-gradient(135deg, rgba(249, 115, 22, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)",
                border: "1px solid rgba(249, 115, 22, 0.2)",
                transition: "all 0.3s ease",
                cursor: "pointer",
              }}
              className="stat-card"
            >
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <ThemeIcon
                    size={56}
                    radius="md"
                    variant="light"
                    color="orange"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%)",
                    }}
                  >
                    <IconMessage size={32} />
                  </ThemeIcon>
                  <Badge variant="light" color="orange" size="sm">
                    Sent
                  </Badge>
                </Group>
                <Box>
                  <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                    Total Praise
                  </Text>
                  <Text
                    size="3rem"
                    fw={900}
                    lh={1}
                    style={{ color: "rgba(249, 115, 22, 1)" }}
                  >
                    {totalPraise}
                  </Text>
                </Box>
              </Stack>
            </Paper>
          </SimpleGrid>

          <style jsx>{`
            :global(.stat-card:hover) {
              transform: translateY(-4px);
              box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
            }
          `}</style>
        </Tabs.Panel>
        )}

        {!isConference && (
        <Tabs.Panel value="activity" pt="xl">
          {activityLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Timeline
              active={activityTimeline?.length ?? 0}
              bulletSize={32}
              lineWidth={2}
            >
              {activityTimeline?.map((activity) => {
                const from = activity.from as {
                  id: string;
                  firstName: string | null;
                  surname: string | null;
                  name: string | null;
                  email?: string | null;
                  image: string | null;
                };
                const to = activity.to as {
                  id: string;
                  firstName: string | null;
                  surname: string | null;
                  name: string | null;
                  email?: string | null;
                  image: string | null;
                };

                const fromName =
                  from?.firstName && from?.surname
                    ? `${from.firstName} ${from.surname}`
                    : (from?.name ?? from?.email ?? "Unknown");

                const toName =
                  to?.firstName && to?.surname
                    ? `${to.firstName} ${to.surname}`
                    : (to?.name ?? to?.email ?? "Unknown");

                let icon = <IconSparkles size={16} />;
                let title = "";
                let description = "";
                let color = "blue";

                if (activity.type === "praise") {
                  icon = <IconMessage size={16} />;
                  title = `${fromName} praised ${toName}`;
                  description = (activity.content as { message: string })
                    .message;
                  color = "pink";
                } else if (activity.type === "like_update") {
                  icon = <IconThumbUp size={16} />;
                  title = `${fromName} liked ${toName}'s update`;
                  description =
                    (activity.content as { updateTitle?: string | null })
                      .updateTitle ?? "Project update";
                  color = "grape";
                } else if (activity.type === "like_askoffer") {
                  icon = <IconQuestionMark size={16} />;
                  title = `${fromName} liked ${toName}'s ${(activity.content as { askOfferType: string }).askOfferType}`;
                  description =
                    (activity.content as { askOfferTitle?: string | null })
                      .askOfferTitle ?? "";
                  color = "cyan";
                } else if (activity.type === "like_project") {
                  icon = <IconBriefcase size={16} />;
                  title = `${fromName} liked ${toName}'s project`;
                  description =
                    (activity.content as { projectTitle?: string | null })
                      .projectTitle ?? "Project";
                  color = "indigo";
                }

                return (
                  <Timeline.Item
                    key={activity.id}
                    bullet={icon}
                    title={
                      <Group justify="space-between">
                        <Text fw={600}>{title}</Text>
                        <Badge
                          size="sm"
                          variant="light"
                          color={color}
                          leftSection={<IconSparkles size={12} />}
                        >
                          +{activity.kudosTransferred.toFixed(1)} kudos
                        </Badge>
                      </Group>
                    }
                  >
                    <Text size="sm" c="dimmed" mt={4}>
                      {description}
                    </Text>
                    <Text size="xs" c="dimmed" mt={8}>
                      {formatDistanceToNow(activity.createdAt, {
                        addSuffix: true,
                      })}
                    </Text>
                    <Divider mt="md" />
                  </Timeline.Item>
                );
              })}
            </Timeline>
          )}
        </Tabs.Panel>
        )}

        {!isConference && (
        <Tabs.Panel value="leaderboard" pt="xl">
          {eventLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <Card withBorder>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Resident</Table.Th>
                    <Table.Th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("projects")}
                    >
                      <Group gap="xs">
                        Projects
                        <SortIcon field="projects" />
                      </Group>
                    </Table.Th>
                    <Table.Th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("projectsWithMetrics")}
                    >
                      <Group gap="xs">
                        Projects with Metrics
                        <SortIcon field="projectsWithMetrics" />
                      </Group>
                    </Table.Th>
                    <Table.Th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("updates")}
                    >
                      <Group gap="xs">
                        Updates
                        <SortIcon field="updates" />
                      </Group>
                    </Table.Th>
                    <Table.Th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("praiseSent")}
                    >
                      <Group gap="xs">
                        Praise Sent
                        <SortIcon field="praiseSent" />
                      </Group>
                    </Table.Th>
                    <Table.Th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("praiseReceived")}
                    >
                      <Group gap="xs">
                        Praise Received
                        <SortIcon field="praiseReceived" />
                      </Group>
                    </Table.Th>
                    <Table.Th
                      style={{ cursor: "pointer" }}
                      onClick={() => handleSort("kudos")}
                    >
                      <Group gap="xs">
                        Kudos
                        <SortIcon field="kudos" />
                      </Group>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedResidentStats.map((resident) => (
                    <Table.Tr key={resident!.userId}>
                      <Table.Td>
                        <Group gap="sm">
                          <UserAvatar
                            user={{
                              customAvatarUrl: resident!.customAvatarUrl,
                              oauthImageUrl: resident!.image,
                              name: resident!.name,
                              firstName: resident!.firstName,
                              surname: resident!.surname,
                            }}
                            radius="xl"
                            size="sm"
                          />
                          <Text
                            component={Link}
                            href={`/profiles/${resident!.userId}`}
                            size="sm"
                            fw={500}
                            style={{ textDecoration: "none", color: "inherit" }}
                          >
                            {getDisplayName(resident, "Unknown")}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{resident!.projects}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">
                          {resident!.projectsWithMetrics}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light">{resident!.updates}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="blue">
                          {resident!.praiseSent}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="green">
                          {resident!.praiseReceived}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={getKudosTier(resident!.kudos).color}
                          size="lg"
                        >
                          {Math.round(resident!.kudos)}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          )}
        </Tabs.Panel>
        )}

        {!isConference && (
        <Tabs.Panel value="sponsor-hyperboard" pt="xl">
          {sponsors && sponsors.length > 0 ? (
            <Hyperboard
              data={sponsors}
              height={800}
              label="Sponsors"
              onClickLabel={() => {
                console.log("Label clicked");
              }}
              grayscaleImages={true}
              borderColor="#000000"
              borderWidth={1}
              logoSize="50%"
            />
          ) : (
            <Text c="dimmed">No sponsors found for this event.</Text>
          )}
        </Tabs.Panel>
        )}

        <Tabs.Panel value="kudosboard" pt="xl">
          {residentsKudosboard && residentsKudosboard.length > 0 ? (
            <Hyperboard
              data={residentsKudosboard}
              height={800}
              label="Kudos Leaders"
              onClickLabel={() => {
                console.log("Label clicked");
              }}
              grayscaleImages={false}
              borderColor="white"
              imageObjectFit="cover"
            />
          ) : (
            <Text c="dimmed">No residents found for this event.</Text>
          )}
        </Tabs.Panel>

        {!isConference && (
        <>
        <Tabs.Panel value="projects-hyperboard" pt="xl">
          {projectsHyperboard && projectsHyperboard.length > 0 ? (
            <Hyperboard
              data={projectsHyperboard}
              height={800}
              label="Projects"
              onClickLabel={() => {
                console.log("Projects data:", projectsHyperboard);
              }}
              grayscaleImages={false}
              borderColor="white"
            />
          ) : (
            <Box>
              <Text c="dimmed">No projects found for this event.</Text>
              <Text size="xs" c="dimmed" mt="sm">
                Debug: projectsHyperboard = {JSON.stringify(projectsHyperboard)}
              </Text>
            </Box>
          )}
        </Tabs.Panel>

        <Tabs.Panel
          value="combined-hyperboard"
          pt="xl"
          style={{
            position: "relative",
            minHeight: "800px",
          }}
        >
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              backgroundImage: "url(/images/ba.jpg)",
              backgroundSize: "cover",
              backgroundPosition: "left center",
              backgroundRepeat: "no-repeat",
              opacity: 0.4,
              filter: "grayscale(100%)",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
          <Box style={{ position: "relative", zIndex: 1 }}>
            {combinedHyperboard && combinedHyperboard.length > 0 ? (
              <Hyperboard
                data={combinedHyperboard}
                height={800}
                label="Sponsors & Residents"
                onClickLabel={() => {
                  console.log("Combined hyperboard clicked");
                }}
                grayscaleImages={true}
                borderColor="#000000"
                borderWidth={1}
                logoSize="50%"
              />
            ) : (
              <Text c="dimmed">No data found for this event.</Text>
            )}
          </Box>
        </Tabs.Panel>
        </>
        )}

        {/* Hypersphere Tab */}
        <Tabs.Panel value="hypersphere" pt="xl">
          {hypersphereLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : !hypersphereData?.activityCert &&
            !hypersphereData?.deliberation &&
            !hypersphereData?.networkStats ? (
            <Paper p="xl" radius="md" withBorder>
              <Stack gap="md" align="center">
                <ThemeIcon size={48} variant="light" color="gray">
                  <IconWorld size={28} />
                </ThemeIcon>
                <Text c="dimmed" ta="center">
                  No Hypersphere data available for this event yet.
                </Text>
              </Stack>
            </Paper>
          ) : (
            <Stack gap="xl">
              {/* Network Stats */}
              {hypersphereData?.networkStats && (
                <Stack gap="md">
                  <Title order={3}>Hypersphere Network</Title>
                  <Paper p="lg" radius="md" withBorder>
                    <Text
                      size="sm"
                      style={{ whiteSpace: "pre-line" }}
                      c="dimmed"
                    >
                      {hypersphereData.networkStats}
                    </Text>
                  </Paper>
                </Stack>
              )}

              {/* Activity Cert */}
              {hypersphereData?.activityCert && (
                <Stack gap="md">
                  <Title order={3}>Activity Cert</Title>
                  <Paper p="lg" radius="md" withBorder>
                    <Stack gap="md">
                      <Group justify="space-between" align="flex-start">
                        <Stack gap={4}>
                          <Text fw={600} size="lg">
                            {hypersphereData.activityCert.value.title}
                          </Text>
                          {hypersphereData.activityCert.value.workScope && (
                            <Badge variant="light" color="blue" size="sm">
                              {hypersphereData.activityCert.value.workScope}
                            </Badge>
                          )}
                        </Stack>
                        <Anchor
                          href={atUriToWebUrl(hypersphereData.activityCert.uri)}
                          target="_blank"
                          size="sm"
                        >
                          <Group gap={4}>
                            View on AT Protocol
                            <IconExternalLink size={14} />
                          </Group>
                        </Anchor>
                      </Group>

                      {(hypersphereData.activityCert.value.startDate ??
                        hypersphereData.activityCert.value.endDate) && (
                        <Text size="sm" c="dimmed">
                          {hypersphereData.activityCert.value.startDate &&
                            new Date(
                              hypersphereData.activityCert.value.startDate,
                            ).toLocaleDateString()}
                          {hypersphereData.activityCert.value.endDate &&
                            ` — ${new Date(hypersphereData.activityCert.value.endDate).toLocaleDateString()}`}
                        </Text>
                      )}

                      {/* Contributors grouped by role */}
                      {hypersphereData.activityCert.value.contributors &&
                        hypersphereData.activityCert.value.contributors.length >
                          0 && (
                          <Stack gap="sm">
                            <Divider />
                            <Text fw={500} size="sm">
                              Contributors (
                              {
                                hypersphereData.activityCert.value.contributors
                                  .length
                              }
                              )
                            </Text>
                            {Object.entries(
                              hypersphereData.activityCert.value.contributors.reduce<
                                Record<string, string[]>
                              >((acc, c) => {
                                const role =
                                  c.contributionDetails?.role ?? "Contributor";
                                acc[role] ??= [];
                                const name =
                                  c.contributorIdentity.displayName ??
                                  "Anonymous";
                                acc[role].push(name);
                                return acc;
                              }, {}),
                            ).map(([role, names]) => (
                              <Stack key={role} gap={4}>
                                <Text size="xs" fw={500} c="dimmed">
                                  {role}s ({names.length})
                                </Text>
                                <Group gap={4}>
                                  {names.map((name, i) => (
                                    <Badge
                                      key={`${name}-${String(i)}`}
                                      variant="outline"
                                      color="gray"
                                      size="sm"
                                    >
                                      {name}
                                    </Badge>
                                  ))}
                                </Group>
                              </Stack>
                            ))}
                          </Stack>
                        )}
                    </Stack>
                  </Paper>
                </Stack>
              )}

              {/* Deliberation Results */}
              {hypersphereData?.deliberation && (
                <Stack gap="md">
                  <Title order={3}>Deliberation Intelligence</Title>

                  {/* Synthesis */}
                  {hypersphereData.deliberation.summary?.value.synthesis && (
                    <Paper p="lg" radius="md" withBorder>
                      <Stack gap="xs">
                        <Text fw={500}>Synthesis</Text>
                        <Text
                          size="sm"
                          c="dimmed"
                          style={{ whiteSpace: "pre-line" }}
                        >
                          {
                            hypersphereData.deliberation.summary.value
                              .synthesis
                          }
                        </Text>
                      </Stack>
                    </Paper>
                  )}

                  {/* Statistics */}
                  {hypersphereData.deliberation.summary?.value.statistics && (
                    <SimpleGrid cols={{ base: 2, sm: 4 }}>
                      {[
                        {
                          label: "Priorities",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.totalPriorities,
                          color: "blue",
                        },
                        {
                          label: "Votes",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.totalVotes,
                          color: "green",
                        },
                        {
                          label: "Topic Clusters",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.topicClusterCount,
                          color: "violet",
                        },
                        {
                          label: "Convergent",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.convergentCount,
                          color: "teal",
                        },
                        {
                          label: "Aspirational",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.aspirationalCount,
                          color: "indigo",
                        },
                        {
                          label: "Blind Spots",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.blindSpotCount,
                          color: "orange",
                        },
                        {
                          label: "Blockers",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.totalBlockers,
                          color: "red",
                        },
                        {
                          label: "Recommendations",
                          value:
                            hypersphereData.deliberation.summary.value
                              .statistics.totalResources,
                          color: "cyan",
                        },
                      ].map((stat) => (
                        <Paper key={stat.label} p="md" radius="md" withBorder>
                          <Stack gap={4} align="center">
                            <Text size="xl" fw={700} c={stat.color}>
                              {stat.value ?? 0}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {stat.label}
                            </Text>
                          </Stack>
                        </Paper>
                      ))}
                    </SimpleGrid>
                  )}

                  {/* Topic Clusters */}
                  {hypersphereData.deliberation.pca?.value.topicClusters &&
                    hypersphereData.deliberation.pca.value.topicClusters
                      .length > 0 && (
                      <Stack gap="sm">
                        <Text fw={500}>Topic Clusters</Text>
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                          {hypersphereData.deliberation.pca.value.topicClusters.map(
                            (cluster) => (
                              <Paper
                                key={cluster.label}
                                p="md"
                                radius="md"
                                withBorder
                              >
                                <Stack gap="xs">
                                  <Group justify="space-between">
                                    <Text fw={500} size="sm">
                                      {cluster.label}
                                    </Text>
                                    <Badge
                                      size="sm"
                                      variant="light"
                                      color="violet"
                                    >
                                      {cluster.mentionCount} mentions
                                    </Badge>
                                  </Group>
                                  <Group gap={4}>
                                    {cluster.keywords.map((kw) => (
                                      <Badge
                                        key={kw}
                                        size="xs"
                                        variant="outline"
                                        color="gray"
                                      >
                                        {kw}
                                      </Badge>
                                    ))}
                                  </Group>
                                </Stack>
                              </Paper>
                            ),
                          )}
                        </SimpleGrid>
                      </Stack>
                    )}

                  {/* Blocker Themes */}
                  {hypersphereData.deliberation.summary?.value.blockerThemes &&
                    hypersphereData.deliberation.summary.value.blockerThemes
                      .length > 0 && (
                      <Stack gap="sm">
                        <Group gap="xs">
                          <ThemeIcon
                            size="sm"
                            variant="light"
                            color="orange"
                          >
                            <IconAlertTriangle size={14} />
                          </ThemeIcon>
                          <Text fw={500}>Blocker Themes</Text>
                        </Group>
                        <SimpleGrid cols={{ base: 1, sm: 2 }}>
                          {hypersphereData.deliberation.summary.value.blockerThemes.map(
                            (bt) => (
                              <Paper
                                key={bt.theme}
                                p="md"
                                radius="md"
                                withBorder
                              >
                                <Stack gap="xs">
                                  <Group justify="space-between">
                                    <Text fw={500} size="sm">
                                      {bt.theme}
                                    </Text>
                                    <Badge
                                      size="sm"
                                      variant="light"
                                      color="orange"
                                    >
                                      {bt.frequency}x
                                    </Badge>
                                  </Group>
                                  <Text size="xs" c="dimmed">
                                    {bt.description}
                                  </Text>
                                  <Group gap={4}>
                                    {bt.affectedPriorities.map((ap) => (
                                      <Badge
                                        key={ap}
                                        size="xs"
                                        variant="outline"
                                        color="gray"
                                      >
                                        {ap}
                                      </Badge>
                                    ))}
                                  </Group>
                                </Stack>
                              </Paper>
                            ),
                          )}
                        </SimpleGrid>
                      </Stack>
                    )}

                  {/* Resource Recommendations */}
                  {hypersphereData.deliberation.summary?.value
                    .resourceRecommendations &&
                    hypersphereData.deliberation.summary.value
                      .resourceRecommendations.length > 0 && (
                      <Stack gap="sm">
                        <Group gap="xs">
                          <ThemeIcon size="sm" variant="light" color="teal">
                            <IconCoin size={14} />
                          </ThemeIcon>
                          <Text fw={500}>Resource Recommendations</Text>
                        </Group>
                        {hypersphereData.deliberation.summary.value.resourceRecommendations.map(
                          (r, i) => (
                            <Paper key={i} p="md" radius="md" withBorder>
                              <Group gap="xs" align="flex-start">
                                <Badge variant="light" color="teal" size="sm">
                                  {r.category}
                                </Badge>
                                <Badge
                                  variant="light"
                                  color={
                                    r.urgency === "high"
                                      ? "red"
                                      : r.urgency === "medium"
                                        ? "orange"
                                        : "blue"
                                  }
                                  size="xs"
                                >
                                  {r.urgency}
                                </Badge>
                                <Stack gap={2} style={{ flex: 1 }}>
                                  <Text size="sm">{r.recommendation}</Text>
                                  {r.relatedPriorities.length > 0 && (
                                    <Text size="xs" c="dimmed">
                                      Related:{" "}
                                      {r.relatedPriorities.join(", ")}
                                    </Text>
                                  )}
                                </Stack>
                              </Group>
                            </Paper>
                          ),
                        )}
                      </Stack>
                    )}

                  {/* Verifiable Record Links */}
                  <Paper p="md" radius="md" withBorder>
                    <Stack gap="xs">
                      <Text fw={500} size="sm">
                        Verifiable Records
                      </Text>
                      {hypersphereData.deliberation.summary && (
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            Summary:
                          </Text>
                          <Anchor
                            href={atUriToWebUrl(
                              hypersphereData.deliberation.summary.uri,
                            )}
                            target="_blank"
                            size="xs"
                          >
                            <Group gap={4}>
                              View record
                              <IconExternalLink size={12} />
                            </Group>
                          </Anchor>
                        </Group>
                      )}
                      {hypersphereData.deliberation.pca && (
                        <Group gap="xs">
                          <Text size="xs" c="dimmed">
                            Topic Analysis:
                          </Text>
                          <Anchor
                            href={atUriToWebUrl(
                              hypersphereData.deliberation.pca.uri,
                            )}
                            target="_blank"
                            size="xs"
                          >
                            <Group gap={4}>
                              View record
                              <IconExternalLink size={12} />
                            </Group>
                          </Anchor>
                        </Group>
                      )}
                    </Stack>
                  </Paper>
                </Stack>
              )}
            </Stack>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}

function atUriToWebUrl(atUri: string): string {
  return `https://pdsls.dev/${atUri.replace("://", "/")}`;
}
