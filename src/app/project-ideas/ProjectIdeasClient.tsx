"use client";

import { useState, useMemo } from "react";
import {
  Container,
  Title,
  Text,
  Grid,
  Stack,
  Group,
  TextInput,
  Select,
  MultiSelect,
  Button,
  Loader,
  Center,
  Alert,
  Badge,
  Paper,
} from "@mantine/core";
import { IconSearch, IconX, IconInfoCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { ProjectCard } from "~/app/_components/ProjectCard";

const ITEMS_PER_PAGE = 12;

export function ProjectIdeasClient() {
  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTechnologies, setSelectedTechnologies] = useState<string[]>(
    [],
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null,
  );
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  // Build API query parameters - load all projects
  const queryParams = useMemo(
    () => ({
      limit: 100, // Load all projects
      offset: 0,
      technologies:
        selectedTechnologies.length > 0 ? selectedTechnologies : undefined,
      category: selectedCategory ?? undefined,
      difficulty: selectedDifficulty ?? undefined,
      search: searchTerm.trim() || undefined,
    }),
    [searchTerm, selectedTechnologies, selectedCategory, selectedDifficulty],
  );

  // API queries
  const projectsQuery = api.projectIdea.getAll.useQuery(queryParams);

  // Client-side pagination
  const displayedProjects = useMemo(() => {
    if (!projectsQuery.data?.projects) return [];
    return projectsQuery.data.projects.slice(0, displayCount);
  }, [projectsQuery.data?.projects, displayCount]);

  const hasMore =
    projectsQuery.data?.projects &&
    displayCount < projectsQuery.data.projects.length;
  const technologiesQuery = api.projectIdea.getTechnologies.useQuery();
  const categoriesQuery = api.projectIdea.getCategories.useQuery();
  const difficultiesQuery = api.projectIdea.getDifficulties.useQuery();
  const statsQuery = api.projectIdea.getStats.useQuery();

  // Reset pagination when filters change
  const handleFilterChange = () => {
    setDisplayCount(ITEMS_PER_PAGE);
  };

  // Load more projects
  const loadMore = () => {
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedTechnologies([]);
    setSelectedCategory(null);
    setSelectedDifficulty(null);
    setDisplayCount(ITEMS_PER_PAGE);
  };

  const hasActiveFilters =
    searchTerm ??
    selectedTechnologies.length > 0 ??
    selectedCategory ??
    selectedDifficulty;

  // Prepare options for selects
  interface TechnologyData {
    name: string;
    count: number;
  }
  const technologyOptions =
    technologiesQuery.data?.map((tech: TechnologyData) => ({
      value: tech.name,
      label: `${tech.name} (${tech.count})`,
    })) ?? [];

  interface CategoryData {
    name: string;
    count: number;
  }
  const categoryOptions =
    categoriesQuery.data?.map((cat: CategoryData) => ({
      value: cat.name,
      label: `${cat.name} (${cat.count})`,
    })) ?? [];

  interface DifficultyData {
    name: string;
    count: number;
  }
  const difficultyOptions =
    difficultiesQuery.data?.map((diff: DifficultyData) => ({
      value: diff.name,
      label: `${diff.name} (${diff.count})`,
    })) ?? [];

  return (
    <div className="bg-theme-gradient min-h-screen">
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Header */}
          <div className="text-center">
            <Title order={1} size="h1" mb="md">
              Project Ideas
            </Title>
            <Text size="lg" c="dimmed" maw={600} mx="auto">
              Explore innovative blockchain and crypto project ideas from our
              community. Find your next build or contribute to the ecosystem.
            </Text>

            {/* Stats */}
            {statsQuery.data && (
              <Group justify="center" mt="md" gap="md">
                <Badge variant="light" size="lg">
                  {statsQuery.data.successfulProjects} Projects
                </Badge>
                {statsQuery.data.lastSync && (
                  <Text size="sm" c="dimmed">
                    Last updated:{" "}
                    {new Date(
                      statsQuery.data.lastSync.startedAt,
                    ).toLocaleDateString()}
                  </Text>
                )}
              </Group>
            )}
          </div>

          {/* Filters */}
          <Paper
            p="md"
            radius="md"
            withBorder
            className="bg-theme-surface-primary"
          >
            <Stack gap="md">
              {/* Search */}
              <TextInput
                placeholder="Search projects..."
                leftSection={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  handleFilterChange();
                }}
                style={{ maxWidth: 400 }}
              />

              {/* Filter selects */}
              <Grid>
                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    placeholder="Filter by category"
                    data={categoryOptions}
                    value={selectedCategory}
                    onChange={(value) => {
                      setSelectedCategory(value);
                      handleFilterChange();
                    }}
                    clearable
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <Select
                    placeholder="Filter by difficulty"
                    data={difficultyOptions}
                    value={selectedDifficulty}
                    onChange={(value) => {
                      setSelectedDifficulty(value);
                      handleFilterChange();
                    }}
                    clearable
                  />
                </Grid.Col>

                <Grid.Col span={{ base: 12, sm: 4 }}>
                  <MultiSelect
                    placeholder="Filter by technologies"
                    data={technologyOptions}
                    value={selectedTechnologies}
                    onChange={(value) => {
                      setSelectedTechnologies(value);
                      handleFilterChange();
                    }}
                    searchable
                    maxDropdownHeight={200}
                  />
                </Grid.Col>
              </Grid>

              {/* Filter actions */}
              {hasActiveFilters && (
                <Group>
                  <Button
                    variant="subtle"
                    size="sm"
                    leftSection={<IconX size={14} />}
                    onClick={clearFilters}
                  >
                    Clear filters
                  </Button>
                </Group>
              )}
            </Stack>
          </Paper>

          {/* Results */}
          {projectsQuery.isLoading ? (
            <Center py="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading project ideas...</Text>
              </Stack>
            </Center>
          ) : projectsQuery.error ? (
            <Alert
              icon={<IconInfoCircle size={16} />}
              title="Error loading projects"
              color="red"
            >
              {projectsQuery.error.message}
            </Alert>
          ) : !displayedProjects.length ? (
            <Alert
              icon={<IconInfoCircle size={16} />}
              title="No projects found"
              color="blue"
            >
              {hasActiveFilters
                ? "No projects match your current filters. Try adjusting your search criteria."
                : "No project ideas are currently available. Check back later!"}
            </Alert>
          ) : (
            <Stack gap="lg">
              {/* Results count */}
              <Text size="sm" c="dimmed">
                Showing {displayedProjects.length} of{" "}
                {projectsQuery.data?.totalCount ?? 0} projects
              </Text>

              {/* Project grid */}
              <Grid>
                {displayedProjects.map((project) => (
                  <Grid.Col key={project.id} span={{ base: 12, sm: 6, lg: 4 }}>
                    <ProjectCard project={project} />
                  </Grid.Col>
                ))}
              </Grid>

              {/* Load more button */}
              {hasMore && (
                <Center>
                  <Button
                    variant="light"
                    onClick={loadMore}
                    loading={projectsQuery.isLoading}
                  >
                    Load More Projects
                  </Button>
                </Center>
              )}
            </Stack>
          )}
        </Stack>
      </Container>
    </div>
  );
}
