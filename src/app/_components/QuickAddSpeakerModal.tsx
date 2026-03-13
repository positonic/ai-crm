"use client";

import { useState, useEffect } from "react";
import { Modal, TextInput, Stack, Group, Button, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { getDisplayName } from "~/utils/userDisplay";

export interface QuickAddSpeakerResult {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface QuickAddSpeakerModalProps {
  opened: boolean;
  onClose: () => void;
  eventId: string;
  venueId?: string;
  onSpeakerCreated: (user: QuickAddSpeakerResult) => void;
  prefillFirstName?: string;
  prefillLastName?: string;
  sessionTitle?: string;
}

export function QuickAddSpeakerModal({
  opened,
  onClose,
  eventId,
  venueId,
  onSpeakerCreated,
  prefillFirstName,
  prefillLastName,
  sessionTitle,
}: QuickAddSpeakerModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  // Apply prefill values when modal opens
  useEffect(() => {
    if (opened) {
      setFirstName(prefillFirstName ?? "");
      setLastName(prefillLastName ?? "");
    }
  }, [opened, prefillFirstName, prefillLastName]);

  const quickCreateMutation = api.schedule.quickCreateSpeaker.useMutation({
    onSuccess: (user) => {
      notifications.show({
        title: "Speaker added",
        message: `${getDisplayName(user, "Speaker")} has been added`,
        color: "green",
      });
      onSpeakerCreated(user);
      handleClose();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleClose = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setEmailError(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    if (!firstName.trim()) return;

    quickCreateMutation.mutate({
      eventId,
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim() || undefined,
      venueId,
      sessionTitle,
    });
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Quick Add Speaker"
      size="sm"
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Add a person who doesn&apos;t have an account yet. They&apos;ll be
          created with a minimal profile and can complete it later.
        </Text>
        <TextInput
          label="Email"
          placeholder="speaker@example.com"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.currentTarget.value);
            setEmailError(null);
          }}
          error={emailError}
        />
        <Group grow>
          <TextInput
            label="First Name"
            placeholder="Jane"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.currentTarget.value)}
          />
          <TextInput
            label="Last Name"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.currentTarget.value)}
          />
        </Group>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            loading={quickCreateMutation.isPending}
            disabled={!email.trim() || !firstName.trim()}
          >
            Add Speaker
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
