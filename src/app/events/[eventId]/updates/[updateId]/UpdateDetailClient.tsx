"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Button,
  Badge,
  ActionIcon,
  Image,
  SimpleGrid,
  Divider,
  Anchor,
  Textarea,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCalendarEvent,
  IconMessageCircle,
  IconEdit,
  IconTrash,
  IconBrandGithub,
  IconExternalLink,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { MentionTextarea } from "~/app/_components/MentionTextarea";
import { LikeButton } from "~/app/_components/LikeButton";
import { getDisplayName } from "~/utils/userDisplay";
import { UserAvatar } from "~/app/_components/UserAvatar";

interface UpdateDetailClientProps {
  update: {
    id: string;
    title: string;
    content: string;
    weekNumber: number | null;
    imageUrls: string[];
    githubUrls: string[];
    demoUrls: string[];
    tags: string[];
    updateDate: Date;
    updatedAt: Date;
    author: {
      id: string;
      name: string | null;
      firstName: string | null;
      surname: string | null;
      image: string | null;
      profile?: {
        avatarUrl: string | null;
      } | null;
    };
    project: {
      id: string;
      title: string;
      imageUrl: string | null;
    };
    likes: Array<{
      userId: string;
    }>;
    comments: Array<{
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
    }>;
  };
  eventId: string;
  userId?: string;
}

export default function UpdateDetailClient({
  update: initialUpdate,
  eventId,
  userId,
}: UpdateDetailClientProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [newComment, setNewComment] = useState("");

  const utils = api.useUtils();

  // Use client-side query - this ensures we can update the UI when comments change
  const { data: update } = api.project.getUpdateById.useQuery(
    { updateId: initialUpdate.id },
    {
      // Keep data fresh for a short time to avoid unnecessary refetches
      staleTime: 1000 * 30, // 30 seconds
    },
  );

  // Fall back to initial data while loading
  const displayUpdate = update ?? initialUpdate;

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor(
      (now.getTime() - new Date(date).getTime()) / 1000,
    );

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000)
      return `${Math.floor(diffInSeconds / 604800)}w ago`;
    return new Date(date).toLocaleDateString("en-US", { timeZone: "UTC" });
  };

  // Create comment mutation with optimistic update
  const createComment = api.project.createUpdateComment.useMutation({
    onMutate: async (newCommentData) => {
      // Cancel any outgoing refetches
      await utils.project.getUpdateById.cancel({ updateId: initialUpdate.id });

      // Snapshot the previous value
      const previousUpdate = utils.project.getUpdateById.getData({
        updateId: initialUpdate.id,
      });

      // Optimistically update the cache with a temporary comment
      utils.project.getUpdateById.setData(
        { updateId: initialUpdate.id },
        (old) => {
          if (!old) return old;

          // Create optimistic comment with temporary ID
          const optimisticComment = {
            id: `temp-${Date.now()}`,
            content: newCommentData.content,
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: userId ?? "",
            projectUpdateId: initialUpdate.id,
            user: {
              id: userId ?? "",
              name: null,
              firstName: null,
              surname: null,
              image: null,
              profile: null,
            },
          };

          return {
            ...old,
            comments: [...old.comments, optimisticComment],
          };
        },
      );

      return { previousUpdate };
    },
    onSuccess: async () => {
      setNewComment("");
      // Refetch to get the real comment data from server
      await utils.project.getUpdateById.invalidate({
        updateId: initialUpdate.id,
      });
      notifications.show({
        title: "Comment posted",
        message: "Your comment has been added",
        color: "green",
      });
    },
    onError: (error, _newComment, context) => {
      // Rollback to previous state on error
      if (context?.previousUpdate) {
        utils.project.getUpdateById.setData(
          { updateId: initialUpdate.id },
          context.previousUpdate,
        );
      }
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  // Update comment mutation
  const updateCommentMutation = api.project.updateUpdateComment.useMutation({
    onSuccess: async () => {
      setIsEditing(null);
      setEditContent("");
      await utils.project.getUpdateById.invalidate({
        updateId: initialUpdate.id,
      });
      notifications.show({
        title: "Comment updated",
        message: "Your comment has been updated",
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

  // Delete comment mutation
  const deleteComment = api.project.deleteUpdateComment.useMutation({
    onSuccess: async () => {
      await utils.project.getUpdateById.invalidate({
        updateId: initialUpdate.id,
      });
      notifications.show({
        title: "Comment deleted",
        message: "Your comment has been removed",
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

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        {/* Back Navigation */}
        <Group>
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={20} />}
            onClick={() => router.push(`/events/${eventId}/timeline`)}
          >
            Back to Timeline
          </Button>
        </Group>

        {/* Main Update Card */}
        <Card shadow="lg" padding="xl" radius="md" withBorder>
          <Stack gap="lg">
            {/* Header with Author Info */}
            <Group justify="space-between" align="flex-start">
              <Group gap="md">
                <UserAvatar
                  user={{
                    customAvatarUrl: displayUpdate.author.profile?.avatarUrl,
                    oauthImageUrl: displayUpdate.author.image,
                    name: displayUpdate.author.name,
                    firstName: displayUpdate.author.firstName,
                    surname: displayUpdate.author.surname,
                  }}
                  size="lg"
                  radius="xl"
                />
                <div>
                  <Text fw={600} size="lg">
                    {getDisplayName(displayUpdate.author, "Anonymous")}
                  </Text>
                  <Group gap="xs">
                    <Text size="sm" c="dimmed">
                      {getRelativeTime(displayUpdate.updateDate)}
                    </Text>
                    {displayUpdate.weekNumber && (
                      <>
                        <Text size="sm" c="dimmed">
                          •
                        </Text>
                        <Group gap={4}>
                          <IconCalendarEvent size={14} />
                          <Text size="sm" c="dimmed">
                            Week {displayUpdate.weekNumber}
                          </Text>
                        </Group>
                      </>
                    )}
                  </Group>
                </div>
              </Group>

              {/* Project Link */}
              <Button
                component="a"
                href={`/projects/${displayUpdate.project.id}`}
                variant="light"
                size="sm"
              >
                View Project: {displayUpdate.project.title}
              </Button>
            </Group>

            <Divider />

            {/* Images */}
            {displayUpdate.imageUrls.length > 0 && (
              <SimpleGrid
                cols={{
                  base: 1,
                  sm: displayUpdate.imageUrls.length === 1 ? 1 : 2,
                }}
                spacing="md"
              >
                {displayUpdate.imageUrls.map((url, index) => (
                  <Image
                    key={index}
                    src={url}
                    alt={`Update image ${index + 1}`}
                    radius="md"
                    style={{ width: "100%" }}
                  />
                ))}
              </SimpleGrid>
            )}

            {/* Title */}
            <Title order={2}>{displayUpdate.title}</Title>

            {/* Tags */}
            {displayUpdate.tags.length > 0 && (
              <Group gap="xs">
                {displayUpdate.tags.map((tag, index) => (
                  <Badge key={index} variant="outline" size="md">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}

            {/* Content */}
            <MarkdownRenderer content={displayUpdate.content} />

            {/* GitHub Links */}
            {displayUpdate.githubUrls.length > 0 && (
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  GitHub Links:
                </Text>
                {displayUpdate.githubUrls.map((url, index) => (
                  <Anchor
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                  >
                    <Group gap="xs">
                      <IconBrandGithub size={16} />
                      {url}
                    </Group>
                  </Anchor>
                ))}
              </Stack>
            )}

            {/* Demo Links */}
            {displayUpdate.demoUrls.length > 0 && (
              <Stack gap="xs">
                <Text size="sm" fw={600}>
                  Demo Links:
                </Text>
                {displayUpdate.demoUrls.map((url, index) => (
                  <Anchor
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    size="sm"
                  >
                    <Group gap="xs">
                      <IconExternalLink size={16} />
                      {url}
                    </Group>
                  </Anchor>
                ))}
              </Stack>
            )}

            <Divider />

            {/* Like Button */}
            <Group justify="flex-end">
              <LikeButton
                updateId={displayUpdate.id}
                initialLikeCount={displayUpdate.likes.length}
                initialHasLiked={
                  userId
                    ? displayUpdate.likes.some((like) => like.userId === userId)
                    : false
                }
                userId={userId}
                likeType="projectUpdate"
              />
            </Group>
          </Stack>
        </Card>

        {/* Comments Section */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="lg">
            <Group justify="space-between">
              <Group gap="xs">
                <IconMessageCircle size={20} />
                <Title order={3}>
                  Comments ({displayUpdate.comments.length})
                </Title>
              </Group>
            </Group>

            {/* Comments List */}
            {displayUpdate.comments.length > 0 ? (
              <Stack gap="md">
                {displayUpdate.comments.map((comment) => (
                  <Card key={comment.id} withBorder padding="md">
                    {isEditing === comment.id ? (
                      // Edit mode
                      <Stack gap="sm">
                        <Textarea
                          value={editContent}
                          onChange={(e) =>
                            setEditContent(e.currentTarget.value)
                          }
                          minRows={3}
                          autoFocus
                        />
                        <Group justify="flex-end">
                          <Button
                            variant="subtle"
                            onClick={() => {
                              setIsEditing(null);
                              setEditContent("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() =>
                              updateCommentMutation.mutate({
                                commentId: comment.id,
                                content: editContent,
                              })
                            }
                            loading={updateCommentMutation.isPending}
                            disabled={!editContent.trim()}
                          >
                            Save
                          </Button>
                        </Group>
                      </Stack>
                    ) : (
                      // View mode
                      <Stack gap="xs">
                        <Group justify="space-between" align="flex-start">
                          <Group gap="sm">
                            <UserAvatar
                              user={{
                                customAvatarUrl:
                                  comment.user.profile?.avatarUrl,
                                oauthImageUrl: comment.user.image,
                                name: comment.user.name,
                                firstName: comment.user.firstName,
                                surname: comment.user.surname,
                              }}
                              size="sm"
                              radius="xl"
                            />
                            <div>
                              <Text size="sm" fw={500}>
                                {getDisplayName(comment.user, "Anonymous")}
                              </Text>
                              <Text size="xs" c="dimmed">
                                {getRelativeTime(comment.createdAt)}
                                {comment.updatedAt.getTime() >
                                  comment.createdAt.getTime() && (
                                  <Text span fs="italic">
                                    {" "}
                                    (edited)
                                  </Text>
                                )}
                              </Text>
                            </div>
                          </Group>

                          {userId === comment.user.id && (
                            <Group gap="xs">
                              <ActionIcon
                                variant="subtle"
                                onClick={() => {
                                  setIsEditing(comment.id);
                                  setEditContent(comment.content);
                                }}
                              >
                                <IconEdit size={16} />
                              </ActionIcon>
                              <ActionIcon
                                variant="subtle"
                                color="red"
                                onClick={() =>
                                  deleteComment.mutate({
                                    commentId: comment.id,
                                  })
                                }
                                loading={deleteComment.isPending}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Group>

                        <MarkdownRenderer content={comment.content} />
                      </Stack>
                    )}
                  </Card>
                ))}
              </Stack>
            ) : (
              <Text c="dimmed" ta="center" py="md">
                No comments yet. Be the first to comment!
              </Text>
            )}

            {/* Add Comment Form */}
            {userId && (
              <Card
                withBorder
                padding="md"
                style={{ backgroundColor: "var(--mantine-color-gray-0)" }}
              >
                <Stack gap="sm">
                  <MentionTextarea
                    placeholder="Add a comment... (supports Markdown and @mentions)"
                    value={newComment}
                    onChange={setNewComment}
                    minRows={3}
                  />
                  <Group justify="flex-end">
                    <Button
                      onClick={() =>
                        createComment.mutate({
                          updateId: displayUpdate.id,
                          content: newComment,
                          eventId: eventId,
                        })
                      }
                      disabled={!newComment.trim()}
                      loading={createComment.isPending}
                      leftSection={<IconMessageCircle size={16} />}
                    >
                      Post Comment
                    </Button>
                  </Group>
                </Stack>
              </Card>
            )}

            {!userId && (
              <Text c="dimmed" ta="center" py="md">
                Please log in to comment
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
