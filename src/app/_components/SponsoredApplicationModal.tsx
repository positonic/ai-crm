"use client";

import { useState } from "react";
import {
  Modal,
  TextInput,
  Button,
  Stack,
  Group,
  Alert,
  Text,
} from "@mantine/core";
import { IconAlertCircle, IconCheck } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface SponsoredApplicationModalProps {
  opened: boolean;
  onClose: () => void;
  eventId: string;
  onSuccess?: () => void;
}

interface FormData {
  name: string;
  email: string;
  organization: string;
  notes: string;
}

export default function SponsoredApplicationModal({
  opened,
  onClose,
  eventId,
  onSuccess,
}: SponsoredApplicationModalProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    organization: "",
    notes: "",
  });

  const createSponsoredApplicationMutation =
    api.application.createSponsoredApplication.useMutation({
      onSuccess: () => {
        setFormData({ name: "", email: "", organization: "", notes: "" });
        onSuccess?.();
        onClose();
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim()) {
      return;
    }

    createSponsoredApplicationMutation.mutate({
      eventId,
      name: formData.name.trim(),
      email: formData.email.trim(),
      organization: formData.organization.trim() || undefined,
      notes: formData.notes.trim() || undefined,
    });
  };

  const handleInputChange =
    (field: keyof FormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const isValid =
    formData.name.trim().length > 0 && formData.email.trim().length > 0;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Create Sponsored Application"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Create a reserved spot with ACCEPTED status for sponsors or special
            invitees.
          </Text>

          {createSponsoredApplicationMutation.error && (
            <Alert
              icon={<IconAlertCircle size="1rem" />}
              title="Error"
              color="red"
            >
              {createSponsoredApplicationMutation.error.message}
            </Alert>
          )}

          <TextInput
            label="Full Name"
            placeholder="Enter sponsor's full name"
            required
            value={formData.name}
            onChange={handleInputChange("name")}
            error={formData.name.trim() === "" ? "Name is required" : undefined}
          />

          <TextInput
            label="Email Address"
            placeholder="Enter sponsor's email address"
            type="email"
            required
            value={formData.email}
            onChange={handleInputChange("email")}
            error={
              formData.email.trim() === "" ? "Email is required" : undefined
            }
          />

          <TextInput
            label="Affiliation"
            placeholder="Company, organization, or institutional affiliation"
            value={formData.organization}
            onChange={handleInputChange("organization")}
          />

          <TextInput
            label="Notes"
            placeholder="Internal notes (e.g., sponsor type, special requirements)"
            value={formData.notes}
            onChange={handleInputChange("notes")}
          />

          <Group justify="flex-end" mt="md">
            <Button
              variant="subtle"
              onClick={onClose}
              disabled={createSponsoredApplicationMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createSponsoredApplicationMutation.isPending}
              disabled={!isValid}
              leftSection={<IconCheck size="1rem" />}
            >
              Create Sponsored Application
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
