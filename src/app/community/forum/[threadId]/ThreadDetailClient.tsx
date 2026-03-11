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
  Avatar,
  ActionIcon,
  Tooltip,
  Button,
  Textarea,
  Divider,
  Anchor,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconHeart,
  IconHeartFilled,
  IconMessageCircle,
  IconTrash,
  IconCornerDownRight,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { getDisplayName } from "~/utils/userDisplay";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";

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

interface ThreadDetailClientProps {
  threadId: string;
}

export default function ThreadDetailClient({
  threadId,
}: ThreadDetailClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = api.useUtils();

  // State
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Fetch thread
  const {
    data: thread,
    isLoading,
    error,
  } = api.forum.getThreadById.useQuery({
    id: threadId,
  });

  // Mutations
  const createCommentMutation = api.forum.createComment.useMutation({
    onSuccess: () => {
      void utils.forum.getThreadById.invalidate({ id: threadId });
      setNewComment("");
      setReplyingTo(null);
      setReplyContent("");
      notifications.show({
        title: "Success",
        message: "Comment added",
        color: "green",
      });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const deleteCommentMutation = api.forum.deleteComment.useMutation({
    onSuccess: () => {
      void utils.forum.getThreadById.invalidate({ id: threadId });
      notifications.show({
        title: "Success",
        message: "Comment deleted",
        color: "green",
      });
    },
  });

  const deleteThreadMutation = api.forum.deleteThread.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Thread deleted",
        color: "green",
      });
      router.push("/community/forum");
    },
  });

  const likeThreadMutation = api.forum.likeThread.useMutation({
    onSuccess: () => {
      void utils.forum.getThreadById.invalidate({ id: threadId });
    },
  });

  const unlikeThreadMutation = api.forum.unlikeThread.useMutation({
    onSuccess: () => {
      void utils.forum.getThreadById.invalidate({ id: threadId });
    },
  });

  const likeCommentMutation = api.forum.likeComment.useMutation({
    onSuccess: () => {
      void utils.forum.getThreadById.invalidate({ id: threadId });
    },
  });

  const unlikeCommentMutation = api.forum.unlikeComment.useMutation({
    onSuccess: () => {
      void utils.forum.getThreadById.invalidate({ id: threadId });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({
      threadId,
      content: newComment.trim(),
    });
  };

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({
      threadId,
      parentId,
      content: replyContent.trim(),
    });
  };

  const handleThreadLikeToggle = () => {
    if (!thread) return;
    if (thread.hasLiked) {
      unlikeThreadMutation.mutate({ threadId });
    } else {
      likeThreadMutation.mutate({ threadId });
    }
  };

  const handleCommentLikeToggle = (commentId: string, hasLiked: boolean) => {
    if (hasLiked) {
      unlikeCommentMutation.mutate({ commentId });
    } else {
      likeCommentMutation.mutate({ commentId });
    }
  };

  const isOwnThread = thread?.userId === session?.user?.id;
  const isOwnComment = (userId: string) => session?.user?.id === userId;

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (error ?? !thread) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md" py="xl">
          <Text c="red">Thread not found</Text>
          <Button
            variant="light"
            leftSection={<IconArrowLeft size={16} />}
            component={Link}
            href="/community/forum"
          >
            Back to Forum
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Back Button */}
        <Anchor component={Link} href="/community/forum" c="dimmed" size="sm">
          <Group gap="xs">
            <IconArrowLeft size={16} />
            Back to Forum
          </Group>
        </Anchor>

        {/* Thread Header */}
        <Paper p="lg" withBorder>
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Title order={2}>{thread.title}</Title>
              {isOwnThread && (
                <Tooltip label="Delete Thread">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() =>
                      deleteThreadMutation.mutate({ id: threadId })
                    }
                    loading={deleteThreadMutation.isPending}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>

            {/* Author */}
            <Group gap="sm">
              <Avatar
                src={getAvatarUrl({
                  customAvatarUrl: thread.user.profile?.avatarUrl,
                  oauthImageUrl: thread.user.image,
                  name: thread.user.name,
                  email: thread.user.email,
                })}
                alt={thread.user.name ?? "User"}
                size="md"
                radius="xl"
              >
                {getAvatarInitials({
                  name: thread.user.name,
                  email: thread.user.email,
                })}
              </Avatar>
              <div>
                <Text fw={500}>{getDisplayName(thread.user, "Anonymous")}</Text>
                <Text size="sm" c="dimmed">
                  {thread.user.profile?.jobTitle}
                  {thread.user.profile?.company &&
                    ` at ${thread.user.profile.company}`}
                  {" · "}
                  {getRelativeTime(thread.createdAt)}
                </Text>
              </div>
            </Group>

            {/* Tags */}
            {thread.tags.length > 0 && (
              <Group gap="xs">
                {thread.tags.map((tag, idx) => (
                  <Badge key={idx} size="sm" variant="light">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}

            {/* Content */}
            <MarkdownRenderer content={thread.content} />

            {/* Actions */}
            <Divider />
            <Group justify="space-between">
              <Group gap="md">
                <Button
                  variant={thread.hasLiked ? "filled" : "light"}
                  color={thread.hasLiked ? "red" : "gray"}
                  size="sm"
                  leftSection={
                    thread.hasLiked ? (
                      <IconHeartFilled size={16} />
                    ) : (
                      <IconHeart size={16} />
                    )
                  }
                  onClick={handleThreadLikeToggle}
                  loading={
                    likeThreadMutation.isPending ||
                    unlikeThreadMutation.isPending
                  }
                >
                  {thread.likeCount} {thread.likeCount === 1 ? "Like" : "Likes"}
                </Button>
                <Group gap={4}>
                  <IconMessageCircle size={18} style={{ opacity: 0.6 }} />
                  <Text size="sm" c="dimmed">
                    {thread.comments.length}{" "}
                    {thread.comments.length === 1 ? "Comment" : "Comments"}
                  </Text>
                </Group>
              </Group>
            </Group>
          </Stack>
        </Paper>

        {/* Add Comment */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Text fw={500}>Add a comment</Text>
            <Textarea
              placeholder="Share your thoughts... (Markdown supported)"
              value={newComment}
              onChange={(e) => setNewComment(e.currentTarget.value)}
              minRows={3}
            />
            <Group justify="flex-end">
              <Button
                onClick={handleAddComment}
                loading={createCommentMutation.isPending}
                disabled={!newComment.trim()}
              >
                Post Comment
              </Button>
            </Group>
          </Stack>
        </Paper>

        {/* Comments */}
        {thread.comments.length > 0 && (
          <Stack gap="md">
            <Title order={4}>Comments</Title>
            {thread.comments.map((comment) => {
              const commentHasLiked = session?.user
                ? comment.likes.some((like) => like.userId === session.user.id)
                : false;

              return (
                <Paper key={comment.id} p="md" withBorder>
                  <Stack gap="sm">
                    {/* Comment Header */}
                    <Group justify="space-between" align="flex-start">
                      <Group gap="sm">
                        <Avatar
                          src={getAvatarUrl({
                            customAvatarUrl: comment.user.profile?.avatarUrl,
                            oauthImageUrl: comment.user.image,
                            name: comment.user.name,
                          })}
                          alt={comment.user.name ?? "User"}
                          size="sm"
                          radius="xl"
                        >
                          {getAvatarInitials({
                            name: comment.user.name,
                          })}
                        </Avatar>
                        <div>
                          <Text fw={500} size="sm">
                            {getDisplayName(comment.user, "Anonymous")}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {getRelativeTime(comment.createdAt)}
                          </Text>
                        </div>
                      </Group>
                      {isOwnComment(comment.userId) && (
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() =>
                              deleteCommentMutation.mutate({ id: comment.id })
                            }
                            loading={deleteCommentMutation.isPending}
                          >
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>

                    {/* Comment Content */}
                    <MarkdownRenderer content={comment.content} />

                    {/* Comment Actions */}
                    <Group gap="sm">
                      <Button
                        variant="subtle"
                        color={commentHasLiked ? "red" : "gray"}
                        size="xs"
                        leftSection={
                          commentHasLiked ? (
                            <IconHeartFilled size={14} />
                          ) : (
                            <IconHeart size={14} />
                          )
                        }
                        onClick={() =>
                          handleCommentLikeToggle(comment.id, commentHasLiked)
                        }
                      >
                        {comment.likes.length}
                      </Button>
                      <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconCornerDownRight size={14} />}
                        onClick={() =>
                          setReplyingTo(
                            replyingTo === comment.id ? null : comment.id,
                          )
                        }
                      >
                        Reply
                      </Button>
                    </Group>

                    {/* Reply Form */}
                    {replyingTo === comment.id && (
                      <Paper p="sm" bg="gray.0" style={{ marginLeft: "2rem" }}>
                        <Stack gap="sm">
                          <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) =>
                              setReplyContent(e.currentTarget.value)
                            }
                            minRows={2}
                            size="sm"
                          />
                          <Group justify="flex-end" gap="xs">
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyContent("");
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="xs"
                              onClick={() => handleAddReply(comment.id)}
                              loading={createCommentMutation.isPending}
                              disabled={!replyContent.trim()}
                            >
                              Reply
                            </Button>
                          </Group>
                        </Stack>
                      </Paper>
                    )}

                    {/* Nested Replies */}
                    {comment.replies && comment.replies.length > 0 && (
                      <Stack
                        gap="sm"
                        style={{
                          marginLeft: "2rem",
                          borderLeft: "2px solid var(--mantine-color-gray-3)",
                          paddingLeft: "1rem",
                        }}
                      >
                        {comment.replies.map((reply) => {
                          const replyHasLiked = session?.user
                            ? reply.likes.some(
                                (like) => like.userId === session.user.id,
                              )
                            : false;

                          return (
                            <Paper key={reply.id} p="sm" bg="gray.0">
                              <Stack gap="xs">
                                <Group
                                  justify="space-between"
                                  align="flex-start"
                                >
                                  <Group gap="xs">
                                    <Avatar
                                      src={getAvatarUrl({
                                        customAvatarUrl:
                                          reply.user.profile?.avatarUrl,
                                        oauthImageUrl: reply.user.image,
                                        name: reply.user.name,
                                      })}
                                      alt={reply.user.name ?? "User"}
                                      size="xs"
                                      radius="xl"
                                    >
                                      {getAvatarInitials({
                                        name: reply.user.name,
                                      })}
                                    </Avatar>
                                    <Text fw={500} size="xs">
                                      {getDisplayName(reply.user, "Anonymous")}
                                    </Text>
                                    <Text size="xs" c="dimmed">
                                      {getRelativeTime(reply.createdAt)}
                                    </Text>
                                  </Group>
                                  {isOwnComment(reply.userId) && (
                                    <ActionIcon
                                      variant="subtle"
                                      color="red"
                                      size="xs"
                                      onClick={() =>
                                        deleteCommentMutation.mutate({
                                          id: reply.id,
                                        })
                                      }
                                    >
                                      <IconTrash size={12} />
                                    </ActionIcon>
                                  )}
                                </Group>
                                <MarkdownRenderer content={reply.content} />
                                <Button
                                  variant="subtle"
                                  color={replyHasLiked ? "red" : "gray"}
                                  size="xs"
                                  leftSection={
                                    replyHasLiked ? (
                                      <IconHeartFilled size={12} />
                                    ) : (
                                      <IconHeart size={12} />
                                    )
                                  }
                                  onClick={() =>
                                    handleCommentLikeToggle(
                                      reply.id,
                                      replyHasLiked,
                                    )
                                  }
                                  style={{ width: "fit-content" }}
                                >
                                  {reply.likes.length}
                                </Button>
                              </Stack>
                            </Paper>
                          );
                        })}
                      </Stack>
                    )}
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}

        {thread.comments.length === 0 && (
          <Text c="dimmed" ta="center" py="xl">
            No comments yet. Be the first to share your thoughts!
          </Text>
        )}
      </Stack>
    </Container>
  );
}
