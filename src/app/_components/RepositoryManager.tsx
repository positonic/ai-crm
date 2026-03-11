"use client";

import { useState, useEffect } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  TextInput,
  Textarea,
  ActionIcon,
  Paper,
  Badge,
  Switch,
  Box,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconBrandGithub,
  IconStarFilled,
} from "@tabler/icons-react";

interface RepositoryInput {
  id?: string; // Undefined for new repos
  url: string;
  name: string;
  description: string;
  isPrimary: boolean;
  order: number;
  isNew?: boolean; // Track new repos not yet saved
}

interface RepositoryManagerProps {
  projectId?: string; // Undefined when creating new project
  initialRepositories: RepositoryInput[];
  onChange: (repos: RepositoryInput[]) => void;
}

export function RepositoryManager({
  projectId: _projectId,
  initialRepositories,
  onChange,
}: RepositoryManagerProps) {
  const [localRepos, setLocalRepos] =
    useState<RepositoryInput[]>(initialRepositories);

  // Sync with initialRepositories when they change (e.g., when editing a different project)
  useEffect(() => {
    setLocalRepos(initialRepositories);
  }, [initialRepositories]);

  const handleAddRepo = () => {
    const newRepo: RepositoryInput = {
      url: "",
      name: "",
      description: "",
      isPrimary: localRepos.length === 0, // First repo is primary by default
      order: localRepos.length,
      isNew: true,
    };
    const updated = [...localRepos, newRepo];
    setLocalRepos(updated);
    onChange(updated);
  };

  const handleRemoveRepo = (index: number) => {
    const updated = localRepos.filter((_, i) => i !== index);
    // If removed repo was primary and there are others, make first one primary
    if (updated.length > 0 && !updated.some((r) => r.isPrimary)) {
      updated[0]!.isPrimary = true;
    }
    setLocalRepos(updated);
    onChange(updated);
  };

  const handleUpdateRepo = (
    index: number,
    field: keyof RepositoryInput,
    value: string | boolean,
  ) => {
    const updated = [...localRepos];
    const repo = updated[index];
    if (!repo) return;

    if (field === "isPrimary" && value === true) {
      // Unset primary on all other repos
      updated.forEach((r, i) => {
        if (i !== index) r.isPrimary = false;
      });
    }

    // @ts-expect-error - We know the types match
    repo[field] = value;
    setLocalRepos(updated);
    onChange(updated);
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <div>
          <Text fw={500}>Repositories</Text>
          <Text size="sm" c="dimmed">
            Add GitHub repositories for this project
          </Text>
        </div>
        <Button
          leftSection={<IconPlus size={16} />}
          variant="light"
          size="xs"
          onClick={handleAddRepo}
        >
          Add Repository
        </Button>
      </Group>

      {localRepos.length === 0 ? (
        <Box ta="center" py="lg">
          <Text size="sm" c="dimmed">
            No repositories added yet
          </Text>
        </Box>
      ) : (
        <Stack gap="sm">
          {localRepos.map((repo, index) => (
            <Paper key={index} p="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="flex-start">
                  <Group gap="xs" style={{ flex: 1 }}>
                    <IconBrandGithub size={20} />
                    <Text size="sm" fw={500}>
                      Repository {index + 1}
                    </Text>
                    {repo.isPrimary && (
                      <Badge
                        size="xs"
                        color="blue"
                        leftSection={<IconStarFilled size={10} />}
                      >
                        Primary
                      </Badge>
                    )}
                  </Group>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={() => handleRemoveRepo(index)}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>

                <TextInput
                  label="Repository URL"
                  placeholder="https://github.com/username/repo"
                  required
                  value={repo.url}
                  onChange={(e) =>
                    handleUpdateRepo(index, "url", e.currentTarget.value)
                  }
                />

                <TextInput
                  label="Name (optional)"
                  placeholder="e.g., Frontend, Backend, API"
                  description="Display name for this repository"
                  value={repo.name}
                  onChange={(e) =>
                    handleUpdateRepo(index, "name", e.currentTarget.value)
                  }
                />

                <Textarea
                  label="Description (optional)"
                  placeholder="What does this repository contain?"
                  minRows={2}
                  value={repo.description}
                  onChange={(e) =>
                    handleUpdateRepo(
                      index,
                      "description",
                      e.currentTarget.value,
                    )
                  }
                />

                {localRepos.length > 1 && (
                  <Switch
                    label="Set as primary repository"
                    description="The main repository will be shown prominently"
                    checked={repo.isPrimary}
                    onChange={(e) =>
                      handleUpdateRepo(
                        index,
                        "isPrimary",
                        e.currentTarget.checked,
                      )
                    }
                  />
                )}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
