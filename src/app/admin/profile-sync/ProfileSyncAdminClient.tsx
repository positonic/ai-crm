"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Card,
  Text,
  Group,
  Stack,
  Button,
  Badge,
  Progress,
  SimpleGrid,
  Loader,
  Box,
  Modal,
  Table,
  Alert,
  NumberInput,
  Switch,
  Divider,
  List,
  ThemeIcon,
} from "@mantine/core";
import {
  IconUserCog,
  IconDownload,
  IconEye,
  IconCheck,
  IconX,
  IconUsers,
  IconDatabase,
  IconTrendingUp,
  IconChartBar,
  IconRefresh,
  IconArrowLeft,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import { api } from "~/trpc/react";

interface SyncResult {
  userEmail: string;
  syncedFields: string[];
  error?: string;
}

interface BulkSyncResults {
  dryRun: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  results: SyncResult[];
}

export function ProfileSyncAdminClient() {
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [syncResults, setSyncResults] = useState<BulkSyncResults | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [limitUsers, setLimitUsers] = useState<number | undefined>(10);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = api.profile.adminGetSyncStats.useQuery();

  const bulkSyncMutation = api.profile.adminBulkSyncProfiles.useMutation({
    onSuccess: (data) => {
      setSyncResults(data);
      setResultsModalOpen(true);
      if (!data.dryRun) {
        notifications.show({
          title: "Profile Sync Complete",
          message: `Successfully synced ${data.successful} profiles`,
          color: "green",
          icon: <IconCheck size={16} />,
        });
        void refetchStats();
      }
    },
    onError: (error) => {
      notifications.show({
        title: "Sync Failed",
        message: error.message,
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handleSync = () => {
    bulkSyncMutation.mutate({
      dryRun,
      limitUsers,
    });
  };

  const handlePreview = () => {
    setDryRun(true);
    bulkSyncMutation.mutate({
      dryRun: true,
      limitUsers,
    });
  };

  if (statsLoading) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  return (
    <Container size="lg" py="md">
      {/* Header */}
      <Group mb="xl">
        <Link href="/admin" style={{ textDecoration: "none" }}>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />}>
            Back to Admin
          </Button>
        </Link>
      </Group>

      <div style={{ marginBottom: "2rem" }}>
        <Group>
          <ThemeIcon size="lg" color="blue">
            <IconUserCog size={24} />
          </ThemeIcon>
          <div>
            <Title order={1}>Profile Sync Management</Title>
            <Text c="dimmed">
              Bulk import application data to enhance user profiles
            </Text>
          </div>
        </Group>
      </div>

      {/* Statistics */}
      <SimpleGrid cols={{ base: 2, md: 4 }} mb="xl">
        <Card withBorder p="md">
          <Group>
            <ThemeIcon size="md" color="blue" variant="light">
              <IconUsers size={18} />
            </ThemeIcon>
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Total Profiles
              </Text>
              <Text fw={700} size="lg">
                {stats?.totalProfiles ?? 0}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group>
            <ThemeIcon size="md" color="green" variant="light">
              <IconCheck size={18} />
            </ThemeIcon>
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Submitted Apps
              </Text>
              <Text fw={700} size="lg">
                {stats?.submittedApplications ?? 0}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group>
            <ThemeIcon size="md" color="orange" variant="light">
              <IconDatabase size={18} />
            </ThemeIcon>
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Unsynced Users
              </Text>
              <Text fw={700} size="lg" c="orange">
                {stats?.usersWithUnsyncedApplications ?? 0}
              </Text>
            </div>
          </Group>
        </Card>

        <Card withBorder p="md">
          <Group>
            <ThemeIcon size="md" color="violet" variant="light">
              <IconTrendingUp size={18} />
            </ThemeIcon>
            <div>
              <Text size="xs" tt="uppercase" fw={700} c="dimmed">
                Sync Coverage
              </Text>
              <Text fw={700} size="lg">
                {stats?.syncCoverage ?? 0}%
              </Text>
            </div>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Coverage Progress */}
      <Card withBorder mb="xl">
        <Stack>
          <Group justify="space-between">
            <Text fw={600}>Profile Sync Coverage</Text>
            <Badge color={stats?.syncCoverage === 100 ? "green" : "orange"}>
              {stats?.syncCoverage}% Complete
            </Badge>
          </Group>
          <Progress
            value={stats?.syncCoverage ?? 0}
            color={stats?.syncCoverage === 100 ? "green" : "blue"}
            size="lg"
            radius="md"
          />
          <Text size="sm" c="dimmed">
            {stats?.usersWithUnsyncedApplications ?? 0} users with submitted
            applications still need profile sync
          </Text>
        </Stack>
      </Card>

      {/* Sync Configuration */}
      <Card withBorder mb="xl">
        <Stack>
          <Title order={3}>Bulk Sync Configuration</Title>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            <Box>
              <Text fw={500} mb="xs">
                Sync Mode
              </Text>
              <Switch
                checked={!dryRun}
                onChange={(event) => setDryRun(!event.currentTarget.checked)}
                label={dryRun ? "Preview Mode (Dry Run)" : "Execute Sync"}
                description={
                  dryRun
                    ? "Preview changes without applying them"
                    : "Actually sync data to profiles"
                }
                color="blue"
              />
            </Box>

            <Box>
              <NumberInput
                label="Limit Users"
                description="Maximum number of users to process"
                placeholder="10"
                value={limitUsers}
                onChange={(value) =>
                  setLimitUsers(typeof value === "number" ? value : undefined)
                }
                min={1}
                max={100}
              />
            </Box>
          </SimpleGrid>

          <Divider />

          <Group>
            <Button
              leftSection={<IconEye size={16} />}
              variant="light"
              onClick={handlePreview}
              loading={bulkSyncMutation.isPending}
            >
              Preview Changes
            </Button>
            <Button
              leftSection={<IconDownload size={16} />}
              onClick={handleSync}
              loading={bulkSyncMutation.isPending}
              disabled={stats?.usersWithUnsyncedApplications === 0}
            >
              {dryRun ? "Preview Sync" : "Execute Bulk Sync"}
            </Button>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="light"
              onClick={() => void refetchStats()}
            >
              Refresh Stats
            </Button>
          </Group>

          {stats?.usersWithUnsyncedApplications === 0 && (
            <Alert color="green" icon={<IconCheck size={16} />}>
              All users with submitted applications have been synced to
              profiles!
            </Alert>
          )}
        </Stack>
      </Card>

      {/* Information */}
      <Card withBorder>
        <Stack>
          <Title order={3}>How Profile Sync Works</Title>
          <List spacing="sm">
            <List.Item>
              Finds users with SUBMITTED applications that haven&apos;t been
              synced to their profiles
            </List.Item>
            <List.Item>
              Safely merges application data without overwriting existing
              profile information
            </List.Item>
            <List.Item>
              Skills are merged (combined with existing skills), other fields
              only filled if empty
            </List.Item>
            <List.Item>
              Creates ProfileSync records to prevent duplicate imports
            </List.Item>
            <List.Item>
              Uses the most recent submitted application if multiple exist
            </List.Item>
          </List>

          <Text size="sm" c="dimmed" mt="md">
            <strong>Synced Fields:</strong> Technical Skills, Bio, Location,
            Company, LinkedIn URL, GitHub URL, Twitter URL, Telegram Handle
          </Text>
        </Stack>
      </Card>

      {/* Results Modal */}
      <Modal
        opened={resultsModalOpen}
        onClose={() => setResultsModalOpen(false)}
        title={
          <Group>
            <IconChartBar size={20} />
            <Text fw={600}>
              {syncResults?.dryRun ? "Preview Results" : "Sync Results"}
            </Text>
          </Group>
        }
        size="xl"
      >
        {syncResults && (
          <Stack gap="md">
            <SimpleGrid cols={3}>
              <Box ta="center">
                <Text size="xl" fw={700} c="blue">
                  {syncResults.totalProcessed}
                </Text>
                <Text size="sm" c="dimmed">
                  Processed
                </Text>
              </Box>
              <Box ta="center">
                <Text size="xl" fw={700} c="green">
                  {syncResults.successful}
                </Text>
                <Text size="sm" c="dimmed">
                  Successful
                </Text>
              </Box>
              <Box ta="center">
                <Text size="xl" fw={700} c="red">
                  {syncResults.failed}
                </Text>
                <Text size="sm" c="dimmed">
                  Failed
                </Text>
              </Box>
            </SimpleGrid>

            {syncResults.dryRun && (
              <Alert color="blue" icon={<IconEye size={16} />}>
                This was a preview - no changes were actually made to user
                profiles.
              </Alert>
            )}

            {syncResults.results.length > 0 && (
              <div>
                <Text fw={500} mb="sm">
                  Detailed Results
                </Text>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>User Email</Table.Th>
                      <Table.Th>Synced Fields</Table.Th>
                      <Table.Th>Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {syncResults.results.map(
                      (result: SyncResult, index: number) => (
                        <Table.Tr key={index}>
                          <Table.Td>{result.userEmail}</Table.Td>
                          <Table.Td>
                            {result.syncedFields.length > 0 ? (
                              <Group gap="xs">
                                {result.syncedFields.map((field) => (
                                  <Badge key={field} size="xs" variant="light">
                                    {field}
                                  </Badge>
                                ))}
                              </Group>
                            ) : (
                              <Text c="dimmed" size="sm">
                                No fields
                              </Text>
                            )}
                          </Table.Td>
                          <Table.Td>
                            {result.error ? (
                              <Badge
                                color="red"
                                leftSection={<IconX size={12} />}
                              >
                                Error
                              </Badge>
                            ) : (
                              <Badge
                                color="green"
                                leftSection={<IconCheck size={12} />}
                              >
                                Success
                              </Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ),
                    )}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => setResultsModalOpen(false)}
              >
                Close
              </Button>
              {syncResults.dryRun && syncResults.totalProcessed > 0 && (
                <Button
                  onClick={() => {
                    setResultsModalOpen(false);
                    setDryRun(false);
                    handleSync();
                  }}
                  leftSection={<IconDownload size={16} />}
                >
                  Execute Sync
                </Button>
              )}
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
