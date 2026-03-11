"use client";

import { Card, Text, Group, Stack, Badge, Anchor } from "@mantine/core";
import { IconBrandGithub } from "@tabler/icons-react";
import Link from "next/link";
import { TechnologyBadge } from "./TechnologyBadge";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ProjectCardProps {
  project: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    technologies: string[];
    difficulty?: string;
    category?: string;
    lastSynced: Date;
    createdAt: Date;
    updatedAt: Date;
  };
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

export function ProjectCard({ project }: ProjectCardProps) {
  const githubUrl = `https://github.com/fundingthecommons/project-ideas/blob/main/projects/${project.slug}.md`;

  return (
    <Link href={`/project-ideas/${project.slug}`} passHref legacyBehavior>
      <a style={{ textDecoration: "none", color: "inherit" }}>
        <Card
          shadow="sm"
          padding="lg"
          radius="md"
          withBorder
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            cursor: "pointer",
            transition: "all 0.2s ease",
            background:
              "var(--theme-surface-primary, var(--mantine-color-white))",
            border:
              "1px solid var(--theme-border-light, var(--mantine-color-gray-3))",
          }}
          className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
        >
          <Stack gap="md" style={{ flex: 1 }}>
            {/* Header with title and category */}
            <div>
              <Group justify="space-between" align="flex-start" gap="xs">
                <Text size="lg" fw={600} lineClamp={2} style={{ flex: 1 }}>
                  {project.title}
                </Text>
                {project.category && (
                  <Badge variant="dot" size="xs" color="blue">
                    {project.category}
                  </Badge>
                )}
              </Group>

              {project.description && (
                <div
                  style={{
                    fontSize: "14px",
                    color: "var(--mantine-color-dimmed)",
                    marginTop: "var(--mantine-spacing-xs)",
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    lineHeight: 1.4,
                  }}
                >
                  <MarkdownRenderer
                    content={
                      project.description.substring(0, 200) +
                      (project.description.length > 200 ? "..." : "")
                    }
                  />
                </div>
              )}
            </div>

            {/* Technologies */}
            {project.technologies.length > 0 && (
              <Group gap={6}>
                {project.technologies.slice(0, 4).map((tech) => (
                  <TechnologyBadge
                    key={tech}
                    technology={tech}
                    size="xs"
                    variant="light"
                  />
                ))}
                {project.technologies.length > 4 && (
                  <Badge size="xs" variant="light" color="gray">
                    +{project.technologies.length - 4}
                  </Badge>
                )}
              </Group>
            )}

            {/* Footer with difficulty and links */}
            <Group justify="space-between" align="center" mt="auto" pt="md">
              {project.difficulty && (
                <Badge
                  variant="filled"
                  size="sm"
                  color={getDifficultyColor(project.difficulty)}
                >
                  {project.difficulty}
                </Badge>
              )}

              <Group gap="xs" ml="auto">
                <Anchor
                  href={githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconBrandGithub size={16} />
                </Anchor>
              </Group>
            </Group>
          </Stack>
        </Card>
      </a>
    </Link>
  );
}
