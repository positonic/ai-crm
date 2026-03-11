"use client";

import { memo, useMemo, useState } from "react";
import { ActionIcon, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { getDisplayName } from "~/utils/userDisplay";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface CommentPreviewProps {
  comment: {
    id: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
    user: {
      id: string;
      name: string | null;
      firstName: string | null;
      surname: string | null;
      image: string | null;
      profile?: {
        avatarUrl: string | null;
      } | null;
    };
    likes?: {
      userId: string;
    }[];
    _count?: {
      likes: number;
    };
  };
  currentUserId?: string;
}

// Extract static styles
const stackStyle = { flex: 1, minWidth: 0 } as const;
const textLineStyle = { lineHeight: 1.2 } as const;

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInSeconds = Math.floor(
    (now.getTime() - new Date(date).getTime()) / 1000,
  );

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 604800)}w ago`;
  return new Date(date).toLocaleDateString();
};

function CommentPreviewComponent({
  comment,
  currentUserId,
}: CommentPreviewProps) {
  // Determine initial like state
  const initialHasLiked = useMemo(
    () =>
      currentUserId
        ? (comment.likes?.some((like) => like.userId === currentUserId) ??
          false)
        : false,
    [comment.likes, currentUserId],
  );
  const initialLikeCount = comment._count?.likes ?? 0;

  const [optimisticLiked, setOptimisticLiked] = useState(initialHasLiked);
  const [optimisticCount, setOptimisticCount] = useState(initialLikeCount);

  const utils = api.useUtils();

  // Like mutation with optimistic updates
  const likeMutation = api.project.likeUpdateComment.useMutation({
    onMutate: async () => {
      // Immediately update UI state
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: () => {
      // Don't refetch - trust the optimistic update
      // Only invalidate to mark data as stale for next natural refetch
      void utils.project.getAllEventUpdates.invalidate();
      void utils.project.getUpdateComments.invalidate();
    },
    onError: (error) => {
      // Rollback optimistic update on error
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Unlike mutation with optimistic updates
  const unlikeMutation = api.project.unlikeUpdateComment.useMutation({
    onMutate: async () => {
      // Immediately update UI state
      setOptimisticLiked(false);
      setOptimisticCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: () => {
      // Don't refetch - trust the optimistic update
      // Only invalidate to mark data as stale for next natural refetch
      void utils.project.getAllEventUpdates.invalidate();
      void utils.project.getUpdateComments.invalidate();
    },
    onError: (error) => {
      // Rollback optimistic update on error
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleLike = () => {
    if (!currentUserId) {
      notifications.show({
        title: "Login Required",
        message: "Please log in to like comments",
        color: "blue",
      });
      return;
    }

    if (optimisticLiked) {
      unlikeMutation.mutate({ commentId: comment.id });
    } else {
      likeMutation.mutate({ commentId: comment.id });
    }
  };

  // Memoize user object to prevent UserAvatar re-renders
  const userAvatarProps = useMemo(
    () => ({
      customAvatarUrl: comment.user.profile?.avatarUrl,
      oauthImageUrl: comment.user.image,
      name: comment.user.name,
      firstName: comment.user.firstName,
      surname: comment.user.surname,
    }),
    [
      comment.user.profile?.avatarUrl,
      comment.user.image,
      comment.user.name,
      comment.user.firstName,
      comment.user.surname,
    ],
  );

  // Memoize relative time calculation
  const relativeTime = useMemo(
    () => getRelativeTime(comment.createdAt),
    [comment.createdAt],
  );

  // Memoize display name
  const displayName = useMemo(
    () => getDisplayName(comment.user, "Anonymous"),
    [comment.user],
  );

  const isLoading = likeMutation.isPending || unlikeMutation.isPending;

  return (
    <Group gap="sm" align="flex-start" wrap="nowrap">
      <UserAvatar user={userAvatarProps} size="sm" radius="xl" />
      <Stack gap={4} style={stackStyle}>
        <Group gap="xs" wrap="nowrap">
          <Text size="sm" fw={500} style={textLineStyle}>
            {displayName}
          </Text>
          <Text size="xs" c="dimmed" style={textLineStyle}>
            {relativeTime}
            {comment.updatedAt.getTime() > comment.createdAt.getTime() && (
              <Text span fs="italic">
                {" "}
                (edited)
              </Text>
            )}
          </Text>
          <Group gap={4} ml="auto">
            <Tooltip label={optimisticLiked ? "Unlike" : "Like"}>
              <ActionIcon
                variant="subtle"
                color={optimisticLiked ? "red" : "gray"}
                size="sm"
                onClick={handleLike}
                loading={isLoading}
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
          </Group>
        </Group>
        <MarkdownRenderer content={comment.content} />
      </Stack>
    </Group>
  );
}

// Memoize component - only re-render if comment ID, content, update time, or like data changes
export const CommentPreview = memo(
  CommentPreviewComponent,
  (prevProps, nextProps) => {
    return (
      prevProps.comment.id === nextProps.comment.id &&
      prevProps.comment.updatedAt.getTime() ===
        nextProps.comment.updatedAt.getTime() &&
      prevProps.comment.content === nextProps.comment.content &&
      prevProps.comment._count?.likes === nextProps.comment._count?.likes &&
      prevProps.currentUserId === nextProps.currentUserId
    );
  },
);
