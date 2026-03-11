"use client";

import { Paper, Stack, Group, Title, Button, Code, Text } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCode, IconCopy, IconDownload } from "@tabler/icons-react";
import { type HyperboardConfig } from "../HyperboardPlaygroundClient";

interface SchemaPanelProps {
  config: HyperboardConfig;
}

export function SchemaPanel({ config }: SchemaPanelProps) {
  const configJson = JSON.stringify(config, null, 2);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(configJson);
      notifications.show({
        title: "Copied!",
        message: "Configuration copied to clipboard",
        color: "green",
      });
    } catch {
      notifications.show({
        title: "Copy Failed",
        message: "Could not copy to clipboard",
        color: "red",
      });
    }
  };

  const handleDownloadJson = () => {
    const blob = new Blob([configJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hyperboard-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notifications.show({
      title: "Downloaded!",
      message: "Configuration saved to file",
      color: "green",
    });
  };

  return (
    <Paper withBorder p="lg">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group gap="xs">
            <IconCode size={20} />
            <Title order={3}>Configuration Schema</Title>
          </Group>

          <Group gap="xs">
            <Button
              variant="light"
              size="sm"
              leftSection={<IconCopy size={16} />}
              onClick={handleCopyToClipboard}
            >
              Copy
            </Button>
            <Button
              variant="light"
              size="sm"
              leftSection={<IconDownload size={16} />}
              onClick={handleDownloadJson}
            >
              Download
            </Button>
          </Group>
        </Group>

        {/* Schema Display */}
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Current configuration in JSON format. Use this schema to
            programmatically generate hyperboards.
          </Text>
          <Code block style={{ maxHeight: "500px", overflow: "auto" }}>
            {configJson}
          </Code>
        </Stack>
      </Stack>
    </Paper>
  );
}
