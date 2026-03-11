"use client";

import {
  Paper,
  Group,
  Stack,
  Text,
  Button,
  Badge,
  Collapse,
  Textarea,
  Select,
  Avatar,
  ActionIcon,
} from "@mantine/core";
import {
  IconArrowUp,
  IconAlertTriangle,
  IconCoin,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useState } from "react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface PriorityUser {
  id: string;
  name: string | null;
  image: string | null;
}

interface Blocker {
  id: string;
  description: string;
  user: { id: string; name: string | null };
}

interface Resource {
  id: string;
  category: string;
  description: string;
  user: { id: string; name: string | null };
}

interface PriorityData {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  user: PriorityUser;
  _count: { votes: number; blockers: number; resources: number };
  hasVoted: boolean;
  blockers: Blocker[];
  resources: Resource[];
}

interface PriorityCardProps {
  priority: PriorityData;
  isCollecting: boolean;
}

export default function PriorityCard({
  priority,
  isCollecting,
}: PriorityCardProps) {
  const [showBlockers, setShowBlockers] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const [blockerText, setBlockerText] = useState("");
  const [resourceText, setResourceText] = useState("");
  const [resourceCategory, setResourceCategory] = useState<string>("funding");

  const utils = api.useUtils();

  const voteMutation = api.deliberation.vote.useMutation({
    onMutate: async () => {
      await utils.deliberation.getPriorities.cancel();
    },
    onSettled: () => {
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

  const submitBlocker = api.deliberation.submitBlocker.useMutation({
    onSuccess: () => {
      setBlockerText("");
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

  const submitResource = api.deliberation.submitResourceSuggestion.useMutation({
    onSuccess: () => {
      setResourceText("");
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

  const timeAgo = getRelativeTime(priority.createdAt);

  return (
    <Paper p="md" radius="md" withBorder>
      <Group align="flex-start" gap="md" wrap="nowrap">
        {/* Vote button */}
        <Stack align="center" gap={2}>
          <ActionIcon
            variant={priority.hasVoted ? "filled" : "light"}
            color={priority.hasVoted ? "blue" : "gray"}
            size="lg"
            onClick={() => voteMutation.mutate({ priorityId: priority.id })}
            loading={voteMutation.isPending}
            aria-label={`Toggle vote for ${priority.title}`}
            aria-pressed={priority.hasVoted}
          >
            <IconArrowUp size={18} />
          </ActionIcon>
          <Text size="sm" fw={600} ta="center">
            {priority._count.votes}
          </Text>
        </Stack>

        {/* Content */}
        <Stack gap="xs" style={{ flex: 1, minWidth: 0 }}>
          <Text fw={600} size="md">
            {priority.title}
          </Text>
          {priority.description && (
            <Text size="sm" c="dimmed" lineClamp={3}>
              {priority.description}
            </Text>
          )}

          <Group gap="xs">
            <Avatar src={priority.user.image} size="xs" radius="xl" />
            <Text size="xs" c="dimmed">
              {priority.user.name ?? "Anonymous"} &middot; {timeAgo}
            </Text>
          </Group>

          {/* Action buttons */}
          <Group gap="xs" mt="xs">
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconAlertTriangle size={14} />}
              rightSection={
                priority._count.blockers > 0 ? (
                  <Badge size="xs" variant="light" color="orange">
                    {priority._count.blockers}
                  </Badge>
                ) : null
              }
              onClick={() => setShowBlockers(!showBlockers)}
              color="orange"
            >
              Blockers
              {showBlockers ? (
                <IconChevronUp size={12} />
              ) : (
                <IconChevronDown size={12} />
              )}
            </Button>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconCoin size={14} />}
              rightSection={
                priority._count.resources > 0 ? (
                  <Badge size="xs" variant="light" color="teal">
                    {priority._count.resources}
                  </Badge>
                ) : null
              }
              onClick={() => setShowResources(!showResources)}
              color="teal"
            >
              Resources
              {showResources ? (
                <IconChevronUp size={12} />
              ) : (
                <IconChevronDown size={12} />
              )}
            </Button>
          </Group>

          {/* Blockers section */}
          <Collapse in={showBlockers}>
            <Stack gap="xs" mt="xs">
              {priority.blockers.map((b) => (
                <Paper key={b.id} p="xs" radius="sm" bg="orange.0">
                  <Text size="sm">{b.description}</Text>
                  <Text size="xs" c="dimmed">
                    {b.user.name ?? "Anonymous"}
                  </Text>
                </Paper>
              ))}
              {isCollecting && (
                <Group gap="xs">
                  <Textarea
                    placeholder="What is blocking progress?"
                    value={blockerText}
                    onChange={(e) => setBlockerText(e.currentTarget.value)}
                    size="xs"
                    style={{ flex: 1 }}
                    maxLength={2000}
                    autosize
                    minRows={1}
                  />
                  <Button
                    size="xs"
                    variant="light"
                    color="orange"
                    onClick={() => {
                      if (blockerText.trim().length >= 3) {
                        submitBlocker.mutate({
                          priorityId: priority.id,
                          description: blockerText.trim(),
                        });
                      }
                    }}
                    loading={submitBlocker.isPending}
                  >
                    Add
                  </Button>
                </Group>
              )}
            </Stack>
          </Collapse>

          {/* Resources section */}
          <Collapse in={showResources}>
            <Stack gap="xs" mt="xs">
              {priority.resources.map((r) => (
                <Paper key={r.id} p="xs" radius="sm" bg="teal.0">
                  <Group gap="xs">
                    <Badge size="xs" variant="light" color="teal">
                      {r.category}
                    </Badge>
                    <Text size="sm">{r.description}</Text>
                  </Group>
                  <Text size="xs" c="dimmed">
                    {r.user.name ?? "Anonymous"}
                  </Text>
                </Paper>
              ))}
              {isCollecting && (
                <Stack gap="xs">
                  <Group gap="xs">
                    <Select
                      data={[
                        { value: "funding", label: "Funding" },
                        { value: "talent", label: "Talent" },
                        { value: "tooling", label: "Tooling" },
                        { value: "other", label: "Other" },
                      ]}
                      value={resourceCategory}
                      onChange={(v) => setResourceCategory(v ?? "funding")}
                      size="xs"
                      w={120}
                    />
                    <Textarea
                      placeholder="Where should resources go?"
                      value={resourceText}
                      onChange={(e) => setResourceText(e.currentTarget.value)}
                      size="xs"
                      style={{ flex: 1 }}
                      maxLength={2000}
                      autosize
                      minRows={1}
                    />
                    <Button
                      size="xs"
                      variant="light"
                      color="teal"
                      onClick={() => {
                        if (resourceText.trim().length >= 3) {
                          submitResource.mutate({
                            priorityId: priority.id,
                            category: resourceCategory as
                              | "funding"
                              | "talent"
                              | "tooling"
                              | "other",
                            description: resourceText.trim(),
                          });
                        }
                      }}
                      loading={submitResource.isPending}
                    >
                      Add
                    </Button>
                  </Group>
                </Stack>
              )}
            </Stack>
          </Collapse>
        </Stack>
      </Group>
    </Paper>
  );
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${String(days)}d ago`;
}
