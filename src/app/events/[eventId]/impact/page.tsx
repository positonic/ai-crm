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
} from "@mantine/core";
import {
  IconChartBar,
  IconTable,
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
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { Hyperboard } from "~/app/_components/Hyperboard";
import { formatDistanceToNow } from "date-fns";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";
import Link from "next/link";
import { getKudosTier, KUDOS_CONSTANTS } from "~/utils/kudosCalculation";

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
  const searchParams = useSearchParams();
  const [eventId, setEventId] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("kudos");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [activeTab, setActiveTab] = useState<string>("stats");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      router.push(`?tab=${value}`, { scroll: false });
    }
  };

  // Get event details
  const { isLoading: eventLoading } = api.event.getEvent.useQuery(
    { id: eventId },
    { enabled: !!eventId },
  );

  // Get resident projects
  const { data: residentProjects } =
    api.application.getResidentProjects.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  // Get accepted residents
  const { data: residentsData } = api.application.getAcceptedResidents.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  // Get sponsors for hyperboard
  const { data: sponsors } = api.sponsor.getSponsorsForHyperboard.useQuery(
    { eventId },
    { enabled: !!eventId },
  );

  // Get residents for kudosboard (sized by kudos)
  const { data: residentsKudosboard } =
    api.application.getResidentsForKudosboard.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  // Get projects for hyperboard
  const { data: projectsHyperboard } =
    api.application.getProjectsForHyperboard.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  // Get combined hyperboard (sponsors + residents)
  const { data: combinedHyperboard } =
    api.application.getCombinedHyperboard.useQuery(
      { eventId },
      { enabled: !!eventId },
    );

  // Get activity timeline
  const { data: activityTimeline, isLoading: activityLoading } =
    api.kudos.getActivityTimeline.useQuery({ limit: 50 });

  // Get praise transactions for residency leaderboard
  const { data: transactions } = api.praise.getAllTransactions.useQuery({
    limit: 100,
  });

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

  if (eventLoading || !eventId) {
    return (
      <Container size="lg" py="xl">
        <Center>
          <Loader />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Title order={1} mb="xl">
        Residency Impact
      </Title>

      <Tabs value={activeTab} onChange={handleTabChange}>
        <Tabs.List>
          <Tabs.Tab value="stats" leftSection={<IconChartBar size={16} />}>
            Statistics
          </Tabs.Tab>
          <Tabs.Tab value="activity" leftSection={<IconActivity size={16} />}>
            Activity Timeline
          </Tabs.Tab>
          <Tabs.Tab value="leaderboard" leftSection={<IconUsers size={16} />}>
            Residency Leaderboard
          </Tabs.Tab>
          <Tabs.Tab
            value="sponsor-hyperboard"
            leftSection={<IconTable size={16} />}
          >
            Sponsor Hyperboard
          </Tabs.Tab>
          <Tabs.Tab value="kudosboard" leftSection={<IconSparkles size={16} />}>
            Residents Hyperboard
          </Tabs.Tab>
          <Tabs.Tab
            value="projects-hyperboard"
            leftSection={<IconBriefcase size={16} />}
          >
            Projects Hyperboard
          </Tabs.Tab>
          <Tabs.Tab
            value="combined-hyperboard"
            leftSection={<IconLayoutGrid size={16} />}
          >
            Combined Hyperboard
          </Tabs.Tab>
        </Tabs.List>

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
      </Tabs>
    </Container>
  );
}
