"use client";

import { memo } from "react";
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
  Button,
  Divider,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
  IconMessageCircle,
} from "@tabler/icons-react";
import Link from "next/link";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { UserMetricsBadges } from "~/app/_components/UserMetricsBadges";
import { UserAvatar } from "~/app/_components/UserAvatar";
import { CommentPreview } from "~/app/_components/CommentPreview";
import { MentionTextarea } from "~/app/_components/MentionTextarea";

interface UpdateCardProps {
  update: {
    id: string;
    title: string;
    content: string;
    updateDate: Date;
    weekNumber: number | null;
    tags: string[];
    imageUrls: string[];
    githubUrls: string[];
    demoUrls: string[];
    author: {
      id: string;
      name: string | null;
      firstName: string | null;
      surname: string | null;
      image: string | null;
      profile?: { avatarUrl: string | null } | null;
    };
    project: {
      id: string;
      title: string;
      imageUrl: string | null;
    };
    likes: Array<{ userId: string }>;
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
        profile?: { avatarUrl: string | null } | null;
      };
    }>;
  };
  userId: string | undefined;
  userMetrics?: Record<
    string,
    { kudos: number; updates: number; projects: number; praiseReceived: number }
  >;
  commentInput: string;
  showCommentInput: boolean;
  onNavigate: () => void;
  onImageClick: (url: string) => void;
  onCommentChange: (value: string) => void;
  onToggleCommentInput: () => void;
  onPostComment: () => void;
  onCancelComment: () => void;
  isPostingComment: boolean;
}

function UpdateCardComponent({
  update,
  userId,
  userMetrics,
  commentInput,
  showCommentInput,
  onNavigate,
  onImageClick,
  onCommentChange,
  onToggleCommentInput,
  onPostComment,
  onCancelComment,
  isPostingComment,
}: UpdateCardProps) {
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
    return new Date(date).toLocaleDateString();
  };

  return (
    <Card
      key={update.id}
      withBorder
      radius="md"
      p="lg"
      shadow="sm"
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onClick={onNavigate}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--mantine-color-gray-0)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "transparent";
      }}
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
            <div style={{ flex: 1, minWidth: 0 }}>
              <Group gap="xs">
                <Text fw={500} size="sm" style={{ whiteSpace: "nowrap" }}>
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
                  style={{
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  onClick={(e) => e.stopPropagation()}
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
              <Text c="dimmed" size="xs" mt={4}>
                {getRelativeTime(update.updateDate)}
              </Text>
            </div>
          </Group>

          {update.weekNumber && (
            <Badge variant="light" size="lg">
              Week {update.weekNumber}
            </Badge>
          )}
        </Group>

        {/* Update Title */}
        <Text size="xl" fw={600}>
          {update.title}
        </Text>

        {/* Update Content */}
        <MarkdownRenderer content={update.content} />

        {/* Images */}
        {update.imageUrls.length > 0 && (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
            {update.imageUrls.map((url, imgIndex) => (
              <div
                key={imgIndex}
                onClick={(e) => {
                  e.stopPropagation();
                  onImageClick(url);
                }}
                style={{ cursor: "pointer" }}
              >
                <Image
                  src={url}
                  alt={`Update image ${imgIndex + 1}`}
                  radius="md"
                  style={{ maxHeight: "300px", objectFit: "cover" }}
                />
              </div>
            ))}
          </SimpleGrid>
        )}

        {/* Links */}
        {(update.githubUrls.length > 0 || update.demoUrls.length > 0) && (
          <Group gap="xs">
            {update.githubUrls.map((url, urlIndex) => (
              <Anchor key={urlIndex} href={url} target="_blank" size="sm">
                <Group gap={4}>
                  <IconBrandGithub size={14} />
                  GitHub
                </Group>
              </Anchor>
            ))}
            {update.demoUrls.map((url, urlIndex) => (
              <Anchor key={urlIndex} href={url} target="_blank" size="sm">
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
                  userId
                    ? update.likes.some((like) => like.userId === userId)
                    : false
                }
                userId={userId}
              />
            </div>
          </Group>
        </Group>

        {/* Inline Comments Section */}
        {(update.comments.length > 0 || userId) && (
          <div onClick={(e) => e.stopPropagation()}>
            <Divider my="sm" />
            <Stack gap="sm">
              {/* View all comments link */}
              {update.comments.length > 2 && (
                <Anchor
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate();
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
                  currentUserId={userId}
                />
              ))}

              {/* Add comment section */}
              {userId && (
                <Stack gap="xs">
                  {!showCommentInput ? (
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCommentInput();
                      }}
                    >
                      Add a comment...
                    </Button>
                  ) : (
                    <Stack gap="xs">
                      <MentionTextarea
                        value={commentInput}
                        onChange={onCommentChange}
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
                            onCancelComment();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPostComment();
                          }}
                          loading={isPostingComment}
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
          </div>
        )}
      </Stack>
    </Card>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const UpdateCard = memo(UpdateCardComponent, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.update.id === nextProps.update.id &&
    prevProps.commentInput === nextProps.commentInput &&
    prevProps.showCommentInput === nextProps.showCommentInput &&
    prevProps.isPostingComment === nextProps.isPostingComment &&
    prevProps.update.likes.length === nextProps.update.likes.length &&
    prevProps.update.comments.length === nextProps.update.comments.length
  );
});

UpdateCard.displayName = "UpdateCard";
