"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Paper,
  Anchor,
  Breadcrumbs,
  Alert,
  Center,
  Loader,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconArrowLeft,
  IconInfoCircle,
  IconShare,
} from "@tabler/icons-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "~/trpc/react";
import { TechnologyBadge } from "~/app/_components/TechnologyBadge";
import { MarkdownRenderer } from "~/app/_components/MarkdownRenderer";

interface ProjectDetailClientProps {
  slug: string;
}

const getDifficultyColor = (difficulty?: string) => {
  if (!difficulty) return "gray";

  switch (difficulty.toLowerCase()) {
    case "easy":
      return "green";
    case "medium":
      return "yellow";
    case "hard":
      return "red";
    default:
      return "gray";
  }
};

export function ProjectDetailClient({ slug }: ProjectDetailClientProps) {
  const router = useRouter();
  const {
    data: project,
    isLoading,
    error,
  } = api.projectIdea.getBySlug.useQuery({ slug });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: project?.title,
          text: project?.description ?? undefined,
          url: window.location.href,
        });
      } catch {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  const githubUrl = project
    ? `https://github.com/fundingthecommons/project-ideas/blob/main/projects/${slug}.md`
    : "";

  const breadcrumbItems = [
    { title: "Project Ideas", href: "/project-ideas" },
    { title: project?.title ?? "Loading...", href: "#" },
  ].map((item, index) =>
    index === 0 ? (
      <Link key={index} href={item.href} passHref legacyBehavior>
        <Anchor>{item.title}</Anchor>
      </Link>
    ) : (
      <Text key={index} c="dimmed">
        {item.title}
      </Text>
    ),
  );

  if (isLoading) {
    return (
      <div className="bg-theme-gradient min-h-screen">
        <Container size="lg" py="xl">
          <Center py="xl">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text c="dimmed">Loading project details...</Text>
            </Stack>
          </Center>
        </Container>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-theme-gradient min-h-screen">
        <Container size="lg" py="xl">
          <Stack gap="lg">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.back()}
            >
              Back to Projects
            </Button>

            <Alert
              icon={<IconInfoCircle size={16} />}
              title="Project not found"
              color="red"
            >
              The project you&apos;re looking for doesn&apos;t exist or
              couldn&apos;t be loaded.
            </Alert>
          </Stack>
        </Container>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="bg-theme-gradient min-h-screen">
      <Container size="lg" py="xl">
        <Stack gap="xl">
          {/* Navigation */}
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => router.back()}
            >
              Back to Projects
            </Button>

            <Breadcrumbs>{breadcrumbItems}</Breadcrumbs>
          </Group>

          {/* Project Header */}
          <Paper
            p="xl"
            radius="lg"
            className="bg-theme-surface-primary border-theme-light"
          >
            <Stack gap="lg">
              {/* Title and Meta */}
              <div>
                <Group justify="space-between" align="flex-start" mb="md">
                  <Title order={1} size="h1">
                    {project.title}
                  </Title>

                  <Group gap="xs">
                    {project.category && (
                      <Badge variant="light" size="lg">
                        {project.category}
                      </Badge>
                    )}

                    {project.difficulty && (
                      <Badge
                        variant="filled"
                        size="lg"
                        color={getDifficultyColor(project.difficulty)}
                      >
                        {project.difficulty}
                      </Badge>
                    )}
                  </Group>
                </Group>

                {project.description && (
                  <Text size="lg" c="dimmed" mb="lg">
                    {project.description}
                  </Text>
                )}
              </div>

              {/* Technologies */}
              {project.technologies.length > 0 && (
                <div>
                  <Text size="sm" fw={600} mb="xs" c="dimmed">
                    Technologies
                  </Text>
                  <Group gap="xs">
                    {project.technologies.map((tech) => (
                      <TechnologyBadge
                        key={tech}
                        technology={tech}
                        size="md"
                        variant="light"
                      />
                    ))}
                  </Group>
                </div>
              )}

              {/* Actions */}
              <Group>
                <Button
                  component="a"
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  leftSection={<IconBrandGithub size={16} />}
                >
                  View on GitHub
                </Button>

                <Button
                  variant="light"
                  leftSection={<IconShare size={16} />}
                  onClick={handleShare}
                >
                  Share
                </Button>
              </Group>
            </Stack>
          </Paper>

          {/* Project Content */}
          <Paper
            p="xl"
            radius="lg"
            className="bg-theme-surface-primary border-theme-light"
          >
            <MarkdownRenderer content={project.content} />
          </Paper>

          {/* Footer */}
          <Paper p="md" radius="md" className="bg-theme-surface-secondary">
            <Group justify="space-between" align="center">
              <div>
                <Text size="sm" c="dimmed">
                  Last updated:{" "}
                  {new Date(project.lastSynced).toLocaleDateString()}
                </Text>
                <Text size="xs" c="dimmed">
                  Source: {project.githubPath}
                </Text>
              </div>

              <Group gap="xs">
                <Text size="xs" c="dimmed">
                  Found an issue?
                </Text>
                <Anchor
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="xs"
                >
                  Edit on GitHub
                </Anchor>
              </Group>
            </Group>
          </Paper>
        </Stack>
      </Container>
    </div>
  );
}
