"use client";

import {
  Modal,
  TextInput,
  Textarea,
  Button,
  Stack,
} from "@mantine/core";
import { useState } from "react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface PrioritySubmitFormProps {
  deliberationId: string;
  opened: boolean;
  onClose: () => void;
}

export default function PrioritySubmitForm({
  deliberationId,
  opened,
  onClose,
}: PrioritySubmitFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const utils = api.useUtils();

  const submitPriority = api.deliberation.submitPriority.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Priority submitted",
        message: "Your priority has been added to the deliberation.",
        color: "green",
      });
      setTitle("");
      setDescription("");
      onClose();
      void utils.deliberation.getPriorities.invalidate();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleSubmit = () => {
    if (title.trim().length < 3) {
      notifications.show({
        title: "Validation error",
        message: "Title must be at least 3 characters.",
        color: "orange",
      });
      return;
    }
    submitPriority.mutate({
      deliberationId,
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Submit a Priority" size="md">
      <Stack gap="md">
        <TextInput
          label="What matters most?"
          placeholder="e.g., Retroactive public goods funding"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
          maxLength={200}
          required
        />
        <Textarea
          label="Description (optional)"
          placeholder="Why is this important? What should the community know?"
          value={description}
          onChange={(e) => setDescription(e.currentTarget.value)}
          maxLength={2000}
          minRows={3}
          autosize
        />
        <Button
          onClick={handleSubmit}
          loading={submitPriority.isPending}
          fullWidth
        >
          Submit Priority
        </Button>
      </Stack>
    </Modal>
  );
}
