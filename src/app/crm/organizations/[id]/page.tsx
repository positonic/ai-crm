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
  Tooltip,
  Box,
  Divider,
} from "@mantine/core";
import {
  IconWorld,
  IconBuilding,
  IconUsers,
  IconCalendar,
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
  IconCopy,
  IconLink,
  IconBrandTelegram,
} from "@tabler/icons-react";
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
  return new Date(date).toLocaleDateString();
}

// Helper function to get days until future date
function getDaysUntil(date: Date): string {
  const now = new Date();
  const diffMs = new Date(date).getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `in ${diffDays} days`;
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

export default function OrganizationDetailsPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const organizationId = params.id as string;
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [selectedMessage, setSelectedMessage] =
    useState<CommunicationMessage | null>(null);
  const [messageModalOpened, setMessageModalOpened] = useState(false);

  const handleOpenMessage = (message: CommunicationMessage) => {
    setSelectedMessage(message);
    setMessageModalOpened(true);
  };

  const {
    data: organization,
    isLoading,
    error,
  } = api.sponsor.getSponsor.useQuery(
    { id: organizationId },
    { enabled: !!organizationId },
  );

  const { data: communications } =
    api.sponsor.getSponsorCommunications.useQuery(
      { sponsorId: organizationId, limit: 20 },
      { enabled: !!organizationId },
    );

  // Fetch all organizations for prev/next navigation
  const { data: allOrganizations } = api.sponsor.getSponsors.useQuery();

  // Calculate prev/next organization IDs
  const currentIndex =
    allOrganizations?.findIndex((org) => org.id === organizationId) ?? -1;
  const prevOrganization =
    currentIndex > 0 ? allOrganizations?.[currentIndex - 1] : null;
  const nextOrganization =
    currentIndex >= 0 && currentIndex < (allOrganizations?.length ?? 0) - 1
      ? allOrganizations?.[currentIndex + 1]
      : null;
  const totalOrganizations = allOrganizations?.length ?? 0;

  // Handle authentication on client side
  if (status === "loading") {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!session?.user) {
    redirect("/signin?callbackUrl=/crm/organizations");
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
          <Text c="dimmed">Loading organization details...</Text>
        </Stack>
      </Box>
    );
  }

  if (error ?? !organization) {
    return (
      <Box
        p="xl"
        style={{ background: "var(--theme-crm-bg)", minHeight: "100vh" }}
      >
        <Stack gap="lg">
          <Button
            component={Link}
            href="/crm/organizations"
            leftSection={<IconChevronLeft size={16} />}
            variant="subtle"
          >
            Back to Organizations
          </Button>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            variant="light"
          >
            <Text fw={500}>Organization Not Found</Text>
            <Text size="sm">
              The organization you&apos;re looking for doesn&apos;t exist or you
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
  const callCount = 0; // Placeholder - could be from calls table

  // Build activity items from communications and events
  const activityItems: Array<{
    id: string;
    type: "email" | "telegram" | "meeting" | "system" | "created";
    description: string;
    actor: string;
    timestamp: Date;
    subject?: string;
    channel?: string;
  }> = [];

  // Add communications as activity
  communications?.forEach((comm) => {
    const isTelegram = comm.channel === "TELEGRAM";
    activityItems.push({
      id: comm.id,
      type: isTelegram ? "telegram" : "email",
      description: isTelegram ? "sent a message" : "sent an email",
      actor: comm.contact
        ? `${comm.contact.firstName} ${comm.contact.lastName}`
        : "System",
      timestamp: comm.sentAt ?? comm.createdAt,
      subject: comm.subject ?? comm.textContent?.slice(0, 60) ?? "",
      channel: comm.channel,
    });
  });

  // Add events as activity
  organization.events.forEach((evt) => {
    activityItems.push({
      id: evt.id,
      type: "meeting",
      description: `Event sponsorship: ${evt.eventId}`,
      actor: "System",
      timestamp: new Date(),
    });
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

  // Get domain from website URL
  const getDomain = (url: string | null): string | null => {
    if (!url) return null;
    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return url;
    }
  };

  const domain = getDomain(organization.websiteUrl);

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
              href="/crm/organizations"
            >
              <IconChevronLeft size={16} />
            </ActionIcon>
            <Tooltip
              label={
                prevOrganization
                  ? `Previous: ${prevOrganization.name}`
                  : "No previous organization"
              }
            >
              {prevOrganization ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  component={Link}
                  href={`/crm/organizations/${prevOrganization.id}`}
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
                nextOrganization
                  ? `Next: ${nextOrganization.name}`
                  : "No next organization"
              }
            >
              {nextOrganization ? (
                <ActionIcon
                  variant="subtle"
                  size="sm"
                  component={Link}
                  href={`/crm/organizations/${nextOrganization.id}`}
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
                ? `${currentIndex + 1} of ${totalOrganizations} in`
                : "Organization in"}{" "}
              All Companies
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

      {/* Company Header */}
      <Box
        px="md"
        py="sm"
        style={{
          borderBottom: "1px solid var(--theme-crm-border)",
          background: "var(--theme-crm-surface)",
        }}
      >
        <Group gap="md">
          {organization.logoUrl ? (
            <Avatar src={organization.logoUrl} size={36} radius="sm">
              {organization.name[0]?.toUpperCase()}
            </Avatar>
          ) : (
            <Avatar size={36} radius="sm">
              <IconBuilding size={20} />
            </Avatar>
          )}
          <Title order={3} fw={500}>
            {organization.name}
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
              <Tabs.Tab value="activity">
                <Group gap={6}>Activity</Group>
              </Tabs.Tab>
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
              <Tabs.Tab value="team">
                <Group gap={6}>
                  Team
                  <Badge size="xs" variant="light">
                    {organization.contacts.length}
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
                              background: "var(--mantine-color-green-6)",
                            }}
                          />
                          <Text size="sm" fw={500}>
                            Very strong
                          </Text>
                        </Group>
                        {organization.contacts[0] && (
                          <Text size="xs" c="dimmed">
                            {organization.contacts[0].firstName}{" "}
                            {organization.contacts[0].lastName}
                          </Text>
                        )}
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
                          <ActionIcon variant="subtle" size="xs">
                            <IconCopy size={12} />
                          </ActionIcon>
                        </Group>
                        {organization.events[0] ? (
                          <>
                            <Text size="sm" fw={500} lineClamp={1}>
                              Event: {organization.events[0].eventId}
                            </Text>
                            <Group gap="xs">
                              <Text size="xs" c="dimmed">
                                {getDaysUntil(new Date())}
                              </Text>
                              <Avatar.Group spacing="xs">
                                {organization.contacts
                                  .slice(0, 2)
                                  .map((contact) => (
                                    <Avatar
                                      key={contact.id}
                                      size="xs"
                                      color="blue"
                                    >
                                      {contact.firstName[0]}
                                    </Avatar>
                                  ))}
                                {organization.contacts.length > 2 && (
                                  <Avatar size="xs">
                                    +{organization.contacts.length - 2}
                                  </Avatar>
                                )}
                              </Avatar.Group>
                            </Group>
                          </>
                        ) : (
                          <Text size="sm" c="dimmed">
                            No upcoming events
                          </Text>
                        )}
                      </Stack>
                    </Paper>

                    {/* Team */}
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
                            Team
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconUsers size={12} />
                          </ActionIcon>
                        </Group>
                        <Avatar.Group spacing="sm">
                          {organization.contacts.slice(0, 3).map((contact) => (
                            <Tooltip
                              key={contact.id}
                              label={`${contact.firstName} ${contact.lastName}`}
                            >
                              <Avatar size="sm" color="blue">
                                {contact.firstName[0]}
                              </Avatar>
                            </Tooltip>
                          ))}
                          {organization.contacts.length > 3 && (
                            <Avatar size="sm">
                              +{organization.contacts.length - 3}
                            </Avatar>
                          )}
                        </Avatar.Group>
                      </Stack>
                    </Paper>

                    {/* Event Count */}
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
                            Events
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconCalendar size={12} />
                          </ActionIcon>
                        </Group>
                        <Text size="sm" fw={500}>
                          {organization.events.length}
                        </Text>
                      </Stack>
                    </Paper>

                    {/* Contacts */}
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
                            Contacts
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconUsers size={12} />
                          </ActionIcon>
                        </Group>
                        <Text size="sm" fw={500}>
                          {organization.contacts.length}
                        </Text>
                      </Stack>
                    </Paper>

                    {/* Communications */}
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
                            Communications
                          </Text>
                          <ActionIcon variant="subtle" size="xs">
                            <IconMail size={12} />
                          </ActionIcon>
                        </Group>
                        <Text size="sm" fw={500}>
                          {communications?.length ?? 0}
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
                    <Anchor size="xs" c="dimmed">
                      View all &gt;
                    </Anchor>
                  </Group>

                  <Stack gap="xs">
                    {activityItems.slice(0, 5).map((item) => (
                      <Paper
                        key={item.id}
                        p="sm"
                        radius="md"
                        style={{
                          background: "var(--theme-crm-card)",
                          border: "1px solid var(--theme-crm-card-border)",
                        }}
                      >
                        <Group justify="space-between" align="flex-start">
                          <Group gap="sm" align="flex-start">
                            <Box
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background:
                                  item.type === "email"
                                    ? "var(--mantine-color-blue-6)"
                                    : item.type === "meeting"
                                      ? "var(--mantine-color-green-6)"
                                      : "var(--mantine-color-gray-6)",
                                marginTop: 6,
                              }}
                            />
                            <Stack gap={2}>
                              <Group gap="xs">
                                <Text size="sm" fw={500}>
                                  {item.actor}
                                </Text>
                                <Text size="sm" c="dimmed">
                                  {item.type === "email"
                                    ? "sent"
                                    : item.type === "meeting"
                                      ? "scheduled"
                                      : ""}
                                </Text>
                                <Text size="sm">{item.description}</Text>
                              </Group>
                            </Stack>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {getRelativeTime(item.timestamp)}
                          </Text>
                        </Group>
                      </Paper>
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
                        <Text size="sm" c="dimmed" ta="center">
                          No activity yet
                        </Text>
                      </Paper>
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
                    </Group>
                    <ActionIcon variant="subtle" size="xs">
                      <IconPlus size={14} />
                    </ActionIcon>
                  </Group>

                  <Stack gap="xs">
                    {communications
                      ?.filter((c) => c.channel === "EMAIL")
                      .slice(0, 5)
                      .map((email) => (
                        <Paper
                          key={email.id}
                          p="sm"
                          radius="md"
                          style={{
                            background: "var(--theme-crm-card)",
                            border: "1px solid var(--theme-crm-card-border)",
                          }}
                        >
                          <Group justify="space-between" align="flex-start">
                            <Group gap="sm" align="flex-start">
                              <Avatar size="sm" color="blue">
                                {email.contact?.firstName?.[0] ?? "?"}
                              </Avatar>
                              <Stack gap={2}>
                                <Text size="sm" fw={500}>
                                  {email.contact
                                    ? `${email.contact.firstName} ${email.contact.lastName}`
                                    : "Unknown"}
                                </Text>
                                <Text size="sm" c="dimmed" lineClamp={1}>
                                  {email.subject ?? "No subject"}
                                </Text>
                              </Stack>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {getRelativeTime(email.sentAt ?? email.createdAt)}
                            </Text>
                          </Group>
                        </Paper>
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
                        <Text size="sm" c="dimmed" ta="center">
                          No emails yet
                        </Text>
                      </Paper>
                    )}
                  </Stack>
                </Box>
              </Stack>
            )}

            {activeTab === "team" && (
              <Stack gap="md">
                {organization.contacts.map((contact) => (
                  <Paper
                    key={contact.id}
                    p="md"
                    radius="md"
                    component={Link}
                    href={`/crm/contacts/${contact.id}`}
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                      cursor: "pointer",
                      textDecoration: "none",
                    }}
                  >
                    <Group gap="md">
                      <Avatar size="lg" color="blue">
                        {contact.firstName[0]?.toUpperCase()}
                        {contact.lastName[0]?.toUpperCase()}
                      </Avatar>
                      <Stack gap={2}>
                        <Text fw={500}>
                          {contact.firstName} {contact.lastName}
                        </Text>
                        {contact.email && (
                          <Text size="sm" c="dimmed">
                            {contact.email}
                          </Text>
                        )}
                      </Stack>
                    </Group>
                  </Paper>
                ))}
                {organization.contacts.length === 0 && (
                  <Paper
                    p="xl"
                    radius="md"
                    style={{
                      background: "var(--theme-crm-card)",
                      border: "1px solid var(--theme-crm-card-border)",
                    }}
                  >
                    <Stack align="center" gap="md">
                      <IconUsers size={48} style={{ opacity: 0.5 }} />
                      <Text c="dimmed">
                        No contacts associated with this organization
                      </Text>
                    </Stack>
                  </Paper>
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
                          {/* Activity Row */}
                          <Group gap="md" align="flex-start" wrap="nowrap">
                            <Avatar
                              size={28}
                              radius="xl"
                              color={
                                item.type === "email"
                                  ? "blue"
                                  : item.type === "telegram"
                                    ? "cyan"
                                    : item.type === "meeting"
                                      ? "teal"
                                      : "gray"
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
                                </Text>
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{ flexShrink: 0 }}
                                >
                                  {getRelativeTime(item.timestamp)}
                                </Text>
                              </Group>

                              {/* Embedded Card for messages/meetings */}
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
                                          : "var(--mantine-color-orange-6)"
                                    }`,
                                    background: "var(--theme-crm-card)",
                                    borderRadius: "0 6px 6px 0",
                                  }}
                                >
                                  <Text size="sm" fw={500} lineClamp={1}>
                                    {item.subject}
                                  </Text>
                                  <Text size="xs" c="dimmed" mt={4}>
                                    {new Date(
                                      item.timestamp,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
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
                          {email.contact?.firstName?.[0]?.toUpperCase() ?? "?"}
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
                            {email.contact
                              ? `${email.contact.firstName} ${email.contact.lastName}`
                              : (email.fromEmail ?? "Unknown")}
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
                          {message.contact?.firstName?.[0]?.toUpperCase() ??
                            "?"}
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
                              {message.contact
                                ? `${message.contact.firstName} ${message.contact.lastName}`
                                : message.fromTelegram
                                  ? `@${message.fromTelegram}`
                                  : "Unknown"}
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
                      {/* Domain */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconWorld size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Domains
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          {domain ? (
                            <Anchor
                              href={organization.websiteUrl ?? "#"}
                              target="_blank"
                              size="sm"
                            >
                              {domain}
                            </Anchor>
                          ) : (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          )}
                        </Box>
                      </Group>

                      {/* Name */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconBuilding size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Name
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Text size="sm">{organization.name}</Text>
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
                          <Text size="sm" c="dimmed" lineClamp={3}>
                            {organization.name} organization profile.
                          </Text>
                        </Box>
                      </Group>

                      {/* Team */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconUsers size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Team
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Group gap="xs">
                            {organization.contacts
                              .slice(0, 2)
                              .map((contact) => (
                                <Tooltip
                                  key={contact.id}
                                  label={`${contact.firstName} ${contact.lastName}`}
                                >
                                  <Avatar size="sm" color="blue">
                                    {contact.firstName[0]}
                                  </Avatar>
                                </Tooltip>
                              ))}
                            {organization.contacts.length > 2 && (
                              <Text size="xs" c="dimmed">
                                +{organization.contacts.length - 2}
                              </Text>
                            )}
                          </Group>
                        </Box>
                      </Group>

                      {/* Categories */}
                      <Group gap="md" align="flex-start">
                        <Box style={{ width: 100 }}>
                          <Group gap={6}>
                            <IconFolder size={14} style={{ opacity: 0.5 }} />
                            <Text size="xs" c="dimmed">
                              Categories
                            </Text>
                          </Group>
                        </Box>
                        <Box style={{ flex: 1 }}>
                          <Group gap={6}>
                            <Badge size="sm" color="teal" variant="filled">
                              Sponsor
                            </Badge>
                            {organization.events.length > 0 && (
                              <Badge size="sm" color="blue" variant="filled">
                                Event Partner
                              </Badge>
                            )}
                          </Group>
                        </Box>
                      </Group>
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
    </Box>
  );
}
