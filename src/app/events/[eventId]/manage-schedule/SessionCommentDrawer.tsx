"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Drawer,
  Stack,
  Group,
  Text,
  Textarea,
  Button,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconHeart,
  IconHeartFilled,
  IconTrash,
  IconCornerDownRight,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { getDisplayName } from "~/utils/userDisplay";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";

interface SessionCommentDrawerProps {
  sessionId: string | null;
  sessionTitle: string;
  onClose: () => void;
  currentUserId: string;
}

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000,
  );
  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600)
    return `${String(Math.floor(diffInSeconds / 60))}m ago`;
  if (diffInSeconds < 86400)
    return `${String(Math.floor(diffInSeconds / 3600))}h ago`;
  if (diffInSeconds < 604800)
    return `${String(Math.floor(diffInSeconds / 86400))}d ago`;
  if (diffInSeconds < 2592000)
    return `${String(Math.floor(diffInSeconds / 604800))}w ago`;
  return new Date(date).toLocaleDateString("en-US", { timeZone: "UTC" });
}

type CommentData = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentId: string | null;
  user: {
    id: string;
    name: string | null;
    firstName: string | null;
    surname: string | null;
    email: string | null;
    image: string | null;
    profile?: { avatarUrl: string | null } | null;
  };
  likes: { userId: string }[];
  _count: { likes: number };
  replies?: CommentData[];
};

function CommentItem({
  comment,
  currentUserId,
  sessionId,
  isReply = false,
}: {
  comment: CommentData;
  currentUserId: string;
  sessionId: string;
  isReply?: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [optimisticLiked, setOptimisticLiked] = useState(
    comment.likes.some((l) => l.userId === currentUserId),
  );
  const [optimisticCount, setOptimisticCount] = useState(comment._count.likes);

  const utils = api.useUtils();

  const createReply = api.schedule.createSessionComment.useMutation({
    onSuccess: () => {
      setReplyContent("");
      setReplyOpen(false);
      void utils.schedule.getSessionComments.invalidate({ sessionId });
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  const deleteComment = api.schedule.deleteSessionComment.useMutation({
    onSuccess: () => {
      void utils.schedule.getSessionComments.invalidate({ sessionId });
      void utils.schedule.getFloorSessions.invalidate();
    },
  });

  const likeMutation = api.schedule.likeSessionComment.useMutation({
    onMutate: () => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: () => {
      void utils.schedule.getSessionComments.invalidate({ sessionId });
    },
    onError: () => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
    },
  });

  const unlikeMutation = api.schedule.unlikeSessionComment.useMutation({
    onMutate: () => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: () => {
      void utils.schedule.getSessionComments.invalidate({ sessionId });
    },
    onError: () => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
  });

  const handleLike = useCallback(() => {
    if (optimisticLiked) {
      unlikeMutation.mutate({ commentId: comment.id });
    } else {
      likeMutation.mutate({ commentId: comment.id });
    }
  }, [optimisticLiked, comment.id, likeMutation, unlikeMutation]);

  const displayName = useMemo(
    () => getDisplayName(comment.user, "Anonymous"),
    [comment.user],
  );

  const relativeTime = useMemo(
    () => getRelativeTime(comment.createdAt),
    [comment.createdAt],
  );

  return (
    <Stack gap={4} ml={isReply ? "lg" : 0}>
      <Group gap="sm" align="flex-start" wrap="nowrap">
        <UserAvatar
          user={{
            customAvatarUrl: comment.user.profile?.avatarUrl,
            oauthImageUrl: comment.user.image,
            name: comment.user.name,
            firstName: comment.user.firstName,
            surname: comment.user.surname,
          }}
          size="sm"
          radius="xl"
        />
        <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={500} style={{ lineHeight: 1.2 }}>
              {displayName}
            </Text>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.2 }}>
              {relativeTime}
            </Text>
            <Group gap={4} ml="auto">
              {!isReply && (
                <Tooltip label="Reply">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size="sm"
                    onClick={() => setReplyOpen(!replyOpen)}
                  >
                    <IconCornerDownRight size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
              <Tooltip label={optimisticLiked ? "Unlike" : "Like"}>
                <ActionIcon
                  variant="subtle"
                  color={optimisticLiked ? "red" : "gray"}
                  size="sm"
                  onClick={handleLike}
                  loading={likeMutation.isPending || unlikeMutation.isPending}
                >
                  {optimisticLiked ? (
                    <IconHeartFilled size={14} />
                  ) : (
                    <IconHeart size={14} />
                  )}
                </ActionIcon>
              </Tooltip>
              {optimisticCount > 0 && (
                <Text size="xs" c="dimmed">
                  {optimisticCount}
                </Text>
              )}
              {comment.user.id === currentUserId && (
                <Tooltip label="Delete">
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="sm"
                    onClick={() => deleteComment.mutate({ id: comment.id })}
                    loading={deleteComment.isPending}
                  >
                    <IconTrash size={14} />
                  </ActionIcon>
                </Tooltip>
              )}
            </Group>
          </Group>
          <MarkdownRenderer content={comment.content} />
        </Stack>
      </Group>

      {/* Replies */}
      {comment.replies?.map((reply) => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentUserId={currentUserId}
          sessionId={sessionId}
          isReply
        />
      ))}

      {/* Reply form */}
      {replyOpen && (
        <Group gap="xs" ml="lg">
          <Textarea
            placeholder="Write a reply..."
            size="xs"
            autosize
            minRows={1}
            maxRows={3}
            style={{ flex: 1 }}
            value={replyContent}
            onChange={(e) => setReplyContent(e.currentTarget.value)}
          />
          <Button
            size="xs"
            variant="light"
            onClick={() => {
              if (!replyContent.trim()) return;
              createReply.mutate({
                sessionId,
                content: replyContent.trim(),
                parentId: comment.id,
              });
            }}
            loading={createReply.isPending}
            disabled={!replyContent.trim()}
          >
            Reply
          </Button>
        </Group>
      )}
    </Stack>
  );
}

export function SessionCommentDrawer({
  sessionId,
  sessionTitle,
  onClose,
  currentUserId,
}: SessionCommentDrawerProps) {
  const [newComment, setNewComment] = useState("");

  const { data: comments, isLoading } =
    api.schedule.getSessionComments.useQuery(
      { sessionId: sessionId! },
      { enabled: !!sessionId },
    );

  const utils = api.useUtils();

  const createComment = api.schedule.createSessionComment.useMutation({
    onSuccess: () => {
      setNewComment("");
      void utils.schedule.getSessionComments.invalidate({
        sessionId: sessionId!,
      });
      void utils.schedule.getFloorSessions.invalidate();
    },
    onError: (err) => {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    },
  });

  return (
    <Drawer
      opened={!!sessionId}
      onClose={onClose}
      title={
        <Text fw={600} size="sm" lineClamp={1}>
          Comments: {sessionTitle}
        </Text>
      }
      position="right"
      size="md"
    >
      <Stack gap="md" h="calc(100vh - 120px)">
        {/* Comment list */}
        <Stack gap="md" style={{ flex: 1, overflow: "auto" }}>
          {isLoading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : !comments || comments.length === 0 ? (
            <Text c="dimmed" ta="center" py="xl" size="sm">
              No comments yet. Start the discussion.
            </Text>
          ) : (
            comments.map((comment) => (
              <CommentItem
                key={comment.id}
                comment={comment as CommentData}
                currentUserId={currentUserId}
                sessionId={sessionId!}
              />
            ))
          )}
        </Stack>

        {/* New comment form */}
        <Stack gap="xs" style={{ flexShrink: 0 }}>
          <Textarea
            placeholder="Add a note or comment..."
            autosize
            minRows={2}
            maxRows={5}
            value={newComment}
            onChange={(e) => setNewComment(e.currentTarget.value)}
          />
          <Button
            onClick={() => {
              if (!newComment.trim() || !sessionId) return;
              createComment.mutate({
                sessionId,
                content: newComment.trim(),
              });
            }}
            loading={createComment.isPending}
            disabled={!newComment.trim()}
          >
            Post Comment
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}
