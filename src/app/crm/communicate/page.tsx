"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "~/trpc/react";
import {
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Alert,
  Select,
  Loader,
  Center,
  Box,
  MultiSelect,
  Textarea,
  Badge,
  ActionIcon,
  Avatar,
  Tabs,
} from "@mantine/core";
import {
  IconBrandTelegram,
  IconSend,
  IconX,
  IconUsers,
  IconUsersGroup,
  IconCheck,
} from "@tabler/icons-react";
import { redirect } from "next/navigation";
import { useSession } from "next-auth/react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  telegram?: string | null;
  sponsor?: {
    id: string;
    name: string;
    websiteUrl: string | null;
    logoUrl: string | null;
  } | null;
}

export default function CommunicatePage() {
  return (
    <Suspense
      fallback={
        <Center h="100vh">
          <Loader size="lg" />
        </Center>
      }
    >
      <CommunicatePageContent />
    </Suspense>
  );
}

function CommunicatePageContent() {
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();

  // Messaging state
  const [selectedRecipients, setSelectedRecipients] = useState<Contact[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedSmartList, setSelectedSmartList] = useState<string | null>(
    null,
  );
  const [messagingMode, setMessagingMode] = useState<"manual" | "smartlist">(
    "manual",
  );
  const [addSalutation, setAddSalutation] = useState(false);
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false);

  const { data: contacts, isLoading } = api.contact.getContacts.useQuery();

  // Pre-select contacts from URL query parameter
  useEffect(() => {
    if (hasInitializedFromUrl || !contacts) return;

    const contactIdsParam = searchParams.get("contacts");
    if (contactIdsParam) {
      const contactIds = contactIdsParam.split(",").filter(Boolean);
      const telegramContacts = contacts.filter((c) => c.telegram);
      const preSelectedContacts: Contact[] = telegramContacts
        .filter((c) => contactIds.includes(c.id))
        .map((c) => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          telegram: c.telegram,
          sponsor: c.sponsor,
        }));

      if (preSelectedContacts.length > 0) {
        setSelectedRecipients(preSelectedContacts);
        setMessagingMode("manual");
      }
    }
    setHasInitializedFromUrl(true);
  }, [contacts, searchParams, hasInitializedFromUrl]);
  const { data: telegramAuthStatus } =
    api.telegramAuth.getAuthStatus.useQuery();
  const { data: smartLists, isLoading: smartListsLoading } =
    api.telegramAuth.getSmartLists.useQuery();
  const { data: smartListContacts, isLoading: smartListContactsLoading } =
    api.telegramAuth.getSmartListContacts.useQuery(
      { listId: selectedSmartList! },
      { enabled: !!selectedSmartList },
    );
  const sendBulkMessage = api.telegramAuth.sendBulkMessage.useMutation();
  const sendBulkMessageToList =
    api.telegramAuth.sendBulkMessageToList.useMutation();

  // Handle authentication on client side
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/crm/communicate");
    return null;
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
    return null;
  }

  // Get contacts with Telegram usernames for messaging
  const telegramContacts =
    contacts?.filter((contact) => contact.telegram) ?? [];

  // Contact selector data for MultiSelect
  const contactSelectData = telegramContacts.map((contact) => ({
    value: contact.id,
    label: `${contact.firstName} ${contact.lastName} (@${contact.telegram})`,
  }));

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    if (messagingMode === "manual" && !selectedRecipients.length) return;
    if (messagingMode === "smartlist" && !selectedSmartList) return;

    setIsSending(true);
    try {
      if (messagingMode === "smartlist") {
        await sendBulkMessageToList.mutateAsync({
          listId: selectedSmartList!,
          message: messageText.trim(),
          addSalutation,
        });
      } else {
        await sendBulkMessage.mutateAsync({
          contactIds: selectedRecipients.map((c) => c.id),
          message: messageText.trim(),
          addSalutation,
        });
      }

      // Reset form on success
      setSelectedRecipients([]);
      setSelectedSmartList(null);
      setMessageText("");
    } catch (error) {
      console.error("Failed to send messages:", error);
    } finally {
      setIsSending(false);
    }
  };

  const removeRecipient = (contactId: string) => {
    setSelectedRecipients((prev) => prev.filter((c) => c.id !== contactId));
  };

  // Helper to get recipient count for current mode
  const getRecipientCount = () => {
    if (messagingMode === "smartlist") {
      const selectedList = smartLists?.find(
        (list) => list.id === selectedSmartList,
      );
      return selectedList?.contactCount ?? 0;
    }
    return selectedRecipients.length;
  };

  // Helper to check if send is enabled
  const canSend = () => {
    if (!messageText.trim()) return false;
    if (messagingMode === "manual") return selectedRecipients.length > 0;
    if (messagingMode === "smartlist") return !!selectedSmartList;
    return false;
  };

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--crm-bg)",
      }}
    >
      {/* Header Bar */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--crm-sidebar-border)",
          background: "var(--crm-sidebar-bg)",
        }}
      >
        <Group justify="space-between">
          <Group gap="md">
            <IconBrandTelegram size={24} style={{ color: "#0088cc" }} />
            <Text
              fw={500}
              size="lg"
              style={{ color: "var(--crm-sidebar-text-active)" }}
            >
              Telegram Communications
            </Text>
          </Group>
          <Text size="sm" c="dimmed">
            {telegramContacts.length} contacts with Telegram
          </Text>
        </Group>
      </Box>

      {/* Content */}
      <Box style={{ flex: 1, overflow: "auto", padding: "24px" }}>
        <Paper
          shadow="xs"
          p="lg"
          radius="md"
          withBorder
          style={{
            maxWidth: 800,
            margin: "0 auto",
            background: "var(--crm-sidebar-bg)",
            borderColor: "var(--crm-sidebar-border)",
          }}
        >
          <Stack gap="lg">
            {!telegramAuthStatus?.isAuthenticated ? (
              <Alert
                icon={<IconBrandTelegram size={16} />}
                color="orange"
                variant="light"
              >
                <Text fw={500}>Telegram Authentication Required</Text>
                <Text size="sm">
                  Please set up Telegram authentication in your profile settings
                  to send messages.
                </Text>
              </Alert>
            ) : (
              <Stack gap="md">
                {/* Messaging Mode Selector */}
                <Stack gap="sm">
                  <Text
                    fw={500}
                    size="sm"
                    style={{ color: "var(--crm-sidebar-text-active)" }}
                  >
                    Send to:
                  </Text>
                  <Tabs
                    value={messagingMode}
                    onChange={(value) => {
                      setMessagingMode(value as "manual" | "smartlist");
                      // Clear selections when switching modes
                      setSelectedRecipients([]);
                      setSelectedSmartList(null);
                    }}
                  >
                    <Tabs.List>
                      <Tabs.Tab
                        value="manual"
                        leftSection={<IconUsers size={16} />}
                      >
                        Select Contacts
                      </Tabs.Tab>
                      <Tabs.Tab
                        value="smartlist"
                        leftSection={<IconUsersGroup size={16} />}
                      >
                        Smart Lists
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs>
                </Stack>

                {/* Manual Contact Selection */}
                {messagingMode === "manual" && (
                  <Stack gap="sm">
                    <MultiSelect
                      placeholder="Search contacts by name..."
                      data={contactSelectData}
                      value={selectedRecipients.map((c) => c.id)}
                      onChange={(values) => {
                        const newRecipients: Contact[] = [];
                        for (const value of values) {
                          const found = telegramContacts.find(
                            (c) => c.id === value,
                          );
                          if (found) {
                            newRecipients.push({
                              id: found.id,
                              firstName: found.firstName,
                              lastName: found.lastName,
                              email: found.email,
                              telegram: found.telegram,
                              sponsor: found.sponsor,
                            });
                          }
                        }
                        setSelectedRecipients(newRecipients);
                      }}
                      searchable
                      clearable
                      maxDropdownHeight={200}
                    />

                    {/* Selected Recipients Pills */}
                    {selectedRecipients.length > 0 && (
                      <Group gap="xs">
                        {selectedRecipients.map((contact) => (
                          <Badge
                            key={contact.id}
                            variant="light"
                            color="blue"
                            rightSection={
                              <ActionIcon
                                size="xs"
                                color="blue"
                                radius="xl"
                                variant="transparent"
                                onClick={() => removeRecipient(contact.id)}
                              >
                                <IconX size={10} />
                              </ActionIcon>
                            }
                          >
                            {contact.firstName} {contact.lastName}
                          </Badge>
                        ))}
                      </Group>
                    )}
                  </Stack>
                )}

                {/* Smart List Selection */}
                {messagingMode === "smartlist" && (
                  <Stack gap="sm">
                    {smartListsLoading ? (
                      <Group gap="sm">
                        <Loader size="sm" />
                        <Text size="sm" c="dimmed">
                          Loading smart lists...
                        </Text>
                      </Group>
                    ) : (
                      <Select
                        placeholder="Choose a contact list..."
                        data={
                          smartLists?.map((list) => ({
                            value: list.id,
                            label: `${list.name} (${list.contactCount} contacts)`,
                          })) ?? []
                        }
                        value={selectedSmartList}
                        onChange={setSelectedSmartList}
                        clearable
                        searchable
                      />
                    )}

                    {/* Smart List Preview */}
                    {selectedSmartList && smartListContacts && (
                      <Paper p="xs" withBorder radius="sm">
                        <Stack gap="xs">
                          <Group gap="xs">
                            <IconUsers size={14} />
                            <Text size="xs" fw={500}>
                              Preview: {smartListContacts.length} contacts
                            </Text>
                          </Group>
                          {smartListContactsLoading ? (
                            <Group gap="xs">
                              <Loader size="xs" />
                              <Text size="xs" c="dimmed">
                                Loading contacts...
                              </Text>
                            </Group>
                          ) : (
                            <Group gap="xs">
                              {smartListContacts.slice(0, 5).map((c) => (
                                <Avatar
                                  key={c.id}
                                  size="sm"
                                  color="blue"
                                  radius="xl"
                                >
                                  {c.firstName?.[0]?.toUpperCase()}
                                </Avatar>
                              ))}
                              {smartListContacts.length > 5 && (
                                <Text size="xs" c="dimmed">
                                  +{smartListContacts.length - 5} more
                                </Text>
                              )}
                            </Group>
                          )}
                        </Stack>
                      </Paper>
                    )}
                  </Stack>
                )}

                {/* Salutation Toggle */}
                <Group gap="xs">
                  <input
                    type="checkbox"
                    id="addSalutation"
                    checked={addSalutation}
                    onChange={(e) => setAddSalutation(e.target.checked)}
                  />
                  <label htmlFor="addSalutation">
                    <Text size="sm" c="dimmed">
                      Add personalized greeting (Hey [FirstName], ...)
                    </Text>
                  </label>
                </Group>

                {/* Message Form */}
                <Stack gap="sm">
                  <Text
                    fw={500}
                    size="sm"
                    style={{ color: "var(--crm-sidebar-text-active)" }}
                  >
                    Message:
                  </Text>
                  <Textarea
                    placeholder="Type your message here..."
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    minRows={6}
                    maxRows={12}
                    autosize
                  />
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">
                      {messageText.length}/4096 characters
                    </Text>
                    <Button
                      leftSection={<IconSend size={16} />}
                      onClick={handleSendMessage}
                      disabled={!canSend() || isSending}
                      loading={isSending}
                    >
                      {isSending
                        ? "Sending..."
                        : `Send to ${getRecipientCount()} recipient${getRecipientCount() !== 1 ? "s" : ""}`}
                    </Button>
                  </Group>
                </Stack>

                {/* Send Results */}
                {(sendBulkMessage.isSuccess ||
                  sendBulkMessageToList.isSuccess) && (
                  <Alert
                    icon={<IconCheck size={16} />}
                    color="green"
                    variant="light"
                  >
                    <Text fw={500}>Messages Sent Successfully!</Text>
                    {(sendBulkMessage.data ?? sendBulkMessageToList.data) && (
                      <Text size="sm" mt="xs">
                        Delivered to{" "}
                        {sendBulkMessage.data?.successCount ??
                          sendBulkMessageToList.data?.successCount}{" "}
                        recipient(s)
                        {(sendBulkMessage.data?.failureCount ??
                          sendBulkMessageToList.data?.failureCount ??
                          0) > 0 &&
                          `, ${sendBulkMessage.data?.failureCount ?? sendBulkMessageToList.data?.failureCount} failed`}
                      </Text>
                    )}
                  </Alert>
                )}

                {(sendBulkMessage.error ?? sendBulkMessageToList.error) && (
                  <Alert icon={<IconX size={16} />} color="red" variant="light">
                    <Text fw={500}>Failed to Send Messages</Text>
                    <Text size="sm">
                      {sendBulkMessage.error?.message ??
                        sendBulkMessageToList.error?.message}
                    </Text>
                  </Alert>
                )}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
