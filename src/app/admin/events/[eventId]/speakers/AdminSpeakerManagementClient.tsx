"use client";

import { useState, useEffect } from "react";
import {
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconUpload,
  IconArrowLeft,
  IconEye,
  IconMail,
  IconUserPlus,
  IconMicrophone,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import ApplicationDetailsDrawer from "../applications/ApplicationDetailsDrawer";
import { AddSpeakerModal } from "~/app/events/[eventId]/AddSpeakerModal";
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

export default function AdminSpeakerManagementClient({ eventId }: Props) {
  const [mainTab, setMainTab] = useState<string>("applications");
  const [appTab, setAppTab] = useState<string>("all");

  // URL hash-based tab linking
  const validMainTabs = ["applications", "invitations"];
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
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] =
    useDisclosure(false);
  const [addSpeakerOpened, { open: openAddSpeaker, close: closeAddSpeaker }] =
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

  // ── Application Queries ──
  const {
    data: speakerApplications,
    refetch: refetchApplications,
    isLoading: loadingApplications,
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
    (app) => app.invitationId != null,
  );

  const getCurrentTabApplications = () => {
    switch (appTab) {
      case "accepted":
        return acceptedApplications;
      case "rejected":
        return rejectedApplications;
      case "invited":
        return invitedApplications;
      default:
        return allApplications;
    }
  };
  const currentApplications = getCurrentTabApplications();

  const activeSpeakerCount =
    currentSpeakers?.filter((user) => user.userRoles.length > 0).length ?? 0;

  return (
    <Container size="xl" py="md">
      {/* Header */}
      <Group justify="space-between" mb="xl">
        <div>
          <Group mb="xs">
            <Link
              href={`/admin/events/${eventId}`}
              style={{ textDecoration: "none" }}
            >
              <Button
                variant="subtle"
                leftSection={<IconArrowLeft size={16} />}
                size="sm"
              >
                Back to {inv.event?.name ?? "Event"}
              </Button>
            </Link>
          </Group>
          <Group gap="sm">
            <IconMicrophone size={28} />
            <Title order={1}>Speaker Management</Title>
          </Group>
          <Text c="dimmed" mb="xs">
            {inv.event?.name ?? "Loading..."}
          </Text>
        </div>
        <Button
          leftSection={<IconUserPlus size={16} />}
          onClick={openAddSpeaker}
        >
          Add Speaker
        </Button>
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

          <Card withBorder>
            <Tabs value={appTab} onChange={(v) => setAppTab(v ?? "all")}>
              <Tabs.List grow>
                <Tabs.Tab value="all">
                  All{" "}
                  {allApplications.length > 0 && (
                    <Badge size="sm" variant="light" ml="xs">
                      {allApplications.length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="accepted">
                  Accepted{" "}
                  {acceptedApplications.length > 0 && (
                    <Badge size="sm" variant="light" color="green" ml="xs">
                      {acceptedApplications.length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="rejected">
                  Rejected{" "}
                  {rejectedApplications.length > 0 && (
                    <Badge size="sm" variant="light" color="red" ml="xs">
                      {rejectedApplications.length}
                    </Badge>
                  )}
                </Tabs.Tab>
                <Tabs.Tab value="invited">
                  Invited{" "}
                  {invitedApplications.length > 0 && (
                    <Badge size="sm" variant="light" color="violet" ml="xs">
                      {invitedApplications.length}
                    </Badge>
                  )}
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="all" mt="md">
                <SpeakerApplicationsTable
                  applications={allApplications}
                  selectedApplications={selectedApplications}
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
                  applications={acceptedApplications}
                  selectedApplications={selectedApplications}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === acceptedApplications.length
                        ? []
                        : acceptedApplications.map((a) => a.id),
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
                  applications={rejectedApplications}
                  selectedApplications={selectedApplications}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === rejectedApplications.length
                        ? []
                        : rejectedApplications.map((a) => a.id),
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
                  applications={invitedApplications}
                  selectedApplications={selectedApplications}
                  onSelectAll={() => {
                    setSelectedApplications((prev) =>
                      prev.length === invitedApplications.length
                        ? []
                        : invitedApplications.map((a) => a.id),
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

      {/* Add Speaker Modal */}
      <AddSpeakerModal
        eventId={eventId}
        opened={addSpeakerOpened}
        onClose={closeAddSpeaker}
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
  onSelectAll: () => void;
  onSelectApplication: (id: string) => void;
  onStatusUpdate: (id: string, status: "ACCEPTED" | "REJECTED") => void;
  onViewApplication: (id: string) => void;
  isUpdating: boolean;
}

function SpeakerApplicationsTable({
  applications,
  selectedApplications,
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
                  <Text size="sm" fw={500}>
                    {application.user?.name ?? "Unknown"}
                  </Text>
                  {application.invitationId && (
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
                    ? new Date(application.submittedAt).toLocaleDateString()
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
