"use client";

import { useState } from "react";
import {
  Card,
  Text,
  Badge,
  Group,
  Stack,
  Button,
  TextInput,
  Select,
  Textarea,
  Modal,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { DatePickerInput } from "@mantine/dates";
import { IconPlus, IconMail, IconUpload, IconCopy } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import TelegramMessageButton from "~/app/_components/TelegramMessageButton";
import {
  validateEmail,
  validateBulkEmails,
  parseEmails,
  useInvitationMutations,
  InvitationStatsGrid,
  InvitationsTable,
} from "~/app/admin/_components/invitations";

interface CreateInvitationForm {
  email: string;
  type: "EVENT_ROLE" | "GLOBAL_ADMIN" | "GLOBAL_STAFF";
  eventId?: string;
  roleId?: string;
  globalRole?: "admin" | "staff";
  expiresAt?: Date;
}

interface BulkInvitationForm {
  emails: string;
  eventId: string;
  roleId: string;
  expiresAt?: Date;
}

export default function InvitationsClient() {
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [filterEventId, setFilterEventId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterEmail, setFilterEmail] = useState("");

  // API queries
  const {
    data: invitations,
    refetch: refetchInvitations,
    isLoading: loadingInvitations,
  } = api.invitation.getAll.useQuery({
    eventId: filterEventId || undefined,
    status:
      filterStatus && filterStatus !== ""
        ? (filterStatus as "PENDING" | "ACCEPTED" | "EXPIRED" | "CANCELLED")
        : undefined,
    email: filterEmail || undefined,
  });

  const { data: events, isLoading: loadingEvents } =
    api.event.getEvents.useQuery();
  const { data: roles, isLoading: loadingRoles } =
    api.invitation.getAvailableRoles.useQuery();
  const { data: stats } = api.invitation.getStats.useQuery({
    eventId: filterEventId || undefined,
  });

  const refetch = () => void refetchInvitations();

  // Shared mutations
  const mutations = useInvitationMutations({
    roleName: "invitation",
    onCreateSuccess: () => {
      setCreateModalOpen(false);
      createForm.reset();
      refetch();
    },
    onBulkCreateSuccess: () => {
      setBulkModalOpen(false);
      bulkForm.reset();
      refetch();
    },
    onCancelSuccess: refetch,
    onResendSuccess: refetch,
  });

  // Forms
  const createForm = useForm<CreateInvitationForm>({
    initialValues: {
      email: "",
      type: "EVENT_ROLE",
      eventId: "",
      roleId: "",
      globalRole: undefined,
      expiresAt: undefined,
    },
    validate: {
      email: (value) => validateEmail(value),
      type: (value) => (value ? null : "Invitation type is required"),
      eventId: (value, values) => {
        if (values.type === "EVENT_ROLE") {
          return value ? null : "Event is required for event roles";
        }
        return null;
      },
      roleId: (value, values) => {
        if (values.type === "EVENT_ROLE") {
          return value ? null : "Role is required for event roles";
        }
        return null;
      },
      globalRole: (value, values) => {
        if (values.type === "GLOBAL_ADMIN" || values.type === "GLOBAL_STAFF") {
          return value ? null : "Global role is required";
        }
        return null;
      },
    },
  });

  const bulkForm = useForm<BulkInvitationForm>({
    initialValues: {
      emails: "",
      eventId: "",
      roleId: "",
      expiresAt: undefined,
    },
    validate: {
      emails: (value) => validateBulkEmails(value),
      eventId: (value) => (value ? null : "Event is required"),
      roleId: (value) => (value ? null : "Role is required"),
    },
  });

  const handleCreateInvitation = (values: CreateInvitationForm) => {
    mutations.createInvitation.mutate({
      email: values.email,
      type: values.type,
      eventId: values.type === "EVENT_ROLE" ? values.eventId : undefined,
      roleId: values.type === "EVENT_ROLE" ? values.roleId : undefined,
      globalRole: values.type !== "EVENT_ROLE" ? values.globalRole : undefined,
      expiresAt: values.expiresAt,
    });
  };

  const handleBulkCreateInvitations = (values: BulkInvitationForm) => {
    const emails = parseEmails(values.emails);
    mutations.bulkCreateInvitations.mutate({
      emails,
      eventId: values.eventId,
      roleId: values.roleId,
      expiresAt: values.expiresAt,
    });
  };

  const copyInvitationLink = (token: string) => {
    const invitationUrl = `${window.location.origin}/accept-invitation?token=${token}`;
    void navigator.clipboard
      .writeText(invitationUrl)
      .then(() => {
        notifications.show({
          title: "Success",
          message: "Invitation link copied to clipboard!",
          color: "green",
        });
      })
      .catch(() => {
        notifications.show({
          title: "Error",
          message: "Failed to copy invitation link",
          color: "red",
        });
      });
  };

  // Transform invitation data for TelegramMessageButton
  const createMockApplicationForTelegram = (invitation: { email: string }) => {
    return {
      responses: [
        {
          answer: invitation.email,
          question: {
            questionKey: "telegram",
            questionEn: "Telegram Handle",
            order: 1,
          },
        },
      ],
      user: {
        name: invitation.email.split("@")[0] ?? null,
        email: invitation.email,
      },
    };
  };

  const createInvitationTelegramMessage = (invitation: {
    token: string;
    type: string;
    event?: { name: string } | null;
    role?: { name: string } | null;
    globalRole?: string | null;
    expiresAt: string | Date;
  }) => {
    const invitationUrl = `${window.location.origin}/accept-invitation?token=${invitation.token}`;
    const eventName =
      invitation.type === "EVENT_ROLE"
        ? invitation.event?.name
        : "Platform Administration";
    const roleName =
      invitation.type === "EVENT_ROLE"
        ? invitation.role?.name
        : invitation.globalRole;

    return `You've been invited to join ${eventName ?? "an event"} as ${roleName ?? "a role"}!

Click here to accept your invitation:
${invitationUrl}

This invitation expires on ${new Date(invitation.expiresAt).toLocaleDateString()}.

We're excited to have you on board!`;
  };

  if (loadingInvitations || loadingEvents || loadingRoles) {
    return (
      <Group justify="center" py="xl">
        <Loader size="xl" />
      </Group>
    );
  }

  return (
    <>
      {/* Action Buttons */}
      <Group justify="flex-end" mb="xl">
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreateModalOpen(true)}
        >
          Send Invitation
        </Button>
        <Button
          variant="light"
          leftSection={<IconUpload size={16} />}
          onClick={() => setBulkModalOpen(true)}
        >
          Bulk Invite
        </Button>
      </Group>

      {/* Statistics */}
      {stats && (
        <InvitationStatsGrid
          stats={[
            { value: stats.total, label: "Total" },
            { value: stats.pending, label: "Pending", color: "blue" },
            { value: stats.accepted, label: "Accepted", color: "green" },
            { value: stats.expired, label: "Expired", color: "orange" },
            { value: stats.acceptanceRate, label: "Accept Rate %" },
          ]}
          cols={{ base: 2, sm: 5 }}
        />
      )}

      {/* Filters */}
      <Card withBorder mb="xl">
        <Group>
          <TextInput
            placeholder="Filter by email..."
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by event"
            value={filterEventId}
            onChange={(value) => setFilterEventId(value ?? "")}
            data={
              events?.map((event) => ({
                value: event.id,
                label: event.name,
              })) ?? []
            }
            clearable
            style={{ minWidth: 200 }}
          />
          <Select
            placeholder="Filter by status"
            value={filterStatus}
            onChange={(value) => setFilterStatus(value ?? "")}
            data={[
              { value: "PENDING", label: "Pending" },
              { value: "ACCEPTED", label: "Accepted" },
              { value: "EXPIRED", label: "Expired" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
            clearable
            style={{ minWidth: 150 }}
          />
        </Group>
      </Card>

      {/* Invitations Table */}
      <InvitationsTable
        invitations={invitations ?? []}
        totalCount={invitations?.length ?? 0}
        roleName="invitation"
        title="Event Invitations"
        onResend={(id) =>
          mutations.resendInvitation.mutate({ invitationId: id })
        }
        onCancel={(id) =>
          mutations.cancelInvitation.mutate({ invitationId: id })
        }
        isResending={mutations.resendInvitation.isPending}
        isCancelling={mutations.cancelInvitation.isPending}
        extraColumns={[
          {
            header: "Event",
            render: (inv) => (
              <Group gap="xs">
                <Text size="sm" fw={500}>
                  {inv.type === "EVENT_ROLE"
                    ? inv.event?.name
                    : "Global Platform"}
                </Text>
                {inv.type !== "EVENT_ROLE" && (
                  <Badge size="xs" color="red" variant="dot">
                    Global
                  </Badge>
                )}
              </Group>
            ),
          },
          {
            header: "Role",
            render: (inv) => (
              <Badge
                variant="light"
                color={inv.type === "EVENT_ROLE" ? "blue" : "red"}
                size="sm"
              >
                {inv.type === "EVENT_ROLE" ? inv.role?.name : inv.globalRole}
              </Badge>
            ),
          },
        ]}
        extraActions={(inv) => (
          <>
            <ActionIcon
              variant="light"
              color="green"
              size="sm"
              onClick={() => copyInvitationLink(inv.token ?? "")}
              title="Copy invitation link"
            >
              <IconCopy size={14} />
            </ActionIcon>
            <TelegramMessageButton
              application={createMockApplicationForTelegram(inv)}
              customMessage={createInvitationTelegramMessage(
                inv as Parameters<typeof createInvitationTelegramMessage>[0],
              )}
              size={14}
              variant="light"
              color="blue"
            />
          </>
        )}
      />

      {/* Create Invitation Modal (custom — supports multiple invitation types) */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Send Invitation"
        size="md"
      >
        <form onSubmit={createForm.onSubmit(handleCreateInvitation)}>
          <Stack>
            <TextInput
              label="Email"
              placeholder="user@example.com"
              {...createForm.getInputProps("email")}
              required
            />

            <Select
              label="Invitation Type"
              placeholder="Select invitation type"
              data={[
                {
                  value: "EVENT_ROLE",
                  label: "Event Role (mentor, sponsor, etc.)",
                },
                { value: "GLOBAL_ADMIN", label: "Global Admin" },
                { value: "GLOBAL_STAFF", label: "Global Staff" },
              ]}
              {...createForm.getInputProps("type")}
              required
              onChange={(value) => {
                createForm.setFieldValue(
                  "type",
                  value as "EVENT_ROLE" | "GLOBAL_ADMIN" | "GLOBAL_STAFF",
                );
                createForm.setFieldValue("eventId", "");
                createForm.setFieldValue("roleId", "");
                createForm.setFieldValue("globalRole", undefined);
              }}
            />

            {(createForm.values.type === "GLOBAL_ADMIN" ||
              createForm.values.type === "GLOBAL_STAFF") && (
              <Select
                label="Global Role"
                placeholder="Select global role"
                data={[
                  { value: "admin", label: "Admin - Full platform access" },
                  { value: "staff", label: "Staff - Management access" },
                ]}
                {...createForm.getInputProps("globalRole")}
                required
              />
            )}

            {createForm.values.type === "EVENT_ROLE" && (
              <Select
                label="Event"
                placeholder="Select an event"
                data={
                  events?.map((event) => ({
                    value: event.id,
                    label: event.name,
                  })) ?? []
                }
                {...createForm.getInputProps("eventId")}
                required
              />
            )}

            {createForm.values.type === "EVENT_ROLE" && (
              <Select
                label="Event Role"
                placeholder="Select a role"
                data={
                  roles?.map((role) => ({
                    value: role.id,
                    label: role.name,
                  })) ?? []
                }
                {...createForm.getInputProps("roleId")}
                required
              />
            )}

            <DatePickerInput
              label="Expires At (optional)"
              placeholder="Select expiration date"
              {...createForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={mutations.createInvitation.isPending}
                leftSection={<IconMail size={16} />}
              >
                Send Invitation
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Bulk Invitation Modal */}
      <Modal
        opened={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        title="Bulk Send Invitations"
        size="lg"
      >
        <form onSubmit={bulkForm.onSubmit(handleBulkCreateInvitations)}>
          <Stack>
            <Textarea
              label="Emails"
              description="Enter one email per line or separate with commas"
              placeholder={
                "user1@example.com\nuser2@example.com\nuser3@example.com"
              }
              {...bulkForm.getInputProps("emails")}
              rows={6}
              required
            />

            <Select
              label="Event"
              placeholder="Select an event"
              data={
                events?.map((event) => ({
                  value: event.id,
                  label: event.name,
                })) ?? []
              }
              {...bulkForm.getInputProps("eventId")}
              required
            />

            <Select
              label="Role"
              placeholder="Select a role"
              data={
                roles?.map((role) => ({ value: role.id, label: role.name })) ??
                []
              }
              {...bulkForm.getInputProps("roleId")}
              required
            />

            <DatePickerInput
              label="Expires At (optional)"
              placeholder="Select expiration date"
              {...bulkForm.getInputProps("expiresAt")}
              minDate={new Date()}
            />

            <Group justify="flex-end">
              <Button variant="light" onClick={() => setBulkModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={mutations.bulkCreateInvitations.isPending}
                leftSection={<IconUpload size={16} />}
              >
                Send Invitations
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
