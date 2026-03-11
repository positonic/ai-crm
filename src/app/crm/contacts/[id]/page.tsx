"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { api } from "~/trpc/react";
import {
  Stack,
  Title,
  Text,
  Badge,
  Avatar,
  Group,
  Paper,
  Tabs,
  Anchor,
  Button,
  Loader,
  Center,
  Alert,
  ActionIcon,
  Box,
  Divider,
  Modal,
  Select,
  NumberInput,
  Tooltip,
} from "@mantine/core";
import {
  IconBuilding,
  IconChevronLeft,
  IconChevronRight,
  IconChevronDown,
  IconAlertCircle,
  IconMail,
  IconPhone,
  IconNotes,
  IconChecklist,
  IconFolder,
  IconActivity,
  IconStar,
  IconPlus,
  IconDots,
  IconExternalLink,
  IconLink,
  IconBrandTelegram,
  IconUser,
  IconBriefcase,
  IconMapPin,
  IconDownload,
  IconRefresh,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import Link from "next/link";
import MessageViewerModal from "../../components/MessageViewerModal";

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  if (diffDays < 60) return "1 month ago";
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return new Date(date).toLocaleDateString();
}

// Type for communication message
type CommunicationMessage = {
  id: string;
  channel: string;
  subject?: string | null;
  textContent?: string | null;
  htmlContent?: string | null;
  fromEmail?: string | null;
  toEmail?: string | null;
  fromTelegram?: string | null;
  toTelegram?: string | null;
  sentAt?: Date | null;
  createdAt: Date;
  contact?: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
};

export default function ContactDetailsPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const contactId = params.id as string;
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [selectedMessage, setSelectedMessage] =
    useState<CommunicationMessage | null>(null);
  const [messageModalOpened, setMessageModalOpened] = useState(false);
  const [importTelegramModalOpened, setImportTelegramModalOpened] =
    useState(false);
  const [importGmailModalOpened, setImportGmailModalOpened] = useState(false);
  const [selectedTelegramEventId, setSelectedTelegramEventId] =
    useState<string>("");
  const [selectedGmailEventId, setSelectedGmailEventId] = useState<string>("");
  const [maxGmailMessages, setMaxGmailMessages] = useState<number>(100);
  const [maxTelegramMessages, setMaxTelegramMessages] = useState<number>(100);
  const [reconnecting, setReconnecting] = useState(false);

  const handleOpenMessage = (message: CommunicationMessage) => {
    setSelectedMessage(message);
    setMessageModalOpened(true);
  };

  const {
    data: contact,
    isLoading,
    error,
  } = api.contact.getContact.useQuery(
    { id: contactId },
    { enabled: !!contactId },
  );

  const { data: communications, refetch: refetchCommunications } =
    api.contact.getContactCommunications.useQuery(
      { contactId, limit: 100 },
      { enabled: !!contactId },
    );

  const { data: events } = api.event.getEvents.useQuery();

  // Fetch all contacts for prev/next navigation
  const { data: allContacts } = api.contact.getContacts.useQuery();

  // Calculate prev/next contact IDs (sorted alphabetically by name)
  const sortedContacts = allContacts
    ? [...allContacts].sort((a, b) => {
        const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
        const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
        return nameA.localeCompare(nameB);
      })
    : [];
  const currentIndex = sortedContacts.findIndex((c) => c.id === contactId);
  const prevContact =
    currentIndex > 0 ? sortedContacts[currentIndex - 1] : null;
  const nextContact =
    currentIndex >= 0 && currentIndex < sortedContacts.length - 1
      ? sortedContacts[currentIndex + 1]
      : null;
  const totalContacts = sortedContacts.length;

  const importTelegramMessages =
    api.contact.importTelegramMessagesForContact.useMutation({
      onSuccess: (result) => {
        notifications.show({
          title: "Import Complete",
          message: `Successfully imported ${result.imported} Telegram messages`,
          color: "green",
        });
        setImportTelegramModalOpened(false);
        void refetchCommunications();
      },
      onError: (error) => {
        notifications.show({
          title: "Import Failed",
          message: error.message,
          color: "red",
        });
      },
    });

  const disconnectGoogleAccount =
    api.contact.disconnectGoogleAccount.useMutation();

  const importGmailMessages =
    api.contact.importGmailMessagesForContact.useMutation({
      onSuccess: (result) => {
        notifications.show({
          title: "Import Complete",
          message: `Successfully imported ${result.imported} Gmail messages`,
          color: "green",
        });
        setImportGmailModalOpened(false);
        void refetchCommunications();
      },
      onError: (error) => {
        notifications.show({
          title: "Import Failed",
          message: error.message,
          color: "red",
        });
      },
    });

  const handleImportTelegram = () => {
    importTelegramMessages.mutate({
      contactId,
      eventId: selectedTelegramEventId || undefined,
      maxMessages: maxTelegramMessages,
    });
  };

  const handleImportGmail = () => {
    importGmailMessages.mutate({
      contactId,
      eventId: selectedGmailEventId || undefined,
      maxMessages: maxGmailMessages,
    });
  };

  const handleReconnectGoogle = async () => {
    setReconnecting(true);
    try {
      await disconnectGoogleAccount.mutateAsync();
      setTimeout(() => {
        window.location.href = "/api/auth/signin?provider=google";
      }, 500);
    } catch (e) {
      console.error("Failed to disconnect Google account:", e);
      setReconnecting(false);
      notifications.show({
        title: "Reconnect Failed",
        message: "Failed to disconnect Google account. Please try again.",
        color: "red",
      });
    }
  };

  // Handle authentication on client side
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/crm/contacts");
    return null;
  }

  if (session.user.role !== "staff" && session.user.role !== "admin") {
    redirect("/unauthorized");
    return null;
  }

  if (isLoading) {
    return (
      <Box
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--theme-crm-bg)",
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">Loading contact details...</Text>
        </Stack>
      </Box>
    );
  }

  if (error ?? !contact) {
    return (
      <Box
        p="xl"
        style={{ background: "var(--theme-crm-bg)", minHeight: "100vh" }}
      >
        <Stack gap="lg">
          <Button
            component={Link}
            href="/crm/contacts"
            leftSection={<IconChevronLeft size={16} />}
            variant="subtle"
          >
            Back to Contacts
          </Button>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
          >
            <Text fw={500}>Contact Not Found</Text>
            <Text size="sm">
              The contact you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to view it.
            </Text>
          </Alert>
        </Stack>
      </Box>
    );
  }

  const emailCount =
    communications?.filter((c) => c.channel === "EMAIL").length ?? 0;
  const telegramCount =
    communications?.filter((c) => c.channel === "TELEGRAM").length ?? 0;
  const callCount = 0;

  // Build activity items
  const activityItems: Array<{
    id: string;
    type: "email" | "telegram" | "system" | "created";
    description: string;
    actor: string;
    timestamp: Date;
    subject?: string;
  }> = [];

  // Add communications as activity
  communications?.forEach((comm) => {
    const isTelegram = comm.channel === "TELEGRAM";
    activityItems.push({
      id: comm.id,
      type: isTelegram ? "telegram" : "email",
      description: isTelegram ? "sent a message" : "sent an email",
      actor: `${contact.firstName} ${contact.lastName}`,
      timestamp: comm.sentAt ?? comm.createdAt,
      subject: comm.subject ?? comm.textContent?.slice(0, 60) ?? "",
    });
  });

  // Add creation activity (use earliest communication or a default date)
  const earliestDate =
    communications && communications.length > 0
      ? new Date(
          Math.min(
            ...communications.map((c) => new Date(c.createdAt).getTime()),
          ),
        )
      : new Date();

  activityItems.push({
    id: "created",
    type: "created",
    description: "was created by",
    actor: `${contact.firstName} ${contact.lastName}`,
    timestamp: earliestDate,
  });

  // Sort by timestamp descending
  activityItems.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  // Group activities by time period
  const groupActivitiesByPeriod = (items: typeof activityItems) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());

    const groups: Record<string, typeof activityItems> = {};

    items.forEach((item) => {
      const itemDate = new Date(item.timestamp);
      let period: string;

      if (itemDate > now) {
        period = "Upcoming";
      } else if (itemDate >= thisWeekStart) {
        period = "This week";
      } else if (itemDate.getFullYear() === now.getFullYear()) {
        period = itemDate.toLocaleDateString("en-US", { month: "long" });
      } else {
        period = itemDate.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }

      const periodItems = groups[period] ?? [];
      periodItems.push(item);
      groups[period] = periodItems;
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByPeriod(activityItems);

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "var(--theme-crm-bg)",
      }}
    >
      {/* Top Navigation Bar */}
      <Box
        px="md"
        py="xs"
        style={{
          borderBottom: "1px solid var(--theme-crm-border)",
          background: "var(--theme-crm-surface)",
        }}
      >
        <Group justify="space-between">
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              size="sm"
              component={Link}
              href="/crm/contacts"
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Tooltip
              label={
                prevContact
                  ? `Previous: ${prevContact.firstName} ${prevContact.lastName}`
                  : "No previous contact"
              }
            >
              {prevContact ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  component={Link}
                  href={`/crm/contacts/${prevContact.id}`}
                >
                  <IconChevronLeft size={14} />
                </ActionIcon>
              ) : (
                <ActionIcon variant="subtle" size="sm" disabled>
                  <IconChevronLeft size={14} />
                </ActionIcon>
              )}
            </Tooltip>
            <Tooltip
              label={
                nextContact
                  ? `Next: ${nextContact.firstName} ${nextContact.lastName}`
                  : "No next contact"
              }
            >
              {nextContact ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  component={Link}
                  href={`/crm/contacts/${nextContact.id}`}
                >
                  <IconChevronRight size={14} />
                </ActionIcon>
              ) : (
                <ActionIcon variant="subtle" size="sm" disabled>
                  <IconChevronRight size={14} />
                </ActionIcon>
              )}
            </Tooltip>
            <Text size="sm" c="dimmed">
              {currentIndex >= 0
                ? `${currentIndex + 1} of ${totalContacts} in`
                : "Contact in"}{" "}
              All People
            </Text>
          </Group>
          <Group gap="xs">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconMail size={14} />}
            >
              Compose email
            </Button>
            <ActionIcon variant="subtle" size="sm">
              <IconExternalLink size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm">
              <IconLink size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" size="sm">
              <IconDots size={16} />
            </ActionIcon>
          </Group>
        </Group>
      </Box>

      {/* Contact Header */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--theme-crm-border)",
          background: "var(--theme-crm-surface)",
        }}
      >
        <Group gap="md">
          <Avatar size={36} radius="xl" color="gray">
            {contact.firstName[0]?.toUpperCase()}
          </Avatar>
          <Title order={3} fw={500}>
            {contact.firstName} {contact.lastName}
          </Title>
          <ActionIcon variant="subtle" size="xs">
            <IconStar size={16} />
          </ActionIcon>
        </Group>
      </Box>

      {/* Main Content Area */}
      <Box style={{ display: "flex" }}>
        {/* Left Content */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            variant="unstyled"
            styles={{
              root: {
                borderBottom: "1px solid var(--theme-crm-border)",
                background: "var(--theme-crm-surface)",
              },
              list: {
                gap: 0,
              },
              tab: {
                padding: "12px 16px",
                color: "var(--mantine-color-dimmed)",
                fontWeight: 500,
                fontSize: "14px",
                borderBottom: "2px solid transparent",
                "&[data-active]": {
                  color: "var(--mantine-color-text)",
                  borderBottomColor: "var(--mantine-color-text)",
                },
                "&:hover": {
                  background: "var(--theme-crm-surface-hover)",
                },
              },
            }}
          >
            <Tabs.List px="md">
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="activity">Activity</Tabs.Tab>
              <Tabs.Tab value="emails">
                <Group gap={6}>
                  Emails
                  <Badge size="xs" variant="light">
                    {emailCount}
                  </Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="telegram">
                <Group gap={6}>
                  Telegram
                  <Badge size="xs" variant="light">
                    {telegramCount}
                  </Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="calls">
                <Group gap={6}>
                  Calls
                  <Badge size="xs" variant="light">
                    {callCount}
                  </Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="company">
                <Group gap={6}>
                  Company
                  <Badge size="xs" variant="light">
                    {contact.sponsor ? 1 : 0}
                  </Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="notes">
                <Group gap={6}>
                  Notes
                  <Badge size="xs" variant="light">
                    0
                  </Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="tasks">
                <Group gap={6}>
                  Tasks
                  <Badge size="xs" variant="light">
                    0
                  </Badge>
                </Group>
              </Tabs.Tab>
              <Tabs.Tab value="files">Files</Tabs.Tab>
            </Tabs.List>
          </Tabs>

          {/* Tab Content */}
          <Box p="md">
            {activeTab === "overview" && (
              <Stack gap="lg">
                {/* Highlights Section */}
                <Box>
                  <Group gap="xs" mb="sm">
                    <IconActivity size={16} />
                    <Text size="sm" fw={600} c="dimmed">
                      Highlights
                    </Text>
                  </Group>

                  {/* Highlights Grid */}
                  <Box
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: "12px",
                    }}
                  >
                    {/* Connection Strength */}
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--theme-crm-card)",
                        border: "1px solid var(--theme-crm-card-border)",
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Connection strength
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconStar size={12} />
                          </ActionIcon>
                        </Group>
                        <Group gap="xs">
                          <Box
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background:
                                communications && communications.length > 5
                                  ? "var(--mantine-color-green-6)"
                                  : communications && communications.length > 0
                                    ? "var(--mantine-color-yellow-6)"
                                    : "var(--mantine-color-red-6)",
                            }}
                          />
                          <Text size="sm" fw={500}>
                            {communications && communications.length > 5
                              ? "Strong"
                              : communications && communications.length > 0
                                ? "Moderate"
                                : "Very weak"}
                          </Text>
                        </Group>
                      </Stack>
                    </Paper>

                    {/* Next Calendar Interaction */}
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--theme-crm-card)",
                        border: "1px solid var(--theme-crm-card-border)",
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Next calendar interaction
                          </Text>
                        </Group>
                        <Text size="sm" c="dimmed">
                          No interaction
                        </Text>
                      </Stack>
                    </Paper>

                    {/* Company */}
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--theme-crm-card)",
                        border: "1px solid var(--theme-crm-card-border)",
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Company
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconBuilding size={12} />
                          </ActionIcon>
                        </Group>
                        {contact.sponsor ? (
                          <>
                            <Group gap="xs">
                              <Text size="sm" fw={500}>
                                {contact.sponsor.name}
                              </Text>
                              <Avatar size="xs" color="cyan" radius="sm">
                                {contact.sponsor.name[0]}
                              </Avatar>
                            </Group>
                          </>
                        ) : (
                          <Text size="sm" c="dimmed">
                            No company
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    {/* Email Addresses */}
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--theme-crm-card)",
                        border: "1px solid var(--theme-crm-card-border)",
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Email addresses
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconMail size={12} />
                          </ActionIcon>
                        </Group>
                        {contact.email ? (
                          <Anchor href={`mailto:${contact.email}`} size="sm">
                            {contact.email}
                          </Anchor>
                        ) : (
                          <Text size="sm" c="dimmed">
                            No email
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    {/* Phone Numbers */}
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--theme-crm-card)",
                        border: "1px solid var(--theme-crm-card-border)",
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Phone numbers
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconPhone size={12} />
                          </ActionIcon>
                        </Group>
                        {contact.phone ? (
                          <Anchor href={`tel:${contact.phone}`} size="sm">
                            {contact.phone}
                          </Anchor>
                        ) : (
                          <Text size="sm" c="dimmed">
                            No phone numbers
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    {/* Primary Location */}
                    <Paper
                      p="md"
                      radius="md"
                      style={{
                        background: "var(--theme-crm-card)",
                        border: "1px solid var(--theme-crm-card-border)",
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="xs" c="dimmed">
                            Primary location
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconMapPin size={12} />
                          </ActionIcon>
                        </Group>
                        <Text size="sm" c="dimmed">
                          No Primary location
                        </Text>
                      </Stack>
                    </Paper>
                  </Box>
                </Box>

                {/* Activity Section */}
                <Box>
                  <Group gap="xs" mb="sm" justify="space-between">
                    <Group gap="xs">
                      <IconActivity size={16} />
                      <Text size="sm" fw={600} c="dimmed">
                        Activity
                      </Text>
                    </Group>
                    <Anchor
                      size="xs"
                      c="dimmed"
                      onClick={() => setActiveTab("activity")}
                    >
                      View all &gt;
                    </Anchor>
                  </Group>

                  <Stack gap="xs">
                    {activityItems.slice(0, 3).map((item) => (
                      <Box
                        key={item.id}
                        py="sm"
                        style={{
                          borderBottom: "1px solid var(--theme-crm-border)",
                        }}
                      >
                        <Group justify="space-between" align="flex-start">
                          <Group gap="sm" align="flex-start">
                            <Avatar
                              size={24}
                              radius="xl"
                              color={
                                item.type === "email"
                                  ? "blue"
                                  : item.type === "telegram"
                                    ? "cyan"
                                    : item.type === "system"
                                      ? "gray"
                                      : "violet"
                              }
                            >
                              {item.type === "system"
                                ? "S"
                                : item.actor[0]?.toUpperCase()}
                            </Avatar>
                            <Text size="sm">
                              <Text span fw={600}>
                                {item.actor}
                              </Text>{" "}
                              <Text span c="dimmed">
                                {item.description}
                              </Text>
                              {item.type === "created" && (
                                <Text span c="dimmed">
                                  {" "}
                                  System
                                </Text>
                              )}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {getRelativeTime(item.timestamp)}
                          </Text>
                        </Group>
                      </Box>
                    ))}
                    {activityItems.length === 0 && (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No activity yet
                      </Text>
                    )}
                  </Stack>
                </Box>

                {/* Emails Section */}
                <Box>
                  <Group gap="xs" mb="sm" justify="space-between">
                    <Group gap="xs">
                      <IconMail size={16} />
                      <Text size="sm" fw={600} c="dimmed">
                        Emails
                      </Text>
                      <Badge size="xs" variant="light">
                        {emailCount}
                      </Badge>
                      <Anchor
                        size="xs"
                        c="dimmed"
                        onClick={() => setActiveTab("emails")}
                      >
                        &gt;
                      </Anchor>
                    </Group>
                    <ActionIcon variant="subtle" size="xs">
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Group>

                  <Stack gap="xs">
                    {communications
                      ?.filter((c) => c.channel === "EMAIL")
                      .slice(0, 3)
                      .map((email) => (
                        <Box
                          key={email.id}
                          py="sm"
                          style={{
                            borderBottom: "1px solid var(--theme-crm-border)",
                            cursor: "pointer",
                          }}
                          className="crm-message-row"
                          onClick={() => handleOpenMessage(email)}
                        >
                          <Group gap="sm" align="flex-start">
                            <Avatar size={24} radius="xl" color="orange">
                              {contact.firstName[0]?.toUpperCase()}
                            </Avatar>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Group
                                justify="space-between"
                                align="flex-start"
                                wrap="nowrap"
                              >
                                <Group
                                  gap="sm"
                                  style={{ flex: 1, minWidth: 0 }}
                                >
                                  <Text size="sm" fw={600}>
                                    {contact.firstName} {contact.lastName}
                                  </Text>
                                  <Text size="sm" fw={500} lineClamp={1}>
                                    {email.subject ?? "No subject"}
                                  </Text>
                                  <Text size="sm" c="dimmed" lineClamp={1}>
                                    {email.textContent
                                      ? email.textContent.slice(0, 40)
                                      : "No content"}
                                  </Text>
                                </Group>
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{ flexShrink: 0 }}
                                >
                                  {getRelativeTime(
                                    email.sentAt ?? email.createdAt,
                                  )}
                                </Text>
                              </Group>
                            </Box>
                          </Group>
                        </Box>
                      ))}
                    {emailCount === 0 && (
                      <Text size="sm" c="dimmed" ta="center" py="md">
                        No emails yet
                      </Text>
                    )}
                  </Stack>
                </Box>

                {/* Import Buttons (if applicable) */}
                {(contact.telegram ??
                  (contact.email &&
                    !contact.email.endsWith("telegram.placeholder"))) && (
                  <Box>
                    <Group gap="xs" mb="sm">
                      <IconDownload size={16} />
                      <Text size="sm" fw={600} c="dimmed">
                        Import Messages
                      </Text>
                    </Group>
                    <Group gap="sm">
                      {contact.telegram && (
                        <Button
                          leftSection={<IconBrandTelegram size={16} />}
                          variant="light"
                          color="blue"
                          size="xs"
                          onClick={() => setImportTelegramModalOpened(true)}
                          loading={importTelegramMessages.isPending}
                        >
                          Import Telegram
                        </Button>
                      )}
                      {contact.email &&
                        !contact.email.endsWith("telegram.placeholder") && (
                          <Button
                            leftSection={<IconMail size={16} />}
                            variant="light"
                            color="green"
                            size="xs"
                            onClick={() => setImportGmailModalOpened(true)}
                            loading={importGmailMessages.isPending}
                          >
                            Import Gmail
                          </Button>
                        )}
                    </Group>
                    {importGmailMessages.error && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        mt="sm"
                      >
                        <Text size="sm" mb="sm">
                          {importGmailMessages.error.message ===
                          "GOOGLE_GMAIL_PERMISSIONS_INSUFFICIENT"
                            ? "Gmail access permission is missing. Please reconnect your Google account."
                            : importGmailMessages.error.message}
                        </Text>
                        {importGmailMessages.error.message ===
                          "GOOGLE_GMAIL_PERMISSIONS_INSUFFICIENT" && (
                          <Button
                            size="xs"
                            variant="outline"
                            leftSection={
                              reconnecting ? (
                                <Loader size={14} />
                              ) : (
                                <IconRefresh size={14} />
                              )
                            }
                            onClick={handleReconnectGoogle}
                            disabled={
                              reconnecting || disconnectGoogleAccount.isPending
                            }
                          >
                            Reconnect Google
                          </Button>
                        )}
                      </Alert>
                    )}
                  </Box>
                )}
              </Stack>
            )}

            {activeTab === "activity" && (
              <Stack gap="lg">
                {/* Activity Header */}
                <Group justify="space-between" align="center">
                  <Title order={4}>Activity</Title>
                  <Button
                    variant="subtle"
                    size="sm"
                    leftSection={<IconPlus size={16} />}
                    disabled
                  >
                    Add meeting
                  </Button>
                </Group>

                {/* Grouped Activities */}
                {Object.entries(groupedActivities).map(([period, items]) => (
                  <Box key={period}>
                    {/* Period Header */}
                    <Group gap="md" mb="md" align="center">
                      <Badge
                        variant="light"
                        color="gray"
                        size="sm"
                        radius="sm"
                        style={{ textTransform: "none", fontWeight: 500 }}
                      >
                        {period}
                      </Badge>
                      <Box
                        style={{
                          flex: 1,
                          height: 1,
                          background: "var(--theme-crm-border)",
                        }}
                      />
                      <ActionIcon variant="subtle" size="sm">
                        <IconChevronDown size={14} />
                      </ActionIcon>
                    </Group>

                    {/* Activity Items */}
                    <Stack gap="md" pl="xs">
                      {items.map((item) => (
                        <Box key={item.id}>
                          <Group gap="md" align="flex-start" wrap="nowrap">
                            <Avatar
                              size={28}
                              radius="xl"
                              color={
                                item.type === "email"
                                  ? "blue"
                                  : item.type === "telegram"
                                    ? "cyan"
                                    : item.type === "system"
                                      ? "gray"
                                      : "violet"
                              }
                            >
                              {item.actor[0]?.toUpperCase() ?? "?"}
                            </Avatar>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                              <Group
                                justify="space-between"
                                align="flex-start"
                                wrap="nowrap"
                              >
                                <Text size="sm" lineClamp={1}>
                                  <Text span fw={600}>
                                    {item.actor}
                                  </Text>{" "}
                                  <Text span c="dimmed">
                                    {item.description}
                                  </Text>
                                  {item.type === "created" && (
                                    <Text span fw={600}>
                                      {" "}
                                      System
                                    </Text>
                                  )}
                                </Text>
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{ flexShrink: 0 }}
                                >
                                  {getRelativeTime(item.timestamp)}
                                </Text>
                              </Group>

                              {item.subject && (
                                <Box
                                  mt="xs"
                                  p="sm"
                                  style={{
                                    borderLeft: `3px solid ${
                                      item.type === "email"
                                        ? "var(--mantine-color-blue-6)"
                                        : item.type === "telegram"
                                          ? "var(--mantine-color-cyan-6)"
                                          : "var(--mantine-color-gray-6)"
                                    }`,
                                    background: "var(--theme-crm-card)",
                                    borderRadius: "0 6px 6px 0",
                                  }}
                                >
                                  <Text size="sm" fw={500} lineClamp={1}>
                                    {item.subject}
                                  </Text>
                                </Box>
                              )}
                            </Box>
                          </Group>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                ))}

                {activityItems.length === 0 && (
                  <Paper
                    p="xl"
                    radius="md"
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                    }}
                  >
                    <Stack align="center" gap="md">
                      <IconActivity size={48} style={{ opacity: 0.5 }} />
                      <Text c="dimmed">No activity yet</Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {activeTab === "emails" && (
              <Stack gap={0}>
                {communications
                  ?.filter((c) => c.channel === "EMAIL")
                  .map((email) => (
                    <Box
                      key={email.id}
                      p="md"
                      style={{
                        borderBottom: "1px solid var(--theme-crm-border)",
                        cursor: "pointer",
                      }}
                      className="crm-message-row"
                      onClick={() => handleOpenMessage(email)}
                    >
                      <Group gap="md" align="flex-start" wrap="nowrap">
                        <Avatar size={40} color="gray" radius="xl">
                          {contact.firstName[0]?.toUpperCase() ?? "?"}
                        </Avatar>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group
                            justify="space-between"
                            align="flex-start"
                            wrap="nowrap"
                            mb={4}
                          >
                            <Text
                              size="sm"
                              fw={600}
                              lineClamp={1}
                              style={{ flex: 1 }}
                            >
                              {email.subject ?? "No subject"}
                            </Text>
                            <Text
                              size="xs"
                              c="dimmed"
                              style={{ flexShrink: 0 }}
                            >
                              {email.sentAt
                                ? new Date(email.sentAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      day: "numeric",
                                      month: "short",
                                    },
                                  )
                                : new Date(email.createdAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      day: "numeric",
                                      month: "short",
                                    },
                                  )}
                            </Text>
                          </Group>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {contact.firstName} {contact.lastName}
                          </Text>
                          <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                            {email.textContent}
                          </Text>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                {emailCount === 0 && (
                  <Paper
                    p="xl"
                    radius="md"
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                    }}
                  >
                    <Stack align="center" gap="md">
                      <IconMail size={48} style={{ opacity: 0.5 }} />
                      <Text c="dimmed">No emails yet</Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {activeTab === "telegram" && (
              <Stack gap={0}>
                {communications
                  ?.filter((c) => c.channel === "TELEGRAM")
                  .map((message) => (
                    <Box
                      key={message.id}
                      p="md"
                      style={{
                        borderBottom: "1px solid var(--theme-crm-border)",
                        cursor: "pointer",
                      }}
                      className="crm-message-row"
                      onClick={() => handleOpenMessage(message)}
                    >
                      <Group gap="md" align="flex-start" wrap="nowrap">
                        <Avatar size={40} color="gray" radius="xl">
                          {contact.firstName[0]?.toUpperCase() ?? "?"}
                        </Avatar>
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group
                            justify="space-between"
                            align="flex-start"
                            wrap="nowrap"
                            mb={4}
                          >
                            <Text
                              size="sm"
                              fw={600}
                              lineClamp={1}
                              style={{ flex: 1 }}
                            >
                              {contact.firstName} {contact.lastName}
                            </Text>
                            <Text
                              size="xs"
                              c="dimmed"
                              style={{ flexShrink: 0 }}
                            >
                              {message.sentAt
                                ? new Date(message.sentAt).toLocaleDateString(
                                    "en-US",
                                    {
                                      day: "numeric",
                                      month: "short",
                                    },
                                  )
                                : new Date(
                                    message.createdAt,
                                  ).toLocaleDateString("en-US", {
                                    day: "numeric",
                                    month: "short",
                                  })}
                            </Text>
                          </Group>
                          <Text size="sm" c="dimmed" lineClamp={1}>
                            {message.fromTelegram && message.toTelegram && (
                              <Text span size="sm" c="dimmed">
                                @{message.fromTelegram} → @{message.toTelegram}
                              </Text>
                            )}
                          </Text>
                          <Text size="sm" c="dimmed" lineClamp={2} mt={4}>
                            {message.textContent}
                          </Text>
                        </Box>
                      </Group>
                    </Box>
                  ))}
                {telegramCount === 0 && (
                  <Paper
                    p="xl"
                    radius="md"
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                    }}
                  >
                    <Stack align="center" gap="md">
                      <IconBrandTelegram size={48} style={{ opacity: 0.5 }} />
                      <Text c="dimmed">No Telegram messages yet</Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {activeTab === "company" && (
              <Stack gap="md">
                {contact.sponsor ? (
                  <Paper
                    p="md"
                    radius="md"
                    component={Link}
                    href={`/crm/organizations/${contact.sponsor.id}`}
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                  >
                    <Group gap="md">
                      {contact.sponsor.logoUrl ? (
                        <Avatar
                          src={contact.sponsor.logoUrl}
                          size="lg"
                          radius="sm"
                        >
                          {contact.sponsor.name[0]?.toUpperCase()}
                        </Avatar>
                      ) : (
                        <Avatar size="lg" color="cyan" radius="sm">
                          <IconBuilding size={24} />
                        </Avatar>
                      )}
                      <Stack gap={2}>
                        <Text fw={500} size="lg">
                          {contact.sponsor.name}
                        </Text>
                        {contact.sponsor.websiteUrl && (
                          <Text size="sm" c="dimmed">
                            {new URL(
                              contact.sponsor.websiteUrl,
                            ).hostname.replace("www.", "")}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                ) : (
                  <Paper
                    p="xl"
                    radius="md"
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                    }}
                  >
                    <Stack align="center" gap="md">
                      <IconBuilding size={48} style={{ opacity: 0.5 }} />
                      <Text c="dimmed">No company associated</Text>
                    </Stack>
                  </Paper>
                )}
              </Stack>
            )}

            {(activeTab === "calls" ||
              activeTab === "notes" ||
              activeTab === "tasks" ||
              activeTab === "files") && (
              <Paper
                p="xl"
                radius="md"
                style={{
                  background: "var(--theme-crm-card)",
                  border: "1px solid var(--theme-crm-card-border)",
                }}
              >
                <Stack align="center" gap="md">
                  {activeTab === "calls" && (
                    <IconPhone size={48} style={{ opacity: 0.5 }} />
                  )}
                  {activeTab === "notes" && (
                    <IconNotes size={48} style={{ opacity: 0.5 }} />
                  )}
                  {activeTab === "tasks" && (
                    <IconChecklist size={48} style={{ opacity: 0.5 }} />
                  )}
                  {activeTab === "files" && (
                    <IconFolder size={48} style={{ opacity: 0.5 }} />
                  )}
                  <Text c="dimmed">No {activeTab} yet</Text>
                </Stack>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Right Sidebar - Details */}
        <Box
          style={{
            width: 360,
            borderLeft: "1px solid var(--theme-crm-border)",
            background: "var(--theme-crm-surface)",
          }}
        >
          {/* Sidebar Tabs */}
          <Tabs
            defaultValue="details"
            variant="unstyled"
            styles={{
              root: {
                borderBottom: "1px solid var(--theme-crm-border)",
              },
              tab: {
                padding: "12px 16px",
                color: "var(--mantine-color-dimmed)",
                fontWeight: 500,
                fontSize: "14px",
                borderBottom: "2px solid transparent",
                "&[data-active]": {
                  color: "var(--mantine-color-text)",
                  borderBottomColor: "var(--mantine-color-text)",
                },
              },
            }}
          >
            <Tabs.List px="md">
              <Tabs.Tab value="details">Details</Tabs.Tab>
              <Tabs.Tab value="comments">
                <Group gap={6}>
                  Comments
                  <Badge size="xs" variant="light">
                    0
                  </Badge>
                </Group>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="details">
              <Box p="md">
                <Stack gap="lg">
                  {/* Record Details */}
                  <Box>
                    <Group gap="xs" mb="md">
                      <Text size="xs" c="dimmed" fw={500}>
                        ▾ Record Details
                      </Text>
                    </Group>

                    <Stack gap="md">
                      {/* Name */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconUser size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Name
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Text size="sm">
                            {contact.firstName} {contact.lastName}
                          </Text>
                        </Box>
                      </Group>

                      {/* Email */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconMail size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Email addresses
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          {contact.email ? (
                            <Anchor href={`mailto:${contact.email}`} size="sm">
                              {contact.email}
                            </Anchor>
                          ) : (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          )}
                        </Box>
                      </Group>

                      {/* Description */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconNotes size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Description
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Text size="sm" c="dimmed">
                            {contact.about ?? "Set Description..."}
                          </Text>
                        </Box>
                      </Group>

                      {/* Company */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconBuilding size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Company
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          {contact.sponsor ? (
                            <Group gap="xs">
                              <Avatar size="xs" color="cyan" radius="sm">
                                {contact.sponsor.name[0]}
                              </Avatar>
                              <Anchor
                                component={Link}
                                href={`/crm/organizations/${contact.sponsor.id}`}
                                size="sm"
                              >
                                {contact.sponsor.name}
                              </Anchor>
                            </Group>
                          ) : (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          )}
                        </Box>
                      </Group>

                      {/* Job Title */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconBriefcase size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Job title
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Text size="sm" c="dimmed">
                            Set Job title...
                          </Text>
                        </Box>
                      </Group>

                      {/* Telegram */}
                      {contact.telegram && (
                        <Group gap="md" align="flex-start">
                          <Box style={{ width: 100 }}>
                            <Group gap={6}>
                              <IconBrandTelegram
                                size={14}
                                style={{ opacity: 0.5 }}
                              />
                              <Text size="xs" c="dimmed">
                                Telegram
                              </Text>
                            </Group>
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Anchor
                              href={`https://t.me/${contact.telegram}`}
                              target="_blank"
                              size="sm"
                            >
                              @{contact.telegram}
                            </Anchor>
                          </Box>
                        </Group>
                      )}

                      {/* Show all values */}
                      <Anchor size="xs" c="dimmed">
                        Show all values &gt;
                      </Anchor>
                    </Stack>
                  </Box>

                  <Divider />

                  {/* Lists Section */}
                  <Box>
                    <Group justify="space-between" mb="md">
                      <Group gap="xs">
                        <Text size="xs" c="dimmed" fw={500}>
                          ▾ Lists
                        </Text>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Add to list
                      </Text>
                    </Group>

                    <Text size="sm" c="dimmed">
                      This record has not been added to any lists
                    </Text>
                  </Box>
                </Stack>
              </Box>
            </Tabs.Panel>

            <Tabs.Panel value="comments">
              <Box p="md">
                <Text size="sm" c="dimmed" ta="center">
                  No comments yet
                </Text>
              </Box>
            </Tabs.Panel>
          </Tabs>
        </Box>
      </Box>

      {/* Message Viewer Modal */}
      <MessageViewerModal
        opened={messageModalOpened}
        onClose={() => {
          setMessageModalOpened(false);
          setSelectedMessage(null);
        }}
        message={selectedMessage}
      />

      {/* Import Telegram Messages Modal */}
      <Modal
        opened={importTelegramModalOpened}
        onClose={() => setImportTelegramModalOpened(false)}
        title="Import Telegram Messages"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Import chat history with <strong>@{contact.telegram}</strong> into
            the Communication table.
          </Text>

          <Select
            label="Event (Optional)"
            placeholder="Select an event (optional)"
            description="Leave empty if messages aren't specific to an event"
            data={
              events?.map((event) => ({
                value: event.id,
                label: event.name,
              })) ?? []
            }
            value={selectedTelegramEventId}
            onChange={(value) => setSelectedTelegramEventId(value ?? "")}
            clearable
          />

          <NumberInput
            label="Maximum Messages"
            description="Number of recent messages to import (max 10,000)"
            min={1}
            max={10000}
            value={maxTelegramMessages}
            onChange={(value) =>
              setMaxTelegramMessages(typeof value === "number" ? value : 100)
            }
          />

          <Text size="sm" c="dimmed">
            This will import up to {maxTelegramMessages} recent messages from
            your Telegram conversation.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setImportTelegramModalOpened(false)}
              disabled={importTelegramMessages.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportTelegram}
              loading={importTelegramMessages.isPending}
              leftSection={<IconDownload size={16} />}
            >
              Import Messages
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Import Gmail Messages Modal */}
      <Modal
        opened={importGmailModalOpened}
        onClose={() => setImportGmailModalOpened(false)}
        title="Import Gmail Messages"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Import email history with <strong>{contact.email}</strong> into the
            Communication table.
          </Text>

          <Select
            label="Event (Optional)"
            placeholder="Select an event (optional)"
            description="Leave empty if messages aren't specific to an event"
            data={
              events?.map((event) => ({
                value: event.id,
                label: event.name,
              })) ?? []
            }
            value={selectedGmailEventId}
            onChange={(value) => setSelectedGmailEventId(value ?? "")}
            clearable
          />

          <NumberInput
            label="Maximum Messages"
            description="Number of recent emails to import (max 10,000)"
            min={1}
            max={10000}
            value={maxGmailMessages}
            onChange={(value) =>
              setMaxGmailMessages(typeof value === "number" ? value : 100)
            }
          />

          <Text size="sm" c="dimmed">
            This will import up to {maxGmailMessages} recent emails from or to
            this contact.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="subtle"
              onClick={() => setImportGmailModalOpened(false)}
              disabled={importGmailMessages.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportGmail}
              loading={importGmailMessages.isPending}
              leftSection={<IconDownload size={16} />}
              color="green"
            >
              Import Messages
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
