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
  Table,
  ActionIcon,
  Paper,
  Loader,
  SimpleGrid,
  Tabs,
  Checkbox,
  Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertTriangle,
  IconUpload,
  IconArrowLeft,
  IconEye,
} from "@tabler/icons-react";
import Link from "next/link";
import { api } from "~/trpc/react";
import ApplicationDetailsDrawer from "../applications/ApplicationDetailsDrawer";

interface Props {
  eventId: string;
}

function getStatusColor(status: string) {
  switch (status) {
    case "DRAFT":
      return "gray";
    case "SUBMITTED":
      return "blue";
    case "UNDER_REVIEW":
      return "yellow";
    case "ACCEPTED":
      return "green";
    case "REJECTED":
      return "red";
    case "WAITLISTED":
      return "orange";
    default:
      return "gray";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "DRAFT":
      return <IconClock size={16} />;
    case "SUBMITTED":
      return <IconUpload size={16} />;
    case "UNDER_REVIEW":
      return <IconClock size={16} />;
    case "ACCEPTED":
      return <IconCheck size={16} />;
    case "REJECTED":
      return <IconX size={16} />;
    case "WAITLISTED":
      return <IconAlertTriangle size={16} />;
    default:
      return null;
  }
}

export default function AdminMentorApplicationsClient({ eventId }: Props) {
  const [activeTab, setActiveTab] = useState<string>("all");

  // URL hash-based tab linking
  const validTabs = ["all", "accepted", "rejected"];
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && validTabs.includes(hash)) {
      setActiveTab(hash);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  const [selectedApplications, setSelectedApplications] = useState<string[]>(
    [],
  );
  const [bulkStatusModalOpen, setBulkStatusModalOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"ACCEPTED" | "REJECTED" | null>(
    null,
  );

  // Drawer state management
  const [viewDrawerOpened, { open: openViewDrawer, close: closeViewDrawer }] =
    useDisclosure(false);
  const [viewingApplication, setViewingApplication] = useState<{
    id: string;
  } | null>(null);

  // Get event details
  const { data: event, isLoading: loadingEvent } = api.event.getEvent.useQuery({
    id: eventId,
  });

  // Get mentor applications
  const {
    data: mentorApplications,
    refetch: refetchApplications,
    isLoading: loadingApplications,
  } = api.application.getEventApplications.useQuery({
    eventId,
    applicationType: "MENTOR",
  });

  // API mutations
  const updateApplicationStatus =
    api.application.updateApplicationStatus.useMutation({
      onSuccess: () => {
        notifications.show({
          title: "Success",
          message: "Mentor application status updated successfully",
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
          message: `${result.count} mentor applications updated successfully`,
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

  if (loadingEvent || loadingApplications) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="xl" />
        </Group>
      </Container>
    );
  }

  if (!mentorApplications || !event) {
    return (
      <Container size="xl" py="xl">
        <Text>No mentor applications found</Text>
      </Container>
    );
  }

  // Filter applications by status for different tabs
  const allApplications = mentorApplications;
  const acceptedApplications = mentorApplications.filter(
    (app) => app.status === "ACCEPTED",
  );
  const rejectedApplications = mentorApplications.filter(
    (app) => app.status === "REJECTED",
  );

  // Calculate stats
  const stats = {
    total: allApplications.length,
    accepted: acceptedApplications.length,
    rejected: rejectedApplications.length,
    pending: allApplications.filter(
      (app) => !["ACCEPTED", "REJECTED"].includes(app.status),
    ).length,
  };

  // Get applications for current tab
  const getCurrentTabApplications = () => {
    switch (activeTab) {
      case "accepted":
        return acceptedApplications;
      case "rejected":
        return rejectedApplications;
      default:
        return allApplications;
    }
  };

  const currentApplications = getCurrentTabApplications();

  const handleStatusUpdate = (
    applicationId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => {
    updateApplicationStatus.mutate({ applicationId, status });
  };

  const viewApplication = (applicationId: string) => {
    setViewingApplication({ id: applicationId });
    openViewDrawer();
  };

  const handleBulkStatusUpdate = () => {
    if (!bulkStatus || selectedApplications.length === 0) return;

    bulkUpdateApplicationStatus.mutate({
      applicationIds: selectedApplications,
      status: bulkStatus,
    });
  };

  const handleSelectAll = () => {
    if (selectedApplications.length === currentApplications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(currentApplications.map((app) => app.id));
    }
  };

  const handleSelectApplication = (applicationId: string) => {
    if (selectedApplications.includes(applicationId)) {
      setSelectedApplications(
        selectedApplications.filter((id) => id !== applicationId),
      );
    } else {
      setSelectedApplications([...selectedApplications, applicationId]);
    }
  };

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
                Back to {event?.name ?? "Event"}
              </Button>
            </Link>
          </Group>
          <Title order={1} mb="xs">
            Mentor Applications
          </Title>
          <Text c="dimmed" mb="xs">
            {event.name}
          </Text>
          <Text size="sm" c="dimmed">
            Review and manage mentor applications for this event.
          </Text>
        </div>
      </Group>

      {/* Statistics */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} mb="xl">
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700}>
              {stats.total}
            </Text>
            <Text size="sm" c="dimmed">
              Total Applications
            </Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="orange">
              {stats.pending}
            </Text>
            <Text size="sm" c="dimmed">
              Pending Review
            </Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="green">
              {stats.accepted}
            </Text>
            <Text size="sm" c="dimmed">
              Accepted
            </Text>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder>
          <Group>
            <Text size="xl" fw={700} c="red">
              {stats.rejected}
            </Text>
            <Text size="sm" c="dimmed">
              Rejected
            </Text>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <Card withBorder mb="xl" p="md">
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
                Clear Selection
              </Button>
            </Group>
          </Group>
        </Card>
      )}

      {/* Main Content */}
      <Card withBorder>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List grow>
            <Tabs.Tab value="all">
              All Applications
              {stats.total > 0 && (
                <Badge size="sm" variant="light" ml="xs">
                  {stats.total}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="accepted">
              Accepted
              {stats.accepted > 0 && (
                <Badge size="sm" variant="light" color="green" ml="xs">
                  {stats.accepted}
                </Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="rejected">
              Rejected
              {stats.rejected > 0 && (
                <Badge size="sm" variant="light" color="red" ml="xs">
                  {stats.rejected}
                </Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="all" mt="md">
            <MentorApplicationsTable
              applications={allApplications}
              selectedApplications={selectedApplications}
              onSelectAll={handleSelectAll}
              onSelectApplication={handleSelectApplication}
              onStatusUpdate={handleStatusUpdate}
              onViewApplication={viewApplication}
              isUpdating={updateApplicationStatus.isPending}
            />
          </Tabs.Panel>

          <Tabs.Panel value="accepted" mt="md">
            <MentorApplicationsTable
              applications={acceptedApplications}
              selectedApplications={selectedApplications}
              onSelectAll={handleSelectAll}
              onSelectApplication={handleSelectApplication}
              onStatusUpdate={handleStatusUpdate}
              onViewApplication={viewApplication}
              isUpdating={updateApplicationStatus.isPending}
            />
          </Tabs.Panel>

          <Tabs.Panel value="rejected" mt="md">
            <MentorApplicationsTable
              applications={rejectedApplications}
              selectedApplications={selectedApplications}
              onSelectAll={handleSelectAll}
              onSelectApplication={handleSelectApplication}
              onStatusUpdate={handleStatusUpdate}
              onViewApplication={viewApplication}
              isUpdating={updateApplicationStatus.isPending}
            />
          </Tabs.Panel>
        </Tabs>
      </Card>

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
            {selectedApplications.length} mentor application
            {selectedApplications.length !== 1 ? "s" : ""}?
            {bulkStatus === "ACCEPTED" &&
              " This will send acceptance emails to the mentors."}
            {bulkStatus === "REJECTED" &&
              " This will send rejection emails to the mentors."}
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
              onClick={handleBulkStatusUpdate}
              loading={bulkUpdateApplicationStatus.isPending}
            >
              {bulkStatus === "ACCEPTED" ? "Accept" : "Reject"} Applications
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Application Detail Drawer */}
      <ApplicationDetailsDrawer
        applicationId={viewingApplication?.id ?? null}
        opened={viewDrawerOpened}
        onClose={closeViewDrawer}
      />
    </Container>
  );
}

interface Application {
  id: string;
  status: string;
  email: string;
  eventId: string;
  submittedAt: Date | null;
  user?: {
    name: string | null;
  } | null;
}

interface MentorApplicationsTableProps {
  applications: Application[];
  selectedApplications: string[];
  onSelectAll: () => void;
  onSelectApplication: (applicationId: string) => void;
  onStatusUpdate: (
    applicationId: string,
    status: "ACCEPTED" | "REJECTED",
  ) => void;
  onViewApplication: (applicationId: string) => void;
  isUpdating: boolean;
}

function MentorApplicationsTable({
  applications,
  selectedApplications,
  onSelectAll,
  onSelectApplication,
  onStatusUpdate,
  onViewApplication,
  isUpdating,
}: MentorApplicationsTableProps) {
  if (applications.length === 0) {
    return (
      <Text ta="center" py="xl" c="dimmed">
        No mentor applications found for this filter.
      </Text>
    );
  }

  return (
    <>
      <Group justify="space-between" mb="md">
        <Checkbox
          checked={selectedApplications.length === applications.length}
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
                <Text size="sm" fw={500}>
                  {application.user?.name ?? "Unknown"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{application.email}</Text>
              </Table.Td>
              <Table.Td>
                <Badge
                  color={getStatusColor(application.status)}
                  variant="light"
                  size="sm"
                  leftSection={getStatusIcon(application.status)}
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
                  {/* Accept button - only show if not already accepted */}
                  {application.status !== "ACCEPTED" && (
                    <ActionIcon
                      variant="light"
                      color="green"
                      size="sm"
                      onClick={() => onStatusUpdate(application.id, "ACCEPTED")}
                      loading={isUpdating}
                      title="Accept mentor application"
                    >
                      <IconCheck size={14} />
                    </ActionIcon>
                  )}
                  {/* Reject button - always show (can reject accepted applications) */}
                  {application.status !== "REJECTED" && (
                    <ActionIcon
                      variant="light"
                      color="red"
                      size="sm"
                      onClick={() => onStatusUpdate(application.id, "REJECTED")}
                      loading={isUpdating}
                      title="Reject mentor application"
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  )}
                  <ActionIcon
                    variant="light"
                    color="blue"
                    size="sm"
                    onClick={() => onViewApplication(application.id)}
                    title="View mentor application details"
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
