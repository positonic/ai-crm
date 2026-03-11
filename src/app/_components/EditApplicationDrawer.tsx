"use client";

import React from "react";
import { Drawer, Stack, Title, Group, Button, Text } from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import AdminFieldsEditor from "./AdminFieldsEditor";
import ProjectManagementSection from "./ProjectManagementSection";
import { getDisplayName } from "~/utils/userDisplay";

interface EditApplicationDrawerProps {
  opened: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    adminNotes: string | null;
    adminWorkExperience: string | null;
    adminLabels: string[];
  } | null;
  eventId: string;
}

export default function EditApplicationDrawer({
  opened,
  onClose,
  user,
  eventId,
}: EditApplicationDrawerProps) {
  const handleClose = () => {
    onClose();
  };

  if (!user) return null;

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      position="right"
      size="lg"
      title={
        <Group>
          <Title order={4}>Edit Person</Title>
          <Text size="sm" c="dimmed">
            {getDisplayName(user)} ({user.email})
          </Text>
        </Group>
      }
      padding="xl"
    >
      <Stack gap="lg">
        {/* Admin Fields Editor */}
        <AdminFieldsEditor user={user} eventId={eventId} />

        {/* Project Management Section */}
        <ProjectManagementSection userId={user.id} />

        {/* Action buttons */}
        <Group justify="flex-end">
          <Button
            variant="outline"
            onClick={handleClose}
            leftSection={<IconX size={16} />}
          >
            Close
          </Button>
        </Group>
      </Stack>
    </Drawer>
  );
}
