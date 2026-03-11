"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Grid,
  Card,
  Avatar,
  Text,
  Badge,
  Button,
  TextInput,
  MultiSelect,
  Stack,
  Group,
  Loader,
  Center,
  ActionIcon,
  Tooltip,
  Image,
  Paper,
} from "@mantine/core";
import {
  IconSearch,
  IconBrandGithub,
  IconExternalLink,
  IconPlus,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getDisplayName } from "~/utils/userDisplay";
import { getPrimaryRepoUrl } from "~/utils/project";

interface ProjectFilters {
  search: string;
  technologies: string[];
}

export function ProjectsClient() {
  const { data: session } = useSession();
  const [filters, setFilters] = useState<ProjectFilters>({
    search: "",
    technologies: [],
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.profile.getAllFeaturedProjects.useInfiniteQuery(
      {
        search: filters.search || undefined,
        technologies:
          filters.technologies.length > 0 ? filters.technologies : undefined,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const allProjects = data?.pages.flatMap((page) => page.projects) ?? [];

  // Get unique technologies from all projects for filter options
  const allTechnologies = Array.from(
    new Set(allProjects.flatMap((project) => project.technologies)),
  ).map((tech) => ({ value: tech, label: tech }));

  const handleFilterChange = (
    key: keyof ProjectFilters,
    value: string | string[],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      technologies: [],
    });
  };

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="xl">
        <div>
          <Title order={1} mb="xs">
            Projects Directory
          </Title>
          <Text c="dimmed">
            Discover featured projects from our community members
          </Text>
        </div>
        {session && (
          <Button
            component={Link}
            href="/profile/edit"
            leftSection={<IconPlus size={16} />}
          >
            Add Your Project
          </Button>
        )}
      </Group>

      <Grid gutter="xl">
        {/* Filters Sidebar */}
        <Grid.Col span={{ base: 12, md: 3 }}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Text fw={600}>Filters</Text>
              <Button variant="subtle" size="xs" onClick={clearFilters}>
                Clear all
              </Button>
            </Group>

            <Stack gap="md">
              <TextInput
                placeholder="Search projects..."
                leftSection={<IconSearch size={16} />}
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />

              <MultiSelect
                label="Technologies"
                placeholder="Select technologies"
                data={allTechnologies}
                value={filters.technologies}
                onChange={(value) => handleFilterChange("technologies", value)}
                searchable
                clearable
              />
            </Stack>
          </Card>
        </Grid.Col>

        {/* Projects Grid */}
        <Grid.Col span={{ base: 12, md: 9 }}>
          {isLoading ? (
            <Center h={400}>
              <Loader size="lg" />
            </Center>
          ) : (
            <>
              <Text mb="md" c="dimmed">
                Showing {allProjects.length} featured projects
              </Text>

              <Grid>
                {allProjects.map((project) => (
                  <Grid.Col key={project.id} span={{ base: 12, sm: 6, md: 4 }}>
                    <Card
                      shadow="xs"
                      padding="md"
                      radius="md"
                      withBorder
                      h="100%"
                      component={Link}
                      href={`/projects/${project.id}`}
                      style={{
                        textDecoration: "none",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                    >
                      <Stack gap="xs">
                        <Group
                          justify="space-between"
                          align="flex-start"
                          wrap="nowrap"
                        >
                          <Group
                            gap="xs"
                            wrap="nowrap"
                            style={{ minWidth: 0, flex: 1 }}
                          >
                            {project.imageUrl ? (
                              <Image
                                src={project.imageUrl}
                                alt={project.title}
                                w={24}
                                h={24}
                                radius="sm"
                                fit="contain"
                                style={{ flexShrink: 0 }}
                              />
                            ) : (
                              <Avatar
                                size={24}
                                radius="sm"
                                color={
                                  [
                                    "blue",
                                    "cyan",
                                    "grape",
                                    "green",
                                    "indigo",
                                    "orange",
                                    "pink",
                                    "teal",
                                    "violet",
                                  ][project.id.charCodeAt(0) % 9]
                                }
                                style={{ flexShrink: 0 }}
                              >
                                {project.title.charAt(0).toUpperCase()}
                              </Avatar>
                            )}
                            <Text
                              fw={500}
                              size="sm"
                              lineClamp={1}
                              style={{ minWidth: 0 }}
                            >
                              {project.title}
                            </Text>
                          </Group>
                          <Group gap="xs">
                            {project.liveUrl && (
                              <Tooltip label="View Demo">
                                <ActionIcon
                                  variant="light"
                                  size="xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    window.open(project.liveUrl!, "_blank");
                                  }}
                                >
                                  <IconExternalLink size={12} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                            {getPrimaryRepoUrl(project) && (
                              <Tooltip label="View Source">
                                <ActionIcon
                                  variant="light"
                                  size="xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    window.open(
                                      getPrimaryRepoUrl(project)!,
                                      "_blank",
                                    );
                                  }}
                                >
                                  <IconBrandGithub size={12} />
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </Group>
                        </Group>

                        {project.description && (
                          <Text size="xs" c="dimmed" lineClamp={2}>
                            {project.description}
                          </Text>
                        )}

                        {project.technologies.length > 0 && (
                          <Group gap="xs">
                            {project.technologies.slice(0, 2).map((tech) => (
                              <Badge key={tech} size="xs" variant="outline">
                                {tech}
                              </Badge>
                            ))}
                            {project.technologies.length > 2 && (
                              <Badge size="xs" variant="outline" color="gray">
                                +{project.technologies.length - 2}
                              </Badge>
                            )}
                          </Group>
                        )}

                        <Group gap="xs" mt="auto">
                          <Avatar
                            src={project.profile.user.image}
                            size="xs"
                            radius="xl"
                          />
                          <Text size="xs" c="dimmed">
                            {getDisplayName(project.profile.user, "Anonymous")}
                          </Text>
                        </Group>
                      </Stack>
                    </Card>
                  </Grid.Col>
                ))}
              </Grid>

              {/* Load More Button */}
              {hasNextPage && (
                <Center mt="xl">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    loading={isFetchingNextPage}
                  >
                    Load More Projects
                  </Button>
                </Center>
              )}

              {allProjects.length === 0 && !isLoading && (
                <Paper p="xl" radius="md" withBorder>
                  <Center>
                    <Stack align="center" gap="md">
                      <Text size="lg" fw={500}>
                        No projects found
                      </Text>
                      <Text c="dimmed" ta="center">
                        No projects match your current filters. Try adjusting
                        your search criteria.
                      </Text>
                      {session && (
                        <Button
                          component={Link}
                          href="/profile/edit"
                          leftSection={<IconPlus size={16} />}
                        >
                          Add the First Project
                        </Button>
                      )}
                    </Stack>
                  </Center>
                </Paper>
              )}
            </>
          )}
        </Grid.Col>
      </Grid>
    </Container>
  );
}
