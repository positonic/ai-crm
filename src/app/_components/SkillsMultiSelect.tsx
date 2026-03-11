"use client";

import { useState, useMemo } from "react";
import {
  MultiSelect,
  Group,
  Text,
  Badge,
  Button,
  Modal,
  TextInput,
  Select,
  Stack,
  Alert,
  Loader,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import { IconPlus, IconInfoCircle } from "@tabler/icons-react";
import { api } from "~/trpc/react";

// Interface moved to be used internally
// interface Skill {
//   id: string;
//   name: string;
//   category?: string | null;
//   popularity?: number;
// }

interface SkillsMultiSelectProps {
  value: string[]; // Array of skill IDs
  onChange: (skillIds: string[]) => void;
  label?: string;
  placeholder?: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// Skill categories for the skills multiselect
const SKILL_CATEGORIES = [
  "Frontend",
  "Backend",
  "Blockchain",
  "Database",
  "Design",
  "DevOps",
  "Mobile",
  "Data Science",
  "Business",
  "Cryptography",
  "Cybersecurity",
  "Cloud Computing",
  "Networking",
  "Operating Systems",
  "Virtualization",
  "System Administration",
  "System Security",
  "System Architecture",
  "System Design",
  "Other",
];

export default function SkillsMultiSelect(props: SkillsMultiSelectProps) {
  const {
    value,
    onChange,
    label = "Skills",
    placeholder = "Select or add skills...",
    description,
    error,
    required = false,
    disabled = false,
  } = props;

  // v8 requires value to be string[]
  const safeValue = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const [searchValue, setSearchValue] = useState("");
  const [
    createModalOpened,
    { open: openCreateModal, close: closeCreateModal },
  ] = useDisclosure(false);
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillCategory, setNewSkillCategory] = useState<string>("Other");

  // Fetch available skills grouped by category
  const { data: skillsByCategory, isLoading: skillsLoading } =
    api.skills.getSkillsByCategory.useQuery();

  // Get utils at component level (fixes React Hook error)
  const utils = api.useUtils();

  // Create new skill mutation
  const createSkillMutation = api.skills.createSkill.useMutation({
    onSuccess: (newSkill) => {
      notifications.show({
        title: "Skill Created",
        message: `"${newSkill.name}" has been added to the skills list.`,
        color: "green",
      });

      // Invalidate skills cache first to refresh the list
      void utils.skills.getSkillsByCategory.invalidate();

      // Add the new skill to the current selection
      onChange([...(Array.isArray(value) ? value : []), newSkill.id]);

      // Reset form and close modal
      setNewSkillName("");
      setNewSkillCategory("Other");
      closeCreateModal();
    },
    onError: (error) => {
      notifications.show({
        title: "Error Creating Skill",
        message: error.message ?? "Failed to create skill. Please try again.",
        color: "red",
      });
    },
  });

  // Transform skills data for MultiSelect - Simple format for Mantine v8
  const skillOptions = useMemo(() => {
    if (!skillsByCategory) return [];

    const options: Array<{ value: string; label: string }> = [];

    Object.entries(skillsByCategory).forEach(([_category, skills]) => {
      if (Array.isArray(skills)) {
        skills.forEach((skill) => {
          if (skill?.id && skill?.name) {
            options.push({
              value: skill.id,
              label: skill.name,
            });
          }
        });
      }
    });

    return options;
  }, [skillsByCategory]);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    // Ensure skillOptions is always an array
    const safeSkillOptions = Array.isArray(skillOptions) ? skillOptions : [];

    if (!searchValue) return safeSkillOptions;

    return safeSkillOptions.filter((option) =>
      option?.label?.toLowerCase().includes(searchValue.toLowerCase()),
    );
  }, [skillOptions, searchValue]);

  // Get selected skill names for display
  const selectedSkills = useMemo(() => {
    const safeSkillOptions = Array.isArray(skillOptions) ? skillOptions : [];
    const filtered = safeSkillOptions.filter((option) =>
      safeValue.includes(option?.value),
    );
    return Array.isArray(filtered) ? filtered : [];
  }, [skillOptions, safeValue]);

  const handleCreateNewSkill = () => {
    if (!newSkillName.trim()) {
      notifications.show({
        title: "Invalid Skill Name",
        message: "Please enter a skill name.",
        color: "red",
      });
      return;
    }

    createSkillMutation.mutate({
      name: newSkillName.trim(),
      category: newSkillCategory,
    });
  };

  const handleSearchChange = (search: string) => {
    setSearchValue(search);
  };

  // Check if the current search would create a new skill
  const wouldCreateNewSkill =
    searchValue &&
    !filteredOptions.some(
      (option) => option.label.toLowerCase() === searchValue.toLowerCase(),
    );

  if (skillsLoading) {
    return (
      <Group gap="xs">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading skills...
        </Text>
      </Group>
    );
  }

  return (
    <div>
      <MultiSelect
        label={label}
        placeholder={placeholder}
        description={description}
        error={error}
        required={required}
        disabled={disabled}
        value={safeValue}
        onChange={onChange}
        data={filteredOptions ?? []}
        searchable
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        maxDropdownHeight={300}
        renderOption={({ option /*, checked */ }) => (
          <Group gap="xs" style={{ width: "100%" }}>
            <Text size="sm">{option.label}</Text>
          </Group>
        )}
        nothingFoundMessage={
          wouldCreateNewSkill ? (
            <Group gap="xs" style={{ padding: "8px 12px" }}>
              <Text size="sm" c="dimmed">
                No skills found for &quot;{searchValue}&quot;
              </Text>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconPlus size={14} />}
                onClick={() => {
                  setNewSkillName(searchValue);
                  openCreateModal();
                }}
              >
                Create &quot;{searchValue}&quot;
              </Button>
            </Group>
          ) : (
            <Text size="sm" c="dimmed" ta="center" py="xs">
              No skills found
            </Text>
          )
        }
        rightSection={
          <Button
            size="xs"
            variant="subtle"
            leftSection={<IconPlus size={14} />}
            onClick={openCreateModal}
            disabled={disabled}
          >
            Add New
          </Button>
        }
        rightSectionWidth={100}
      />

      {/* Display selected skills as badges */}
      {Array.isArray(selectedSkills) && selectedSkills.length > 0 && (
        <Group gap="xs" mt="xs">
          {selectedSkills.map((skill) =>
            skill?.value && skill?.label ? (
              <Badge
                key={skill.value}
                variant="light"
                size="sm"
                style={{ cursor: "pointer" }}
                onClick={() =>
                  onChange(safeValue.filter((id) => id !== skill.value))
                }
              >
                {skill.label} ×
              </Badge>
            ) : null,
          )}
        </Group>
      )}

      {/* Create New Skill Modal */}
      <Modal
        opened={createModalOpened}
        onClose={() => {
          closeCreateModal();
          setNewSkillName("");
          setNewSkillCategory("Other");
        }}
        title="Create New Skill"
        size="md"
      >
        <Stack gap="md">
          <Alert
            icon={<IconInfoCircle size={16} />}
            title="Adding a new skill"
            color="blue"
          >
            You&apos;re about to add a new skill that other users will also be
            able to select. Please make sure the skill name is clear and not a
            duplicate of existing skills.
          </Alert>

          <TextInput
            label="Skill Name"
            placeholder="e.g., React, Product Management, Solidity"
            value={newSkillName}
            onChange={(e) => setNewSkillName(e.target.value)}
            required
            data-autofocus
          />

          <Select
            label="Category"
            placeholder="Select a category"
            value={newSkillCategory}
            onChange={(value) => setNewSkillCategory(value ?? "Other")}
            data={SKILL_CATEGORIES.map((cat) => ({ value: cat, label: cat }))}
            required
          />

          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={() => {
                closeCreateModal();
                setNewSkillName("");
                setNewSkillCategory("Other");
              }}
              disabled={createSkillMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewSkill}
              loading={createSkillMutation.isPending}
              disabled={!newSkillName.trim()}
            >
              Create Skill
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
