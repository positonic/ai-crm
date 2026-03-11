"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Paper,
  Stack,
  Group,
  Text,
  Badge,
  Avatar,
  Button,
  ActionIcon,
  Divider,
  Card,
  Tooltip,
  Modal,
  TextInput,
  TagsInput,
  Textarea,
  Title,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconHandStop,
  IconGift,
  IconTrash,
  IconCheck,
  IconBrandLinkedin,
  IconBrandTwitter,
  IconBrandGithub,
  IconWorld,
  IconBriefcase,
  IconEdit,
  IconX,
  IconHeart,
  IconHeartFilled,
  IconCornerDownRight,
  IconMessageCircle,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { getAvatarUrl, getAvatarInitials } from "~/utils/avatarUtils";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import { MentionTextarea } from "~/app/_components/MentionTextarea";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { getDisplayName } from "~/utils/userDisplay";
import { useSession } from "next-auth/react";

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

const editSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(100),
  description: z.string().min(10, "Description must be at least 10 characters"),
  tags: z.array(z.string()).default([]),
});

type EditFormData = z.infer<typeof editSchema>;

interface AskOfferDetailClientProps {
  askOffer: {
    id: string;
    type: "ASK" | "OFFER";
    title: string;
    description: string;
    tags: string[];
    isActive: boolean;
    createdAt: Date;
    userId: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
      email: string | null;
      profile?: {
        jobTitle: string | null;
        company: string | null;
        avatarUrl: string | null;
        bio: string | null;
        githubUrl: string | null;
        linkedinUrl: string | null;
        twitterUrl: string | null;
        website: string | null;
      } | null;
    };
  };
  eventId?: string | null;
  isOwner: boolean;
  userId?: string;
}

export default function AskOfferDetailClient({
  askOffer,
  eventId,
  isOwner,
}: AskOfferDetailClientProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const { data: session } = useSession();
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Comments state
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Fetch comments
  const { data: comments } = api.askOffer.getComments.useQuery({
    askOfferId: askOffer.id,
  });

  // Comment mutations
  const createCommentMutation = api.askOffer.createComment.useMutation({
    onSuccess: () => {
      void utils.askOffer.getComments.invalidate({ askOfferId: askOffer.id });
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

  const deleteCommentMutation = api.askOffer.deleteComment.useMutation({
    onSuccess: () => {
      void utils.askOffer.getComments.invalidate({ askOfferId: askOffer.id });
      notifications.show({
        title: "Success",
        message: "Comment deleted",
        color: "green",
      });
    },
  });

  const likeCommentMutation = api.askOffer.likeComment.useMutation({
    onSuccess: () => {
      void utils.askOffer.getComments.invalidate({ askOfferId: askOffer.id });
    },
  });

  const unlikeCommentMutation = api.askOffer.unlikeComment.useMutation({
    onSuccess: () => {
      void utils.askOffer.getComments.invalidate({ askOfferId: askOffer.id });
    },
  });

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({
      askOfferId: askOffer.id,
      content: newComment.trim(),
    });
  };

  const handleAddReply = (parentId: string) => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({
      askOfferId: askOffer.id,
      parentId,
      content: replyContent.trim(),
    });
  };

  const handleCommentLikeToggle = (commentId: string, hasLiked: boolean) => {
    if (hasLiked) {
      unlikeCommentMutation.mutate({ commentId });
    } else {
      likeCommentMutation.mutate({ commentId });
    }
  };

  const isOwnComment = (userId: string) => session?.user?.id === userId;

  const form = useForm<EditFormData>({
    validate: zodResolver(editSchema),
    initialValues: {
      title: askOffer.title,
      description: askOffer.description,
      tags: askOffer.tags,
    },
  });

  const updateMutation = api.askOffer.update.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Success",
        message: "Updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setEditModalOpen(false);
      await utils.askOffer.getById.invalidate({ id: askOffer.id });
      router.refresh();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const handleEdit = (data: EditFormData) => {
    updateMutation.mutate({
      id: askOffer.id,
      ...data,
    });
  };

  const deleteMutation = api.askOffer.delete.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Deleted successfully",
        color: "green",
      });
      router.push(eventId ? `/events/${eventId}` : `/community/asks-offers`);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const markFulfilledMutation = api.askOffer.markFulfilled.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Success",
        message: "Marked as fulfilled",
        color: "green",
      });
      await utils.askOffer.getById.invalidate({ id: askOffer.id });
      router.push(eventId ? `/events/${eventId}` : `/community/asks-offers`);
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        {/* Back Navigation */}
        <Group>
          <ActionIcon variant="subtle" size="lg" onClick={() => router.back()}>
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Text size="sm" c="dimmed">
            {eventId ? "Back to event" : "Back to asks & offers"}
          </Text>
        </Group>

        {/* Main Card */}
        <Paper shadow="lg" p="xl" radius="md" withBorder>
          <Stack gap="lg">
            {/* Header */}
            <Group justify="space-between" align="flex-start">
              <Group gap="md">
                {askOffer.type === "ASK" ? (
                  <IconHandStop
                    size={32}
                    style={{ color: "var(--mantine-color-red-6)" }}
                  />
                ) : (
                  <IconGift
                    size={32}
                    style={{ color: "var(--mantine-color-green-6)" }}
                  />
                )}
                <div>
                  <Badge
                    size="lg"
                    variant="light"
                    color={askOffer.type === "ASK" ? "red" : "green"}
                  >
                    {askOffer.type}
                  </Badge>
                  {!askOffer.isActive && (
                    <Badge size="sm" color="gray" ml="xs">
                      Fulfilled
                    </Badge>
                  )}
                </div>
              </Group>
              {isOwner && askOffer.isActive && (
                <Group gap="xs">
                  <Button
                    variant="light"
                    color="blue"
                    size="sm"
                    leftSection={<IconEdit size={16} />}
                    onClick={() => setEditModalOpen(true)}
                  >
                    Edit
                  </Button>
                  <Tooltip label="Mark as fulfilled">
                    <Button
                      variant="light"
                      color="green"
                      size="sm"
                      leftSection={<IconCheck size={16} />}
                      onClick={() =>
                        markFulfilledMutation.mutate({ id: askOffer.id })
                      }
                      loading={markFulfilledMutation.isPending}
                    >
                      Mark Fulfilled
                    </Button>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="lg"
                      onClick={() => deleteMutation.mutate({ id: askOffer.id })}
                      loading={deleteMutation.isPending}
                    >
                      <IconTrash size={18} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              )}
            </Group>

            {/* Title */}
            <div>
              <Text size="xl" fw={700} mb="xs">
                {askOffer.title}
              </Text>
              <Text size="sm" c="dimmed">
                Posted on {formatDate(askOffer.createdAt)}
              </Text>
            </div>

            {/* Description */}
            <MarkdownRenderer content={askOffer.description} />

            {/* Tags */}
            {askOffer.tags.length > 0 && (
              <Group gap="xs">
                {askOffer.tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" size="md">
                    {tag}
                  </Badge>
                ))}
              </Group>
            )}
          </Stack>
        </Paper>

        {/* Author Card */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Text fw={600} size="lg">
              Posted by
            </Text>
            <Group gap="md">
              <Avatar
                src={getAvatarUrl({
                  customAvatarUrl: askOffer.user.profile?.avatarUrl,
                  oauthImageUrl: askOffer.user.image,
                  name: askOffer.user.name,
                  email: askOffer.user.email,
                })}
                alt={askOffer.user.name ?? "User"}
                size="lg"
                radius="xl"
              >
                {getAvatarInitials({
                  name: askOffer.user.name,
                  email: askOffer.user.email,
                })}
              </Avatar>
              <div style={{ flex: 1 }}>
                <Text fw={600} size="lg">
                  {getDisplayName(askOffer.user, "Anonymous")}
                </Text>
                {askOffer.user.profile?.jobTitle && (
                  <Group gap="xs" mt={4}>
                    <IconBriefcase size={14} />
                    <Text size="sm" c="dimmed">
                      {askOffer.user.profile.jobTitle}
                      {askOffer.user.profile.company &&
                        ` at ${askOffer.user.profile.company}`}
                    </Text>
                  </Group>
                )}
              </div>
            </Group>

            {/* Bio */}
            {askOffer.user.profile?.bio && (
              <>
                <Divider />
                <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                  {askOffer.user.profile.bio}
                </Text>
              </>
            )}

            {/* Contact Links */}
            {(askOffer.user.profile?.githubUrl ??
              askOffer.user.profile?.linkedinUrl ??
              askOffer.user.profile?.twitterUrl ??
              askOffer.user.profile?.website) && (
              <>
                <Divider />
                <Stack gap="xs">
                  <Text fw={500} size="sm">
                    Connect
                  </Text>
                  <Group gap="md">
                    {askOffer.user.profile?.githubUrl && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.githubUrl}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconBrandGithub size={16} />}
                      >
                        GitHub
                      </Button>
                    )}
                    {askOffer.user.profile?.linkedinUrl && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.linkedinUrl}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconBrandLinkedin size={16} />}
                      >
                        LinkedIn
                      </Button>
                    )}
                    {askOffer.user.profile?.twitterUrl && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.twitterUrl}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconBrandTwitter size={16} />}
                      >
                        Twitter
                      </Button>
                    )}
                    {askOffer.user.profile?.website && (
                      <Button
                        component="a"
                        href={askOffer.user.profile.website}
                        target="_blank"
                        variant="subtle"
                        size="sm"
                        leftSection={<IconWorld size={16} />}
                      >
                        Website
                      </Button>
                    )}
                  </Group>
                </Stack>
              </>
            )}
          </Stack>
        </Card>

        {/* Comments Section */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Stack gap="md">
            <Group gap="sm">
              <IconMessageCircle size={20} />
              <Title order={4}>
                Comments {comments?.length ? `(${comments.length})` : ""}
              </Title>
            </Group>

            {/* Add Comment Form */}
            {session ? (
              <Paper p="md" withBorder>
                <Stack gap="sm">
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
            ) : (
              <Paper p="md" withBorder bg="gray.0">
                <Text c="dimmed" ta="center">
                  Sign in to leave a comment
                </Text>
              </Paper>
            )}

            {/* Comments List */}
            {comments && comments.length > 0 && (
              <Stack gap="md">
                {comments.map((comment) => {
                  const commentHasLiked = session?.user
                    ? comment.likes.some(
                        (like) => like.userId === session.user.id,
                      )
                    : false;

                  return (
                    <Paper key={comment.id} p="md" withBorder>
                      <Stack gap="sm">
                        {/* Comment Header */}
                        <Group justify="space-between" align="flex-start">
                          <Group gap="sm">
                            <Avatar
                              src={getAvatarUrl({
                                customAvatarUrl:
                                  comment.user.profile?.avatarUrl,
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
                                  deleteCommentMutation.mutate({
                                    commentId: comment.id,
                                  })
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
                        {session && (
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
                                handleCommentLikeToggle(
                                  comment.id,
                                  commentHasLiked,
                                )
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
                        )}

                        {/* Reply Form */}
                        {replyingTo === comment.id && (
                          <Paper
                            p="sm"
                            bg="gray.0"
                            style={{ marginLeft: "2rem" }}
                          >
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
                              borderLeft:
                                "2px solid var(--mantine-color-gray-3)",
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
                                          {getDisplayName(
                                            reply.user,
                                            "Anonymous",
                                          )}
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
                                              commentId: reply.id,
                                            })
                                          }
                                        >
                                          <IconTrash size={12} />
                                        </ActionIcon>
                                      )}
                                    </Group>
                                    <MarkdownRenderer content={reply.content} />
                                    {session && (
                                      <Group gap="xs">
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
                                        >
                                          {reply.likes.length}
                                        </Button>
                                      </Group>
                                    )}
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

            {(!comments || comments.length === 0) && (
              <Text c="dimmed" ta="center" py="md">
                No comments yet. Be the first to respond!
              </Text>
            )}
          </Stack>
        </Card>
      </Stack>

      {/* Edit Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit ${askOffer.type === "ASK" ? "Ask" : "Offer"}`}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleEdit)}>
          <Stack gap="md">
            <TextInput
              label="Title"
              placeholder="Brief title..."
              {...form.getInputProps("title")}
              required
            />

            <MentionTextarea
              label="Description"
              placeholder="Provide details... (Use @ to mention users, supports Markdown)"
              minRows={4}
              value={form.values.description}
              onChange={(value) => form.setFieldValue("description", value)}
              error={
                typeof form.errors.description === "string"
                  ? form.errors.description
                  : undefined
              }
              required
            />

            <TagsInput
              label="Tags"
              placeholder="Add tags..."
              value={form.values.tags}
              onChange={(tags) => form.setFieldValue("tags", tags)}
            />

            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Container>
  );
}
