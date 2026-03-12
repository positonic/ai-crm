"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Alert,
  Container,
  Title,
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  TextInput,
  Table,
  ActionIcon,
  Loader,
  Tabs,
  Checkbox,
  Modal,
  Select,
  Switch,
  Anchor,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconUpload,
  IconEye,
  IconMail,
  IconUserPlus,
  IconMicrophone,
  IconTrash,
  IconDownload,
  IconSend,
  IconPresentation,
  IconSearch,
  IconId,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import ApplicationDetailsDrawer from "~/app/admin/events/[eventId]/applications/ApplicationDetailsDrawer";
import {
  getApplicationStatusColor,
  getApplicationStatusIcon,
  useInvitationManager,
  InvitationStatsGrid,
  InvitationsTable,
  InviteModal,
  BulkInviteModal,
  CurrentRoleHoldersTable,
} from "~/app/admin/_components/invitations";

interface Props {
  eventId: string;
}

export default function SpeakerManagementClient({ eventId }: Props) {
  const [mainTab, setMainTab] = useState<string>("applications");
  const [appTab, setAppTab] = useState<string>("all");
  const [floorFilter, setFloorFilter] = useState<string | null>(null);
  const [appSearch, setAppSearch] = useState("");

  // URL hash-based tab linking
  const validMainTabs = [
    "applications",
    "invitations",
    "sessions",
    "speaker-cards",
  ];
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && validMainTabs.includes(hash)) {
      setMainTab(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleMainTabChange = (value: string | null) => {
    if (value) {
      setMainTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  // ── Applications State ──
  const [selectedApplications, setSelectedApplications] = useState<string[]>(
    [],
  );
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"ACCEPTED" | "REJECTED" | null>(
    null,
  );
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] =
    useDisclosure(false);
  const [viewingApplication, setViewingApplication] = useState<{
    id: string;
  } | null>(null);

  // ── Invitations (via shared hook) ──
  const inv = useInvitationManager({
    eventId,
    invitationType: "EVENT_ROLE",
    roleName: "speaker",
    roleLookupName: "speaker",
  });

  // ── Sessions with slides status ──
  const [sessionsSearch, setSessionsSearch] = useState("");
  const [showMissingSlidesOnly, setShowMissingSlidesOnly] = useState(false);
  const [sessionsFloorFilter, setSessionsFloorFilter] = useState<string | null>(
    null,
  );
  const [selectedReminders, setSelectedReminders] = useState<string[]>([]);

  const { data: sessionsData, isLoading: loadingSessions } =
    api.schedule.getSessionsWithSlidesStatus.useQuery({ eventId });

  // ── Venues for speaker cards tab ──
  const { data: filtersData } =
    api.schedule.getEventScheduleFilters.useQuery({ eventId });

  const sendSlidesReminder = api.schedule.sendSlidesReminder.useMutation({
    onSuccess: (result) => {
      notifications.show({
        title: "Reminders sent",
        message: `${result.successCount} reminder${result.successCount !== 1 ? "s" : ""} sent${result.failureCount > 0 ? `, ${result.failureCount} failed` : ""}`,
        color: result.failureCount > 0 ? "yellow" : "green",
      });
      setSelectedReminders([]);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const sendSessionDetailsReminder =
    api.schedule.sendSessionDetailsReminder.useMutation({
      onSuccess: (result) => {
        notifications.show({
          title: "Session details sent",
          message: `${result.successCount} email${result.successCount !== 1 ? "s" : ""} sent${result.failureCount > 0 ? `, ${result.failureCount} failed` : ""}`,
          color: result.failureCount > 0 ? "yellow" : "green",
        });
        setSelectedReminders([]);
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    });

  // ── Application Queries ──
  const {
    data: speakerApplications,
    refetch: refetchApplications,
    isLoading: loadingApplications,
    error: applicationsError,
  } = api.application.getEventApplications.useQuery({
    eventId,
    applicationType: "SPEAKER",
  });

  const { data: currentSpeakers, isLoading: loadingSpeakers } =
    api.role.getAllUsersWithEventRoles.useQuery({
      eventId,
      roleId: inv.resolvedRoleId,
    });

  // ── Application Mutations ──
  const updateApplicationStatus =
    api.application.updateApplicationStatus.useMutation({
      onSuccess: () => {
        notifications.show({
          title: "Success",
          message: "Speaker application status updated",
          color: "green",
        });
        void refetchApplications();
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    });

  const bulkUpdateApplicationStatus =
    api.application.bulkUpdateApplicationStatus.useMutation({
      onSuccess: (result) => {
        notifications.show({
          title: "Success",
          message: `${result.count} speaker applications updated`,
          color: "green",
        });
        setSelectedApplications([]);
        setBulkStatusModalOpen(false);
        setBulkStatus(null);
        void refetchApplications();
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    });

  const bulkDeleteApplications =
    api.application.bulkDeleteApplications.useMutation({
      onSuccess: (result) => {
        notifications.show({
          title: "Deleted",
          message: `${result.count} speaker application${result.count !== 1 ? "s" : ""} permanently deleted`,
          color: "red",
        });
        setSelectedApplications([]);
        setBulkDeleteModalOpen(false);
        void refetchApplications();
      },
      onError: (error) => {
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      },
    });

  // Build a set of invited emails for cross-referencing (must be before early returns)
  const invitedEmails = useMemo(() => {
    const emails = new Set<string>();
    for (const invitation of inv.invitations) {
      emails.add(invitation.email.toLowerCase());
    }
    return emails;
  }, [inv.invitations]);

  // ── Derive unique floors from applications ──
  const availableFloors = useMemo(() => {
    const floorMap = new Map<string, string>();
    for (const app of speakerApplications ?? []) {
      for (const av of app.venues ?? []) {
        floorMap.set(av.venue.id, av.venue.name);
      }
    }
    return Array.from(floorMap, ([value, label]) => ({ value, label }));
  }, [speakerApplications]);

  // ── Sessions tab: flatten sessions → (session, speaker) rows ──
  const sessionRows = useMemo(() => {
    if (!sessionsData?.sessions) return [];
    const rows: Array<{
      key: string;
      sessionId: string;
      sessionTitle: string;
      speakerUserId: string;
      speakerName: string;
      speakerEmail: string;
      slidesUrl: string | null;
      slidesFileName: string | null;
      slidesUploadedAt: Date | null;
      venueId: string | null;
      venueName: string | null;
    }> = [];
    for (const session of sessionsData.sessions) {
      const venueId = session.venueId ?? null;
      const venueName = session.venue?.name ?? null;
      if (session.sessionSpeakers.length === 0) {
        rows.push({
          key: session.id,
          sessionId: session.id,
          sessionTitle: session.title,
          speakerUserId: "",
          speakerName: "(no speakers)",
          speakerEmail: "",
          slidesUrl: session.slidesUrl,
          slidesFileName: session.slidesFileName,
          slidesUploadedAt: session.slidesUploadedAt,
          venueId,
          venueName,
        });
      } else {
        for (const sp of session.sessionSpeakers) {
          rows.push({
            key: `${session.id}-${sp.user.id}`,
            sessionId: session.id,
            sessionTitle: session.title,
            speakerUserId: sp.user.id,
            speakerName:
              sp.user.firstName ?? sp.user.name ?? sp.user.email ?? "Unknown",
            speakerEmail: sp.user.email ?? "",
            slidesUrl: session.slidesUrl,
            slidesFileName: session.slidesFileName,
            slidesUploadedAt: session.slidesUploadedAt,
            venueId,
            venueName,
          });
        }
      }
    }
    return rows;
  }, [sessionsData]);

  const filteredSessionRows = useMemo(() => {
    let rows = sessionRows;
    if (sessionsFloorFilter) {
      rows = rows.filter((r) => r.venueId === sessionsFloorFilter);
    }
    if (showMissingSlidesOnly) {
      rows = rows.filter((r) => !r.slidesUrl);
    }
    if (sessionsSearch.trim()) {
      const q = sessionsSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.sessionTitle.toLowerCase().includes(q) ||
          r.speakerName.toLowerCase().includes(q) ||
          r.speakerEmail.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [sessionRows, sessionsFloorFilter, showMissingSlidesOnly, sessionsSearch]);

  // ── Loading ──
  if (inv.isLoading || loadingApplications || loadingSpeakers) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  // ── Error Handling ──
  if (applicationsError) {
    return (
      <Container size="xl" py="xl">
        <Alert color="red" title="Failed to load applications">
          {applicationsError.message}
        </Alert>
      </Container>
    );
  }

  // ── Application Helpers ──
  const allApplications = speakerApplications ?? [];
  const acceptedApplications = allApplications.filter(
    (app) => app.status === "ACCEPTED",
  );
  const rejectedApplications = allApplications.filter(
    (app) => app.status === "REJECTED",
  );
  const pendingApplications = allApplications.filter(
    (app) => !["ACCEPTED", "REJECTED"].includes(app.status),
  );
  const invitedApplications = allApplications.filter(
    (app) =>
      app.invitationId != null || invitedEmails.has(app.email.toLowerCase()),
  );

  const applyFloorFilter = (apps: typeof allApplications) => {
    if (!floorFilter) return apps;
    return apps.filter((app) =>
      app.venues?.some((av) => av.venue.id === floorFilter),
    );
  };

  const applySearchFilter = (apps: typeof allApplications) => {
    if (!appSearch.trim()) return apps;
    const q = appSearch.trim().toLowerCase();
    return apps.filter(
      (app) =>
        (app.user?.name?.toLowerCase().includes(q) ?? false) ||
        app.email.toLowerCase().includes(q),
    );
  };

  const applyFilters = (apps: typeof allApplications) =>
    applySearchFilter(applyFloorFilter(apps));

  const getCurrentTabApplications = () => {
    switch (appTab) {
      case "accepted":
        return applyFilters(acceptedApplications);
      case "rejected":
        return applyFilters(rejectedApplications);
      case "invited":
        return applyFilters(invitedApplications);
      default:
        return applyFilters(allApplications);
    }
  };
  const currentApplications = getCurrentTabApplications();

  const activeSpeakerCount =
    currentSpeakers?.filter((user) => user.userRoles.length > 0).length ?? 0;

  // Only rows that can receive reminders (has speaker email, no slides)
  const remindableRows = filteredSessionRows.filter(
    (r) => r.speakerEmail && !r.slidesUrl,
  );

  const handleBulkRemind = () => {
    const reminders = selectedReminders
      .map((key) => {
        const row = sessionRows.find((r) => r.key === key);
        if (!row?.speakerUserId) return null;
        return { sessionId: row.sessionId, speakerUserId: row.speakerUserId };
      })
      .filter(
        (r): r is { sessionId: string; speakerUserId: string } => r !== null,
      );

    if (reminders.length === 0) return;
    sendSlidesReminder.mutate({ eventId, reminders });
  };

  const handleSingleRemind = (sessionId: string, speakerUserId: string) => {
    sendSlidesReminder.mutate({
      eventId,
      reminders: [{ sessionId, speakerUserId }],
    });
  };

  // All rows with a speaker email (for session details reminder)
  const emailableRows = filteredSessionRows.filter(
    (r) => !!r.speakerEmail && !!r.speakerUserId,
  );

  const handleBulkSessionDetailsRemind = () => {
    const reminders = selectedReminders
      .map((key) => {
        const row = sessionRows.find((r) => r.key === key);
        if (!row?.speakerUserId) return null;
        return { sessionId: row.sessionId, speakerUserId: row.speakerUserId };
      })
      .filter(
        (r): r is { sessionId: string; speakerUserId: string } => r !== null,
      );

    if (reminders.length === 0) return;
    sendSessionDetailsReminder.mutate({ eventId, reminders });
  };

  const missingSlidesCount = sessionRows.filter((r) => !r.slidesUrl).length;
  const uploadedSlidesCount = sessionRows.filter((r) => r.slidesUrl).length;

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Group gap="sm">
            <IconMicrophone size={28} />
            <Title order={1}>Speaker Management</Title>
          </Group>
          <Text c="dimmed" mb="xs">
            {inv.event?.name ?? "Loading..."}
          </Text>
        </div>
      </Group>

      {/* Top-level Statistics */}
      <InvitationStatsGrid
        stats={[
          { value: allApplications.length, label: "Applications" },
          {
            value: pendingApplications.length,
            label: "Pending",
            color: "orange",
          },
          {
            value: acceptedApplications.length,
            label: "Accepted",
            color: "green",
          },
          {
            value: activeSpeakerCount,
            label: "Invited Speakers",
            color: "blue",
          },
        ]}
        cols={{ base: 2, sm: 4 }}
      />

      {/* Main Tabs */}
      <Tabs value={mainTab} onChange={handleMainTabChange}>
        <Tabs.List mb="md">
          <Tabs.Tab value="applications">
            Applications
            {allApplications.length > 0 && (
              <Badge size="sm" variant="light" ml="xs">
                {allApplications.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab value="invitations">
            Invitations
            {inv.invitations.length > 0 && (
              <Badge size="sm" variant="light" ml="xs">
                {inv.invitations.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab
            value="sessions"
            leftSection={<IconPresentation size={16} />}
          >
            Sessions
            {sessionRows.length > 0 && (
              <Badge size="sm" variant="light" ml="xs">
                {sessionRows.length}
              </Badge>
            )}
          </Tabs.Tab>
          <Tabs.Tab
            value="speaker-cards"
            leftSection={<IconId size={16} />}
          >
            Speaker Cards
          </Tabs.Tab>
        </Tabs.List>

        {/* ── Applications Tab ── */}
        <Tabs.Panel value="applications">
          {selectedApplications.length > 0 && (
            <Card withBorder mb="md" p="md">
              <Group justify="space-between">
                <Text size="sm">
                  {selectedApplications.length} application
                  {selectedApplications.length !== 1 ? "s" : ""} selected
                </Text>
                <Group gap="xs">
                  <Button
                    variant="light"
                    color="green"
                    size="sm"
                    onClick={() => {
                      setBulkStatus("ACCEPTED");
                      setBulkStatusModalOpen(true);
                    }}
                  >
                    Accept Selected
                  </Button>
                  <Button
                    variant="light"
                    color="red"
                    size="sm"
                    onClick={() => {
                      setBulkStatus("REJECTED");
                      setBulkStatusModalOpen(true);
                    }}
                  >
                    Reject Selected
                  </Button>
                  <Button
                    variant="light"
                    color="dark"
                    size="sm"
                    leftSection={<IconTrash size={14} />}
                    onClick={() => setBulkDeleteModalOpen(true)}
                  >
                    Delete Selected
                  </Button>
                  <Button
                    variant="subtle"
                    size="sm"
                    onClick={() => setSelectedApplications([])}
                  >
                    Clear
                  </Button>
                </Group>
              </Group>
            </Card>
          )}

          <Card withBorder mb="md" p="md">
            <Group align="flex-end" gap="md">
              <TextInput
                placeholder="Search by name or email..."
                value={appSearch}
                onChange={(e) => setAppSearch(e.currentTarget.value)}
                leftSection={<IconSearch size={16} />}
                style={{ flex: 1 }}
              />
              {availableFloors.length > 1 && (
                <Select
                  label="Filter by floor"
                  placeholder="All floors"
                  data={availableFloors}
                  value={floorFilter}
                  onChange={setFloorFilter}
                  clearable
                  w={250}
                />
              )}
            </Group>
          </Card>

          <Card withBorder>
            <Tabs value={appTab} onChange={(v) => setAppTab(v ?? "all")}>
              <Tabs.List grow>
                <Tabs.Tab value="all">
                  All{" "}
                  {applyFilters(allApplications).length > 0 && (
                    <Badge size="sm" variant="light" ml="xs">
                      {applyFilters(allApplications).length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="accepted">
                  Accepted{" "}
                  {applyFilters(acceptedApplications).length > 0 && (
                    <Badge size="sm" variant="light" color="green" ml="xs">
                      {applyFilters(acceptedApplications).length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="rejected">
                  Rejected{" "}
                  {applyFilters(rejectedApplications).length > 0 && (
                    <Badge size="sm" variant="light" color="red" ml="xs">
                      {applyFilters(rejectedApplications).length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="invited">
                  Invited{" "}
                  {applyFilters(invitedApplications).length > 0 && (
                    <Badge size="sm" variant="light" color="violet" ml="xs">
                      {applyFilters(invitedApplications).length}
                    </Badge>
                  )}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="all" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFilters(allApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === currentApplications.length
                        ? []
                        : currentApplications.map((a) => a.id),
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id],
                    );
                  }}
                  onStatusUpdate={(id, status) =>
                    updateApplicationStatus.mutate({
                      applicationId: id,
                      status,
                    })
                  }
                  onViewApplication={(id) => {
                    setViewingApplication({ id });
                    openViewDrawer();
                  }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
              <Tabs.Panel value="accepted" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFilters(acceptedApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === currentApplications.length
                        ? []
                        : currentApplications.map((a) => a.id),
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id],
                    );
                  }}
                  onStatusUpdate={(id, status) =>
                    updateApplicationStatus.mutate({
                      applicationId: id,
                      status,
                    })
                  }
                  onViewApplication={(id) => {
                    setViewingApplication({ id });
                    openViewDrawer();
                  }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
              <Tabs.Panel value="rejected" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFilters(rejectedApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === currentApplications.length
                        ? []
                        : currentApplications.map((a) => a.id),
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id],
                    );
                  }}
                  onStatusUpdate={(id, status) =>
                    updateApplicationStatus.mutate({
                      applicationId: id,
                      status,
                    })
                  }
                  onViewApplication={(id) => {
                    setViewingApplication({ id });
                    openViewDrawer();
                  }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
              <Tabs.Panel value="invited" mt="md">
                <SpeakerApplicationsTable
                  applications={applyFilters(invitedApplications)}
                  selectedApplications={selectedApplications}
                  invitedEmails={invitedEmails}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === currentApplications.length
                        ? []
                        : currentApplications.map((a) => a.id),
                    );
                  }}
                  onSelectApplication={(id) => {
                    setSelectedApplications((prev) =>
                      prev.includes(id)
                        ? prev.filter((x) => x !== id)
                        : [...prev, id],
                    );
                  }}
                  onStatusUpdate={(id, status) =>
                    updateApplicationStatus.mutate({
                      applicationId: id,
                      status,
                    })
                  }
                  onViewApplication={(id) => {
                    setViewingApplication({ id });
                    openViewDrawer();
                  }}
                  isUpdating={updateApplicationStatus.isPending}
                />
              </Tabs.Panel>
            </Tabs>
          </Card>
        </Tabs.Panel>

        {/* ── Invitations Tab ── */}
        <Tabs.Panel value="invitations">
          <Group justify="flex-end" mb="md">
            <Button
              leftSection={<IconUserPlus size={16} />}
              onClick={() => inv.setInviteModalOpen(true)}
            >
              Invite Speaker
            </Button>
            <Button
              variant="light"
              leftSection={<IconUpload size={16} />}
              onClick={() => inv.setBulkInviteModalOpen(true)}
            >
              Bulk Invite
            </Button>
          </Group>

          <InvitationStatsGrid
            stats={[
              { value: inv.stats.total, label: "Total Invites" },
              { value: inv.stats.pending, label: "Pending", color: "blue" },
              { value: inv.stats.accepted, label: "Accepted", color: "green" },
              {
                value: activeSpeakerCount,
                label: "Active Speakers",
                color: "teal",
              },
            ]}
          />

          <CurrentRoleHoldersTable
            holders={
              currentSpeakers?.filter((user) => user.userRoles.length > 0) ?? []
            }
            roleName="speaker"
            badgeColor="teal"
            title="Current Speakers"
          />

          <Card withBorder mb="md">
            <TextInput
              placeholder="Filter speaker invitations by email..."
              value={inv.filterEmail}
              onChange={(e) => inv.setFilterEmail(e.currentTarget.value)}
              leftSection={<IconMail size={16} />}
            />
          </Card>

          <InvitationsTable
            invitations={inv.filteredInvitations}
            totalCount={inv.invitations.length}
            roleName="speaker"
            onResend={(id) => inv.resendInvitation.mutate({ invitationId: id })}
            onCancel={(id) => inv.cancelInvitation.mutate({ invitationId: id })}
            isResending={inv.resendInvitation.isPending}
            isCancelling={inv.cancelInvitation.isPending}
          />
        </Tabs.Panel>

        {/* ── Sessions Tab ── */}
        <Tabs.Panel value="sessions">
          {loadingSessions ? (
            <Group justify="center" py="xl">
              <Loader size="lg" />
            </Group>
          ) : (
            <>
              {/* Stats row */}
              <InvitationStatsGrid
                stats={[
                  { value: sessionRows.length, label: "Total Rows" },
                  {
                    value: uploadedSlidesCount,
                    label: "Slides Uploaded",
                    color: "green",
                  },
                  {
                    value: missingSlidesCount,
                    label: "Missing Slides",
                    color: "red",
                  },
                ]}
                cols={{ base: 3, sm: 3 }}
              />

              {/* Filters */}
              <Card withBorder mb="md" p="md">
                <Group>
                  <TextInput
                    placeholder="Search sessions or speakers..."
                    value={sessionsSearch}
                    onChange={(e) => setSessionsSearch(e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <Select
                    placeholder="All floors"
                    data={
                      filtersData?.venues?.map((v) => ({
                        value: v.id,
                        label: v.name,
                      })) ?? []
                    }
                    value={sessionsFloorFilter}
                    onChange={(val) => {
                      setSessionsFloorFilter(val);
                      setSelectedReminders([]);
                    }}
                    clearable
                    w={250}
                  />
                  <Switch
                    label="Missing slides only"
                    checked={showMissingSlidesOnly}
                    onChange={(e) => {
                      setShowMissingSlidesOnly(e.currentTarget.checked);
                      setSelectedReminders([]);
                    }}
                  />
                </Group>
              </Card>

              {/* Bulk action bar */}
              {selectedReminders.length > 0 && (
                <Card withBorder mb="md" p="md">
                  <Group justify="space-between">
                    <Text size="sm">
                      {selectedReminders.length} speaker
                      {selectedReminders.length !== 1 ? "s" : ""} selected
                    </Text>
                    <Group gap="xs">
                      <Button
                        leftSection={<IconSend size={14} />}
                        size="sm"
                        onClick={handleBulkRemind}
                        loading={sendSlidesReminder.isPending}
                      >
                        Send Slides Reminder to{" "}
                        {selectedReminders.length} Speaker
                        {selectedReminders.length !== 1 ? "s" : ""}
                      </Button>
                      <Button
                        leftSection={<IconMail size={14} />}
                        size="sm"
                        variant="light"
                        onClick={handleBulkSessionDetailsRemind}
                        loading={sendSessionDetailsReminder.isPending}
                      >
                        Send Session Details to{" "}
                        {selectedReminders.length} Speaker
                        {selectedReminders.length !== 1 ? "s" : ""}
                      </Button>
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => setSelectedReminders([])}
                      >
                        Clear
                      </Button>
                    </Group>
                  </Group>
                </Card>
              )}

              {filteredSessionRows.length === 0 ? (
                <Text ta="center" py="xl" c="dimmed">
                  No sessions found.
                </Text>
              ) : (
                <>
                  {(remindableRows.length > 0 ||
                    emailableRows.length > 0) && (
                    <Group mb="md" gap="lg">
                      {emailableRows.length > 0 && (
                        <Checkbox
                          checked={
                            selectedReminders.length ===
                              emailableRows.length &&
                            emailableRows.length > 0
                          }
                          indeterminate={
                            selectedReminders.length > 0 &&
                            selectedReminders.length < emailableRows.length
                          }
                          onChange={() => {
                            setSelectedReminders((prev) =>
                              prev.length === emailableRows.length
                                ? []
                                : emailableRows.map((r) => r.key),
                            );
                          }}
                          label={`Select all speakers (${emailableRows.length})`}
                          size="sm"
                        />
                      )}
                      {remindableRows.length > 0 && (
                        <Checkbox
                          checked={
                            selectedReminders.length ===
                              remindableRows.length &&
                            remindableRows.length > 0
                          }
                          indeterminate={
                            selectedReminders.length > 0 &&
                            selectedReminders.length < remindableRows.length
                          }
                          onChange={() => {
                            setSelectedReminders((prev) =>
                              prev.length === remindableRows.length
                                ? []
                                : remindableRows.map((r) => r.key),
                            );
                          }}
                          label={`Select all without slides (${remindableRows.length})`}
                          size="sm"
                        />
                      )}
                    </Group>
                  )}

                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th w={40} />
                        <Table.Th>Session</Table.Th>
                        <Table.Th>Floor</Table.Th>
                        <Table.Th>Speaker</Table.Th>
                        <Table.Th>Email</Table.Th>
                        <Table.Th>Slides</Table.Th>
                        <Table.Th>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {filteredSessionRows.map((row) => {
                        const canRemind = row.speakerEmail && !row.slidesUrl;
                        return (
                          <Table.Tr key={row.key}>
                            <Table.Td>
                              {row.speakerEmail && row.speakerUserId && (
                                <Checkbox
                                  checked={selectedReminders.includes(row.key)}
                                  onChange={() => {
                                    setSelectedReminders((prev) =>
                                      prev.includes(row.key)
                                        ? prev.filter((k) => k !== row.key)
                                        : [...prev, row.key],
                                    );
                                  }}
                                  size="sm"
                                />
                              )}
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" fw={500}>
                                {row.sessionTitle}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                {row.venueName ?? "—"}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm">{row.speakerName}</Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="dimmed">
                                {row.speakerEmail}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              {row.slidesUrl ? (
                                <Anchor
                                  href={row.slidesUrl}
                                  target="_blank"
                                  size="sm"
                                >
                                  <Group gap={4} wrap="nowrap">
                                    <IconDownload size={14} />
                                    <Text size="sm" truncate maw={150}>
                                      {row.slidesFileName ?? "Download"}
                                    </Text>
                                  </Group>
                                </Anchor>
                              ) : (
                                <Badge color="red" variant="light" size="sm">
                                  Missing
                                </Badge>
                              )}
                            </Table.Td>
                            <Table.Td>
                              {canRemind && (
                                <Button
                                  variant="light"
                                  size="xs"
                                  leftSection={<IconSend size={14} />}
                                  onClick={() =>
                                    handleSingleRemind(
                                      row.sessionId,
                                      row.speakerUserId,
                                    )
                                  }
                                  loading={sendSlidesReminder.isPending}
                                >
                                  Remind
                                </Button>
                              )}
                            </Table.Td>
                          </Table.Tr>
                        );
                      })}
                    </Table.Tbody>
                  </Table>
                </>
              )}
            </>
          )}
        </Tabs.Panel>

        {/* ── Speaker Cards Tab ── */}
        <Tabs.Panel value="speaker-cards">
          <Stack gap="md">
            <Text size="sm" c="dimmed">
              View printable session cards for each floor. Each link opens a
              standalone page with all session cards for that venue.
            </Text>
            {filtersData?.venues && filtersData.venues.length > 0 ? (
              <Stack gap="sm">
                {filtersData.venues.map((venue) => (
                  <Card key={venue.id} withBorder p="md">
                    <Group justify="space-between" align="center">
                      <Stack gap={2}>
                        <Text fw={600}>{venue.name}</Text>
                        {venue.rooms.length > 0 && (
                          <Text size="xs" c="dimmed">
                            {venue.rooms.length} room
                            {venue.rooms.length !== 1 ? "s" : ""}
                          </Text>
                        )}
                      </Stack>
                      <Button
                        component={Link}
                        href={`/events/${eventId}/schedule-cards/${venue.id}`}
                        target="_blank"
                        variant="light"
                        leftSection={<IconId size={16} />}
                      >
                        View Cards
                      </Button>
                    </Group>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="xl">
                No venues configured for this event.
              </Text>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Bulk Status Update Modal */}
      <Modal
        opened={bulkStatusModalOpen}
        onClose={() => {
          setBulkStatusModalOpen(false);
          setBulkStatus(null);
        }}
        title={`${bulkStatus === "ACCEPTED" ? "Accept" : "Reject"} Selected Applications`}
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Are you sure you want to {bulkStatus?.toLowerCase()}{" "}
            {selectedApplications.length} speaker application
            {selectedApplications.length !== 1 ? "s" : ""}?
            {bulkStatus === "ACCEPTED" &&
              " This will send acceptance emails to the speakers."}
            {bulkStatus === "REJECTED" &&
              " This will send rejection emails to the speakers."}
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => {
                setBulkStatusModalOpen(false);
                setBulkStatus(null);
              }}
            >
              Cancel
            </Button>
            <Button
              color={bulkStatus === "ACCEPTED" ? "green" : "red"}
              onClick={() => {
                if (!bulkStatus || selectedApplications.length === 0) return;
                bulkUpdateApplicationStatus.mutate({
                  applicationIds: selectedApplications,
                  status: bulkStatus,
                });
              }}
              loading={bulkUpdateApplicationStatus.isPending}
            >
              {bulkStatus === "ACCEPTED" ? "Accept" : "Reject"} Applications
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={bulkDeleteModalOpen}
        onClose={() => setBulkDeleteModalOpen(false)}
        title="Delete Selected Applications"
        size="md"
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Are you sure you want to permanently delete{" "}
            {selectedApplications.length} application
            {selectedApplications.length !== 1 ? "s" : ""}? This action cannot
            be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setBulkDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => {
                if (selectedApplications.length === 0) return;
                bulkDeleteApplications.mutate({
                  applicationIds: selectedApplications,
                });
              }}
              loading={bulkDeleteApplications.isPending}
            >
              Delete Applications
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Invite Speaker Modal */}
      <InviteModal
        opened={inv.inviteModalOpen}
        onClose={() => inv.setInviteModalOpen(false)}
        title="Invite Speaker"
        description={`Invite a speaker for ${inv.event?.name ?? "this event"}. They will receive an email invitation and can register or login to submit their speaker application.`}
        form={inv.inviteForm}
        onSubmit={inv.handleInvite}
        isLoading={inv.createInvitation.isPending}
        emailPlaceholder="speaker@example.com"
      />

      {/* Bulk Invite Modal */}
      <BulkInviteModal
        opened={inv.bulkInviteModalOpen}
        onClose={() => inv.setBulkInviteModalOpen(false)}
        title="Bulk Invite Speakers"
        description={`Invite multiple speakers for ${inv.event?.name ?? "this event"} at once.`}
        form={inv.bulkInviteForm}
        onSubmit={inv.handleBulkInvite}
        isLoading={inv.bulkCreateInvitations.isPending}
        emailsLabel="Speaker Emails"
      />

      {/* Application Detail Drawer */}
      <ApplicationDetailsDrawer
        applicationId={viewingApplication?.id ?? null}
        opened={viewDrawerOpened}
        onClose={closeViewDrawer}
      />
    </Container>
  );
}

// ──────────────────────────────────────────
// Applications Table (speaker-specific)
// ──────────────────────────────────────────

interface ApplicationRow {
  id: string;
  status: string;
  email: string;
  eventId: string;
  submittedAt: Date | null;
  invitationId?: string | null;
  user?: { name: string | null } | null;
  venues?: { venue: { id: string; name: string } }[];
}

interface SpeakerApplicationsTableProps {
  applications: ApplicationRow[];
  selectedApplications: string[];
  invitedEmails: Set<string>;
  onSelectAll: () => void;
  onSelectApplication: (id: string) => void;
  onStatusUpdate: (id: string, status: "ACCEPTED" | "REJECTED") => void;
  onViewApplication: (id: string) => void;
  isUpdating: boolean;
}

function SpeakerApplicationsTable({
  applications,
  selectedApplications,
  invitedEmails,
  onSelectAll,
  onSelectApplication,
  onStatusUpdate,
  onViewApplication,
  isUpdating,
}: SpeakerApplicationsTableProps) {
  if (applications.length === 0) {
    return (
      <Text ta="center" py="xl" c="dimmed">
        No speaker applications found for this filter.
      </Text>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Checkbox
          checked={
            selectedApplications.length === applications.length &&
            applications.length > 0
          }
          indeterminate={
            selectedApplications.length > 0 &&
            selectedApplications.length < applications.length
          }
          onChange={onSelectAll}
          label={`Select all (${applications.length})`}
          size="sm"
        />
        <Text size="sm" c="dimmed">
          {applications.length} application
          {applications.length !== 1 ? "s" : ""}
        </Text>
      </Group>

      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Select</Table.Th>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Floors</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Submitted</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {applications.map((application) => (
            <Table.Tr key={application.id}>
              <Table.Td>
                <Checkbox
                  checked={selectedApplications.includes(application.id)}
                  onChange={() => onSelectApplication(application.id)}
                  size="sm"
                />
              </Table.Td>
              <Table.Td>
                <Group gap={6} wrap="nowrap">
                  <Text
                    size="sm"
                    fw={500}
                    onClick={() => onViewApplication(application.id)}
                    style={{ cursor: "pointer" }}
                    td="underline"
                    c="blue"
                  >
                    {application.user?.name ?? "Unknown"}
                  </Text>
                  {(application.invitationId ??
                    invitedEmails.has(application.email.toLowerCase())) && (
                    <Badge
                      size="xs"
                      variant="light"
                      color="violet"
                      leftSection={<IconMail size={10} />}
                    >
                      Invited
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{application.email}</Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4} wrap="wrap">
                  {application.venues?.map((av) => (
                    <Badge
                      key={av.venue.id}
                      size="xs"
                      variant="light"
                      color="cyan"
                    >
                      {av.venue.name}
                    </Badge>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={getApplicationStatusColor(application.status)}
                  variant="light"
                  size="sm"
                  leftSection={getApplicationStatusIcon(application.status)}
                >
                  {application.status.replace("_", " ").toLowerCase()}
                </Badge>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {application.submittedAt
                    ? new Date(application.submittedAt).toLocaleDateString(
                        "en-US",
                        { timeZone: "UTC" },
                      )
                    : "Not submitted"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={4}>
                  {application.status !== "ACCEPTED" && (
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="sm"
                      onClick={() => onStatusUpdate(application.id, "ACCEPTED")}
                      loading={isUpdating}
                      title="Accept"
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  )}
                  {application.status !== "REJECTED" && (
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="sm"
                      onClick={() => onStatusUpdate(application.id, "REJECTED")}
                      loading={isUpdating}
                      title="Reject"
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    onClick={() => onViewApplication(application.id)}
                    title="View details"
                  >
                    <IconEye size={14} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </>
  );
}
