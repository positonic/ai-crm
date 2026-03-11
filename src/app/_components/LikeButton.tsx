"use client";

import { useState } from "react";
import { ActionIcon, Group, Text, Tooltip } from "@mantine/core";
import { IconHeart, IconHeartFilled } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";

interface LikeButtonProps {
  updateId: string;
  initialLikeCount: number;
  initialHasLiked: boolean;
  userId?: string;
  likeType?: "projectUpdate" | "askOffer" | "userProject";
}

export function LikeButton({
  updateId,
  initialLikeCount,
  initialHasLiked,
  userId,
  likeType = "projectUpdate",
}: LikeButtonProps) {
  const [optimisticLiked, setOptimisticLiked] = useState(initialHasLiked);
  const [optimisticCount, setOptimisticCount] = useState(initialLikeCount);

  const utils = api.useUtils();

  // Fetch likes data based on type - call both queries but enable only one
  const projectLikesQuery = api.project.getUpdateLikes.useQuery(
    { updateId },
    {
      enabled: likeType === "projectUpdate",
      initialData: {
        count: initialLikeCount,
        likes: [],
        hasLiked: initialHasLiked,
      },
    },
  );

  const askOfferLikesQuery = api.askOffer.getAskOfferLikes.useQuery(
    { askOfferId: updateId },
    {
      enabled: likeType === "askOffer",
      initialData: {
        count: initialLikeCount,
        likes: [],
        hasLiked: initialHasLiked,
      },
    },
  );

  const userProjectLikesQuery = api.project.getUserProjectLikes.useQuery(
    { projectId: updateId },
    {
      enabled: likeType === "userProject",
      initialData: {
        count: initialLikeCount,
        likes: [],
        hasLiked: initialHasLiked,
      },
    },
  );

  const likesData =
    likeType === "projectUpdate"
      ? projectLikesQuery.data
      : likeType === "askOffer"
        ? askOfferLikesQuery.data
        : likeType === "userProject"
          ? userProjectLikesQuery.data
          : undefined;

  // Like mutation based on type
  const projectLikeMutation = api.project.likeProjectUpdate.useMutation({
    onMutate: async () => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: async () => {
      await utils.project.getUpdateLikes.invalidate({ updateId });
    },
    onError: (error) => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const askOfferLikeMutation = api.askOffer.likeAskOffer.useMutation({
    onMutate: async () => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: async () => {
      await utils.askOffer.getAskOfferLikes.invalidate({
        askOfferId: updateId,
      });
      await utils.askOffer.getEventAsksOffers.invalidate();
    },
    onError: (error) => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Unlike mutation based on type
  const projectUnlikeMutation = api.project.unlikeProjectUpdate.useMutation({
    onMutate: async () => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
    },
    onSuccess: async () => {
      await utils.project.getUpdateLikes.invalidate({ updateId });
    },
    onError: (error) => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const askOfferUnlikeMutation = api.askOffer.unlikeAskOffer.useMutation({
    onMutate: async () => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
    },
    onSuccess: async () => {
      await utils.askOffer.getAskOfferLikes.invalidate({
        askOfferId: updateId,
      });
      await utils.askOffer.getEventAsksOffers.invalidate();
    },
    onError: (error) => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const userProjectLikeMutation = api.project.likeUserProject.useMutation({
    onMutate: async () => {
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: async () => {
      await utils.project.getUserProjectLikes.invalidate({
        projectId: updateId,
      });
    },
    onError: (error) => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => prev - 1);
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const userProjectUnlikeMutation = api.project.unlikeUserProject.useMutation({
    onMutate: async () => {
      setOptimisticLiked(false);
      setOptimisticCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: async () => {
      await utils.project.getUserProjectLikes.invalidate({
        projectId: updateId,
      });
    },
    onError: (error) => {
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
    if (!userId) {
      notifications.show({
        title: "Login Required",
        message: "Please log in to like projects",
        color: "blue",
      });
      return;
    }

    if (likeType === "projectUpdate") {
      if (optimisticLiked) {
        projectUnlikeMutation.mutate({ updateId });
      } else {
        projectLikeMutation.mutate({ updateId });
      }
    } else if (likeType === "askOffer") {
      if (optimisticLiked) {
        askOfferUnlikeMutation.mutate({ askOfferId: updateId });
      } else {
        askOfferLikeMutation.mutate({ askOfferId: updateId });
      }
    } else if (likeType === "userProject") {
      if (optimisticLiked) {
        userProjectUnlikeMutation.mutate({ projectId: updateId });
      } else {
        userProjectLikeMutation.mutate({ projectId: updateId });
      }
    }
  };

  const isLoading =
    projectLikeMutation.isPending ||
    projectUnlikeMutation.isPending ||
    askOfferLikeMutation.isPending ||
    askOfferUnlikeMutation.isPending ||
    userProjectLikeMutation.isPending ||
    userProjectUnlikeMutation.isPending;
  const displayCount = likesData?.count ?? optimisticCount;
  const displayLiked = likesData?.hasLiked ?? optimisticLiked;

  return (
    <Group gap="xs" align="center">
      <Tooltip label={displayLiked ? "Unlike" : "Like"}>
        <ActionIcon
          variant={displayLiked ? "filled" : "subtle"}
          color={displayLiked ? "red" : "gray"}
          size="lg"
          onClick={handleLike}
          loading={isLoading}
          style={{
            transition: "all 0.2s ease",
          }}
        >
          {displayLiked ? (
            <IconHeartFilled
              size={20}
              style={{
                animation: displayLiked ? "heartBeat 0.3s" : "none",
              }}
            />
          ) : (
            <IconHeart size={20} />
          )}
        </ActionIcon>
      </Tooltip>
      {displayCount > 0 && (
        <Text size="sm" c="dimmed" fw={500}>
          {displayCount}
        </Text>
      )}
      <style jsx global>{`
        @keyframes heartBeat {
          0%,
          100% {
            transform: scale(1);
          }
          25% {
            transform: scale(1.3);
          }
          50% {
            transform: scale(1.1);
          }
        }
      `}</style>
    </Group>
  );
}
