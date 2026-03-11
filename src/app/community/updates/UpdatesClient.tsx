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
  Select,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconExternalLink,
  IconMessageCircle,
  IconCalendarEvent,
  IconPlus,
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
import { CreateUpdateModal } from "~/app/_components/CreateUpdateModal";

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

export default function UpdatesClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [showCommentInput, setShowCommentInput] = useState<
    Record<string, boolean>
  >({});

  // State for create update flow
  const [projectSelectModalOpen, setProjectSelectModalOpen] = useState(false);
  const [createUpdateModalOpen, setCreateUpdateModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<{
    id: string;
    name: string;
    githubUrl?: string | null;
  } | null>(null);

  const utils = api.useUtils();

  // Fetch user's projects for the dropdown
  const { data: myProjects, isLoading: loadingProjects } =
    api.project.getMyProjects.useQuery(undefined, {
      enabled: !!session?.user,
      refetchOnWindowFocus: false,
    });

  // Fetch all updates
  const { data: updates, isLoading: updatesLoading } =
    api.project.getAllUpdates.useQuery(undefined, {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 30000,
    });

  // Fetch user metrics for badges
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
      await utils.project.getAllUpdates.refetch();
      notifications.show({
        title: "Comment posted",
        message: "Your comment has been added",
        color: "green",
      });
    },
    onMutate: async (variables) => {
      setCommentInputs((prev) => ({ ...prev, [variables.updateId]: "" }));
      setShowCommentInput((prev) => ({ ...prev, [variables.updateId]: false }));

      await utils.project.getAllUpdates.cancel();
      const previousData = utils.project.getAllUpdates.getData();

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
            firstName: null,
            surname: null,
            image: session.user.image ?? null,
            profile: null,
          },
          likes: [],
          _count: {
            likes: 0,
          },
        };

        utils.project.getAllUpdates.setData(
          undefined,
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
      if (context?.previousData) {
        utils.project.getAllUpdates.setData(undefined, context.previousData);
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
    return new Date(date).toLocaleDateString();
  }, []);

  const handleImageClick = useCallback((url: string) => {
    setSelectedImage(url);
  }, []);

  const handlePostComment = useCallback(
    (updateId: string, eventId: string) => {
      const content = commentInputs[updateId];
      if (!content?.trim()) return;

      createComment.mutate({
        eventId,
        updateId,
        content: content.trim(),
      });
    },
    [commentInputs, createComment],
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

  // Handlers for create update flow
  const handleOpenCreateUpdate = () => {
    setSelectedProject(null);
    setProjectSelectModalOpen(true);
  };

  const handleProjectSelect = (projectId: string | null) => {
    if (projectId && myProjects) {
      const project = myProjects.find((p) => p.id === projectId);
      if (project) {
        setSelectedProject({
          id: project.id,
          name: project.title,
          githubUrl: project.githubUrl,
        });
        setProjectSelectModalOpen(false);
        setCreateUpdateModalOpen(true);
      }
    }
  };

  const handleCreateUpdateClose = () => {
    setCreateUpdateModalOpen(false);
    setSelectedProject(null);
  };

  const handleCreateUpdateSuccess = () => {
    void utils.project.getAllUpdates.invalidate();
  };

  // Format projects for the select dropdown
  const projectOptions =
    myProjects?.map((project) => ({
      value: project.id,
      label: project.title,
    })) ?? [];

  if (updatesLoading) {
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
            <Title order={2}>Updates</Title>
            <Text c="dimmed">
              Latest project updates from across all events
            </Text>
          </Stack>
          {session?.user && (
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleOpenCreateUpdate}
            >
              Add Update
            </Button>
          )}
        </Group>

        {/* Updates Timeline */}
        {!updates || updates.length === 0 ? (
          <Card withBorder radius="md" p="xl">
            <Stack align="center" py="xl">
              <Text c="dimmed" size="lg" ta="center">
                No project updates yet. Check back later!
              </Text>
            </Stack>
          </Card>
        ) : (
          <Timeline active={updates.length} bulletSize={24} lineWidth={2}>
            {updates.map((update) => {
              const updateCommentInput = commentInputs[update.id] ?? "";
              const updateShowCommentInput =
                showCommentInput[update.id] ?? false;

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
                      router.push(`/community/updates/${update.id}`)
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
                              <Text
                                fw={500}
                                size="sm"
                                style={AUTHOR_NAME_STYLE}
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
                                style={PROJECT_TITLE_STYLE}
                              >
                                {update.project.title}
                              </Text>
                            </Group>
                            {userMetrics?.[update.author.id] && (
                              <Box mt={4}>
                                <UserMetricsBadges
                                  kudos={userMetrics[update.author.id]!.kudos}
                                  updates={
                                    userMetrics[update.author.id]!.updates
                                  }
                                  projects={
                                    userMetrics[update.author.id]!.projects
                                  }
                                  praiseReceived={
                                    userMetrics[update.author.id]!
                                      .praiseReceived
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

                      {/* Content layout */}
                      {update.imageUrls.length > 0 &&
                      update.imageUrls.length === 1 ? (
                        <Group
                          mt="xs"
                          align="flex-start"
                          wrap="nowrap"
                          gap="md"
                          style={SINGLE_IMAGE_LAYOUT_STYLE}
                        >
                          <Paper
                            radius="md"
                            withBorder
                            style={SINGLE_IMAGE_PAPER_STYLE}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleImageClick(update.imageUrls[0]!);
                            }}
                          >
                            <Image
                              src={update.imageUrls[0]}
                              alt="Update image"
                              style={SINGLE_IMAGE_STYLE}
                            />
                          </Paper>
                          <Box style={TEXT_CONTENT_CONTAINER_STYLE}>
                            <Box>
                              <MarkdownRenderer content={update.content} />
                            </Box>
                          </Box>
                        </Group>
                      ) : update.imageUrls.length > 0 ? (
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleImageClick(url);
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
                        <Box>
                          <MarkdownRenderer content={update.content} />
                        </Box>
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
                              onClick={(e) => e.stopPropagation()}
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
                              onClick={(e) => e.stopPropagation()}
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

                      {/* Comments Section */}
                      {(update.comments.length > 0 || session?.user) && (
                        <div onClick={(e) => e.stopPropagation()}>
                          <Divider my="sm" />
                          <Stack gap="sm">
                            {update.comments.length > 2 && (
                              <Anchor
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(
                                    `/community/updates/${update.id}`,
                                  );
                                }}
                              >
                                View all {update.comments.length} comments
                              </Anchor>
                            )}

                            {update.comments.slice(0, 2).map((comment) => (
                              <CommentPreview
                                key={comment.id}
                                comment={comment}
                                currentUserId={session?.user?.id}
                              />
                            ))}

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
                                          handlePostComment(update.id, "");
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
        )}
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

      {/* Project Selection Modal */}
      <Modal
        opened={projectSelectModalOpen}
        onClose={() => setProjectSelectModalOpen(false)}
        title="Select Project for Update"
        size="md"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Choose which project to add this update to:
          </Text>
          <Select
            label="Project"
            placeholder="Select a project"
            data={projectOptions}
            value={selectedProject?.id ?? null}
            onChange={handleProjectSelect}
            searchable
            disabled={loadingProjects}
            nothingFoundMessage="No projects available"
          />
          {projectOptions.length === 0 && !loadingProjects && (
            <Text size="sm" c="dimmed" ta="center">
              You need to have a project to add updates. Create a project first
              from your profile.
            </Text>
          )}
        </Stack>
      </Modal>

      {/* Create Update Modal */}
      {selectedProject && (
        <CreateUpdateModal
          projectId={selectedProject.id}
          projectName={selectedProject.name}
          githubUrl={selectedProject.githubUrl}
          isOpen={createUpdateModalOpen}
          onClose={handleCreateUpdateClose}
          onSuccess={handleCreateUpdateSuccess}
        />
      )}
    </Container>
  );
}
