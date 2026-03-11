"use client";

import { useState } from "react";
import { useForm } from "@mantine/form";
import { zodResolver } from "mantine-form-zod-resolver";
import { z } from "zod";
import {
  Stack,
  Group,
  Text,
  Button,
  Modal,
  TextInput,
  Textarea,
  TagsInput,
  Switch,
  Card,
  Badge,
  ActionIcon,
  Box,
  SimpleGrid,
  Paper,
  Title,
  Divider,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconBrandGithub,
  IconExternalLink,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { api } from "~/trpc/react";
import { useSession } from "next-auth/react";
import type { UserProject, Repository } from "@prisma/client";
import { AddProjectButton } from "./AddProjectButton";
import { UserSearchSelect } from "./UserSearchSelect";
import { CollaboratorsList } from "./CollaboratorsList";
import { RepositoryManager } from "./RepositoryManager";
import { getPrimaryRepoUrl } from "~/utils/project";
import Link from "next/link";

const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  githubUrl: z.string().url("Invalid GitHub URL").optional().or(z.literal("")),
  liveUrl: z.string().url("Invalid URL").optional().or(z.literal("")),
  imageUrl: z.string().url("Invalid image URL").optional().or(z.literal("")),
  technologies: z.array(z.string().max(30)).max(20),
  focusAreas: z.array(z.string().max(50)).max(10).optional(),
  featured: z.boolean().optional().default(false),
});

type ProjectFormData = z.infer<typeof projectSchema>;

type ProjectWithRepositories = UserProject & {
  repositories?: Repository[];
};

interface ProjectManagerProps {
  projects: ProjectWithRepositories[];
  onProjectsChange?: () => void;
  eventId?: string;
}

export function ProjectManager({
  projects,
  onProjectsChange,
  eventId,
}: ProjectManagerProps) {
  const [opened, setOpened] = useState(false);
  const [editingProject, setEditingProject] =
    useState<ProjectWithRepositories | null>(null);
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
  const { data: session } = useSession();

  // Fetch collaborators for the editing project
  const { data: collaboratorsData, refetch: refetchCollaborators } =
    api.profile.getProjectCollaborators.useQuery(
      { projectId: editingProject?.id ?? "" },
      { enabled: !!editingProject?.id },
    );

  const addCollaborators = api.profile.addProjectCollaborators.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Collaborator added successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      void refetchCollaborators();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to add collaborator",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const removeCollaborator = api.profile.removeProjectCollaborator.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Collaborator removed successfully",
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

  const addRepository = api.profile.addRepository.useMutation();
  const updateRepository = api.profile.updateRepository.useMutation();
  const removeRepository = api.profile.removeRepository.useMutation();

  const createProject = api.profile.createProject.useMutation({
    onSuccess: async (project) => {
      // Save repositories if any were added
      if (repositories.length > 0) {
        try {
          await Promise.all(
            repositories.map((repo) =>
              addRepository.mutateAsync({
                projectId: project.id,
                url: repo.url,
                name: repo.name || undefined,
                description: repo.description || undefined,
                isPrimary: repo.isPrimary,
                order: repo.order,
              }),
            ),
          );
        } catch {
          notifications.show({
            title: "Warning",
            message: "Project created but some repositories failed to save",
            color: "yellow",
          });
        }
      }

      notifications.show({
        title: "Success",
        message: "Project created successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      setOpened(false);
      form.reset();
      setRepositories([]);
      onProjectsChange?.();
    },
    onError: (error) => {
      notifications.show({
        title: "Error",
        message: error.message ?? "Failed to create project",
        color: "red",
        icon: <IconX size={16} />,
      });
    },
  });

  const updateProject = api.profile.updateProject.useMutation({
    onSuccess: async () => {
      // Handle repository updates if editing a project
      if (editingProject && repositories.length > 0) {
        try {
          const existingRepoIds =
            editingProject.repositories?.map((r) => r.id) ?? [];
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
                  projectId: editingProject.id,
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
      setOpened(false);
      form.reset();
      setEditingProject(null);
      setRepositories([]);
      onProjectsChange?.();
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

  const deleteProject = api.profile.deleteProject.useMutation({
    onSuccess: () => {
      notifications.show({
        title: "Success",
        message: "Project deleted successfully",
        color: "green",
        icon: <IconCheck size={16} />,
      });
      onProjectsChange?.();
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

  const form = useForm<ProjectFormData>({
    validate: zodResolver(projectSchema),
    initialValues: {
      title: "",
      description: "",
      githubUrl: "",
      liveUrl: "",
      imageUrl: "",
      technologies: [],
      focusAreas: [],
      featured: false,
    },
  });

  const handleSubmit = (values: ProjectFormData) => {
    // Clean up empty strings
    const cleanedValues = Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        value === "" ? undefined : value,
      ]),
    ) as ProjectFormData;

    if (editingProject) {
      updateProject.mutate({
        id: editingProject.id,
        ...cleanedValues,
      });
    } else {
      createProject.mutate(cleanedValues);
    }
  };

  const handleEdit = (project: ProjectWithRepositories) => {
    setEditingProject(project);
    form.setValues({
      title: project.title,
      description: project.description ?? "",
      githubUrl: project.githubUrl ?? "",
      liveUrl: project.liveUrl ?? "",
      imageUrl: project.imageUrl ?? "",
      technologies: project.technologies,
      focusAreas: project.focusAreas,
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

    setOpened(true);
  };

  const handleDelete = (projectId: string) => {
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate({ id: projectId });
    }
  };

  const handleAddNew = () => {
    setEditingProject(null);
    form.reset();
    setRepositories([]);
    setOpened(true);
  };

  const handleAddCollaborator = (user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  }) => {
    if (!editingProject) return;
    addCollaborators.mutate({
      projectId: editingProject.id,
      userIds: [user.id],
    });
  };

  const handleRemoveCollaborator = (userId: string) => {
    if (!editingProject) return;
    removeCollaborator.mutate({
      projectId: editingProject.id,
      userId,
    });
  };

  const isOwner = collaboratorsData?.ownerId === session?.user?.id;
  const collaborators = collaboratorsData?.collaborators ?? [];
  const collaboratorUserIds = collaborators.map((c) => c.userId);

  return (
    <>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Group justify="space-between" mb="md">
          <Title order={2} size="h3">
            Projects Showcase
          </Title>
          <AddProjectButton onClick={handleAddNew}>
            Add Project
          </AddProjectButton>
        </Group>

        {projects.length === 0 ? (
          <Box ta="center" py="xl">
            <Text c="dimmed">No projects added yet</Text>
            <Text size="sm" c="dimmed" mt="xs">
              Showcase your work by adding your projects
            </Text>
          </Box>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 1 }} spacing="md">
            {projects
              .sort((a, b) => {
                if (a.featured && !b.featured) return -1;
                if (!a.featured && b.featured) return 1;
                return a.order - b.order;
              })
              .map((project) => {
                const content = (
                  <>
                    <Group justify="space-between" align="flex-start" mb="sm">
                      <div style={{ flex: 1 }}>
                        <Group gap="xs" mb="xs">
                          <Text fw={500} size="lg">
                            {project.title}
                          </Text>
                          {project.featured && (
                            <Badge size="xs" color="yellow">
                              Featured
                            </Badge>
                          )}
                        </Group>
                        {project.description && (
                          <Text size="sm" c="dimmed" mb="sm">
                            {project.description}
                          </Text>
                        )}
                        {project.focusAreas &&
                          project.focusAreas.length > 0 && (
                            <Group gap={4} mb="xs">
                              {project.focusAreas.map((area) => (
                                <Badge
                                  key={area}
                                  size="sm"
                                  color="blue"
                                  variant="light"
                                >
                                  {area}
                                </Badge>
                              ))}
                            </Group>
                          )}
                      </div>

                      <Group gap="xs">
                        <ActionIcon
                          variant="light"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleEdit(project);
                          }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="light"
                          color="red"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleDelete(project.id);
                          }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </Group>

                    <Group justify="space-between" align="flex-end">
                      <Group gap={4}>
                        {project.technologies.map((tech) => (
                          <Badge key={tech} size="xs" variant="dot">
                            {tech}
                          </Badge>
                        ))}
                      </Group>

                      <Group gap="xs">
                        {getPrimaryRepoUrl(project) && (
                          <ActionIcon
                            component="a"
                            href={getPrimaryRepoUrl(project) ?? undefined}
                            target="_blank"
                            variant="light"
                            size="sm"
                          >
                            <IconBrandGithub size={16} />
                          </ActionIcon>
                        )}
                        {project.repositories &&
                          project.repositories.length > 1 && (
                            <Badge size="xs" variant="light">
                              +{project.repositories.length - 1} more
                            </Badge>
                          )}
                        {project.liveUrl && (
                          <ActionIcon
                            component="a"
                            href={project.liveUrl}
                            target="_blank"
                            variant="light"
                            size="sm"
                          >
                            <IconExternalLink size={16} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                  </>
                );

                return eventId ? (
                  <Paper
                    key={project.id}
                    p="md"
                    withBorder
                    radius="md"
                    component={Link}
                    href={`/projects/${project.id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      cursor: "pointer",
                    }}
                  >
                    {content}
                  </Paper>
                ) : (
                  <Paper key={project.id} p="md" withBorder radius="md">
                    {content}
                  </Paper>
                );
              })}
          </SimpleGrid>
        )}
      </Card>

      <Modal
        opened={opened}
        onClose={() => {
          setOpened(false);
          setEditingProject(null);
          setRepositories([]);
          form.reset();
        }}
        title={editingProject ? "Edit Project!" : "Add Project"}
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Project Title"
              placeholder="My Awesome Project"
              required
              {...form.getInputProps("title")}
            />

            <Textarea
              label="Description"
              placeholder="Brief description of your project"
              minRows={3}
              {...form.getInputProps("description")}
            />

            <RepositoryManager
              projectId={editingProject?.id}
              initialRepositories={repositories}
              onChange={setRepositories}
            />

            <TextInput
              label="Live Demo URL"
              placeholder="https://your-project.com"
              {...form.getInputProps("liveUrl")}
            />

            <TextInput
              label="Image URL"
              placeholder="https://example.com/screenshot.png"
              description="Optional screenshot or logo for your project"
              {...form.getInputProps("imageUrl")}
            />

            <TagsInput
              label="Technologies"
              placeholder="React, TypeScript, Node.js, etc."
              description="Technologies and tools used in this project"
              {...form.getInputProps("technologies")}
            />

            <TagsInput
              label="Focus Areas"
              placeholder="Select or type focus areas"
              description="Main areas your project focuses on (select up to 3)"
              data={[
                "AI & Machine Learning",
                "Privacy & Cryptography",
                "Trust Networks & Identity",
                "Impact Evaluation & Metrics",
                "Public Goods Funding",
                "Governance & Coordination",
                "Data & Analytics",
                "Developer Tools & Infrastructure",
                "Social Impact",
                "Education & Learning",
                "Climate & Environment",
                "Scientific Research",
                "Decentralized Systems",
                "Digital Public Goods",
                "Community Building",
              ]}
              maxTags={3}
              {...form.getInputProps("focusAreas")}
            />

            <Switch
              label="Featured Project"
              description="Show this project prominently on your profile"
              {...form.getInputProps("featured", { type: "checkbox" })}
            />

            {/* Collaborators Section - Only show in edit mode */}
            {editingProject && (
              <>
                <Divider my="md" />

                <Stack gap="md">
                  <div>
                    <Text fw={500} mb="xs">
                      Collaborators
                    </Text>
                    <Text size="sm" c="dimmed" mb="md">
                      {isOwner
                        ? "Add team members who can edit this project"
                        : "Team members working on this project"}
                    </Text>
                  </div>

                  <CollaboratorsList
                    collaborators={collaborators}
                    ownerId={collaboratorsData?.ownerId ?? ""}
                    currentUserId={session?.user?.id ?? ""}
                    isOwner={isOwner}
                    onRemove={isOwner ? handleRemoveCollaborator : undefined}
                    loading={removeCollaborator.isPending}
                  />

                  {isOwner && (
                    <UserSearchSelect
                      onSelect={handleAddCollaborator}
                      excludeUserIds={[
                        collaboratorsData?.ownerId ?? "",
                        ...collaboratorUserIds,
                      ]}
                      placeholder="Search users to add as collaborators..."
                    />
                  )}
                </Stack>
              </>
            )}

            <Group justify="flex-end" mt="md">
              <Button
                variant="light"
                onClick={() => {
                  setOpened(false);
                  setEditingProject(null);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={createProject.isPending || updateProject.isPending}
                leftSection={<IconCheck size={16} />}
              >
                {editingProject ? "Update Project" : "Add Project"}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </>
  );
}
