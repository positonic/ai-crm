"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Badge,
  Table,
  Loader,
  Alert,
  Progress,
  ActionIcon,
  Tooltip,
  Modal,
} from "@mantine/core";
import {
  IconRefresh,
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconDatabase,
  IconBrandGithub,
  IconExternalLink,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ProjectSyncAdminClientProps {}

export function ProjectSyncAdminClient(_props: ProjectSyncAdminClientProps) {
  const [isManualSyncRunning, setIsManualSyncRunning] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [forceResyncModal, { open: openForceResync, close: closeForceResync }] =
    useDisclosure(false);

  // API queries
  const { data: syncStatus, refetch: refetchSyncStatus } =
    api.projectIdea.getSyncStatus.useQuery();

  const {
    data: adminProjects,
    isLoading: isProjectsLoading,
    refetch: refetchProjects,
  } = api.projectIdea.getAllForAdmin.useQuery();

  const { data: projectStats, refetch: refetchStats } =
    api.projectIdea.getStats.useQuery();

  // Mutations
  const syncFromGitHubMutation = api.projectIdea.syncFromGitHub.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Sync completed",
        message: data.message,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setIsManualSyncRunning(false);
      void refetchSyncStatus();
      void refetchProjects();
      void refetchStats();
    },
    onError: (error) => {
      notifications.show({
        title: "Sync failed",
        message: error.message,
        color: "red",
        icon: <IconX size={16} />,
      });
      setIsManualSyncRunning(false);
      void refetchSyncStatus();
    },
  });

  const forceResyncMutation = api.projectIdea.forceResyncProject.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Project resynced",
        message: data.message,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      closeForceResync();
      setSelectedProject(null);
      void refetchProjects();
      void refetchStats();
    },
    onError: (error) => {
      notifications.show({
        title: "Resync failed",
        message: error.message,
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handleManualSync = async () => {
    setIsManualSyncRunning(true);
    syncFromGitHubMutation.mutate();
  };

  const handleForceResync = (projectId: string) => {
    setSelectedProject(projectId);
    openForceResync();
  };

  const confirmForceResync = () => {
    if (selectedProject) {
      forceResyncMutation.mutate({ id: selectedProject });
    }
  };

  const getSyncStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return "green";
      case "FAILED":
        return "red";
      case "SYNCING":
        return "blue";
      case "PENDING":
        return "yellow";
      default:
        return "gray";
    }
  };

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return <IconCheck size={16} />;
      case "FAILED":
        return <IconX size={16} />;
      case "SYNCING":
        return <Loader size={16} />;
      case "PENDING":
        return <IconClock size={16} />;
      default:
        return <IconAlertTriangle size={16} />;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={1} mb="md">
            Project Ideas Sync Management
          </Title>
          <Text c="dimmed">
            Manage synchronization of project ideas from the GitHub repository
          </Text>
        </div>

        {/* Stats Cards */}
        <Group grow>
          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Total Projects
                </Text>
                <Text size="xl" fw={700}>
                  {projectStats?.totalProjects ?? "-"}
                </Text>
              </div>
              <IconDatabase size={24} color="var(--mantine-color-blue-6)" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Successful
                </Text>
                <Text size="xl" fw={700} c="green">
                  {projectStats?.successfulProjects ?? "-"}
                </Text>
              </div>
              <IconCheck size={24} color="var(--mantine-color-green-6)" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Failed
                </Text>
                <Text size="xl" fw={700} c="red">
                  {projectStats?.failedProjects ?? "-"}
                </Text>
              </div>
              <IconX size={24} color="var(--mantine-color-red-6)" />
            </Group>
          </Card>

          <Card withBorder>
            <Group justify="space-between">
              <div>
                <Text size="sm" c="dimmed">
                  Last Sync
                </Text>
                <Text size="sm" fw={500}>
                  {projectStats?.lastSync
                    ? new Date(projectStats.lastSync.startedAt).toLocaleString()
                    : "Never"}
                </Text>
              </div>
              <IconBrandGithub size={24} color="var(--mantine-color-gray-6)" />
            </Group>
          </Card>
        </Group>

        {/* Sync Controls */}
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <div>
                <Text size="lg" fw={600}>
                  GitHub Synchronization
                </Text>
                <Text size="sm" c="dimmed">
                  Sync project ideas from fundingthecommons/project-ideas
                  repository
                </Text>
              </div>

              <Group gap="sm">
                <Button
                  variant="outline"
                  leftSection={<IconRefresh size={16} />}
                  onClick={() => {
                    void refetchSyncStatus();
                    void refetchProjects();
                    void refetchStats();
                  }}
                >
                  Refresh
                </Button>

                <Button
                  leftSection={<IconBrandGithub size={16} />}
                  onClick={handleManualSync}
                  loading={
                    isManualSyncRunning || syncFromGitHubMutation.isPending
                  }
                >
                  Sync Now
                </Button>
              </Group>
            </Group>

            {/* Latest Sync Status */}
            {syncStatus?.latestSync && (
              <Alert
                icon={getSyncStatusIcon(syncStatus.latestSync.status)}
                color={getSyncStatusColor(syncStatus.latestSync.status)}
              >
                <Group justify="space-between">
                  <div>
                    <Text size="sm" fw={500}>
                      Latest sync: {syncStatus.latestSync.status}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Started:{" "}
                      {new Date(
                        syncStatus.latestSync.startedAt,
                      ).toLocaleString()}
                      {syncStatus.latestSync.completedAt && (
                        <>
                          {" "}
                          • Completed:{" "}
                          {new Date(
                            syncStatus.latestSync.completedAt,
                          ).toLocaleString()}
                        </>
                      )}
                    </Text>
                  </div>
                  {syncStatus.latestSync.status === "SUCCESS" && (
                    <Text size="sm">
                      {syncStatus.latestSync.syncedCount} /{" "}
                      {syncStatus.latestSync.totalProjects} synced
                    </Text>
                  )}
                </Group>
                {syncStatus.latestSync.status === "SUCCESS" &&
                  syncStatus.latestSync.totalProjects > 0 && (
                    <Progress
                      value={
                        (syncStatus.latestSync.syncedCount /
                          syncStatus.latestSync.totalProjects) *
                        100
                      }
                      size="sm"
                      mt="xs"
                      color={getSyncStatusColor(syncStatus.latestSync.status)}
                    />
                  )}
              </Alert>
            )}
          </Stack>
        </Card>

        {/* Projects Table */}
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text size="lg" fw={600}>
                Project Status
              </Text>
              <Text size="sm" c="dimmed">
                {adminProjects?.length ?? 0} projects
              </Text>
            </Group>

            {isProjectsLoading ? (
              <Loader mx="auto" />
            ) : !adminProjects?.length ? (
              <Text c="dimmed" ta="center" py="xl">
                No projects found. Run a sync to fetch projects from GitHub.
              </Text>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Project</Table.Th>
                    <Table.Th>Category</Table.Th>
                    <Table.Th>Technologies</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Last Synced</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {adminProjects.map((project) => (
                    <Table.Tr key={project.id}>
                      <Table.Td>
                        <div>
                          <Text size="sm" fw={500}>
                            {project.title}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {project.slug}
                          </Text>
                        </div>
                      </Table.Td>
                      <Table.Td>
                        {project.category ? (
                          <Badge variant="light" size="sm">
                            {project.category}
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {project.technologies.slice(0, 3).map((tech) => (
                            <Badge key={tech} variant="outline" size="xs">
                              {tech}
                            </Badge>
                          ))}
                          {project.technologies.length > 3 && (
                            <Text size="xs" c="dimmed">
                              +{project.technologies.length - 3}
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={getSyncStatusColor(project.syncStatus)}
                          leftSection={getSyncStatusIcon(project.syncStatus)}
                        >
                          {project.syncStatus}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="xs">
                          {new Date(project.lastSynced).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <Tooltip label="View project">
                            <ActionIcon
                              variant="subtle"
                              component="a"
                              href={`/project-ideas/${project.slug}`}
                              target="_blank"
                            >
                              <IconExternalLink size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="View on GitHub">
                            <ActionIcon
                              variant="subtle"
                              component="a"
                              href={`https://github.com/fundingthecommons/project-ideas/blob/main/${project.githubPath}`}
                              target="_blank"
                            >
                              <IconBrandGithub size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Force resync">
                            <ActionIcon
                              variant="subtle"
                              onClick={() => handleForceResync(project.id)}
                              loading={
                                forceResyncMutation.isPending &&
                                selectedProject === project.id
                              }
                            >
                              <IconRefresh size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Stack>
        </Card>

        {/* Recent Sync History */}
        {syncStatus?.recentSyncs && syncStatus.recentSyncs.length > 0 && (
          <Card withBorder>
            <Stack gap="md">
              <Text size="lg" fw={600}>
                Recent Sync History
              </Text>

              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Started</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Projects</Table.Th>
                    <Table.Th>Success Rate</Table.Th>
                    <Table.Th>Duration</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {syncStatus.recentSyncs.map((sync) => (
                    <Table.Tr key={sync.id}>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(sync.startedAt).toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          variant="light"
                          color={getSyncStatusColor(sync.status)}
                          leftSection={getSyncStatusIcon(sync.status)}
                        >
                          {sync.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{sync.totalProjects}</Text>
                      </Table.Td>
                      <Table.Td>
                        {sync.status === "SUCCESS" ? (
                          <Group gap="xs" align="center">
                            <Text size="sm">
                              {sync.syncedCount} / {sync.totalProjects}
                            </Text>
                            <Progress
                              value={
                                sync.totalProjects > 0
                                  ? (sync.syncedCount / sync.totalProjects) *
                                    100
                                  : 0
                              }
                              size="xs"
                              w={60}
                            />
                          </Group>
                        ) : (
                          <Text size="sm" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {sync.completedAt ? (
                          <Text size="sm">
                            {Math.round(
                              (new Date(sync.completedAt).getTime() -
                                new Date(sync.startedAt).getTime()) /
                                1000,
                            )}
                            s
                          </Text>
                        ) : (
                          <Text size="sm" c="dimmed">
                            -
                          </Text>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          </Card>
        )}
      </Stack>

      {/* Force Resync Modal */}
      <Modal
        opened={forceResyncModal}
        onClose={closeForceResync}
        title="Force Resync Project"
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Are you sure you want to force resync this project? This will
            refetch the content from GitHub and overwrite any local changes.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" onClick={closeForceResync}>
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={confirmForceResync}
              loading={forceResyncMutation.isPending}
            >
              Resync Project
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
