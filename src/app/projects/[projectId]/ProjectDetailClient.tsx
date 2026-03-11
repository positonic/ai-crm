"use client";

import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  Group,
  Stack,
  Button,
  Badge,
  Divider,
  Paper,
  Tabs,
  Timeline,
  Modal,
  TextInput,
  NumberInput,
  ActionIcon,
  Image,
  Anchor,
  FileButton,
  Progress,
  Box,
  SimpleGrid,
  Textarea,
  TagsInput,
  Switch,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconArrowLeft,
  IconBrandGithub,
  IconExternalLink,
  IconPlus,
  IconCalendarEvent,
  IconUser,
  IconMapPin,
  IconTrash,
  IconCheck,
  IconX,
  IconEdit,
  IconLink,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import { notifications } from "@mantine/notifications";
import { useSession } from "next-auth/react";
import BlueskyConnectButton from "~/app/_components/BlueskyConnectButton";
import { MentionTextarea } from "~/app/_components/MentionTextarea";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";
import { LikeButton } from "~/app/_components/LikeButton";
import { GitCommitTimeline } from "~/app/_components/GitCommitTimeline";
import { CollaboratorsList } from "~/app/_components/CollaboratorsList";
import { UserSearchSelect } from "~/app/_components/UserSearchSelect";
import { RepositoryManager } from "~/app/_components/RepositoryManager";
import MetricsTab from "./MetricsTab";
import ImpactTab from "./ImpactTab";
import SDSTab from "./SDSTab";
import HypercertsTab from "./HypercertsTab";

// URL validation that accepts URLs with or without protocol
const urlSchema = z.string().refine(
  (val) => {
    if (!val || val === "") return true;
    // Accept URLs with or without protocol
    const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;
    return urlPattern.test(val);
  },
  { message: "Invalid URL" },
);

const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(2000).optional(),
  githubUrl: urlSchema.optional().or(z.literal("")),
  liveUrl: urlSchema.optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")), // Logo
  bannerUrl: z.string().optional().or(z.literal("")), // Banner
  technologies: z.array(z.string().max(30)).max(20),
  featured: z.boolean().optional().default(false),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectDetailClientProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    githubUrl: string | null;
    liveUrl: string | null;
    imageUrl: string | null;
    bannerUrl: string | null;
    technologies: string[];
    featured: boolean;
    createdAt: Date;
    repositories?: Array<{
      id: string;
      url: string;
      name: string | null;
      description: string | null;
      isPrimary: boolean;
      order: number;
      attestations?: Array<{
        id: string;
        uid: string;
        chain: string;
        snapshotDate: Date;
        isRetroactive: boolean;
        data: unknown;
      }>;
    }>;
    author: {
      id: string;
      name: string | null;
      image: string | null;
      profile?: {
        jobTitle: string | null;
        company: string | null;
        location: string | null;
        bio: string | null;
        githubUrl: string | null;
        linkedinUrl: string | null;
        twitterUrl: string | null;
        website: string | null;
      } | null;
    };
    likes: Array<{
      userId: string;
    }>;
    collaborators: Array<{
      id: string;
      userId: string;
      name: string | null;
      image: string | null;
      role: string;
      canEdit: boolean;
      addedAt: Date;
      profile: {
        jobTitle: string | null;
        company: string | null;
        location: string | null;
        bio: string | null;
      } | null;
    }>;
  };
  timeline: Array<{
    id: string;
    title: string;
    content: string;
    weekNumber: number | undefined;
    imageUrls: string[];
    githubUrls: string[];
    demoUrls: string[];
    tags: string[];
    updateDate: Date;
    author: {
      id: string;
      name: string | null;
      image: string | null;
    };
  }>;
  isOwner: boolean;
  userId?: string;
}

export default function ProjectDetailClient({
  project,
  timeline: initialTimeline,
  isOwner,
  userId,
}: ProjectDetailClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Check if current user can edit the project (owner, admin, or collaborator with edit permissions)
  const isAdmin = session?.user?.role === "admin";
  const canEdit =
    isOwner ||
    isAdmin ||
    project.collaborators.some(
      (collab) => collab.userId === userId && collab.canEdit,
    );
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [updateToDelete, setUpdateToDelete] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Attestation expansion state
  const [expandedAttestations, setExpandedAttestations] = useState<Set<string>>(
    new Set(),
  );

  // Edit project modal state
  const [editProjectModalOpen, setEditProjectModalOpen] = useState(false);
  const [deleteProjectModalOpen, setDeleteProjectModalOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  const [bannerUploadProgress, setBannerUploadProgress] = useState(0);
  const [repositories, setRepositories] = useState<
    Array<{
      id?: string;
      url: string;
      name: string;
      description: string;
      isPrimary: boolean;
      order: number;
      isNew?: boolean;
    }>
  >([]);

  const utils = api.useUtils();

  // Handle URL hash navigation on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1); // Remove the '#'
    if (hash && (hash === "overview" || hash === "timeline")) {
      setActiveTab(hash);
    }
  }, []);

  // Update URL hash when tab changes
  const handleTabChange = (value: string | null) => {
    if (value) {
      setActiveTab(value);
      window.history.replaceState(null, "", `#${value}`);
    }
  };

  // Get fresh timeline data
  const { data: timeline = initialTimeline } =
    api.project.getProjectTimeline.useQuery({
      projectId: project.id,
    });

  // Create project update mutation
  const createUpdate = api.project.createProjectUpdate.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Update posted!",
        message: "Your project update has been added to the timeline.",
        color: "green",
      });
      setUpdateModalOpen(false);
      form.reset();
      await utils.project.getProjectTimeline.invalidate({
        projectId: project.id,
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

  // Delete project update mutation
  const deleteUpdate = api.project.deleteProjectUpdate.useMutation({
    onSuccess: async () => {
      notifications.show({
        title: "Update deleted",
        message: "Your project update has been removed from the timeline.",
        color: "green",
      });
      setDeleteModalOpen(false);
      setUpdateToDelete(null);
      await utils.project.getProjectTimeline.invalidate({
        projectId: project.id,
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

  // Delete project mutation
  const deleteProject = api.profile.deleteProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Project deleted",
        message: "Your project has been permanently deleted.",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setDeleteProjectModalOpen(false);
      // Navigate back to projects page
      router.push("/projects");
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to delete project",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  // Update project mutation
  const updateProject = api.profile.updateProject.useMutation({
    onSuccess: async () => {
      // Handle repository updates
      if (repositories.length > 0) {
        try {
          const existingRepoIds = project.repositories?.map((r) => r.id) ?? [];
          const currentRepoIds = repositories
            .filter((r) => r.id)
            .map((r) => r.id!);

          // Delete removed repositories
          const toDelete = existingRepoIds.filter(
            (id) => !currentRepoIds.includes(id),
          );
          await Promise.all(
            toDelete.map((id) => removeRepository.mutateAsync({ id })),
          );

          // Add or update repositories
          await Promise.all(
            repositories.map((repo) => {
              if (repo.id) {
                // Update existing repository
                return updateRepository.mutateAsync({
                  id: repo.id,
                  url: repo.url,
                  name: repo.name || undefined,
                  description: repo.description || undefined,
                  isPrimary: repo.isPrimary,
                  order: repo.order,
                });
              } else {
                // Add new repository
                return addRepository.mutateAsync({
                  projectId: project.id,
                  url: repo.url,
                  name: repo.name || undefined,
                  description: repo.description || undefined,
                  isPrimary: repo.isPrimary,
                  order: repo.order,
                });
              }
            }),
          );
        } catch {
          notifications.show({
            title: "Warning",
            message: "Project updated but some repositories failed to save",
            color: "yellow",
          });
        }
      }

      notifications.show({
        title: "Success",
        message: "Project updated successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setEditProjectModalOpen(false);
      projectForm.reset();
      setRepositories([]);
      router.refresh();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to update project",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  // Fetch collaborators for the project
  const { data: projectCollaboratorsData, refetch: refetchCollaborators } =
    api.profile.getProjectCollaborators.useQuery(
      { projectId: project.id },
      { enabled: editProjectModalOpen },
    );

  // Collaborator mutations
  const addCollaborators = api.profile.addProjectCollaborators.useMutation({
    onSuccess: (data) => {
      notifications.show({
        title: "Success",
        message: `Added ${data.addedCount} collaborator${data.addedCount !== 1 ? "s" : ""}`,
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchCollaborators();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to add collaborators",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const removeCollaborator = api.profile.removeProjectCollaborator.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Collaborator removed",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchCollaborators();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to remove collaborator",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  // Repository mutations
  const addRepository = api.profile.addRepository.useMutation();
  const updateRepository = api.profile.updateRepository.useMutation();
  const removeRepository = api.profile.removeRepository.useMutation();

  // Get user profile for collaborator management
  const { data: userProfile } = api.profile.getMyProfile.useQuery();

  // Form for creating updates
  const form = useForm({
    initialValues: {
      title: "",
      content: "",
      weekNumber: undefined as number | undefined,
      updateDate: new Date(),
      imageUrls: [] as string[],
      githubUrls: [] as string[],
      demoUrls: [] as string[],
      tags: [] as string[],
    },
  });

  const handleCreateUpdate = async (values: typeof form.values) => {
    await createUpdate.mutateAsync({
      projectId: project.id,
      title: values.title,
      content: values.content,
      weekNumber: values.weekNumber,
      updateDate: values.updateDate,
      imageUrls: values.imageUrls.filter((url) => url.trim() !== ""),
      githubUrls: values.githubUrls.filter((url) => url.trim() !== ""),
      demoUrls: values.demoUrls.filter((url) => url.trim() !== ""),
      tags: values.tags.filter((tag) => tag.trim() !== ""),
    });
  };

  // Form for editing project
  const projectForm = useForm<ProjectFormData>({
    validate: zodResolver(projectSchema),
    initialValues: {
      title: project.title,
      description: project.description ?? "",
      githubUrl: project.githubUrl ?? "",
      liveUrl: project.liveUrl ?? "",
      imageUrl: project.imageUrl ?? "",
      bannerUrl: project.bannerUrl ?? "",
      technologies: project.technologies,
      featured: project.featured,
    },
  });

  // Handler for project form submission
  const handleProjectSubmit = (values: ProjectFormData) => {
    // Clean up empty strings
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ]),
    ) as ProjectFormData;

    updateProject.mutate({
      id: project.id,
      ...cleanedValues,
    });
  };

  // Handler for opening edit project modal
  const handleOpenEditModal = () => {
    projectForm.setValues({
      title: project.title,
      description: project.description ?? "",
      githubUrl: project.githubUrl ?? "",
      liveUrl: project.liveUrl ?? "",
      imageUrl: project.imageUrl ?? "",
      bannerUrl: project.bannerUrl ?? "",
      technologies: project.technologies,
      featured: project.featured,
    });

    // Load repositories
    setRepositories(
      project.repositories?.map((r) => ({
        id: r.id,
        url: r.url,
        name: r.name ?? "",
        description: r.description ?? "",
        isPrimary: r.isPrimary,
        order: r.order,
      })) ?? [],
    );

    setEditProjectModalOpen(true);
  };

  // Handler for project logo upload
  const handleLogoUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingLogo(true);
    setLogoUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setLogoUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload/project-image", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setLogoUploadProgress(100);

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Upload failed");
      }

      const result = (await response.json()) as { imageUrl: string };

      // Update form with new logo URL
      projectForm.setFieldValue("imageUrl", result.imageUrl);

      notifications.show({
        title: "Success",
        message: "Project logo uploaded successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message:
          error instanceof Error ? error.message : "Failed to upload logo",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploadingLogo(false);
      setLogoUploadProgress(0);
    }
  };

  // Handler for project banner upload
  const handleBannerUpload = async (file: File | null) => {
    if (!file) return;

    setIsUploadingBanner(true);
    setBannerUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("image", file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setBannerUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch("/api/upload/project-image", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setBannerUploadProgress(100);

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error ?? "Upload failed");
      }

      const result = (await response.json()) as { imageUrl: string };

      // Update form with new banner URL
      projectForm.setFieldValue("bannerUrl", result.imageUrl);

      notifications.show({
        title: "Success",
        message: "Project banner uploaded successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message:
          error instanceof Error ? error.message : "Failed to upload banner",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploadingBanner(false);
      setBannerUploadProgress(0);
    }
  };

  // Handler for project update image upload
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
      const currentUrls = form.values.imageUrls;
      form.setFieldValue("imageUrls", [...currentUrls, result.imageUrl]);

      notifications.show({
        title: "Success",
        message: "Image uploaded successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
    } catch (error) {
      notifications.show({
        title: "Upload failed",
        message:
          error instanceof Error ? error.message : "Failed to upload image",
        color: "red",
        icon: <IconX size={16} />,
      });
    } finally {
      setIsUploadingImage(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteClick = (updateId: string) => {
    setUpdateToDelete(updateId);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (updateToDelete) {
      await deleteUpdate.mutateAsync({ updateId: updateToDelete });
    }
  };

  const handleDeleteProject = () => {
    setDeleteProjectModalOpen(true);
  };

  const handleConfirmDeleteProject = async () => {
    await deleteProject.mutateAsync({ id: project.id });
  };

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  // Helper to get EAS explorer URL for an attestation
  // Note: chain "optimism" without "-sepolia" suffix could be either network
  // Default to testnet (Sepolia) unless explicitly "optimism-mainnet"
  const getEASExplorerUrl = (uid: string, chain: string) => {
    const isMainnet = chain === "optimism-mainnet";
    const baseUrl = isMainnet
      ? "https://optimism.easscan.org/attestation/view"
      : "https://optimism-sepolia.easscan.org/attestation/view";
    return `${baseUrl}/${uid}`;
  };

  // Toggle attestation expansion for a repository
  const toggleAttestations = (repoId: string) => {
    setExpandedAttestations((prev) => {
      const next = new Set(prev);
      if (next.has(repoId)) {
        next.delete(repoId);
      } else {
        next.add(repoId);
      }
      return next;
    });
  };

  // Format attestation date
  const formatAttestationDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  // Parse attestation data to extract commits
  const getAttestationCommits = (data: unknown): number | undefined => {
    if (typeof data === "object" && data !== null) {
      const d = data as Record<string, unknown>;
      return typeof d.totalCommits === "number" ? d.totalCommits : undefined;
    }
    return undefined;
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .update-hover-container {
            transition: background-color 0.2s ease;
          }
          .update-hover-container:hover {
            background-color: var(--mantine-color-gray-0);
          }
          [data-mantine-color-scheme="dark"] .update-hover-container:hover {
            background-color: var(--mantine-color-dark-6);
          }
        `,
        }}
      />
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Back Navigation */}
          <Group>
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={20} />}
              onClick={() => router.push("/projects")}
            >
              Back to Projects
            </Button>
          </Group>

          {/* Project Header */}
          <Card shadow="lg" padding="xl" radius="md" withBorder>
            <Stack gap="lg">
              {project.bannerUrl && (
                <div
                  style={{
                    width: "100%",
                    height: 300,
                    borderRadius: 8,
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={project.bannerUrl}
                    alt={project.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                </div>
              )}

              <Group justify="space-between" align="flex-start">
                <Stack gap="sm" style={{ flex: 1 }}>
                  <Group gap="md">
                    <Title order={1}>{project.title}</Title>
                    {project.featured && (
                      <Badge variant="light" color="yellow" size="lg">
                        Featured
                      </Badge>
                    )}
                  </Group>

                  {project.description && (
                    <Text size="lg" c="dimmed">
                      {project.description}
                    </Text>
                  )}
                </Stack>
              </Group>

              {/* Technologies */}
              {project.technologies.length > 0 && (
                <Group gap="xs">
                  {project.technologies.map((tech, index) => (
                    <Badge key={index} variant="outline" size="sm">
                      {tech}
                    </Badge>
                  ))}
                </Group>
              )}

              {/* Like Button */}
              <LikeButton
                updateId={project.id}
                initialLikeCount={project.likes.length}
                initialHasLiked={
                  userId
                    ? project.likes.some((like) => like.userId === userId)
                    : false
                }
                userId={userId}
                likeType="userProject"
              />

              {/* Action buttons */}
              <Group gap="md">
                {canEdit && (
                  <Button
                    onClick={handleOpenEditModal}
                    leftSection={<IconEdit size={16} />}
                    variant="light"
                    color="blue"
                  >
                    Edit Project
                  </Button>
                )}
                {isOwner && (
                  <Button
                    onClick={handleDeleteProject}
                    leftSection={<IconTrash size={16} />}
                    variant="light"
                    color="red"
                  >
                    Delete Project
                  </Button>
                )}
                {/* Show repositories if available, otherwise fall back to githubUrl */}
                {project.repositories && project.repositories.length > 0
                  ? // Multiple repositories - show them all
                    [...project.repositories]
                      .sort((a, b) => {
                        if (a.isPrimary && !b.isPrimary) return -1;
                        if (!a.isPrimary && b.isPrimary) return 1;
                        return a.order - b.order;
                      })
                      .map((repo) => (
                        <Button
                          key={repo.id}
                          component="a"
                          href={repo.url}
                          target="_blank"
                          leftSection={<IconBrandGithub size={16} />}
                          variant={repo.isPrimary ? "filled" : "light"}
                        >
                          {repo.name ?? "View Code"}
                        </Button>
                      ))
                  : // Legacy: Single githubUrl
                    project.githubUrl && (
                      <Button
                        component="a"
                        href={project.githubUrl}
                        target="_blank"
                        leftSection={<IconBrandGithub size={16} />}
                        variant="light"
                      >
                        View Code
                      </Button>
                    )}
                {project.liveUrl && (
                  <Button
                    component="a"
                    href={project.liveUrl}
                    target="_blank"
                    leftSection={<IconExternalLink size={16} />}
                    variant="filled"
                  >
                    Live Demo
                  </Button>
                )}
              </Group>
            </Stack>
          </Card>

          {/* Main Content Tabs */}
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tabs.List>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="timeline">
                Timeline Updates
                {timeline.length > 0 && (
                  <Badge size="sm" variant="light" ml="xs">
                    {timeline.length}
                  </Badge>
                )}
              </Tabs.Tab>
              <Tabs.Tab value="devtimeline">Dev Timeline</Tabs.Tab>
              <Tabs.Tab value="impact">Impact</Tabs.Tab>
              <Tabs.Tab value="metrics">Manage metrics</Tabs.Tab>
              <Tabs.Tab value="hypercerts">Hypercerts</Tabs.Tab>
              <Tabs.Tab value="sds">SDS</Tabs.Tab>
              <Tabs.Tab value="team">
                Team Members
                <Badge size="sm" variant="light" ml="xs">
                  {1 + project.collaborators.length}
                </Badge>
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Title order={2}>Project Details</Title>

                  <Group gap="xl">
                    <Stack gap="xs">
                      <Text fw={500}>Created</Text>
                      <Text c="dimmed">{formatDate(project.createdAt)}</Text>
                    </Stack>

                    <Stack gap="xs">
                      <Text fw={500}>Technologies</Text>
                      <Text c="dimmed">
                        {project.technologies.length} technologies
                      </Text>
                    </Stack>

                    <Stack gap="xs">
                      <Text fw={500}>Updates</Text>
                      <Text c="dimmed">{timeline.length} timeline updates</Text>
                    </Stack>
                  </Group>

                  {project.description && (
                    <>
                      <Divider />
                      <Stack gap="md">
                        <Title order={3}>Description</Title>
                        <Text style={{ whiteSpace: "pre-wrap" }}>
                          {project.description}
                        </Text>
                      </Stack>
                    </>
                  )}

                  {/* Author contact info */}
                  {(project.author.profile?.githubUrl ??
                    project.author.profile?.linkedinUrl ??
                    project.author.profile?.twitterUrl ??
                    project.author.profile?.website ??
                    isOwner) && (
                    <>
                      <Divider />
                      <Stack gap="md">
                        <Title order={3}>
                          {isOwner ? "Share Your Project" : "Contact Author"}
                        </Title>

                        {/* AT Proto integration buttons - only for project owner */}
                        {isOwner && (
                          <BlueskyConnectButton
                            projectTitle={project.title}
                            projectUrl={
                              typeof window !== "undefined"
                                ? window.location.href
                                : undefined
                            }
                          />
                        )}

                        {/* Author contact links */}
                        {(project.author.profile?.githubUrl ??
                          project.author.profile?.linkedinUrl ??
                          project.author.profile?.twitterUrl ??
                          project.author.profile?.website) && (
                          <Group gap="md">
                            {project.author.profile?.githubUrl && (
                              <Button
                                component="a"
                                href={project.author.profile.githubUrl}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                GitHub
                              </Button>
                            )}
                            {project.author.profile?.linkedinUrl && (
                              <Button
                                component="a"
                                href={project.author.profile.linkedinUrl}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                LinkedIn
                              </Button>
                            )}
                            {project.author.profile?.twitterUrl && (
                              <Button
                                component="a"
                                href={project.author.profile.twitterUrl}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                Twitter
                              </Button>
                            )}
                            {project.author.profile?.website && (
                              <Button
                                component="a"
                                href={project.author.profile.website}
                                target="_blank"
                                variant="subtle"
                                size="sm"
                              >
                                Website
                              </Button>
                            )}
                          </Group>
                        )}
                      </Stack>
                    </>
                  )}

                  {/* Repositories Section */}
                  {project.repositories && project.repositories.length > 0 && (
                    <>
                      <Divider />
                      <Stack gap="md">
                        <Title order={3}>Repositories</Title>
                        <Stack gap="sm">
                          {[...project.repositories]
                            .sort((a, b) => {
                              if (a.isPrimary && !b.isPrimary) return -1;
                              if (!a.isPrimary && b.isPrimary) return 1;
                              return a.order - b.order;
                            })
                            .map((repo) => (
                              <Paper
                                key={repo.id}
                                p="md"
                                withBorder
                                radius="md"
                              >
                                <Stack gap="sm">
                                  <Group
                                    justify="space-between"
                                    align="flex-start"
                                  >
                                    <Stack gap="xs" style={{ flex: 1 }}>
                                      <Group gap="xs">
                                        <Text fw={500} size="sm">
                                          {repo.name ?? "Repository"}
                                        </Text>
                                        {repo.isPrimary && (
                                          <Badge
                                            size="xs"
                                            variant="light"
                                            color="blue"
                                          >
                                            Primary
                                          </Badge>
                                        )}
                                        {repo.attestations &&
                                          repo.attestations.length > 0 && (
                                            <Badge
                                              size="xs"
                                              variant="light"
                                              color="violet"
                                            >
                                              {repo.attestations.length}{" "}
                                              attestation
                                              {repo.attestations.length > 1
                                                ? "s"
                                                : ""}
                                            </Badge>
                                          )}
                                      </Group>
                                      {repo.description && (
                                        <Text size="sm" c="dimmed">
                                          {repo.description}
                                        </Text>
                                      )}
                                      <Text
                                        size="xs"
                                        c="dimmed"
                                        style={{ wordBreak: "break-all" }}
                                      >
                                        {repo.url}
                                      </Text>
                                    </Stack>
                                    <Button
                                      component="a"
                                      href={repo.url}
                                      target="_blank"
                                      size="sm"
                                      variant="light"
                                      leftSection={
                                        <IconBrandGithub size={16} />
                                      }
                                    >
                                      View
                                    </Button>
                                  </Group>

                                  {/* EAS Attestations Section */}
                                  {repo.attestations &&
                                    repo.attestations.length > 0 && (
                                      <>
                                        <Divider />
                                        <Box>
                                          <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={() =>
                                              toggleAttestations(repo.id)
                                            }
                                            rightSection={
                                              expandedAttestations.has(
                                                repo.id,
                                              ) ? (
                                                <IconChevronUp size={14} />
                                              ) : (
                                                <IconChevronDown size={14} />
                                              )
                                            }
                                            px={0}
                                          >
                                            <Group gap={4}>
                                              <IconLink size={14} />
                                              <Text size="xs">
                                                On-chain Attestations
                                              </Text>
                                            </Group>
                                          </Button>

                                          {expandedAttestations.has(
                                            repo.id,
                                          ) && (
                                            <Stack gap="xs" mt="xs">
                                              {repo.attestations.map(
                                                (attestation) => {
                                                  const commits =
                                                    getAttestationCommits(
                                                      attestation.data,
                                                    );
                                                  return (
                                                    <Group
                                                      key={attestation.id}
                                                      gap="xs"
                                                      wrap="nowrap"
                                                    >
                                                      <Text
                                                        size="xs"
                                                        c="dimmed"
                                                        style={{ minWidth: 75 }}
                                                      >
                                                        {formatAttestationDate(
                                                          attestation.snapshotDate,
                                                        )}
                                                      </Text>
                                                      {commits !==
                                                        undefined && (
                                                        <Badge
                                                          size="xs"
                                                          color="blue"
                                                          variant="light"
                                                        >
                                                          {commits} commits
                                                        </Badge>
                                                      )}
                                                      <Anchor
                                                        href={getEASExplorerUrl(
                                                          attestation.uid,
                                                          attestation.chain,
                                                        )}
                                                        target="_blank"
                                                        size="xs"
                                                        c="violet"
                                                        style={{
                                                          whiteSpace: "nowrap",
                                                        }}
                                                      >
                                                        View
                                                        <IconExternalLink
                                                          size={10}
                                                          style={{
                                                            marginLeft: 4,
                                                            verticalAlign:
                                                              "middle",
                                                          }}
                                                        />
                                                      </Anchor>
                                                    </Group>
                                                  );
                                                },
                                              )}
                                            </Stack>
                                          )}
                                        </Box>
                                      </>
                                    )}
                                </Stack>
                              </Paper>
                            ))}
                        </Stack>
                      </Stack>
                    </>
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="timeline" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Group justify="space-between">
                    <Title order={2}>Project Timeline</Title>
                    {canEdit && (
                      <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={() => setUpdateModalOpen(true)}
                      >
                        Add Update
                      </Button>
                    )}
                  </Group>

                  {timeline.length > 0 ? (
                    <Timeline
                      active={timeline.length}
                      bulletSize={24}
                      lineWidth={2}
                    >
                      {timeline.map((update) => (
                        <Timeline.Item
                          key={update.id}
                          bullet={<IconCalendarEvent size={12} />}
                          title={
                            <Group gap="xs" justify="space-between">
                              <Group gap="xs">
                                <Text fw={500}>{update.title}</Text>
                                {update.weekNumber && (
                                  <Badge size="xs" variant="outline">
                                    Week {update.weekNumber}
                                  </Badge>
                                )}
                              </Group>
                              {canEdit && (
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(update.id);
                                  }}
                                  title="Delete update"
                                >
                                  <IconTrash size={16} />
                                </ActionIcon>
                              )}
                            </Group>
                          }
                        >
                          <Paper
                            p="md"
                            radius="md"
                            className="update-hover-container"
                          >
                            <Stack gap="sm" mt="xs">
                              <Group gap="xs">
                                <div
                                  style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                  }}
                                >
                                  {update.author.image ? (
                                    <Image
                                      src={update.author.image}
                                      alt={update.author.name ?? "Author"}
                                      width={20}
                                      height={20}
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                      }}
                                    />
                                  ) : (
                                    <div
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        backgroundColor: "#e9ecef",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Text size="xs">?</Text>
                                    </div>
                                  )}
                                </div>
                                <Text size="sm" c="dimmed">
                                  {update.author.name ?? "Anonymous"} •{" "}
                                  {getRelativeTime(update.updateDate)}
                                </Text>
                              </Group>

                              <Box>
                                <MarkdownRenderer content={update.content} />
                              </Box>

                              {/* Images */}
                              {update.imageUrls.length > 0 && (
                                <Box mt="md">
                                  {update.imageUrls.length === 1 ? (
                                    // Single image - display large
                                    <Paper
                                      radius="md"
                                      withBorder
                                      style={{
                                        overflow: "hidden",
                                        cursor: "pointer",
                                        transition: "transform 0.2s ease",
                                      }}
                                      onClick={() =>
                                        handleImageClick(update.imageUrls[0]!)
                                      }
                                    >
                                      <Image
                                        src={update.imageUrls[0]}
                                        alt="Update image"
                                        style={{
                                          width: "100%",
                                          maxHeight: "400px",
                                          objectFit: "cover",
                                        }}
                                      />
                                    </Paper>
                                  ) : (
                                    // Multiple images - display grid
                                    <SimpleGrid
                                      cols={{
                                        base: 1,
                                        sm: 2,
                                        md:
                                          update.imageUrls.length >= 3 ? 3 : 2,
                                      }}
                                      spacing="md"
                                    >
                                      {update.imageUrls.map((url, imgIndex) => (
                                        <Paper
                                          key={imgIndex}
                                          radius="md"
                                          withBorder
                                          style={{
                                            overflow: "hidden",
                                            cursor: "pointer",
                                            transition: "transform 0.2s ease",
                                            aspectRatio: "16/9",
                                          }}
                                          onClick={() => handleImageClick(url)}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.transform =
                                              "scale(1.05)";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.transform =
                                              "scale(1)";
                                          }}
                                        >
                                          <Image
                                            src={url}
                                            alt={`Update image ${imgIndex + 1}`}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                            }}
                                          />
                                        </Paper>
                                      ))}
                                    </SimpleGrid>
                                  )}
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

                              {/* Tags */}
                              {update.tags.length > 0 && (
                                <Group gap="xs">
                                  {update.tags.map((tag, tagIndex) => (
                                    <Badge
                                      key={tagIndex}
                                      size="xs"
                                      variant="outline"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </Group>
                              )}

                              {/* Like Button */}
                              <LikeButton
                                updateId={update.id}
                                initialLikeCount={0}
                                initialHasLiked={false}
                                userId={userId}
                              />
                            </Stack>
                          </Paper>
                        </Timeline.Item>
                      ))}
                    </Timeline>
                  ) : (
                    <Stack align="center" py="xl">
                      <Text c="dimmed" ta="center">
                        No updates yet.{" "}
                        {canEdit
                          ? "Add the first update to start documenting your progress!"
                          : "Check back later for project updates."}
                      </Text>
                      {canEdit && (
                        <Button
                          variant="light"
                          leftSection={<IconPlus size={16} />}
                          onClick={() => setUpdateModalOpen(true)}
                        >
                          Add First Update
                        </Button>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="devtimeline" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="lg">
                  <Title order={2}>Development Timeline</Title>
                  <Text c="dimmed" size="sm">
                    Recent commits from the last 7 days
                  </Text>

                  {/* Show sub-tabs if multiple repositories, otherwise show single timeline */}
                  {project.repositories && project.repositories.length > 1 ? (
                    <Tabs
                      defaultValue={
                        project.repositories.find((r) => r.isPrimary)?.id ??
                        project.repositories[0]?.id
                      }
                    >
                      <Tabs.List>
                        {[...project.repositories]
                          .sort((a, b) => {
                            if (a.isPrimary && !b.isPrimary) return -1;
                            if (!a.isPrimary && b.isPrimary) return 1;
                            return a.order - b.order;
                          })
                          .map((repo) => (
                            <Tabs.Tab key={repo.id} value={repo.id}>
                              {repo.name ?? "Repository"}
                              {repo.isPrimary && " (Primary)"}
                            </Tabs.Tab>
                          ))}
                      </Tabs.List>

                      {project.repositories.map((repo) => (
                        <Tabs.Panel key={repo.id} value={repo.id} pt="md">
                          {repo.description && (
                            <Text size="sm" c="dimmed" mb="md">
                              {repo.description}
                            </Text>
                          )}
                          <GitCommitTimeline githubUrl={repo.url} />
                        </Tabs.Panel>
                      ))}
                    </Tabs>
                  ) : (
                    <GitCommitTimeline
                      githubUrl={
                        project.repositories && project.repositories.length > 0
                          ? (project.repositories[0]?.url ?? null)
                          : project.githubUrl
                      }
                    />
                  )}
                </Stack>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="impact" mt="md">
              <ImpactTab
                projectId={project.id}
                repositoryId={
                  project.repositories?.find((r) => r.isPrimary)?.id ??
                  project.repositories?.[0]?.id
                }
              />
            </Tabs.Panel>

            <Tabs.Panel value="metrics" mt="md">
              <MetricsTab
                projectId={project.id}
                canEdit={canEdit}
                projectTitle={project.title}
                projectImageUrl={project.imageUrl}
              />
            </Tabs.Panel>

            <Tabs.Panel value="hypercerts" mt="md">
              <HypercertsTab
                projectId={project.id}
                projectTitle={project.title}
                canEdit={canEdit}
              />
            </Tabs.Panel>

            <Tabs.Panel value="sds" mt="md">
              <SDSTab projectId={project.id} canEdit={canEdit} />
            </Tabs.Panel>

            <Tabs.Panel value="team" mt="md">
              <Paper p="xl" radius="md" withBorder>
                <Stack gap="md">
                  <Title order={2}>Team Members</Title>
                  <Text size="sm" c="dimmed">
                    {1 + project.collaborators.length}{" "}
                    {1 + project.collaborators.length === 1
                      ? "member"
                      : "members"}{" "}
                    working on this project
                  </Text>
                  <Stack gap="md">
                    {/* Project Owner */}
                    <Anchor
                      href={`/profiles/${project.author.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Group gap="md" style={{ cursor: "pointer" }}>
                        {project.author.image ? (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: "50%",
                              overflow: "hidden",
                            }}
                          >
                            <Image
                              src={project.author.image}
                              alt={project.author.name ?? "Owner"}
                              width={48}
                              height={48}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          </div>
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: "50%",
                              backgroundColor: "#e9ecef",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <IconUser size={24} />
                          </div>
                        )}
                        <Stack gap={4} style={{ flex: 1 }}>
                          <Text fw={500}>
                            {project.author.name ?? "Anonymous"}
                          </Text>
                          {project.author.profile?.jobTitle && (
                            <Text size="sm" c="dimmed">
                              {project.author.profile.jobTitle}
                              {project.author.profile.company &&
                                ` at ${project.author.profile.company}`}
                            </Text>
                          )}
                          {project.author.profile?.location && (
                            <Group gap={4}>
                              <IconMapPin size={12} />
                              <Text size="xs" c="dimmed">
                                {project.author.profile.location}
                              </Text>
                            </Group>
                          )}
                        </Stack>
                        <Badge size="sm" variant="filled" color="blue">
                          Owner
                        </Badge>
                      </Group>
                    </Anchor>

                    {/* Collaborators */}
                    {project.collaborators.map((collaborator) => (
                      <Anchor
                        key={collaborator.id}
                        href={`/profiles/${collaborator.userId}`}
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <Group gap="md" style={{ cursor: "pointer" }}>
                          {collaborator.image ? (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                overflow: "hidden",
                              }}
                            >
                              <Image
                                src={collaborator.image}
                                alt={collaborator.name ?? "Collaborator"}
                                width={48}
                                height={48}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            </div>
                          ) : (
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: "50%",
                                backgroundColor: "#e9ecef",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <IconUser size={24} />
                            </div>
                          )}
                          <Stack gap={4} style={{ flex: 1 }}>
                            <Text fw={500}>
                              {collaborator.name ?? "Anonymous"}
                            </Text>
                            {collaborator.profile?.jobTitle && (
                              <Text size="sm" c="dimmed">
                                {collaborator.profile.jobTitle}
                                {collaborator.profile.company &&
                                  ` at ${collaborator.profile.company}`}
                              </Text>
                            )}
                            {collaborator.profile?.location && (
                              <Group gap={4}>
                                <IconMapPin size={12} />
                                <Text size="xs" c="dimmed">
                                  {collaborator.profile.location}
                                </Text>
                              </Group>
                            )}
                          </Stack>
                          <Badge size="sm" variant="light">
                            {collaborator.role}
                          </Badge>
                        </Group>
                      </Anchor>
                    ))}
                  </Stack>
                </Stack>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Container>

      {/* Add Update Modal */}
      <Modal
        opened={updateModalOpen}
        onClose={() => setUpdateModalOpen(false)}
        title="Add Project Update"
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

            <NumberInput
              label="Week Number (Optional)"
              placeholder="Which week of the program?"
              min={1}
              max={20}
              {...form.getInputProps("weekNumber")}
            />

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

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Update Images
              </Text>
              <Text size="xs" c="dimmed">
                Upload screenshots or demo images (JPG, PNG, GIF, or WebP, max
                5MB each)
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

            <TextInput
              label="GitHub URLs (comma-separated)"
              placeholder="https://github.com/user/repo/commit/abc123, https://github.com/user/repo/pull/5"
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
              <Button
                variant="subtle"
                onClick={() => setUpdateModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" loading={createUpdate.isPending}>
                Post Update
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Update"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete this update? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDelete}
              loading={deleteUpdate.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Project Confirmation Modal */}
      <Modal
        opened={deleteProjectModalOpen}
        onClose={() => setDeleteProjectModalOpen(false)}
        title="Delete Project"
        size="sm"
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to permanently delete{" "}
            <Text component="span" fw={600}>
              {project.title}
            </Text>
            ? This will delete the project and all its updates, collaborators,
            and data. This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="subtle"
              onClick={() => setDeleteProjectModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleConfirmDeleteProject}
              loading={deleteProject.isPending}
              leftSection={<IconTrash size={16} />}
            >
              Delete Project
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Image Modal */}
      <Modal
        opened={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage(null);
        }}
        size="xl"
        padding={0}
        withCloseButton={true}
        centered
      >
        {selectedImage && (
          <Image
            src={selectedImage}
            alt="Full size image"
            style={{
              width: "100%",
              height: "auto",
              maxHeight: "90vh",
              objectFit: "contain",
            }}
          />
        )}
      </Modal>

      {/* Edit Project Modal */}
      <Modal
        opened={editProjectModalOpen}
        onClose={() => {
          setEditProjectModalOpen(false);
          projectForm.reset();
          setRepositories([]);
        }}
        title="Edit Project"
        size="lg"
      >
        <form onSubmit={projectForm.onSubmit(handleProjectSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Project Title"
              placeholder="My Awesome Project"
              required
              {...projectForm.getInputProps("title")}
            />

            <Textarea
              label="Description"
              placeholder="Brief description of your project"
              minRows={3}
              {...projectForm.getInputProps("description")}
            />

            <RepositoryManager
              projectId={project.id}
              initialRepositories={repositories}
              onChange={setRepositories}
            />

            <TextInput
              label="Live Demo URL"
              placeholder="https://your-project.com"
              {...projectForm.getInputProps("liveUrl")}
            />

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Project Logo
              </Text>
              <Text size="xs" c="dimmed">
                Upload a small logo or icon for your project (JPG, PNG, GIF, or
                WebP, max 5MB)
              </Text>

              {projectForm.values.imageUrl && (
                <Box>
                  <Image
                    src={projectForm.values.imageUrl}
                    alt="Project logo preview"
                    radius="md"
                    h={100}
                    w={100}
                    fit="contain"
                    style={{ border: "1px solid var(--mantine-color-gray-3)" }}
                  />
                </Box>
              )}

              <Group>
                <FileButton
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  disabled={isUploadingLogo}
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="sm"
                      loading={isUploadingLogo}
                    >
                      {projectForm.values.imageUrl
                        ? "Change Logo"
                        : "Upload Logo"}
                    </Button>
                  )}
                </FileButton>
                {projectForm.values.imageUrl && (
                  <Button
                    variant="subtle"
                    size="sm"
                    color="red"
                    onClick={() => projectForm.setFieldValue("imageUrl", "")}
                  >
                    Remove Logo
                  </Button>
                )}
              </Group>

              {isUploadingLogo && (
                <Box>
                  <Text size="sm" mb="xs">
                    Uploading logo...
                  </Text>
                  <Progress value={logoUploadProgress} size="sm" />
                </Box>
              )}

              <TextInput
                placeholder="Or paste logo URL"
                {...projectForm.getInputProps("imageUrl")}
                size="xs"
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Project Banner
              </Text>
              <Text size="xs" c="dimmed">
                Upload a large banner image for your project page (JPG, PNG,
                GIF, or WebP, max 5MB)
              </Text>

              {projectForm.values.bannerUrl && (
                <Box>
                  <Image
                    src={projectForm.values.bannerUrl}
                    alt="Project banner preview"
                    radius="md"
                    h={150}
                    fit="cover"
                    style={{ border: "1px solid var(--mantine-color-gray-3)" }}
                  />
                </Box>
              )}

              <Group>
                <FileButton
                  onChange={handleBannerUpload}
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  disabled={isUploadingBanner}
                >
                  {(props) => (
                    <Button
                      {...props}
                      variant="light"
                      size="sm"
                      loading={isUploadingBanner}
                    >
                      {projectForm.values.bannerUrl
                        ? "Change Banner"
                        : "Upload Banner"}
                    </Button>
                  )}
                </FileButton>
                {projectForm.values.bannerUrl && (
                  <Button
                    variant="subtle"
                    size="sm"
                    color="red"
                    onClick={() => projectForm.setFieldValue("bannerUrl", "")}
                  >
                    Remove Banner
                  </Button>
                )}
              </Group>

              {isUploadingBanner && (
                <Box>
                  <Text size="sm" mb="xs">
                    Uploading banner...
                  </Text>
                  <Progress value={bannerUploadProgress} size="sm" />
                </Box>
              )}

              <TextInput
                placeholder="Or paste banner URL"
                {...projectForm.getInputProps("bannerUrl")}
                size="xs"
              />
            </Stack>

            <TagsInput
              label="Technologies"
              placeholder="React, TypeScript, Node.js, etc."
              description="Technologies and tools used in this project"
              {...projectForm.getInputProps("technologies")}
            />

            {/* Collaborators Section */}
            {projectCollaboratorsData && (
              <Stack gap="xs">
                <Text size="sm" fw={500}>
                  Collaborators
                </Text>
                <Text size="xs" c="dimmed">
                  Add other platform users who can edit this project and post
                  updates
                </Text>

                {/* List of current collaborators */}
                <CollaboratorsList
                  collaborators={projectCollaboratorsData.collaborators}
                  ownerId={projectCollaboratorsData.ownerId}
                  currentUserId={session?.user.id ?? ""}
                  isOwner={
                    session?.user.id === projectCollaboratorsData.ownerId
                  }
                  onRemove={(userId) =>
                    removeCollaborator.mutate({
                      projectId: project.id,
                      userId,
                    })
                  }
                  loading={removeCollaborator.isPending}
                />

                {/* Search to add new collaborators - only show if current user is owner */}
                {session?.user.id === userProfile?.userId && userProfile && (
                  <UserSearchSelect
                    onSelect={(user) =>
                      addCollaborators.mutate({
                        projectId: project.id,
                        userIds: [user.id],
                      })
                    }
                    excludeUserIds={[
                      userProfile.userId,
                      ...projectCollaboratorsData.collaborators.map(
                        (c) => c.user.id,
                      ),
                    ]}
                    placeholder="Search users to add as collaborators..."
                  />
                )}
              </Stack>
            )}

            <Switch
              label="Featured Project"
              description="Show this project prominently on your profile"
              {...projectForm.getInputProps("featured", { type: "checkbox" })}
            />

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setEditProjectModalOpen(false);
                  projectForm.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateProject.isPending}
                leftSection={<IconCheck size={16} />}
              >
                Update Project
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
