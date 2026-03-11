"use client";

import { useState, useCallback, use } from "react";
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
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
  IconArrowLeft,
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

export default function UpdateDetailPage({
  params,
}: {
  params: Promise<{ updateId: string }>;
}) {
  const resolvedParams = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState("");
  const [showCommentInput, setShowCommentInput] = useState(false);

  const utils = api.useUtils();

  // Fetch the update by ID
  const { data: update, isLoading } = api.project.getUpdateById.useQuery(
    { updateId: resolvedParams.updateId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  // Fetch user metrics for author
  const { data: userMetrics } = api.project.getAllUserMetrics.useQuery(
    undefined,
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 60000,
    },
  );

  // Create comment mutation
  const createComment = api.project.createUpdateComment.useMutation({
    onSuccess: async () => {
      await utils.project.getUpdateById.refetch({
        updateId: resolvedParams.updateId,
      });
      setCommentInput("");
      setShowCommentInput(false);
      notifications.show({
        title: "Comment posted",
        message: "Your comment has been added",
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
    return new Date(date).toLocaleDateString();
  }, []);

  const handleImageClick = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const handlePostComment = useCallback(() => {
    if (!commentInput.trim()) return;

    createComment.mutate({
      eventId: "",
      updateId: resolvedParams.updateId,
      content: commentInput.trim(),
    });
  }, [commentInput, createComment, resolvedParams.updateId]);

  if (isLoading) {
    return (
      <Container size="md" py="xl">
        <Center py="xl">
          <Loader size="lg" />
        </Center>
      </Container>
    );
  }

  if (!update) {
    return (
      <Container size="md" py="xl">
        <Card withBorder radius="md" p="xl">
          <Stack align="center" py="xl">
            <Text c="dimmed" size="lg" ta="center">
              Update not found
            </Text>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.push("/community/updates")}
            >
              Back to Updates
            </Button>
          </Stack>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Back Button */}
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => router.push("/community/updates")}
          w="fit-content"
        >
          Back to Updates
        </Button>

        {/* Update Card */}
        <Paper withBorder radius="md" p="xl" shadow="sm">
          <Stack gap="lg">
            {/* Title */}
            <Group justify="space-between" wrap="nowrap">
              <Title order={2}>{update.title}</Title>
              {update.weekNumber && (
                <Badge size="lg" variant="outline">
                  Week {update.weekNumber}
                </Badge>
              )}
            </Group>

            {/* Author Info */}
            <Group gap="sm" wrap="nowrap" align="flex-start">
              <UserAvatar
                user={{
                  customAvatarUrl: update.author.profile?.avatarUrl,
                  oauthImageUrl: update.author.image,
                  name: update.author.name,
                  firstName: update.author.firstName,
                  surname: update.author.surname,
                }}
                size="lg"
                radius="xl"
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <Group gap="xs">
                  <Text
                    component={Link}
                    href={`/profiles/${update.author.id}`}
                    fw={600}
                    size="md"
                  >
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
                  >
                    {update.project.title}
                  </Text>
                </Group>
                {userMetrics?.[update.author.id] && (
                  <Box mt={4}>
                    <UserMetricsBadges
                      kudos={userMetrics[update.author.id]!.kudos}
                      updates={userMetrics[update.author.id]!.updates}
                      projects={userMetrics[update.author.id]!.projects}
                      praiseReceived={
                        userMetrics[update.author.id]!.praiseReceived
                      }
                      size="xs"
                    />
                  </Box>
                )}
                <Text c="dimmed" size="sm" mt={4}>
                  {getRelativeTime(update.updateDate)}
                </Text>
              </div>
            </Group>

            <Divider />

            {/* Content with Images */}
            {update.imageUrls.length > 0 && update.imageUrls.length === 1 ? (
              <Group
                align="flex-start"
                wrap="nowrap"
                gap="md"
                style={SINGLE_IMAGE_LAYOUT_STYLE}
              >
                <Paper
                  radius="md"
                  withBorder
                  style={SINGLE_IMAGE_PAPER_STYLE}
                  onClick={() => handleImageClick(update.imageUrls[0]!)}
                >
                  <Image
                    src={update.imageUrls[0]}
                    alt="Update image"
                    style={SINGLE_IMAGE_STYLE}
                  />
                </Paper>
                <Box style={TEXT_CONTENT_CONTAINER_STYLE}>
                  <MarkdownRenderer content={update.content} />
                </Box>
              </Group>
            ) : update.imageUrls.length > 0 ? (
              <>
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
                    >
                      <Image
                        src={url}
                        alt={`Update image ${imgIndex + 1}`}
                        style={MULTI_IMAGE_STYLE}
                      />
                    </Paper>
                  ))}
                </SimpleGrid>
                <MarkdownRenderer content={update.content} />
              </>
            ) : (
              <MarkdownRenderer content={update.content} />
            )}

            {/* Links */}
            {(update.githubUrls.length > 0 || update.demoUrls.length > 0) && (
              <Group gap="md">
                {update.githubUrls.map((url, urlIndex) => (
                  <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                    <Group gap={4}>
                      <IconBrandGithub size={16} />
                      GitHub {update.githubUrls.length > 1 ? urlIndex + 1 : ""}
                    </Group>
                  </Anchor>
                ))}
                {update.demoUrls.map((url, urlIndex) => (
                  <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                    <Group gap={4}>
                      <IconExternalLink size={16} />
                      Demo {update.demoUrls.length > 1 ? urlIndex + 1 : ""}
                    </Group>
                  </Anchor>
                ))}
              </Group>
            )}

            {/* Tags */}
            {update.tags.length > 0 && (
              <Group gap="xs">
                {update.tags.map((tag, tagIndex) => (
                  <Badge key={tagIndex} size="sm" variant="outline">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}

            <Divider />

            {/* Engagement */}
            <Group justify="flex-end">
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
                userId={session?.user?.id}
              />
            </Group>

            <Divider />

            {/* Comments Section */}
            <Stack gap="md">
              <Title order={4}>Comments ({update.comments.length})</Title>

              {update.comments.length === 0 && !session?.user && (
                <Text c="dimmed" size="sm">
                  No comments yet.
                </Text>
              )}

              {update.comments.map((comment) => (
                <CommentPreview
                  key={comment.id}
                  comment={comment}
                  currentUserId={session?.user?.id}
                />
              ))}

              {session?.user && (
                <Stack gap="xs">
                  {!showCommentInput ? (
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => setShowCommentInput(true)}
                    >
                      Add a comment...
                    </Button>
                  ) : (
                    <Stack gap="xs">
                      <MentionTextarea
                        value={commentInput}
                        onChange={setCommentInput}
                        placeholder="Write your comment... (Use @ to mention users)"
                        description="Supports Markdown formatting: **bold**, *italic*, [links](url)"
                        minRows={2}
                      />
                      <Group gap="xs" justify="flex-end">
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() => {
                            setShowCommentInput(false);
                            setCommentInput("");
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          onClick={handlePostComment}
                          loading={createComment.isPending}
                          disabled={!commentInput.trim()}
                        >
                          Post
                        </Button>
                      </Group>
                    </Stack>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>
        </Paper>
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
