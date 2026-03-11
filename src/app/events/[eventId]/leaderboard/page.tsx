"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Title,
  Card,
  Text,
  Group,
  Badge,
  Loader,
  Center,
  Table,
} from "@mantine/core";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";
import { IconArrowUp, IconArrowDown } from "@tabler/icons-react";
import Link from "next/link";
import { KUDOS_CONSTANTS, getKudosTier } from "~/utils/kudosCalculation";
import { UserAvatar } from "~/app/_components/UserAvatar";

interface LeaderboardPageProps {
  params: Promise<{ eventId: string }>;
}

type SortField =
  | "projects"
  | "projectsWithMetrics"
  | "updates"
  | "praiseSent"
  | "praiseReceived"
  | "kudos";
type SortDirection = "asc" | "desc";

export default function LeaderboardPage({ params }: LeaderboardPageProps) {
  const [eventId, setEventId] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("kudos");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Await params in Next.js 15
  useEffect(() => {
    void params.then(({ eventId: id }) => setEventId(id));
  }, [params]);

  const { data: transactions } = api.praise.getAllTransactions.useQuery({
    limit: 100,
  });

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

  // Build resident statistics
  const residentStats = useMemo(() => {
    if (!residentsData?.residents) return [];

    return residentsData.residents
      .map((resident) => {
        const userId = resident.user?.id;
        if (!userId) return null;

        // Count projects
        const userProjects =
          residentProjects?.filter((p) => p.profile?.user?.id === userId) ?? [];

        const totalProjects = userProjects.length;

        // Count projects with at least one metric selected
        const projectsWithMetrics = userProjects.filter(
          (p) => p.metrics && p.metrics.length > 0,
        ).length;

        // Count updates across all user's projects
        const updateCount = userProjects.reduce(
          (sum: number, p) => sum + (p.updates?.length ?? 0),
          0,
        );

        // Count praise sent and received
        const praiseSentCount =
          transactions?.filter((t) => t.senderId === userId).length ?? 0;

        const praiseReceivedCount =
          transactions?.filter((t) => t.recipientId === userId).length ?? 0;

        // Get user's actual kudos from database
        // This includes all dynamic transfers (likes, comment likes, praise with actual transfer amounts)
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
        Residency Leaderboard
      </Title>

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
                  <Badge variant="light">{resident!.projectsWithMetrics}</Badge>
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
    </Container>
  );
}
