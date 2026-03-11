"use client";

import { useState } from "react";
import {
  Text,
  Paper,
  Table,
  Avatar,
  Progress,
  Badge,
  Group,
  Loader,
  Alert,
  Stack,
  TextInput,
  Select,
  Popover,
  Divider,
} from "@mantine/core";
import { IconAlertCircle, IconSearch } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import TelegramMessageButton from "~/app/_components/TelegramMessageButton";

const TELEGRAM_MESSAGE = `You are one of the few residents who hasn't yet updated their profile - please update it here and add the projects you're working on asap https://platform.fundingthecommons.io/profile/edit`;

export default function ProfilesAdminClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterByCompleteness, setFilterByCompleteness] = useState<
    string | null
  >(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Fetch events for the filter dropdown
  const { data: events } = api.event.getEvents.useQuery();

  // Fetch user profiles data with optional event filter
  const {
    data: users,
    isLoading,
    error,
  } = api.profile.getAllProfilesForAdmin.useQuery({
    eventId: selectedEventId ?? undefined,
  });

  // Filter users based on search and completeness filter
  const filteredUsers = users?.filter((user) => {
    // Search filter
    const matchesSearch =
      !searchQuery ||
      user.name?.toLowerCase().includes(searchQuery.toLowerCase());

    // Completeness filter
    const matchesCompleteness =
      !filterByCompleteness ||
      (filterByCompleteness === "complete" &&
        user.completeness.meetsThreshold) ||
      (filterByCompleteness === "incomplete" &&
        !user.completeness.meetsThreshold);

    return matchesSearch && matchesCompleteness;
  });

  if (isLoading) {
    return (
      <Group justify="center" mt={50}>
        <Loader size="lg" />
      </Group>
    );
  }

  if (error) {
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Error"
        color="red"
        variant="filled"
      >
        Failed to load user profiles: {error.message}
      </Alert>
    );
  }

  const incompleteCount =
    users?.filter((u) => !u.completeness.meetsThreshold).length ?? 0;
  const completeCount =
    users?.filter((u) => u.completeness.meetsThreshold).length ?? 0;

  // Get selected event name
  const selectedEvent = events?.find((e) => e.id === selectedEventId);
  const eventFilterLabel = selectedEvent ? selectedEvent.name : "All Users";

  return (
    <Stack gap="lg">
      {/* Stats */}
      <Group gap="md">
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed">
            Total Users
          </Text>
          <Text size="xl" fw={700}>
            {users?.length ?? 0}
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            {eventFilterLabel}
          </Text>
        </Paper>
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed">
            Complete Profiles (≥70%)
          </Text>
          <Text size="xl" fw={700} c="green">
            {completeCount}
          </Text>
        </Paper>
        <Paper p="md" withBorder>
          <Text size="sm" c="dimmed">
            Incomplete Profiles (&lt;70%)
          </Text>
          <Text size="xl" fw={700} c="orange">
            {incompleteCount}
          </Text>
        </Paper>
      </Group>

      {/* Filters */}
      <Group gap="md">
        <Select
          placeholder="Filter by event"
          data={[
            { value: "all", label: "All Users" },
            ...(events?.map((event) => ({
              value: event.id,
              label: event.name,
            })) ?? []),
          ]}
          value={selectedEventId ?? "all"}
          onChange={(value) =>
            setSelectedEventId(value === "all" ? null : value)
          }
          clearable
          style={{ minWidth: 250 }}
        />
        <TextInput
          placeholder="Search by name..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          placeholder="Filter by completeness"
          data={[
            { value: "all", label: "All Users" },
            { value: "complete", label: "Complete (≥70%)" },
            { value: "incomplete", label: "Incomplete (<70%)" },
          ]}
          value={filterByCompleteness ?? "all"}
          onChange={(value) =>
            setFilterByCompleteness(value === "all" ? null : value)
          }
          clearable
          style={{ minWidth: 200 }}
        />
      </Group>

      {/* Users Table */}
      <Paper withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Profile Completeness</Table.Th>
              <Table.Th>Projects</Table.Th>
              <Table.Th>Timeline Updates</Table.Th>
              <Table.Th>Contact</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredUsers?.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="xl">
                    {searchQuery || filterByCompleteness || selectedEventId
                      ? "No users match your filters"
                      : "No users found"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredUsers?.map((user) => (
                <Table.Tr key={user.userId}>
                  {/* User Info */}
                  <Table.Td>
                    <Group gap="sm">
                      <Avatar
                        src={user.image}
                        alt={user.name ?? "User"}
                        radius="xl"
                        size="md"
                      />
                      <div>
                        <Text fw={500}>{user.name ?? "Unknown"}</Text>
                      </div>
                    </Group>
                  </Table.Td>

                  {/* Profile Completeness */}
                  <Table.Td>
                    <Stack gap="xs">
                      <Group gap="xs" align="center">
                        <Progress
                          value={user.completeness.percentage}
                          color={
                            user.completeness.percentage >= 70
                              ? "green"
                              : user.completeness.percentage >= 40
                                ? "orange"
                                : "red"
                          }
                          size="lg"
                          radius="xl"
                          style={{ flex: 1, minWidth: 150 }}
                        />
                        <Text size="sm" fw={600} style={{ minWidth: 40 }}>
                          {user.completeness.percentage}%
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {user.completeness.completedFields} of{" "}
                        {user.completeness.totalFields} fields
                      </Text>
                    </Stack>
                  </Table.Td>

                  {/* Project Count with Popover */}
                  <Table.Td>
                    {user.projectCount > 0 ? (
                      <Popover
                        width={350}
                        position="bottom"
                        withArrow
                        shadow="md"
                      >
                        <Popover.Target>
                          <Group
                            gap="xs"
                            align="center"
                            style={{ cursor: "pointer" }}
                          >
                            <Badge color="blue" variant="light" size="lg">
                              {user.projectCount}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {user.projectCount === 1 ? "project" : "projects"}
                            </Text>
                          </Group>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <Stack gap="xs">
                            <Text size="sm" fw={600} mb="xs">
                              {user.name}&apos;s Projects
                            </Text>
                            <Divider />
                            {user.projects?.map((project) => (
                              <div key={project.id}>
                                <Text size="sm" fw={500}>
                                  {project.title}
                                </Text>
                                <Text size="xs" c="dimmed">
                                  {project.updateCount} update
                                  {project.updateCount !== 1 ? "s" : ""}
                                </Text>
                              </div>
                            ))}
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                    ) : (
                      <Group gap="xs" align="center">
                        <Badge color="gray" variant="light" size="lg">
                          0
                        </Badge>
                        <Text size="xs" c="dimmed">
                          projects
                        </Text>
                      </Group>
                    )}
                  </Table.Td>

                  {/* Timeline Updates Count with Popover */}
                  <Table.Td>
                    {user.projectUpdateCount > 0 ? (
                      <Popover
                        width={350}
                        position="bottom"
                        withArrow
                        shadow="md"
                      >
                        <Popover.Target>
                          <Group
                            gap="xs"
                            align="center"
                            style={{ cursor: "pointer" }}
                          >
                            <Badge color="green" variant="light" size="lg">
                              {user.projectUpdateCount}
                            </Badge>
                            <Text size="xs" c="dimmed">
                              {user.projectUpdateCount === 1
                                ? "update"
                                : "updates"}
                            </Text>
                          </Group>
                        </Popover.Target>
                        <Popover.Dropdown>
                          <Stack gap="xs">
                            <Text size="sm" fw={600} mb="xs">
                              Timeline Updates by Project
                            </Text>
                            <Divider />
                            {user.projects
                              ?.filter((project) => project.updateCount > 0)
                              .map((project) => (
                                <div key={project.id}>
                                  <Text size="sm" fw={500}>
                                    {project.title}
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {project.updateCount} update
                                    {project.updateCount !== 1 ? "s" : ""}
                                  </Text>
                                </div>
                              ))}
                            {user.projects?.filter((p) => p.updateCount > 0)
                              .length === 0 && (
                              <Text size="sm" c="dimmed" ta="center" py="md">
                                No updates yet
                              </Text>
                            )}
                          </Stack>
                        </Popover.Dropdown>
                      </Popover>
                    ) : (
                      <Group gap="xs" align="center">
                        <Badge color="gray" variant="light" size="lg">
                          0
                        </Badge>
                        <Text size="xs" c="dimmed">
                          updates
                        </Text>
                      </Group>
                    )}
                  </Table.Td>

                  {/* Telegram Contact */}
                  <Table.Td>
                    {user.application ? (
                      <TelegramMessageButton
                        application={user.application}
                        customMessage={TELEGRAM_MESSAGE}
                        size={20}
                        variant="filled"
                        color="blue"
                      />
                    ) : (
                      <Text size="xs" c="dimmed">
                        N/A
                      </Text>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
