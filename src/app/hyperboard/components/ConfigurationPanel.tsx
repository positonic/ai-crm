"use client";

import {
  Stack,
  Paper,
  Title,
  TextInput,
  NumberInput,
  Switch,
  Select,
  Slider,
  Divider,
  Button,
  Group,
} from "@mantine/core";
import { type UseFormReturnType } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import {
  IconSettings,
  IconPalette,
  IconDatabase,
  IconUpload,
} from "@tabler/icons-react";
import {
  type HyperboardConfig,
  type PresetKey,
  SAMPLE_PRESETS,
} from "../HyperboardPlaygroundClient";
import { type HyperboardEntry } from "~/app/_components/Hyperboard/types";

interface ConfigurationPanelProps {
  form: UseFormReturnType<HyperboardConfig>;
}

export function ConfigurationPanel({ form }: ConfigurationPanelProps) {
  const handlePresetChange = (value: string | null) => {
    if (!value) return;
    const preset = SAMPLE_PRESETS[value as PresetKey];
    if (preset) {
      form.setFieldValue("data", preset);
      form.setFieldValue(
        "label",
        value.charAt(0).toUpperCase() + value.slice(1),
      );
      notifications.show({
        title: "Preset Loaded",
        message: `Loaded ${value} sample data`,
        color: "blue",
      });
    }
  };

  const handleCustomDataImport = () => {
    const dataJson = prompt("Paste your custom JSON data array:");
    if (!dataJson) return;

    try {
      const parsed = JSON.parse(dataJson) as unknown;

      // Validate it's an array
      if (!Array.isArray(parsed)) {
        throw new Error("Data must be an array");
      }

      // Validate structure
      const isValid = parsed.every((item) => {
        return (
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          "id" in item &&
          "value" in item &&
          "isBlueprint" in item
        );
      });

      if (!isValid) {
        throw new Error(
          "Invalid data structure. Each item must have: type, id, value, isBlueprint",
        );
      }

      form.setFieldValue("data", parsed as HyperboardEntry[]);
      notifications.show({
        title: "Data Imported",
        message: `Successfully imported ${parsed.length} items`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Import Failed",
        message: error instanceof Error ? error.message : "Invalid JSON format",
        color: "red",
      });
    }
  };

  return (
    <Stack gap="md">
      {/* Data Configuration */}
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <IconDatabase size={20} />
            <Title order={3}>Data Configuration</Title>
          </Group>

          <Select
            label="Sample Preset"
            description="Choose a sample dataset"
            data={[
              {
                value: "combined",
                label: "Combined (Sponsors 64% + Residents 36%)",
              },
              { value: "sponsors", label: "Sponsors" },
              { value: "users", label: "Users" },
              { value: "projects", label: "Projects" },
              { value: "minimal", label: "Minimal (3 items)" },
            ]}
            onChange={handlePresetChange}
            clearable
          />

          <Button
            variant="light"
            leftSection={<IconUpload size={16} />}
            onClick={handleCustomDataImport}
            fullWidth
          >
            Import Custom JSON Data
          </Button>

          <TextInput
            label="Current Data Count"
            value={`${form.values.data.length} items`}
            readOnly
            variant="filled"
          />
        </Stack>
      </Paper>

      {/* Visual Configuration */}
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <IconSettings size={20} />
            <Title order={3}>Visual Settings</Title>
          </Group>

          <TextInput
            label="Label"
            description="Header text for the hyperboard"
            placeholder="Enter label..."
            {...form.getInputProps("label")}
          />

          <NumberInput
            label="Height (px)"
            description="Container height in pixels"
            min={400}
            max={1200}
            step={50}
            {...form.getInputProps("height")}
          />

          <Divider />

          <Switch
            label="Grayscale Images"
            description="Apply grayscale filter to images"
            {...form.getInputProps("grayscaleImages", { type: "checkbox" })}
          />

          <Select
            label="Image Object Fit"
            description="How images should fit in tiles"
            data={[
              { value: "contain", label: "Contain (fit inside)" },
              { value: "cover", label: "Cover (fill space)" },
            ]}
            {...form.getInputProps("imageObjectFit")}
          />

          <TextInput
            label="Logo Size"
            description="Logo size as percentage (e.g., 60%)"
            placeholder="60%"
            {...form.getInputProps("logoSize")}
          />
        </Stack>
      </Paper>

      {/* Border Configuration */}
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <IconPalette size={20} />
            <Title order={3}>Border Settings</Title>
          </Group>

          <TextInput
            label="Border Color"
            description="Hex color code"
            placeholder="#ffffff"
            {...form.getInputProps("borderColor")}
          />

          <div>
            <TextInput
              label="Border Width"
              description={`Current: ${form.values.borderWidth}px`}
              value={form.values.borderWidth}
              readOnly
              variant="filled"
              mb="xs"
            />
            <Slider
              min={0}
              max={5}
              step={0.1}
              marks={[
                { value: 0, label: "0" },
                { value: 1.2, label: "1.2" },
                { value: 2.5, label: "2.5" },
                { value: 5, label: "5" },
              ]}
              {...form.getInputProps("borderWidth")}
            />
          </div>
        </Stack>
      </Paper>

      {/* Background Configuration */}
      <Paper withBorder p="lg">
        <Stack gap="md">
          <Group gap="xs">
            <IconPalette size={20} />
            <Title order={3}>Background Settings</Title>
          </Group>

          <TextInput
            label="Background Image URL"
            description="URL to background image (optional)"
            placeholder="/images/ba.jpg"
            {...form.getInputProps("backgroundImage")}
          />

          <div>
            <TextInput
              label="Background Opacity"
              description={`Current: ${form.values.backgroundOpacity ?? 0.4}`}
              value={form.values.backgroundOpacity ?? 0.4}
              readOnly
              variant="filled"
              mb="xs"
            />
            <Slider
              min={0}
              max={1}
              step={0.05}
              marks={[
                { value: 0, label: "0" },
                { value: 0.4, label: "0.4" },
                { value: 0.7, label: "0.7" },
                { value: 1, label: "1" },
              ]}
              {...form.getInputProps("backgroundOpacity")}
            />
          </div>

          <TextInput
            label="Background Filter"
            description="CSS filter (e.g., grayscale(100%))"
            placeholder="grayscale(100%)"
            {...form.getInputProps("backgroundFilter")}
          />
        </Stack>
      </Paper>
    </Stack>
  );
}
