"use client";

import React, { useState, useEffect } from "react";
import {
  Stack,
  Text,
  MultiSelect,
  Textarea,
  Paper,
  Button,
  Group,
  Tooltip,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

// Centralized admin labels configuration
export const ADMIN_LABELS = [
  { value: "AI / ML expert", label: "AI / ML expert" },
  { value: "Designer", label: "Designer" },
  { value: "Developer", label: "Developer" },
  { value: "Entrepreneur", label: "Entrepreneur" },
  { value: "Lawyer", label: "Lawyer" },
  { value: "Non-Technical", label: "Non-Technical" },
  { value: "Project manager", label: "Project manager" },
  { value: "REFI", label: "REFI" },
  { value: "Regen", label: "Regen" },
  { value: "Researcher", label: "Researcher" },
  { value: "Scientist", label: "Scientist" },
  { value: "Woman", label: "Woman" },
  { value: "Writer", label: "Writer" },
  { value: "ZK", label: "ZK" },
] as const;

export type AdminLabel = (typeof ADMIN_LABELS)[number]["value"];

interface AdminFieldsEditorProps {
  user: {
    id: string;
    adminNotes: string | null;
    adminWorkExperience: string | null;
    adminLabels: string[];
    adminUpdatedAt?: Date | null;
  };
  eventId?: string;
  onSaved?: () => void;
  disabled?: boolean;
  showTitle?: boolean;
  backgroundColor?: string;
}

export default function AdminFieldsEditor({
  user,
  eventId,
  onSaved,
  disabled = false,
  showTitle = true,
  backgroundColor = "yellow.0",
}: AdminFieldsEditorProps) {
  const [adminNotes, setAdminNotes] = useState(user.adminNotes ?? "");
  const [adminWorkExperience, setAdminWorkExperience] = useState(
    user.adminWorkExperience ?? "",
  );
  const [adminLabels, setAdminLabels] = useState<string[]>(
    user.adminLabels ?? [],
  );
  const [isSaving, setIsSaving] = useState(false);

  // tRPC mutations
  const utils = api.useUtils();
  const updateUserAdminNotes = api.user.updateUserAdminNotes.useMutation();
  const updateUserAdminWorkExperience =
    api.user.updateUserAdminWorkExperience.useMutation();
  const updateUserAdminLabels = api.user.updateUserAdminLabels.useMutation();

  // Update local state when user prop changes
  useEffect(() => {
    setAdminNotes(user.adminNotes ?? "");
    setAdminWorkExperience(user.adminWorkExperience ?? "");
    setAdminLabels(user.adminLabels ?? []);
  }, [user.adminNotes, user.adminWorkExperience, user.adminLabels]);

  // Check if labels have changed
  const labelsChanged =
    adminLabels.length !== (user.adminLabels?.length ?? 0) ||
    !adminLabels.every((label) => user.adminLabels?.includes(label));

  // Save admin notes
  const saveAdminNotes = async () => {
    setIsSaving(true);
    try {
      await updateUserAdminNotes.mutateAsync({
        userId: user.id,
        adminNotes: adminNotes.trim() || null,
      });

      // Invalidate queries to refresh data
      if (eventId) {
        await utils.application.getEventApplications.invalidate({ eventId });
        await utils.application.getConsensusApplications.invalidate({
          eventId,
        });
      }

      onSaved?.();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save admin notes",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save admin work experience
  const saveAdminWorkExperience = async () => {
    setIsSaving(true);
    try {
      await updateUserAdminWorkExperience.mutateAsync({
        userId: user.id,
        adminWorkExperience: adminWorkExperience.trim() || null,
      });

      // Invalidate queries to refresh data
      if (eventId) {
        await utils.application.getEventApplications.invalidate({ eventId });
        await utils.application.getConsensusApplications.invalidate({
          eventId,
        });
      }

      onSaved?.();
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save admin work experience",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Save admin labels
  const saveAdminLabels = async () => {
    setIsSaving(true);
    try {
      await updateUserAdminLabels.mutateAsync({
        userId: user.id,
        adminLabels: adminLabels as AdminLabel[],
      });

      // Invalidate queries to refresh data
      if (eventId) {
        await utils.application.getEventApplications.invalidate({ eventId });
        await utils.application.getConsensusApplications.invalidate({
          eventId,
        });
      }

      notifications.show({
        title: "Success",
        message: "Admin labels saved successfully",
        color: "green",
        icon: <IconCheck />,
      });
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to save admin labels",
        color: "red",
        icon: <IconAlertCircle />,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Paper p="xl" withBorder radius="md" bg={backgroundColor}>
      <Stack gap="lg">
        {showTitle && (
          <>
            <Text fw={600} size="lg" c="orange.8">
              Internal Admin Notes
            </Text>
            <Text size="sm" c="dimmed">
              These fields are for internal use only and are not visible to the
              applicant.
            </Text>
          </>
        )}

        <MultiSelect
          label="Admin Labels"
          placeholder="Select applicable labels"
          data={ADMIN_LABELS}
          value={adminLabels}
          onChange={(values) => {
            setAdminLabels(values);
          }}
          size="md"
          disabled={isSaving || disabled}
          rightSection={
            labelsChanged ? (
              <IconDeviceFloppy size={18} color="orange" />
            ) : (
              <IconCheck size={18} color="green" />
            )
          }
          styles={{
            label: { fontSize: "14px", fontWeight: 600, marginBottom: "8px" },
            input: { fontSize: "14px" },
          }}
        />

        {labelsChanged && (
          <Group justify="flex-end">
            <Button
              size="sm"
              onClick={saveAdminLabels}
              loading={isSaving}
              leftSection={<IconDeviceFloppy size={16} />}
              color="orange"
            >
              Save Labels
            </Button>
          </Group>
        )}

        <Group gap="xs" align="center">
          <Text fw={600} size="md">
            Work Experience
          </Text>
          <Tooltip
            label="Copy work experience from LinkedIn or other professional profiles for internal reference during application review"
            multiline
            w={200}
            position="top"
            withArrow
          >
            <IconInfoCircle size={16} color="gray" style={{ cursor: "help" }} />
          </Tooltip>
        </Group>

        <Textarea
          placeholder="Paste LinkedIn work experience or other professional background..."
          value={adminWorkExperience}
          onChange={(event) =>
            setAdminWorkExperience(event.currentTarget.value)
          }
          onBlur={saveAdminWorkExperience}
          minRows={4}
          size="md"
          disabled={isSaving || disabled}
          rightSection={
            adminWorkExperience !== (user.adminWorkExperience ?? "") ? (
              <IconDeviceFloppy size={18} color="orange" />
            ) : (
              <IconCheck size={18} color="green" />
            )
          }
          styles={{
            input: { fontSize: "14px" },
          }}
        />

        <Textarea
          label="Admin Notes"
          placeholder="Add internal notes about this applicant..."
          value={adminNotes}
          onChange={(event) => setAdminNotes(event.currentTarget.value)}
          onBlur={saveAdminNotes}
          minRows={6}
          size="md"
          disabled={isSaving || disabled}
          rightSection={
            adminNotes !== (user.adminNotes ?? "") ? (
              <IconDeviceFloppy size={18} color="orange" />
            ) : (
              <IconCheck size={18} color="green" />
            )
          }
          styles={{
            label: { fontSize: "14px", fontWeight: 600, marginBottom: "8px" },
            input: { fontSize: "14px" },
          }}
        />

        {user.adminUpdatedAt && (
          <Text size="xs" c="dimmed">
            Last updated: {new Date(user.adminUpdatedAt).toLocaleString()}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
