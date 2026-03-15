"use client";

import { useState, useMemo } from "react";
import { getDisplayName } from "~/utils/userDisplay";
import {
  Container,
  Title,
  Text,
  Card,
  Table,
  Group,
  Stack,
  TextInput,
  Badge,
  Paper,
  SimpleGrid,
  Pagination,
  Modal,
  ScrollArea,
  Avatar,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Select,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
  IconSearch,
  IconEye,
  IconStar,
  IconStarFilled,
  IconAlertTriangle,
  IconMessage,
  IconClock,
  IconRobot,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";

const ITEMS_PER_PAGE = 30;

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMs(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${String(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <Group gap={2}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star}>
          {star <= rating ? (
            <IconStarFilled
              size={14}
              style={{ color: "var(--mantine-color-yellow-5)" }}
            />
          ) : (
            <IconStar
              size={14}
              style={{ color: "var(--mantine-color-gray-4)" }}
            />
          )}
        </span>
      ))}
    </Group>
  );
}

interface InteractionDetail {
  id: string;
  userMessage: string;
  aiResponse: string;
  pathname: string | null;
  responseTimeMs: number | null;
  hadError: boolean;
  errorMessage: string | null;
  conversationId: string | null;
  createdAt: Date | string;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    surname: string | null;
    email: string | null;
    image: string | null;
  };
  feedback: {
    rating: number;
    comment: string | null;
    improvement: string | null;
  } | null;
}

export function AIInteractionsClient() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorFilter, setErrorFilter] = useState<string | null>(null);
  const [selectedInteraction, setSelectedInteraction] =
    useState<InteractionDetail | null>(null);
  const [debouncedSearch] = useDebouncedValue(searchTerm, 300);

  const { data, isLoading } = api.aiInteraction.getInteractions.useQuery({
    limit: ITEMS_PER_PAGE,
    offset: (currentPage - 1) * ITEMS_PER_PAGE,
    search: debouncedSearch || undefined,
    hasError:
      errorFilter === "errors"
        ? true
        : errorFilter === "success"
          ? false
          : undefined,
  });

  const { data: stats } = api.aiInteraction.getInteractionStats.useQuery();

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 0;

  const getUserDisplayName = (user: InteractionDetail["user"]): string =>
    getDisplayName(user, "Unknown");

  const tableRows = useMemo(() => {
    if (!data?.interactions) return null;
    return data.interactions.map((interaction) => (
      <Table.Tr key={interaction.id}>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {formatDate(interaction.createdAt)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            <Avatar src={interaction.user.image} size="sm" radius="xl" />
            <Text size="sm">{getUserDisplayName(interaction.user)}</Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={2}>
            {truncate(interaction.userMessage, 100)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {formatMs(interaction.responseTimeMs)}
          </Text>
        </Table.Td>
        <Table.Td>
          {interaction.hadError ? (
            <Badge color="red" size="sm" variant="light">
              Error
            </Badge>
          ) : (
            <Badge color="green" size="sm" variant="light">
              OK
            </Badge>
          )}
        </Table.Td>
        <Table.Td>
          {interaction.feedback ? (
            <StarRating rating={interaction.feedback.rating} />
          ) : (
            <Text size="xs" c="dimmed">
              —
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Tooltip label="View details">
            <ActionIcon
              variant="subtle"
              onClick={() =>
                setSelectedInteraction(interaction as InteractionDetail)
              }
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    ));
  }, [data?.interactions]);

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <div>
          <Title order={2} mb="xs">
            AI Interactions
          </Title>
          <Text c="dimmed">
            View what users are asking the AI assistant and how it responds
          </Text>
        </div>

        {/* Stats */}
        {stats && (
          <SimpleGrid cols={{ base: 2, md: 5 }}>
            <Paper p="md" withBorder>
              <Group gap="xs">
                <IconMessage
                  size={16}
                  style={{ color: "var(--mantine-color-blue-5)" }}
                />
                <Text size="xs" c="dimmed">
                  Total Interactions
                </Text>
              </Group>
              <Text fw={700} size="xl" mt={4}>
                {stats.totalInteractions}
              </Text>
            </Paper>
            <Paper p="md" withBorder>
              <Group gap="xs">
                <IconStarFilled
                  size={16}
                  style={{ color: "var(--mantine-color-yellow-5)" }}
                />
                <Text size="xs" c="dimmed">
                  Avg Rating
                </Text>
              </Group>
              <Text fw={700} size="xl" mt={4}>
                {stats.averageRating != null
                  ? stats.averageRating.toFixed(1)
                  : "—"}
              </Text>
            </Paper>
            <Paper p="md" withBorder>
              <Group gap="xs">
                <IconRobot
                  size={16}
                  style={{ color: "var(--mantine-color-violet-5)" }}
                />
                <Text size="xs" c="dimmed">
                  Feedback Count
                </Text>
              </Group>
              <Text fw={700} size="xl" mt={4}>
                {stats.totalFeedback}
              </Text>
            </Paper>
            <Paper p="md" withBorder>
              <Group gap="xs">
                <IconClock
                  size={16}
                  style={{ color: "var(--mantine-color-teal-5)" }}
                />
                <Text size="xs" c="dimmed">
                  Avg Response
                </Text>
              </Group>
              <Text fw={700} size="xl" mt={4}>
                {formatMs(stats.averageResponseTimeMs)}
              </Text>
            </Paper>
            <Paper p="md" withBorder>
              <Group gap="xs">
                <IconAlertTriangle
                  size={16}
                  style={{ color: "var(--mantine-color-red-5)" }}
                />
                <Text size="xs" c="dimmed">
                  Error Rate
                </Text>
              </Group>
              <Text fw={700} size="xl" mt={4}>
                {stats.errorRate.toFixed(1)}%
              </Text>
            </Paper>
          </SimpleGrid>
        )}

        {/* Filters */}
        <Card withBorder>
          <Group>
            <TextInput
              placeholder="Search messages, users..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.currentTarget.value);
                setCurrentPage(1);
              }}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Status"
              data={[
                { value: "all", label: "All" },
                { value: "success", label: "Success" },
                { value: "errors", label: "Errors" },
              ]}
              value={errorFilter ?? "all"}
              onChange={(val) => {
                setErrorFilter(val === "all" ? null : val);
                setCurrentPage(1);
              }}
              w={140}
              clearable={false}
            />
          </Group>
        </Card>

        {/* Table */}
        <Card withBorder p={0}>
          {isLoading ? (
            <Center py="xl">
              <Loader />
            </Center>
          ) : (
            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={140}>Date</Table.Th>
                    <Table.Th w={180}>User</Table.Th>
                    <Table.Th>Question</Table.Th>
                    <Table.Th w={90}>Time</Table.Th>
                    <Table.Th w={80}>Status</Table.Th>
                    <Table.Th w={110}>Rating</Table.Th>
                    <Table.Th w={50} />
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {tableRows && tableRows.length > 0 ? (
                    tableRows
                  ) : (
                    <Table.Tr>
                      <Table.Td colSpan={7}>
                        <Text ta="center" c="dimmed" py="xl">
                          No interactions found
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Center>
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
            />
          </Center>
        )}
      </Stack>

      {/* Detail Modal */}
      <Modal
        opened={selectedInteraction !== null}
        onClose={() => setSelectedInteraction(null)}
        title="Interaction Details"
        size="lg"
      >
        {selectedInteraction && (
          <Stack gap="md">
            <Group justify="space-between">
              <Group gap="xs">
                <Avatar
                  src={selectedInteraction.user.image}
                  size="sm"
                  radius="xl"
                />
                <Text size="sm" fw={500}>
                  {getUserDisplayName(selectedInteraction.user)}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {formatDate(selectedInteraction.createdAt)}
              </Text>
            </Group>

            {selectedInteraction.pathname && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Page:
                </Text>
                <Text size="xs">{selectedInteraction.pathname}</Text>
              </Group>
            )}

            {selectedInteraction.responseTimeMs != null && (
              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Response time:
                </Text>
                <Text size="xs">
                  {formatMs(selectedInteraction.responseTimeMs)}
                </Text>
              </Group>
            )}

            <div>
              <Text size="sm" fw={600} mb={4}>
                User Message
              </Text>
              <Paper p="sm" withBorder style={{ whiteSpace: "pre-wrap" }}>
                <Text size="sm">{selectedInteraction.userMessage}</Text>
              </Paper>
            </div>

            <div>
              <Text size="sm" fw={600} mb={4}>
                AI Response
              </Text>
              <Paper p="sm" withBorder>
                <ScrollArea.Autosize mah={300}>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {selectedInteraction.aiResponse}
                  </Text>
                </ScrollArea.Autosize>
              </Paper>
            </div>

            {selectedInteraction.hadError &&
              selectedInteraction.errorMessage && (
                <div>
                  <Text size="sm" fw={600} mb={4} c="red">
                    Error
                  </Text>
                  <Paper
                    p="sm"
                    withBorder
                    style={{ borderColor: "var(--mantine-color-red-3)" }}
                  >
                    <Text size="sm" c="red">
                      {selectedInteraction.errorMessage}
                    </Text>
                  </Paper>
                </div>
              )}

            {selectedInteraction.feedback && (
              <div>
                <Text size="sm" fw={600} mb={4}>
                  User Feedback
                </Text>
                <Paper p="sm" withBorder>
                  <Stack gap="xs">
                    <StarRating rating={selectedInteraction.feedback.rating} />
                    {selectedInteraction.feedback.comment && (
                      <div>
                        <Text size="xs" c="dimmed">
                          Comment:
                        </Text>
                        <Text size="sm">
                          {selectedInteraction.feedback.comment}
                        </Text>
                      </div>
                    )}
                    {selectedInteraction.feedback.improvement && (
                      <div>
                        <Text size="xs" c="dimmed">
                          Improvement suggestion:
                        </Text>
                        <Text size="sm">
                          {selectedInteraction.feedback.improvement}
                        </Text>
                      </div>
                    )}
                  </Stack>
                </Paper>
              </div>
            )}
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
