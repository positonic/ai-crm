"use client";

import { useState, useCallback } from "react";
import {
  Stack,
  Card,
  Text,
  Group,
  Badge,
  Box,
  Image,
  Anchor,
  SimpleGrid,
  Paper,
  Title,
  Loader,
  Center,
  Modal,
  Container,
  Button,
  Divider,
  Timeline,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
  IconArrowLeft,
  IconMessageCircle,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { UserMetricsBadges } from "~/app/_components/UserMetricsBadges";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { CommentPreview } from "~/app/_components/CommentPreview";
import { MentionTextarea } from "~/app/_components/MentionTextarea";
import { notifications } from "@mantine/notifications";

interface UpdatesFeedClientProps {
  eventId: string;
}

// Extract static styles to prevent inline object creation
const PROJECT_TITLE_STYLE = {
  textDecoration: "none",
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const AUTHOR_NAME_STYLE = { whiteSpace: "nowrap" as const };

const AUTHOR_CONTAINER_STYLE = { flex: 1, minWidth: 0 };

// Layout styles for image rendering
const SINGLE_IMAGE_LAYOUT_STYLE = {
  flexDirection: "row" as const,
};

const SINGLE_IMAGE_PAPER_STYLE = {
  overflow: "hidden",
  cursor: "pointer",
  transition: "transform 0.2s ease",
  flexShrink: 0,
  width: "calc(100% / 3)",
  minWidth: "calc(100% / 3)",
};

const SINGLE_IMAGE_STYLE = {
  width: "100%",
  maxHeight: "400px",
  objectFit: "cover" as const,
};

const TEXT_CONTENT_CONTAINER_STYLE = { flex: 1, minWidth: 0 };

const MULTI_IMAGE_PAPER_STYLE = {
  overflow: "hidden",
  cursor: "pointer",
  transition: "transform 0.2s ease",
  aspectRatio: "16/9",
};

const MULTI_IMAGE_STYLE = {
  width: "100%",
  height: "100%",
  objectFit: "cover" as const,
};

export default function UpdatesFeedClient({ eventId }: UpdatesFeedClientProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [showCommentInput, setShowCommentInput] = useState<
    Record<string, boolean>
  >({});

  const utils = api.useUtils();

  const { data: updates, isLoading } = api.project.getAllEventUpdates.useQuery(
    { eventId },
    {
      // Disable aggressive refetching to prevent lag during typing
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000, // Consider data fresh for 30 seconds
    },
  );

  // Fetch user metrics for badges
  const { data: userMetrics } = api.project.getEventUserMetrics.useQuery(
    { eventId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000, // Consider data fresh for 60 seconds
    },
  );

  // Create comment mutation with optimistic update
  const createComment = api.project.createUpdateComment.useMutation({
    onSuccess: async () => {
      // Refetch to get the complete updated data
      await utils.project.getAllEventUpdates.refetch({ eventId });
      notifications.show({
        title: "Comment posted",
        message: "Your comment has been added",
        color: "green",
      });
    },
    onMutate: async (variables) => {
      // Clear input immediately for instant feedback
      setCommentInputs((prev) => ({ ...prev, [variables.updateId]: "" }));
      setShowCommentInput((prev) => ({ ...prev, [variables.updateId]: false }));

      // Cancel outgoing refetches
      await utils.project.getAllEventUpdates.cancel({ eventId });

      // Snapshot previous value
      const previousData = utils.project.getAllEventUpdates.getData({
        eventId,
      });

      // Optimistically update with temporary comment
      if (session?.user && previousData) {
        const optimisticComment = {
          id: "temp-" + Date.now(),
          content: variables.content,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session.user.id,
          projectUpdateId: variables.updateId,
          user: {
            id: session.user.id,
            name: session.user.name ?? null,
            firstName: null, // Session doesn't include firstName
            surname: null, // Session doesn't include surname
            image: session.user.image ?? null,
            profile: null,
          },
          likes: [],
          _count: {
            likes: 0,
          },
        };

        utils.project.getAllEventUpdates.setData(
          { eventId },
          previousData.map((update) => {
            if (update.id === variables.updateId) {
              return {
                ...update,
                comments: [optimisticComment, ...update.comments].slice(0, 2),
              };
            }
            return update;
          }),
        );
      }

      return { previousData };
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        utils.project.getAllEventUpdates.setData(
          { eventId },
          context.previousData,
        );
      }
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const getRelativeTime = useCallback((date: Date) => {
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
  }, []);

  const handleImageClick = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const handlePostComment = useCallback(
    (updateId: string) => {
      const content = commentInputs[updateId];
      if (!content?.trim()) return;

      createComment.mutate({
        eventId,
        updateId,
        content: content.trim(),
      });
    },
    [commentInputs, createComment, eventId],
  );

  const toggleCommentInput = useCallback((updateId: string) => {
    setShowCommentInput((prev) => ({ ...prev, [updateId]: !prev[updateId] }));
  }, []);

  const handleCommentChange = useCallback((updateId: string, value: string) => {
    setCommentInputs((prev) => ({
      ...prev,
      [updateId]: value,
    }));
  }, []);

  if (isLoading) {
    return (
      <Container size="xl" py="xl">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (!updates || updates.length === 0) {
    return (
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.back()}
          >
            Back
          </Button>

          <Title order={1}>Project Updates</Title>

          <Card withBorder radius="md" p="xl">
            <Stack align="center" py="xl">
              <Text c="dimmed" size="lg" ta="center">
                No project updates yet. Check back later!
              </Text>
            </Stack>
          </Card>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Stack gap="md">
          <Button
            variant="subtle"
            leftSection={<IconArrowLeft size={16} />}
            onClick={() => router.back()}
          >
            Back
          </Button>

          <Title order={1}>Project Updates</Title>
          <Text c="dimmed" size="lg">
            Latest updates from all projects in this event
          </Text>
        </Stack>

        {/* Updates Feed */}
        <Timeline active={updates.length} bulletSize={24} lineWidth={2}>
          {updates.map((update) => {
            const updateCommentInput = commentInputs[update.id] ?? "";
            const updateShowCommentInput = showCommentInput[update.id] ?? false;

            return (
              <Timeline.Item
                key={update.id}
                bullet={<IconCalendarEvent size={12} />}
                title={
                  <Group justify="space-between" wrap="nowrap" mb="xs">
                    <Text fw={600} size="lg">
                      {update.title}
                    </Text>
                    {update.weekNumber && (
                      <Badge size="sm" variant="outline">
                        Week {update.weekNumber}
                      </Badge>
                    )}
                  </Group>
                }
              >
                <Paper
                  withBorder
                  radius="md"
                  p="lg"
                  shadow="sm"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    router.push(`/events/${eventId}/updates/${update.id}`)
                  }
                >
                  <Stack gap="md">
                    {/* Header with project and author info */}
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" align="flex-start">
                        <UserAvatar
                          user={{
                            customAvatarUrl: update.author.profile?.avatarUrl,
                            oauthImageUrl: update.author.image,
                            name: update.author.name,
                            firstName: update.author.firstName,
                            surname: update.author.surname,
                          }}
                          size="md"
                          radius="xl"
                        />
                        <div style={AUTHOR_CONTAINER_STYLE}>
                          <Group gap="xs">
                            <Text fw={500} size="sm" style={AUTHOR_NAME_STYLE}>
                              {update.author.name ?? "Anonymous"}
                            </Text>
                            <Text c="dimmed" size="sm">
                              •
                            </Text>
                            <Text
                              component={Link}
                              href={`/projects/${update.project.id}`}
                              c="blue"
                              size="sm"
                              style={PROJECT_TITLE_STYLE}
                            >
                              {update.project.title}
                            </Text>
                          </Group>
                          {/* User metrics badges - Stack Overflow style */}
                          {userMetrics?.[update.author.id] && (
                            <Box mt={4}>
                              <UserMetricsBadges
                                kudos={userMetrics[update.author.id]!.kudos}
                                updates={userMetrics[update.author.id]!.updates}
                                projects={
                                  userMetrics[update.author.id]!.projects
                                }
                                praiseReceived={
                                  userMetrics[update.author.id]!.praiseReceived
                                }
                                size="xs"
                              />
                            </Box>
                          )}
                          <Text c="dimmed" size="xs" mt={4}>
                            {getRelativeTime(update.updateDate)}
                          </Text>
                        </div>
                      </Group>
                    </Group>

                    {/* Content layout - Image and text side by side on desktop, stacked on mobile */}
                    {update.imageUrls.length > 0 &&
                    update.imageUrls.length === 1 ? (
                      // Single image with side-by-side layout on desktop
                      <Group
                        mt="xs"
                        align="flex-start"
                        wrap="nowrap"
                        gap="md"
                        style={SINGLE_IMAGE_LAYOUT_STYLE}
                        styles={{
                          root: {
                            "@media (max-width: 768px)": {
                              flexDirection: "column",
                            },
                          },
                        }}
                      >
                        {/* Image - 1/3 width on desktop */}
                        <Paper
                          radius="md"
                          withBorder
                          style={SINGLE_IMAGE_PAPER_STYLE}
                          onClick={() => handleImageClick(update.imageUrls[0]!)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = "scale(1.02)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "scale(1)";
                          }}
                          styles={{
                            root: {
                              "@media (max-width: 768px)": {
                                width: "100%",
                                minWidth: "100%",
                              },
                            },
                          }}
                        >
                          <Image
                            src={update.imageUrls[0]}
                            alt="Update image"
                            style={SINGLE_IMAGE_STYLE}
                          />
                        </Paper>

                        {/* Text content - 2/3 width on desktop */}
                        <Box style={TEXT_CONTENT_CONTAINER_STYLE}>
                          <Box>
                            <MarkdownRenderer content={update.content} />
                          </Box>
                        </Box>
                      </Group>
                    ) : update.imageUrls.length > 0 ? (
                      // Multiple images - keep original grid layout
                      <>
                        <Box mt="xs">
                          <SimpleGrid
                            cols={{
                              base: 1,
                              sm: 2,
                              md: update.imageUrls.length >= 3 ? 3 : 2,
                            }}
                            spacing="md"
                          >
                            {update.imageUrls.map((url, imgIndex) => (
                              <Paper
                                key={imgIndex}
                                radius="md"
                                withBorder
                                style={MULTI_IMAGE_PAPER_STYLE}
                                onClick={() => handleImageClick(url)}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform =
                                    "scale(1.05)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "scale(1)";
                                }}
                              >
                                <Image
                                  src={url}
                                  alt={`Update image ${imgIndex + 1}`}
                                  style={MULTI_IMAGE_STYLE}
                                />
                              </Paper>
                            ))}
                          </SimpleGrid>
                        </Box>
                        <Box>
                          <MarkdownRenderer content={update.content} />
                        </Box>
                      </>
                    ) : (
                      // No images - just text
                      <>
                        <Box>
                          <MarkdownRenderer content={update.content} />
                        </Box>
                      </>
                    )}

                    {/* Links */}
                    {(update.githubUrls.length > 0 ||
                      update.demoUrls.length > 0) && (
                      <Group gap="xs">
                        {update.githubUrls.map((url, urlIndex) => (
                          <Anchor
                            key={urlIndex}
                            href={url}
                            target="_blank"
                            size="sm"
                          >
                            <Group gap={4}>
                              <IconBrandGithub size={14} />
                              GitHub
                            </Group>
                          </Anchor>
                        ))}
                        {update.demoUrls.map((url, urlIndex) => (
                          <Anchor
                            key={urlIndex}
                            href={url}
                            target="_blank"
                            size="sm"
                          >
                            <Group gap={4}>
                              <IconExternalLink size={14} />
                              Demo
                            </Group>
                          </Anchor>
                        ))}
                      </Group>
                    )}

                    {/* Tags and Engagement Stats */}
                    <Group justify="space-between" align="center">
                      {update.tags.length > 0 ? (
                        <Group gap="xs">
                          {update.tags.map((tag, tagIndex) => (
                            <Badge key={tagIndex} size="xs" variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </Group>
                      ) : (
                        <div />
                      )}
                      <Group gap="md">
                        {/* Comment Count */}
                        {update.comments.length > 0 && (
                          <Group gap={4}>
                            <IconMessageCircle
                              size={16}
                              style={{ color: "var(--mantine-color-gray-6)" }}
                            />
                            <Text size="sm" c="dimmed" fw={500}>
                              {update.comments.length}
                            </Text>
                          </Group>
                        )}
                        {/* Like Button - stop propagation */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <LikeButton
                            updateId={update.id}
                            initialLikeCount={update.likes.length}
                            initialHasLiked={
                              session?.user
                                ? update.likes.some(
                                    (like) => like.userId === session.user.id,
                                  )
                                : false
                            }
                            userId={session?.user.id}
                          />
                        </div>
                      </Group>
                    </Group>

                    {/* Inline Comments Section */}
                    {(update.comments.length > 0 || session?.user) && (
                      <div onClick={(e) => e.stopPropagation()}>
                        <Divider my="sm" />
                        <Stack gap="sm">
                          {/* View all comments link */}
                          {update.comments.length > 2 && (
                            <Anchor
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(
                                  `/events/${eventId}/updates/${update.id}`,
                                );
                              }}
                            >
                              View all {update.comments.length} comments
                            </Anchor>
                          )}

                          {/* Show last 2 comments */}
                          {update.comments.slice(0, 2).map((comment) => (
                            <CommentPreview
                              key={comment.id}
                              comment={comment}
                              currentUserId={session?.user?.id}
                            />
                          ))}

                          {/* Add comment section */}
                          {session?.user && (
                            <Stack gap="xs">
                              {!updateShowCommentInput ? (
                                <Button
                                  variant="subtle"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCommentInput(update.id);
                                  }}
                                >
                                  Add a comment...
                                </Button>
                              ) : (
                                <Stack gap="xs">
                                  <MentionTextarea
                                    value={updateCommentInput}
                                    onChange={(value) =>
                                      handleCommentChange(update.id, value)
                                    }
                                    placeholder="Write your comment... (Use @ to mention users)"
                                    description="Supports Markdown formatting: **bold**, *italic*, [links](url)"
                                    minRows={2}
                                  />
                                  <Group gap="xs" justify="flex-end">
                                    <Button
                                      variant="subtle"
                                      size="xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCommentInput(update.id);
                                        setCommentInputs((prev) => ({
                                          ...prev,
                                          [update.id]: "",
                                        }));
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePostComment(update.id);
                                      }}
                                      loading={createComment.isPending}
                                      disabled={!updateCommentInput.trim()}
                                    >
                                      Post
                                    </Button>
                                  </Group>
                                </Stack>
                              )}
                            </Stack>
                          )}
                        </Stack>
                      </div>
                    )}
                  </Stack>
                </Paper>
              </Timeline.Item>
            );
          })}
        </Timeline>
      </Stack>

      {/* Image preview modal */}
      <Modal
        opened={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        size="xl"
        padding={0}
        withCloseButton
        centered
      >
        {selectedImage && (
          <Image
            src={selectedImage}
            alt="Preview"
            style={{ width: "100%", height: "auto" }}
          />
        )}
      </Modal>
    </Container>
  );
}
