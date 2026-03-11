"use client";

import { useState } from "react";
import {
  Stack,
  Text,
  Group,
  Badge,
  Paper,
  Title,
  Loader,
  Center,
  Container,
  Tabs,
  Avatar,
  ActionIcon,
  Tooltip,
  Button,
  Modal,
  TextInput,
  Textarea,
  TagsInput,
} from "@mantine/core";
import {
  IconMessages,
  IconFlame,
  IconClock,
  IconMessageCircle,
  IconTrash,
  IconPlus,
  IconHeart,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";

function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return "just now";
}

export default function ForumClient() {
  const { data: session } = useSession();
  const utils = api.useUtils();

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [newThreadTags, setNewThreadTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "mostCommented">(
    "recent",
  );

  // Fetch threads
  const { data: threadsData, isLoading } = api.forum.getThreads.useQuery({
    sortBy,
    limit: 50,
  });

  // Mutations
  const createThreadMutation = api.forum.createThread.useMutation({
    onSuccess: () => {
      void utils.forum.getThreads.invalidate();
      void utils.forum.getThreadCount.invalidate();
      setCreateModalOpen(false);
      setNewThreadTitle("");
      setNewThreadContent("");
      setNewThreadTags([]);
      notifications.show({
        title: "Success",
        message: "Thread created successfully",
        color: "green",
      });
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const deleteThreadMutation = api.forum.deleteThread.useMutation({
    onSuccess: () => {
      void utils.forum.getThreads.invalidate();
      void utils.forum.getThreadCount.invalidate();
      notifications.show({
        title: "Success",
        message: "Thread deleted successfully",
        color: "green",
      });
    },
  });

  const handleCreateThread = () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim()) {
      notifications.show({
        title: "Error",
        message: "Please fill in both title and content",
        color: "red",
      });
      return;
    }

    createThreadMutation.mutate({
      title: newThreadTitle.trim(),
      content: newThreadContent.trim(),
      tags: newThreadTags,
    });
  };

  const isOwnThread = (userId: string) => {
    return session?.user?.id === userId;
  };

  const threads = threadsData?.threads ?? [];

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs">
            <Title order={2}>Forum</Title>
            <Text c="dimmed">
              Discuss topics and share ideas with the community
            </Text>
          </Stack>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => setCreateModalOpen(true)}
          >
            New Thread
          </Button>
        </Group>

        {/* Sort Tabs */}
        <Tabs
          value={sortBy}
          onChange={(value) => setSortBy(value as typeof sortBy)}
        >
          <Tabs.List>
            <Tabs.Tab value="recent" leftSection={<IconClock size={16} />}>
              Recent
            </Tabs.Tab>
            <Tabs.Tab value="popular" leftSection={<IconFlame size={16} />}>
              Popular
            </Tabs.Tab>
            <Tabs.Tab
              value="mostCommented"
              leftSection={<IconMessageCircle size={16} />}
            >
              Most Discussed
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Thread List */}
        {threads.length === 0 ? (
          <Stack align="center" gap="md" py="xl">
            <IconMessages size={48} style={{ opacity: 0.3 }} />
            <Text ta="center" c="dimmed">
              No threads yet. Be the first to start a discussion!
            </Text>
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              Create Thread
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            {threads.map((thread) => (
              <Paper
                key={thread.id}
                p="md"
                withBorder
                component={Link}
                href={`/community/forum/${thread.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                  transition: "transform 0.1s ease, box-shadow 0.1s ease",
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 12px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "";
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Group gap="md" style={{ flex: 1 }}>
                    <Avatar
                      src={getAvatarUrl({
                        customAvatarUrl: thread.user.profile?.avatarUrl,
                        oauthImageUrl: thread.user.image,
                        name: thread.user.name,
                      })}
                      alt={thread.user.name ?? "User"}
                      size="md"
                      radius="xl"
                    >
                      {getAvatarInitials({
                        name: thread.user.name,
                      })}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <Text fw={600} mb={4}>
                        {thread.title}
                      </Text>
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          {getDisplayName(thread.user, "Anonymous")}
                        </Text>
                        {thread.user.profile?.jobTitle && (
                          <>
                            <Text size="sm" c="dimmed">
                              ·
                            </Text>
                            <Text size="sm" c="dimmed">
                              {thread.user.profile.jobTitle}
                            </Text>
                          </>
                        )}
                        <Text size="sm" c="dimmed">
                          ·
                        </Text>
                        <Text size="sm" c="dimmed">
                          {getRelativeTime(thread.createdAt)}
                        </Text>
                      </Group>
                      {thread.tags.length > 0 && (
                        <Group gap="xs" mt="xs">
                          {thread.tags.map((tag, idx) => (
                            <Badge key={idx} size="sm" variant="light">
                              {tag}
                            </Badge>
                          ))}
                        </Group>
                      )}
                    </div>
                  </Group>

                  <Group gap="md">
                    {/* Stats */}
                    <Group gap="xs">
                      <Group gap={4}>
                        <IconHeart size={16} style={{ opacity: 0.6 }} />
                        <Text size="sm" c="dimmed">
                          {thread.likeCount}
                        </Text>
                      </Group>
                      <Group gap={4}>
                        <IconMessageCircle size={16} style={{ opacity: 0.6 }} />
                        <Text size="sm" c="dimmed">
                          {thread.commentCount}
                        </Text>
                      </Group>
                    </Group>

                    {/* Actions */}
                    {isOwnThread(thread.userId) && (
                      <Tooltip label="Delete">
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="sm"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteThreadMutation.mutate({ id: thread.id });
                          }}
                          loading={deleteThreadMutation.isPending}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))}
          </Stack>
        )}
      </Stack>

      {/* Create Thread Modal */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Thread"
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="Title"
            placeholder="What would you like to discuss?"
            value={newThreadTitle}
            onChange={(e) => setNewThreadTitle(e.currentTarget.value)}
            required
          />
          <Textarea
            label="Content"
            placeholder="Share your thoughts... (Markdown supported)"
            value={newThreadContent}
            onChange={(e) => setNewThreadContent(e.currentTarget.value)}
            minRows={6}
            required
          />
          <TagsInput
            label="Tags"
            placeholder="Add tags (press Enter)"
            value={newThreadTags}
            onChange={setNewThreadTags}
            clearable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateThread}
              loading={createThreadMutation.isPending}
            >
              Create Thread
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
