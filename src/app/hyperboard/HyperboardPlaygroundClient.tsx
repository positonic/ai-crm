"use client";

import { useState } from "react";
import { Container, Stack, Title, Text, Box, Tabs } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconEye, IconSettings, IconCode } from "@tabler/icons-react";
import { type HyperboardEntry } from "~/app/_components/Hyperboard/types";
import { ConfigurationPanel } from "./components/ConfigurationPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { SchemaPanel } from "./components/SchemaPanel";

// Sample data presets
const SAMPLE_SPONSORS: HyperboardEntry[] = [
  {
    type: "sponsor",
    id: "protocol-labs",
    displayName: "Protocol Labs",
    value: 35,
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/10536621?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "near",
    displayName: "NEAR",
    value: 20,
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/20564190?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "stellar",
    displayName: "Stellar",
    value: 17,
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/6810161?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "gitcoin",
    displayName: "Gitcoin",
    value: 15,
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/30044474?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "ethereum",
    displayName: "Ethereum Foundation",
    value: 12,
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/6250754?s=200&v=4",
  },
];

const SAMPLE_USERS: HyperboardEntry[] = [
  {
    type: "user",
    id: "user-1",
    displayName: "Alice Johnson",
    value: 150,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
  },
  {
    type: "user",
    id: "user-2",
    displayName: "Bob Smith",
    value: 120,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
  },
  {
    type: "user",
    id: "user-3",
    displayName: "Carol Williams",
    value: 95,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
  },
  {
    type: "user",
    id: "user-4",
    displayName: "David Brown",
    value: 80,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
  {
    type: "user",
    id: "user-5",
    displayName: "Eve Davis",
    value: 65,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
  },
];

const SAMPLE_PROJECTS: HyperboardEntry[] = [
  {
    type: "project",
    id: "proj-1",
    displayName: "Climate Action DAO",
    value: 200,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=Climate",
  },
  {
    type: "project",
    id: "proj-2",
    displayName: "Public Goods Network",
    value: 175,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=PublicGoods",
  },
  {
    type: "project",
    id: "proj-3",
    displayName: "Open Source Sustainability",
    value: 150,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=OpenSource",
  },
  {
    type: "project",
    id: "proj-4",
    displayName: "Regenerative Finance",
    value: 125,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=ReFi",
  },
];

const MINIMAL_SAMPLE: HyperboardEntry[] = [
  {
    type: "example",
    id: "item-1",
    displayName: "Large Item",
    value: 100,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=Large",
  },
  {
    type: "example",
    id: "item-2",
    displayName: "Medium Item",
    value: 50,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=Medium",
  },
  {
    type: "example",
    id: "item-3",
    displayName: "Small Item",
    value: 25,
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/shapes/svg?seed=Small",
  },
];

// Combined sample: 64% sponsors, 36% residents (similar to actual combined hyperboard)
const COMBINED_SAMPLE: HyperboardEntry[] = [
  // Sponsors (scaled to 64% of total area)
  {
    type: "sponsor",
    id: "protocol-labs",
    displayName: "Protocol Labs",
    value: 22.4, // 35 * 0.64
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/10536621?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "near",
    displayName: "NEAR",
    value: 12.8, // 20 * 0.64
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/20564190?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "stellar",
    displayName: "Stellar",
    value: 10.88, // 17 * 0.64
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/6810161?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "gitcoin",
    displayName: "Gitcoin",
    value: 9.6, // 15 * 0.64
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/30044474?s=200&v=4",
  },
  {
    type: "sponsor",
    id: "ethereum",
    displayName: "Ethereum Foundation",
    value: 7.68, // 12 * 0.64
    isBlueprint: false,
    avatar: "https://avatars.githubusercontent.com/u/6250754?s=200&v=4",
  },
  // Residents (scaled to 36% of total area)
  {
    type: "resident",
    id: "user-1",
    displayName: "Alice Johnson",
    value: 54, // 150 * 0.36
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice",
  },
  {
    type: "resident",
    id: "user-2",
    displayName: "Bob Smith",
    value: 43.2, // 120 * 0.36
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob",
  },
  {
    type: "resident",
    id: "user-3",
    displayName: "Carol Williams",
    value: 34.2, // 95 * 0.36
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carol",
  },
  {
    type: "resident",
    id: "user-4",
    displayName: "David Brown",
    value: 28.8, // 80 * 0.36
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
  },
  {
    type: "resident",
    id: "user-5",
    displayName: "Eve Davis",
    value: 23.4, // 65 * 0.36
    isBlueprint: false,
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Eve",
  },
];

export const SAMPLE_PRESETS = {
  combined: COMBINED_SAMPLE,
  sponsors: SAMPLE_SPONSORS,
  users: SAMPLE_USERS,
  projects: SAMPLE_PROJECTS,
  minimal: MINIMAL_SAMPLE,
} as const;

export type PresetKey = keyof typeof SAMPLE_PRESETS;

export interface HyperboardConfig {
  data: HyperboardEntry[];
  height: number;
  label: string;
  grayscaleImages: boolean;
  borderColor: string;
  borderWidth: number;
  imageObjectFit: "cover" | "contain";
  logoSize: string;
  backgroundImage?: string;
  backgroundOpacity?: number;
  backgroundFilter?: string;
}

export function HyperboardPlaygroundClient() {
  const [activeTab, setActiveTab] = useState<string>("preview");

  const form = useForm<HyperboardConfig>({
    initialValues: {
      data: COMBINED_SAMPLE,
      height: 800,
      label: "Sponsors & Residents",
      grayscaleImages: true,
      borderColor: "#000000",
      borderWidth: 1,
      imageObjectFit: "contain",
      logoSize: "50%",
      backgroundImage: "/images/ba.jpg",
      backgroundOpacity: 0.4,
      backgroundFilter: "grayscale(100%)",
    },
    validate: {
      height: (value) => (value < 400 ? "Height must be at least 400px" : null),
      label: (value) => (value.trim() === "" ? "Label is required" : null),
      logoSize: (value) => {
        const regex = /^(\d+)%$/;
        const match = regex.exec(value);
        if (!match) return "Logo size must be a percentage (e.g., 60%)";
        const num = parseInt(match[1] ?? "0");
        if (num < 10 || num > 100)
          return "Logo size must be between 10% and 100%";
        return null;
      },
    },
  });

  return (
    <Box>
      {/* Full-width Hyperboard Preview */}
      <Box
        style={{
          position: "relative",
          minHeight: form.values.height + 100,
          width: "100%",
        }}
      >
        {/* Background Image */}
        {form.values.backgroundImage && (
          <Box
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "100%",
              backgroundImage: `url(${form.values.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "left center",
              backgroundRepeat: "no-repeat",
              opacity: form.values.backgroundOpacity ?? 0.4,
              filter: form.values.backgroundFilter ?? "none",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        )}

        {/* Hyperboard */}
        <Box style={{ position: "relative", zIndex: 1, paddingTop: "2rem" }}>
          <PreviewPanel config={form.values} />
        </Box>
      </Box>

      {/* Configuration Tabs Below */}
      <Container size="xl" py="xl">
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value ?? "preview")}
        >
          <Tabs.List>
            <Tabs.Tab value="preview" leftSection={<IconEye size={16} />}>
              Preview Info
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              Configuration
            </Tabs.Tab>
            <Tabs.Tab value="schema" leftSection={<IconCode size={16} />}>
              JSON Schema
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="preview" pt="xl">
            <Stack gap="md">
              <Title order={2}>Hyperboard Playground</Title>
              <Text c="dimmed">
                This playground allows you to configure and preview Hyperboard
                visualizations. The hyperboard above updates in real-time as you
                adjust settings.
              </Text>
              <Text size="sm" c="dimmed">
                Current configuration: {form.values.data.length} items,{" "}
                {form.values.height}px height, {form.values.label}
              </Text>
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="settings" pt="xl">
            <ConfigurationPanel form={form} />
          </Tabs.Panel>

          <Tabs.Panel value="schema" pt="xl">
            <SchemaPanel config={form.values} />
          </Tabs.Panel>
        </Tabs>
      </Container>
    </Box>
  );
}
