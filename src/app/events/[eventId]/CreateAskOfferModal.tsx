"use client";

import { useState } from "react";
import { Modal, Stack, TextInput, Button, Group } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { MentionTextarea } from "~/app/_components/MentionTextarea";

interface CreateAskOfferModalProps {
  eventId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialType: "ASK" | "OFFER";
  onSuccess?: () => void;
}

export function CreateAskOfferModal({
  eventId,
  isOpen,
  onClose,
  initialType,
  onSuccess,
}: CreateAskOfferModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");

  const utils = api.useUtils();

  const createMutation = api.askOffer.create.useMutation({
    onSuccess: () => {
      void utils.askOffer.getEventAsksOffers.invalidate();
      void utils.askOffer.getUserAsksOffers.invalidate();
      void utils.askOffer.getAllAsksOffers.invalidate();

      // Reset form state
      setTitle("");
      setDescription("");
      setTitleError("");
      setDescriptionError("");

      onClose();

      notifications.show({
        title: "Success",
        message: `${initialType === "ASK" ? "Ask" : "Offer"} created successfully`,
        color: "green",
      });

      // Call optional success callback
      if (onSuccess) {
        onSuccess();
      }
    },
    onError: (error) => {
      // Parse Zod validation errors
      try {
        const zodErrors = JSON.parse(error.message) as Array<{
          path: string[];
          message: string;
        }>;

        // Set field-specific errors
        zodErrors.forEach((err) => {
          if (err.path[0] === "title") {
            setTitleError(err.message);
          } else if (err.path[0] === "description") {
            setDescriptionError(err.message);
          }
        });

        notifications.show({
          title: "Validation Error",
          message: "Please check the form fields for errors",
          color: "red",
        });
      } catch {
        // If not a Zod error, show the error message directly
        notifications.show({
          title: "Error",
          message: error.message,
          color: "red",
        });
      }
    },
  });

  const handleCreate = () => {
    // Clear previous errors
    setTitleError("");
    setDescriptionError("");

    // Client-side validation
    let hasError = false;

    if (!title.trim()) {
      setTitleError("Title is required");
      hasError = true;
    } else if (title.trim().length < 3) {
      setTitleError("Title must be at least 3 characters");
      hasError = true;
    }

    if (!description.trim()) {
      setDescriptionError("Description is required");
      hasError = true;
    } else if (description.trim().length < 10) {
      setDescriptionError("Description must be at least 10 characters");
      hasError = true;
    }

    if (hasError) {
      notifications.show({
        title: "Validation Error",
        message: "Please check the form fields for errors",
        color: "red",
      });
      return;
    }

    createMutation.mutate({
      eventId: eventId ?? undefined,
      type: initialType,
      title: title.trim(),
      description: description.trim(),
      tags: [],
    });
  };

  const handleClose = () => {
    // Reset form state when closing
    setTitle("");
    setDescription("");
    setTitleError("");
    setDescriptionError("");
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={`Create ${initialType === "ASK" ? "Ask" : "Offer"}`}
      size="lg"
    >
      <Stack gap="md">
        <TextInput
          label="Title"
          placeholder={
            initialType === "ASK"
              ? "e.g., Looking for Solidity mentor"
              : "e.g., Can help with frontend development"
          }
          value={title}
          onChange={(e) => {
            setTitle(e.currentTarget.value);
            if (titleError) setTitleError("");
          }}
          error={titleError}
          description="Minimum 3 characters"
          required
          withAsterisk
        />
        <MentionTextarea
          label="Description"
          placeholder="Provide more details... (Use @ to mention users, supports Markdown)"
          value={description}
          onChange={(value) => {
            setDescription(value);
            if (descriptionError) setDescriptionError("");
          }}
          error={descriptionError}
          minRows={4}
          required
        />
        <Group justify="flex-end">
          <Button variant="subtle" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={createMutation.isPending}
            leftSection={<IconPlus size={16} />}
          >
            Create {initialType === "ASK" ? "Ask" : "Offer"}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
