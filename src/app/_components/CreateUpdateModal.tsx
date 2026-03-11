"use client";

import { useState } from "react";
import {
  Modal,
  Stack,
  TextInput,
  Button,
  Group,
  Text,
  Box,
  SimpleGrid,
  Image,
  ActionIcon,
  Progress,
  FileButton,
  Paper,
  Loader,
  Collapse,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconPlus,
  IconX,
  IconGitCommit,
  IconSparkles,
} from "@tabler/icons-react";
import { useForm } from "@mantine/form";
import { api } from "~/trpc/react";
import { notifications } from "@mantine/notifications";
import { MentionTextarea } from "~/app/_components/MentionTextarea";

interface CreateUpdateModalProps {
  projectId: string;
  projectName: string;
  githubUrl?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CommitData {
  hash: string;
  datetime: string;
  message: string;
}

export function CreateUpdateModal({
  projectId,
  projectName,
  githubUrl,
  isOpen,
  onClose,
  onSuccess,
}: CreateUpdateModalProps) {
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCommitGenerator, setShowCommitGenerator] = useState(false);
  const [commitDateRange, setCommitDateRange] = useState<
    [Date | null, Date | null]
  >([
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    new Date(),
  ]);
  const [isLoadingCommits, setIsLoadingCommits] = useState(false);
  const [commits, setCommits] = useState<CommitData[]>([]);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const utils = api.useUtils();

  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      updateDate: new Date(),
      imageUrls: [] as string[],
      githubUrls: [] as string[],
      demoUrls: [] as string[],
      tags: [] as string[],
    },
  });

  // Fetch commits from GitHub for the selected date range
  const fetchCommits = async () => {
    if (!githubUrl) {
      notifications.show({
        title: "No GitHub URL",
        message: "This project doesn't have a GitHub repository linked",
        color: "orange",
      });
      return;
    }

    const [since, until] = commitDateRange;
    if (!since || !until) {
      notifications.show({
        title: "Select date range",
        message: "Please select both start and end dates",
        color: "orange",
      });
      return;
    }

    setIsLoadingCommits(true);
    try {
      const url = new URL("/api/roadmap/commits", window.location.origin);
      url.searchParams.set("repo", githubUrl);
      url.searchParams.set("since", since.toISOString());
      url.searchParams.set("until", until.toISOString());

      const response = await fetch(url.toString());
      const data = (await response.json()) as {
        success: boolean;
        commits: CommitData[];
        error?: string;
      };

      if (data.success) {
        setCommits(data.commits);
        if (data.commits.length === 0) {
          notifications.show({
            title: "No commits found",
            message: "No commits found in the selected date range",
            color: "blue",
          });
        }
      } else {
        notifications.show({
          title: "Error",
          message: data.error ?? "Failed to fetch commits",
          color: "red",
        });
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to fetch commits",
        color: "red",
      });
    } finally {
      setIsLoadingCommits(false);
    }
  };

  // Parse GitHub URL to extract owner and repo for constructing commit URLs
  const parseGitHubUrl = (
    url: string,
  ): { owner: string; repo: string } | null => {
    const regex = /github\.com[/:]([\\w-]+)\/([\\w-]+?)(?:\.git)?$/;
    const match = regex.exec(url);
    if (!match) return null;
    return { owner: match[1]!, repo: match[2]! };
  };

  // Generate title and description from commits using AI
  const generateFromCommits = async () => {
    if (commits.length === 0) {
      notifications.show({
        title: "No commits",
        message: "Please fetch commits first",
        color: "orange",
      });
      return;
    }

    setIsGeneratingContent(true);
    try {
      const response = await fetch("/api/ai/summarize-commits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commits,
          projectName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = (await response.json()) as {
        title: string;
        description: string;
      };

      form.setFieldValue("title", data.title);
      form.setFieldValue("content", data.description);

      // Auto-fill GitHub URLs with commit links
      if (githubUrl) {
        const parsed = parseGitHubUrl(githubUrl);
        if (parsed) {
          const commitUrls = commits.map(
            (commit) =>
              `https://github.com/${parsed.owner}/${parsed.repo}/commit/${commit.hash}`,
          );
          form.setFieldValue("githubUrls", commitUrls);
        }
      }

      notifications.show({
        title: "Content generated",
        message:
          "Title, description, and GitHub URLs have been auto-filled from commits",
        color: "green",
      });

      setShowCommitGenerator(false);
    } catch {
      notifications.show({
        title: "Error",
        message: "Failed to generate content from commits",
        color: "red",
      });
    } finally {
      setIsGeneratingContent(false);
    }
  };

  const createUpdate = api.project.createProjectUpdate.useMutation({
    onSuccess: () => {
      void utils.project.getAllUpdates.invalidate();
      void utils.project.getUserProjectUpdates.invalidate();

      form.reset();
      onClose();

      notifications.show({
        title: "Success",
        message: "Update posted successfully",
        color: "green",
      });

      onSuccess?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    },
  });

  const handleCreateUpdate = async (values: typeof form.values) => {
    await createUpdate.mutateAsync({
      projectId,
      title: values.title,
      content: values.content,
      updateDate: values.updateDate,
      imageUrls: values.imageUrls.filter((url) => url.trim() !== ""),
      githubUrls: values.githubUrls.filter((url) => url.trim() !== ""),
      demoUrls: values.demoUrls.filter((url) => url.trim() !== ""),
      tags: values.tags.filter((tag) => tag.trim() !== ""),
    });
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingImage(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload/project-image", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Upload failed");
      }

      const result = (await response.json()) as { imageUrl: string };

      // Add the uploaded image URL to the form's imageUrls array
      form.setFieldValue("imageUrls", [
        ...form.values.imageUrls,
        result.imageUrl,
      ]);

      notifications.show({
        title: "Image uploaded",
        message: "Image added to update",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message:
          error instanceof Error ? error.message : "Failed to upload image",
        color: "red",
      });
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleClose = () => {
    form.reset();
    setShowCommitGenerator(false);
    setCommits([]);
    setCommitDateRange([
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(),
    ]);
    onClose();
  };

  return (
    <Modal
      opened={isOpen}
      onClose={handleClose}
      title={`Add Update to ${projectName}`}
      size="lg"
    >
      <form onSubmit={form.onSubmit(handleCreateUpdate)}>
        <Stack gap="md">
          <TextInput
            label="Update Title"
            placeholder="e.g., Implemented user authentication"
            required
            {...form.getInputProps("title")}
          />

          <MentionTextarea
            label="Description"
            placeholder="Describe what you've accomplished, challenges faced, next steps... (Use @ to mention users)"
            minRows={4}
            required
            value={form.values.content}
            onChange={(value) => form.setFieldValue("content", value)}
            error={
              typeof form.errors.content === "string"
                ? form.errors.content
                : undefined
            }
          />

          {/* Auto-generate from Commits Section */}
          {githubUrl && (
            <Paper withBorder p="sm" radius="md">
              <Group
                justify="space-between"
                mb={showCommitGenerator ? "sm" : 0}
              >
                <Group gap="xs">
                  <IconGitCommit size={18} />
                  <Text size="sm" fw={500}>
                    Auto-generate update from Commits
                  </Text>
                </Group>
                <Button
                  variant="light"
                  size="xs"
                  onClick={() => setShowCommitGenerator(!showCommitGenerator)}
                >
                  {showCommitGenerator ? "Hide" : "Let's go!"}
                </Button>
              </Group>

              <Collapse in={showCommitGenerator}>
                <Stack gap="sm">
                  <Text size="xs" c="dimmed">
                    Select a date range to fetch commits and auto-generate
                    update content using AI.
                  </Text>

                  <Paper
                    p="sm"
                    radius="sm"
                    bg="var(--mantine-color-blue-light)"
                  >
                    <Stack gap="sm">
                      <Group grow>
                        <DatePickerInput
                          label="From"
                          placeholder="Start date"
                          value={commitDateRange[0]}
                          onChange={(value) => {
                            const dateValue = value
                              ? typeof value === "string"
                                ? new Date(value)
                                : value
                              : null;
                            setCommitDateRange([dateValue, commitDateRange[1]]);
                          }}
                          maxDate={new Date()}
                          size="xs"
                        />
                        <DatePickerInput
                          label="To"
                          placeholder="End date"
                          value={commitDateRange[1]}
                          onChange={(value) => {
                            const dateValue = value
                              ? typeof value === "string"
                                ? new Date(value)
                                : value
                              : null;
                            setCommitDateRange([commitDateRange[0], dateValue]);
                          }}
                          maxDate={new Date()}
                          size="xs"
                        />
                      </Group>

                      <Group>
                        <Button
                          variant="light"
                          size="xs"
                          leftSection={<IconGitCommit size={14} />}
                          onClick={() => void fetchCommits()}
                          loading={isLoadingCommits}
                        >
                          Fetch Commits
                        </Button>
                        {commits.length > 0 && (
                          <Button
                            variant="filled"
                            size="xs"
                            leftSection={<IconSparkles size={14} />}
                            onClick={() => void generateFromCommits()}
                            loading={isGeneratingContent}
                          >
                            Generate with AI ({commits.length} commits)
                          </Button>
                        )}
                      </Group>
                    </Stack>
                  </Paper>

                  {isLoadingCommits && (
                    <Group justify="center" py="sm">
                      <Loader size="sm" />
                      <Text size="xs" c="dimmed">
                        Fetching commits...
                      </Text>
                    </Group>
                  )}

                  {commits.length > 0 && !isLoadingCommits && (
                    <Paper withBorder p="xs" radius="sm" bg="gray.0">
                      <Text size="xs" fw={500} mb="xs">
                        Found {commits.length} commits:
                      </Text>
                      <Stack gap={4}>
                        {commits.slice(0, 5).map((commit) => (
                          <Text
                            key={commit.hash}
                            size="xs"
                            c="dimmed"
                            lineClamp={1}
                          >
                            <Text span ff="monospace" size="xs">
                              {commit.hash}
                            </Text>{" "}
                            {commit.message}
                          </Text>
                        ))}
                        {commits.length > 5 && (
                          <Text size="xs" c="dimmed" fs="italic">
                            ... and {commits.length - 5} more
                          </Text>
                        )}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </Collapse>
            </Paper>
          )}

          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Update Images
            </Text>
            <Text size="xs" c="dimmed">
              Upload screenshots or demo images (JPG, PNG, GIF, or WebP, max 5MB
              each)
            </Text>

            {form.values.imageUrls.length > 0 && (
              <SimpleGrid cols={3} spacing="xs">
                {form.values.imageUrls.map((url, index) => (
                  <Box key={index} pos="relative">
                    <Image
                      src={url}
                      alt={`Update image ${index + 1}`}
                      radius="md"
                      h={120}
                      fit="cover"
                      style={{
                        border: "1px solid var(--mantine-color-gray-3)",
                      }}
                    />
                    <ActionIcon
                      color="red"
                      size="sm"
                      radius="xl"
                      variant="filled"
                      style={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                      }}
                      onClick={() => {
                        const newUrls = form.values.imageUrls.filter(
                          (_, i) => i !== index,
                        );
                        form.setFieldValue("imageUrls", newUrls);
                      }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  </Box>
                ))}
              </SimpleGrid>
            )}

            <Group>
              <FileButton
                onChange={handleImageUpload}
                accept="image/png,image/jpeg,image/gif,image/webp"
                disabled={isUploadingImage}
              >
                {(props) => (
                  <Button
                    {...props}
                    variant="light"
                    size="sm"
                    leftSection={<IconPlus size={16} />}
                    loading={isUploadingImage}
                  >
                    Upload Image
                  </Button>
                )}
              </FileButton>
            </Group>

            {isUploadingImage && (
              <Box>
                <Text size="sm" mb="xs">
                  Uploading...
                </Text>
                <Progress value={uploadProgress} size="sm" />
              </Box>
            )}

            <TextInput
              placeholder="Or paste image URL and press Enter"
              size="xs"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  const url = event.currentTarget.value.trim();
                  if (url) {
                    form.setFieldValue("imageUrls", [
                      ...form.values.imageUrls,
                      url,
                    ]);
                    event.currentTarget.value = "";
                  }
                }
              }}
            />
          </Stack>

          <DatePickerInput
            label="Update Date"
            placeholder="When did this update occur?"
            value={form.values.updateDate}
            onChange={(value) => {
              const dateValue = value
                ? typeof value === "string"
                  ? new Date(value)
                  : value
                : new Date();
              form.setFieldValue("updateDate", dateValue);
            }}
            maxDate={new Date()}
            clearable
            required
          />

          <TextInput
            label="GitHub URLs (comma-separated)"
            placeholder="https://github.com/user/repo/commit/abc123, https://github.com/user/repo/pull/5"
            value={form.values.githubUrls.join(", ")}
            onChange={(event) => {
              const urls = event.target.value
                .split(",")
                .map((url) => url.trim());
              form.setFieldValue("githubUrls", urls);
            }}
          />

          <TextInput
            label="Demo URLs (comma-separated)"
            placeholder="https://myproject.vercel.app, https://demo.example.com"
            onChange={(event) => {
              const urls = event.target.value
                .split(",")
                .map((url) => url.trim());
              form.setFieldValue("demoUrls", urls);
            }}
          />

          <TextInput
            label="Tags (comma-separated)"
            placeholder="milestone, frontend, demo, challenge"
            onChange={(event) => {
              const tags = event.target.value
                .split(",")
                .map((tag) => tag.trim());
              form.setFieldValue("tags", tags);
            }}
          />

          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createUpdate.isPending}>
              Post Update
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
