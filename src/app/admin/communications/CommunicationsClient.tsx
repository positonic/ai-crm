"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Card,
  Table,
  Text,
  Title,
  Badge,
  Container,
  Group,
  Stack,
  Loader,
  Center,
  Pagination,
  ActionIcon,
  Tooltip,
  Modal,
  ScrollArea,
  TextInput,
  Select,
} from "@mantine/core";
import {
  IconMail,
  IconEye,
  IconRefresh,
  IconSearch,
  IconX,
  IconMessage,
  IconPhone,
  IconBrandDiscord,
  IconBrandWhatsapp,
  IconBrandTelegram,
} from "@tabler/icons-react";
import { useDebouncedValue } from "@mantine/hooks";
import { api } from "~/trpc/react";
import { format } from "date-fns";
import { useDisclosure } from "@mantine/hooks";
import type { RouterOutputs } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";

const ITEMS_PER_PAGE = 50;

type Communication =
  RouterOutputs["communication"]["getAllSentCommunications"]["communications"][0];

export function CommunicationsClient() {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCommunication, setSelectedCommunication] =
    useState<Communication | null>(null);
  const [modalOpened, { open: openModal, close: closeModal }] =
    useDisclosure(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [searchTelegram, setSearchTelegram] = useState("");
  const [channelFilter, setChannelFilter] = useState<string | null>(null);
  const [debouncedSearchEmail] = useDebouncedValue(searchEmail, 300);
  const [debouncedSearchTelegram] = useDebouncedValue(searchTelegram, 300);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchEmail, debouncedSearchTelegram, channelFilter]);

  const { data, isLoading, refetch } =
    api.communication.getAllSentCommunications.useQuery(
      {
        limit: ITEMS_PER_PAGE,
        offset: (currentPage - 1) * ITEMS_PER_PAGE,
        searchEmail: debouncedSearchEmail || undefined,
        searchTelegram: debouncedSearchTelegram || undefined,
        channel:
          (channelFilter as
            | "EMAIL"
            | "TELEGRAM"
            | "SMS"
            | "DISCORD"
            | "WHATSAPP") || undefined,
      },
      {
        // Only fetch when debounced value is stable
        enabled: true,
        // Prevent refetch on window focus during search
        refetchOnWindowFocus: false,
        // Use stable cache time
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    );

  const totalPages = data ? Math.ceil(data.total / ITEMS_PER_PAGE) : 1;

  const handleViewCommunication = useCallback(
    (communication: Communication) => {
      setSelectedCommunication(communication);
      openModal();
    },
    [openModal],
  );

  // Helper function to get channel icon
  const getChannelIcon = useCallback((channel: string) => {
    switch (channel) {
      case "EMAIL":
        return <IconMail size={16} />;
      case "TELEGRAM":
        return <IconBrandTelegram size={16} />;
      case "SMS":
        return <IconPhone size={16} />;
      case "DISCORD":
        return <IconBrandDiscord size={16} />;
      case "WHATSAPP":
        return <IconBrandWhatsapp size={16} />;
      default:
        return <IconMessage size={16} />;
    }
  }, []);

  // Helper function to get recipient display
  const getRecipientDisplay = useCallback((communication: Communication) => {
    switch (communication.channel) {
      case "EMAIL":
        return communication.toEmail ?? "N/A";
      case "TELEGRAM":
        return communication.toTelegram ?? "N/A";
      case "SMS":
        return communication.toPhone ?? "N/A";
      case "DISCORD":
        return communication.toDiscord ?? "N/A";
      case "WHATSAPP":
        return communication.toPhone ?? "N/A";
      default:
        return "N/A";
    }
  }, []);

  // Memoize communication rows to prevent unnecessary re-renders
  const communicationRows = useMemo(() => {
    if (!data?.communications) return [];

    return data.communications.map((communication) => (
      <Table.Tr key={communication.id}>
        <Table.Td>
          {communication.sentAt
            ? format(new Date(communication.sentAt), "MMM d, yyyy h:mm a")
            : "N/A"}
        </Table.Td>
        <Table.Td>
          <Group gap="xs">
            {getChannelIcon(communication.channel)}
            <Stack gap={2}>
              <Text size="sm" fw={500}>
                {getRecipientDisplay(communication)}
              </Text>
              {getDisplayName(communication.application?.user) && (
                <Text size="xs" c="dimmed">
                  {getDisplayName(communication.application?.user)}
                </Text>
              )}
            </Stack>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm" lineClamp={1}>
            {communication.subject ??
              communication.textContent.substring(0, 50) + "..."}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{communication.event?.name ?? "N/A"}</Text>
        </Table.Td>
        <Table.Td>
          <Badge
            size="sm"
            variant="light"
            color={
              communication.type === "MISSING_INFO"
                ? "yellow"
                : communication.type === "STATUS_UPDATE"
                  ? "blue"
                  : "gray"
            }
          >
            {communication.type.replace("_", " ")}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Badge
            size="sm"
            variant="light"
            color={
              communication.channel === "EMAIL"
                ? "blue"
                : communication.channel === "TELEGRAM"
                  ? "cyan"
                  : "gray"
            }
          >
            {communication.channel}
          </Badge>
        </Table.Td>
        <Table.Td>
          <Tooltip label="View Communication">
            <ActionIcon
              onClick={() => handleViewCommunication(communication)}
              variant="light"
            >
              <IconEye size={16} />
            </ActionIcon>
          </Tooltip>
        </Table.Td>
      </Table.Tr>
    ));
  }, [
    data?.communications,
    handleViewCommunication,
    getChannelIcon,
    getRecipientDisplay,
  ]);

  if (isLoading) {
    return (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    );
  }

  if (!data) {
    return (
      <Container size="xl" py="xl">
        <Text>No data available</Text>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group justify="space-between">
          <div>
            <Title order={2}>Communications</Title>
            <Text size="sm" c="dimmed" mt={4}>
              View all communications (emails, messages) sent from the platform
            </Text>
          </div>
          <Group>
            <Badge size="lg" variant="light">
              {debouncedSearchEmail || debouncedSearchTelegram || channelFilter
                ? `${data?.total ?? 0} results found`
                : `Total: ${data?.total ?? 0} communications`}
            </Badge>
            <Tooltip label="Refresh">
              <ActionIcon
                onClick={() => void refetch()}
                variant="light"
                size="lg"
              >
                <IconRefresh size={20} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Search and Filter Controls */}
        <Group align="end">
          <TextInput
            placeholder="Search by email address..."
            value={searchEmail}
            onChange={(event) => setSearchEmail(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            rightSection={
              searchEmail ? (
                <ActionIcon
                  variant="subtle"
                  onClick={() => setSearchEmail("")}
                  size="sm"
                >
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
            style={{ width: 250 }}
          />

          <TextInput
            placeholder="Search by Telegram username..."
            value={searchTelegram}
            onChange={(event) => setSearchTelegram(event.currentTarget.value)}
            leftSection={<IconBrandTelegram size={16} />}
            rightSection={
              searchTelegram ? (
                <ActionIcon
                  variant="subtle"
                  onClick={() => setSearchTelegram("")}
                  size="sm"
                >
                  <IconX size={16} />
                </ActionIcon>
              ) : null
            }
            style={{ width: 250 }}
          />

          <Select
            placeholder="All channels"
            value={channelFilter}
            onChange={setChannelFilter}
            data={[
              { value: "EMAIL", label: "Email" },
              { value: "TELEGRAM", label: "Telegram" },
              { value: "SMS", label: "SMS" },
              { value: "DISCORD", label: "Discord" },
              { value: "WHATSAPP", label: "WhatsApp" },
            ]}
            clearable
            style={{ width: 150 }}
          />
        </Group>

        <Card withBorder>
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Sent Date</Table.Th>
                  <Table.Th>To</Table.Th>
                  <Table.Th>Subject/Content</Table.Th>
                  <Table.Th>Event</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Channel</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {data.communications.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={7}>
                      <Text ta="center" py="xl" c="dimmed">
                        {debouncedSearchEmail ||
                        debouncedSearchTelegram ||
                        channelFilter
                          ? `No communications found matching your search criteria`
                          : "No sent communications found"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  communicationRows
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>

        {totalPages > 1 && (
          <Group justify="center">
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={totalPages}
            />
          </Group>
        )}
      </Stack>

      <Modal
        opened={modalOpened}
        onClose={closeModal}
        title={
          <Group>
            {selectedCommunication &&
              getChannelIcon(selectedCommunication.channel)}
            <Text fw={600}>Communication Details</Text>
          </Group>
        }
        size="lg"
      >
        {selectedCommunication && (
          <Stack gap="md">
            <div>
              <Text size="xs" c="dimmed">
                Channel
              </Text>
              <Badge
                variant="light"
                color={
                  selectedCommunication.channel === "EMAIL"
                    ? "blue"
                    : selectedCommunication.channel === "TELEGRAM"
                      ? "cyan"
                      : "gray"
                }
              >
                {selectedCommunication.channel}
              </Badge>
            </div>

            <div>
              <Text size="xs" c="dimmed">
                To
              </Text>
              <Text>{getRecipientDisplay(selectedCommunication)}</Text>
            </div>

            {selectedCommunication.subject && (
              <div>
                <Text size="xs" c="dimmed">
                  Subject
                </Text>
                <Text>{selectedCommunication.subject}</Text>
              </div>
            )}

            <div>
              <Text size="xs" c="dimmed">
                Sent At
              </Text>
              <Text>
                {selectedCommunication?.sentAt
                  ? format(
                      new Date(selectedCommunication.sentAt),
                      "MMM d, yyyy h:mm:ss a",
                    )
                  : "N/A"}
              </Text>
            </div>

            {selectedCommunication.event && (
              <div>
                <Text size="xs" c="dimmed">
                  Event
                </Text>
                <Text>{selectedCommunication.event.name}</Text>
              </div>
            )}

            {selectedCommunication.postmarkId && (
              <div>
                <Text size="xs" c="dimmed">
                  Postmark ID
                </Text>
                <Text size="sm" style={{ fontFamily: "monospace" }}>
                  {selectedCommunication.postmarkId}
                </Text>
              </div>
            )}

            {selectedCommunication.telegramMsgId && (
              <div>
                <Text size="xs" c="dimmed">
                  Telegram Message ID
                </Text>
                <Text size="sm" style={{ fontFamily: "monospace" }}>
                  {selectedCommunication.telegramMsgId}
                </Text>
              </div>
            )}

            <div>
              <Text size="xs" c="dimmed" mb="xs">
                {selectedCommunication.channel === "EMAIL" &&
                selectedCommunication.htmlContent
                  ? "Content (HTML)"
                  : "Content (Text)"}
              </Text>
              <ScrollArea h={300} offsetScrollbars>
                {selectedCommunication.channel === "EMAIL" &&
                selectedCommunication.htmlContent ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: selectedCommunication.htmlContent,
                    }}
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: "16px",
                      borderRadius: "4px",
                      backgroundColor: "#f9f9f9",
                    }}
                  />
                ) : (
                  <Text
                    style={{
                      border: "1px solid #e0e0e0",
                      padding: "16px",
                      borderRadius: "4px",
                      backgroundColor: "#f9f9f9",
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedCommunication.textContent}
                  </Text>
                )}
              </ScrollArea>
            </div>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
