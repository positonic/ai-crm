"use client";

import { useState, useEffect } from "react";
import {
  Group,
  ActionIcon,
  Textarea,
  Button,
  Text,
  Collapse,
  Stack,
} from "@mantine/core";
import { IconStar, IconStarFilled } from "@tabler/icons-react";
import { api } from "~/trpc/react";

interface AgentMessageFeedbackProps {
  interactionId: string;
  onFeedbackSubmitted: (rating: number) => void;
}

const STORAGE_KEY = "ai-feedback-rated";
const MAX_STORED = 100;

function getRatedIds(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as string[];
      }
    }
  } catch {
    // Ignore parse errors
  }
  return [];
}

function markAsRated(interactionId: string): void {
  try {
    const ids = getRatedIds();
    if (!ids.includes(interactionId)) {
      ids.push(interactionId);
      // Keep only last MAX_STORED entries
      const trimmed = ids.length > MAX_STORED ? ids.slice(-MAX_STORED) : ids;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // Ignore storage errors
  }
}

export function AgentMessageFeedback({
  interactionId,
  onFeedbackSubmitted,
}: AgentMessageFeedbackProps) {
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [improvement, setImprovement] = useState("");

  const submitFeedback = api.aiInteraction.submitFeedback.useMutation();

  // Check if already rated on mount
  useEffect(() => {
    const ratedIds = getRatedIds();
    if (ratedIds.includes(interactionId)) {
      setSubmitted(true);
    }
  }, [interactionId]);

  const handleSubmit = async (rating: number, withForm = false) => {
    try {
      await submitFeedback.mutateAsync({
        interactionId,
        rating,
        comment: withForm && comment.trim() ? comment.trim() : undefined,
        improvement:
          withForm && improvement.trim() ? improvement.trim() : undefined,
      });
      markAsRated(interactionId);
      setSubmitted(true);
      setShowForm(false);
      onFeedbackSubmitted(rating);
    } catch {
      // Silently fail — don't disrupt the chat experience
    }
  };

  const handleStarClick = (rating: number) => {
    if (submitted) return;
    setSelectedRating(rating);

    if (rating <= 2) {
      // Low rating — expand form for details
      setShowForm(true);
    } else {
      // High rating — submit immediately
      void handleSubmit(rating);
    }
  };

  if (submitted) {
    return (
      <Text size="xs" c="dimmed" mt={4}>
        Thanks for your feedback!
      </Text>
    );
  }

  const displayRating = hoverRating ?? selectedRating ?? 0;

  return (
    <Stack gap={4} mt={4}>
      <Group gap={2}>
        {[1, 2, 3, 4, 5].map((star) => (
          <ActionIcon
            key={star}
            variant="subtle"
            size="xs"
            color={star <= displayRating ? "yellow" : "gray"}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(null)}
            onClick={() => handleStarClick(star)}
          >
            {star <= displayRating ? (
              <IconStarFilled size={14} />
            ) : (
              <IconStar size={14} />
            )}
          </ActionIcon>
        ))}
        <Text size="xs" c="dimmed" ml={4}>
          Rate this response
        </Text>
      </Group>

      <Collapse in={showForm}>
        <Stack
          gap="xs"
          mt="xs"
          p="sm"
          style={{
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Textarea
            placeholder="What went wrong?"
            size="xs"
            autosize
            minRows={2}
            maxRows={4}
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
          />
          <Textarea
            placeholder="How could this be improved?"
            size="xs"
            autosize
            minRows={2}
            maxRows={4}
            value={improvement}
            onChange={(e) => setImprovement(e.currentTarget.value)}
          />
          <Group gap="xs" justify="flex-end">
            <Button
              size="xs"
              variant="subtle"
              color="gray"
              onClick={() => {
                setShowForm(false);
                setSelectedRating(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="xs"
              onClick={() => {
                if (selectedRating) {
                  void handleSubmit(selectedRating, true);
                }
              }}
              loading={submitFeedback.isPending}
            >
              Submit
            </Button>
          </Group>
        </Stack>
      </Collapse>
    </Stack>
  );
}
